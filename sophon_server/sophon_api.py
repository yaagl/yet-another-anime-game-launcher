# Sophon chunk/diff installer and updater implementation
# SPDX-License-Identifier: MIT
# Copyright (C) 2025 Krock <mk939@ymail.com>

"""
	Rough API documentation
	-----------------------
	SHA/getGameConfigs?...
		Game paths (audio/voiceover, screenshots, logs, crash dumps) for all HoYo games
	SHA/getAllGameBasicInfo?...
		Launcher background data for the specified game
	SHA/getGames?...
		Launcher images and links for all HoYo games
	SHA/getGameContent?...
		Event preview data for the specified game
	SGP/getLatestRelease?...
		Launcher update information
	SDA/getPatchBuild (POST)
		List of manifests information (same as getBuild)

	Seriously guys, why don't you provide the chunk URL, diff URL and the two manifests in the same file?


	Functional description
	----------------------
	1 ) getBuild
		JSON file that provides information about the available game and voiceover pack files
		Provides manifests and the base URL to download chunks from
	2 ) manifest
		Provides information for all chunks or ldiff files
	3a) chunks
		zstd-compressed sections of files for installing from scratch (or new ones)
	3b) diffs
		hdiff files to patch installed game files


	TODO
	----
	Low priority
		Parallelization for file downloads and patching
		Apply patches for non-existent files (apparently the official launcher can do that)

	Hints for developers:
		1. Investigate the JSON files downloaded to `tmp/` -> variable `EXPORT_JSON_FILES`

"""

from __future__ import annotations

import argparse
import hashlib # md5
import os
import io # TextIOWrapper
import json
import pathlib
import re # Regular Expressions
import shutil # rmtree
import subprocess # for hpatchz (ldiff)
import sys # stdout
import tempfile # patch extraction
import time
from typing import Literal, Optional
import uuid
import struct
import urllib.error # exception handling
import urllib.request as request # downloads
from typing import TYPE_CHECKING

import psutil
import zstandard # archive unpacking
from google.protobuf.json_format import MessageToJson

import manifest_pb2 # generated
import manifest_ldiff_pb2 # generated

from io import BytesIO
import pycurl
import concurrent.futures

if TYPE_CHECKING:
	from os import PathLike

SCRIPTDIR = pathlib.Path(__file__).resolve().parent

# Needed for ldiff
HPATCHZ_APP = SCRIPTDIR / "HDiffPatch/hpatchz"
if not HPATCHZ_APP.is_file():
	HPATCHZ_APP = SCRIPTDIR / ".." / "hpatchz" / "hpatchz"
assert HPATCHZ_APP.is_file(), f"{HPATCHZ_APP.resolve()} not found."


# Not needed. Only helpful for development purposes.
EXPORT_JSON_FILES = True


# ------------------- CLI options

class Options(argparse.Namespace):
	gamedir:   pathlib.Path | None = None
	tempdir:   pathlib.Path | None = SCRIPTDIR / "tmp" # cache
	# where to place ldiff files and patched output files
	#outputdir: pathlib.Path | None = SCRIPTDIR / "tmp" / "out"
	force_use_cache: bool = False # True: disallow downloads, False: download if not cached
	predownload: bool = False
	install_reltype: str | None = None
	game_type: Literal["hk4e", "nap"] | None # hk4e or nap
	do_install: bool = False
	do_update: bool = False         # True: ldiff, False: chunks
	repair_mode: str | None = None  # "quick"|"reliable"|None
	dry_run: bool = False           # True: prevents modifying game files
	disallow_download: bool = False # True: prevents media downloads

	# `True` ignores the "empty directory" requirement for installs and skips sanity checks for updates
	ignore_conditions: bool = False
	TESTING_FILE: str | None = None # if != None: only update/download the specified file

	# main() script only
	selected_lang_packs: str = ""

# Cannot be overwritten by other scripts :(
OPT = Options()


# ------------------- Translate between voiceover pack names
VOICEOVERS_LUT = {
	# "Friendly/short": {"short": "aa-bb", "friendly": "Longname"}
	"English(US)": {"short": "en-us"},
	"Japanese":    {"short": "ja-jp"},
	"Korean":      {"short": "ko-kr"},
	"Chinese":     {"short": "zh-cn"}
}
if True:
	keys: list = list(VOICEOVERS_LUT.keys())
	for k in keys:
		v = VOICEOVERS_LUT[k]
		v["friendly"] = k

		# Add reverse lookup for the short version
		VOICEOVERS_LUT[v["short"]] = v


# ------------------- Utilities

def _handle_kwargs(kwargs):
	sys.stdout.write("\33[2K")

def tempdir(*args: str | PathLike[str]) -> pathlib.Path:
	return OPT.tempdir.joinpath(*args)

def gamedir(*args: str | PathLike[str]) -> pathlib.Path:
	return OPT.gamedir.joinpath(*args)

def debuglog(*args, **kwargs):
	_handle_kwargs(kwargs)
	print("\033[37mDEBUG ", *args, "\033[0m", **kwargs)

def infolog(*args, **kwargs):
	_handle_kwargs(kwargs)
	print("INFO  ", *args, **kwargs)

def warnlog(*args, **kwargs):
	_handle_kwargs(kwargs)
	print("\033[36mWARN  ", *args, "\033[0m", **kwargs)

def abortlog(*args, **kwargs):
	_handle_kwargs(kwargs)
	print("\033[31mERROR ", *args, "\033[0m", **kwargs)
	exception_string = " ".join(str(a) for a in args)
	raise RuntimeError(exception_string)
	# exit(1)

def try_get_file_size(filename: pathlib.Path):
	"""
	Returns -1 if the file was not found
	"""
	try:
		return filename.stat().st_size
	except FileNotFoundError:
		return -1

def filename_safety_check(filename):
	"""
	Checks whether the path is relative AND within this tree
	This ensures that no files are written to unpredictable locations.
	"""
	assert (".." not in str(filename)), f"Security alert! {filename}"
	assert (str(filename)[0] != '/'), f"Security alert! {filename}"

def bytes_to_MiB(n: float):
	return int(n / (1024 * 1024 / 10) + 0.5) / 10

def cmp_versions(lhs: list, rhs: list) -> int:
	"""
	Returns [1 if lhs > rhs], [-1 if lhs < rhs], [0 if equal]
	"""
	assert len(lhs) == len(rhs)
	for i in range(len(lhs)):
		if lhs[i] < rhs[i]:
			return -1
		if lhs[i] > rhs[i]:
			return 1
	return 0

def hpatchz_patch_file(oldfile: pathlib.Path, dstfile: pathlib.Path, patchfile: pathlib.Path,
		p_offset: int, p_len: int, timeout: int = 50):
	"""
	Patches a file, throws an exception upon failure
	One ldiff file may contain multiple patches, thus the offset

	Returns `True` on success, `False` on timeout
	"""

	pfile_in = None   # keep alive until functoin exit

	# Extract the relevant patch section
	# Note: This is also needed if `p_offset == 0`. Unlike other archiver programs or
	# libraries, hpatchz does not allow tailing data.
	pfile_in = patchfile.open("rb")
	pfile_in.seek(p_offset)
	pfile_out = tempfile.NamedTemporaryFile("wb")
	pfile_out.write(pfile_in.read(p_len))
	pfile_out.flush()

	proc = subprocess.Popen(
		# -f: overwrite the target (temporary) file
		[HPATCHZ_APP, "-f", oldfile, pfile_out.name, dstfile],
		stdout=subprocess.PIPE, stderr=subprocess.PIPE,
		text=True
	)
	# Wait for the process to exit
	# This usually takes < 100 ms
	try:
		pout, perr = proc.communicate(timeout=timeout)
	except subprocess.TimeoutExpired:
		proc.terminate()
		pout, perr = proc.communicate()
		dstfile.unlink(True) # maybe stuck at writing
		warnlog(f"hpatchz timeout ({timeout} s) reached on file '{dstfile.name}'.")
		return False

	retcode = proc.returncode
	if retcode != 0 or perr != "":
		dstfile.unlink(True) # hpatchz may create 0 byte files on failure. Remove it.
		abortlog(f"Failed to patch file '{oldfile.name}' using '{patchfile.name}':"
		         + f"\n\t Exit code: {retcode}"
		         +  "\n\t Message:   " + perr)

	#debuglog("\n", pout)
	"""
	Error Messages And Their Meaning
	~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	oldFile dataSize <integer> != diffFile saved oldDataSize <integer> ERROR!
		Wrong diff file; it does not match the file "signature"
	open oldFile for read ERROR!
		Missing source file
	patch run ERROR!
		Patch file has an unexpected length
	"""
	return True


def get_game_version(game_data_dir: pathlib.Path, offset: int = 0x88) -> Optional[str]:
	ggm_path = game_data_dir / "globalgamemanagers"
	with open(ggm_path, "rb") as f:
		view = f.read()

	pattern = bytes([0x69, 0x63, 0x2e, 0x61, 0x70, 0x70, 0x2d, 0x63, 0x61, 0x74, 0x65, 0x67, 0x6f, 0x72, 0x79, 0x2e])
	plen = len(pattern)
	index = -1
	for i in range(len(view) - plen + 1):
		if view[i:i+plen] == pattern:
			index = i
			break

	if index == -1:
		raise ValueError("pattern not found")
	else:
		len_index = index + offset
		strlen = struct.unpack_from('<I', view, len_index)[0]
		str_bytes = view[len_index + 4: len_index + 4 + strlen]
		str_val = str_bytes.decode('ascii')
		return str_val.split('_')[0]


# -------------------

class DownloadInfo:
	name: str | None = None # for logging
	getBuild_json = None # json object. 'get(Patch)Build' contents for URL information
	# Category-specific list of files and checksums
	manifest: manifest_pb2.Manifest | manifest_ldiff_pb2.DiffManifest | None = None
	category_json: None  # json object. "game", or language pack information


class SophonClient:
	installed_ver: None  # "major.minor.patch" or "new" for new installations
	rel_type: str | None = None  # os / cn / bb
	game_type: Literal["hk4e", "nap"] | None = None  # hk4e / nap
	gamedatadir: str | None= None # "*_Data"
	branch: str          # main / pre_download
	branches_json = None # package_id, password, tag

	# chunks: For files to download from scratch
	# diffs:  For files to update by patching or removal
	di_chunks = DownloadInfo()
	di_diffs  = DownloadInfo()

	new_files_to_download = set() # Update only. Relative file name
	ldiff_files_to_remove = set() # Update only. File name (no path)


	def initialize(self, opts: Options):
		global OPT
		OPT = opts

		self.di_chunks.name = "[chunks]"
		self.di_diffs.name  = "[diffs]"

		if OPT.install_reltype:
			OPT.do_install = True
			self.rel_type = OPT.install_reltype

		if OPT.game_type:
			assert OPT.game_type in ["hk4e", "nap"], "Unknown game type. Must be 'hk4e' or 'nap'."
			self.game_type = OPT.game_type

		if OPT.do_install + OPT.do_update + isinstance(OPT.repair_mode, str) > 1:
			abortlog("Do either install, update or repair!")

		assert OPT.gamedir != None, "Game directory not specified."

		self.branch = "pre_download" if OPT.predownload else "main"
		infolog(f"Selected branch '{self.branch}'")

		if OPT.dry_run:
			infolog("Simulation mode is enabled.")

		# Autodetection
		if OPT.do_install:
			self._initialize_install()
		if OPT.do_update or OPT.repair_mode:
			self._initialize_update()

		OPT.tempdir.mkdir(exist_ok=True)

		if not OPT.gamedir.is_dir():
			abortlog("Game directory does not exist.")


	def _initialize_install(self):
		self.installed_ver = None

		OPT.gamedir.mkdir(exist_ok=True)
		if not OPT.ignore_conditions:
			# must be empty (allow config.ini)
			assert len(list(OPT.gamedir.glob("*"))) < 2, "The specified install path is not empty"

		# Create "config.ini"
		templates = {}
		if OPT.game_type == "hk4e":
			templates = {
				"os": "[General]\r\nchannel=1\r\ncps=mihoyo\r\ngame_version=0.0.0\r\nsdk_version=\r\nsub_channel=0\r\n",
				"cn": "[General]\r\nchannel=1\r\ncps=mihoyo\r\ngame_version=0.0.0\r\nsdk_version=\r\nsub_channel=1\r\n",
				"bb": "[General]\r\nchannel=14\r\ncps=bilibili\r\ngame_version=0.0.0\r\nsdk_version=\r\nsub_channel=0\r\n"
			}
		elif OPT.game_type == "nap":
			templates = {
				"os": "[General]\r\nchannel=1\r\ncps=mihoyo\r\ngame_version=0.0.0\r\nsdk_version=\r\nsub_channel=0\r\n",
				"cn": "[General]\r\nchannel=1\r\ncps=mihoyo\r\ngame_version=0.0.0\r\nsdk_version=\r\nsub_channel=1\r\n",
			}
		assert templates[self.rel_type], "Unknown reltype"
		with gamedir("config.ini").open("w") as fh:
			fh.write(templates[self.rel_type])
		infolog("Created config.ini")


	def _get_gamedatadir(self):
		# Absolute path to the game data directory
		path = next(OPT.gamedir.glob("*_Data"), None)
		assert path, "Cannot determine game data dir"
		self.gamedatadir = path.name


	def _initialize_update(self):
		"""
		Find out what kind of installation we need to update
		"""
		self._get_gamedatadir()
		if self.game_type == "hk4e":
			if gamedir("GenshinImpact.exe").is_file():
				self.rel_type = "os"
			elif gamedir("YuanShen.exe").is_file():
				if self.gamedatadir.joinpath("Plugins", "PCGameSDK.dll").is_file():
					self.rel_type = "bb"
				else:
					self.rel_type = "cn"
			if not isinstance(self.rel_type, str):
				abortlog("Failed to detect release type. " \
				         + f"Game executable in '{OPT.gamedir}' could not be found.")
		elif self.game_type == "nap":
			with open(gamedir("config.ini"), "r") as f:
				contents = f.read()
				if "sub_channel=0" in contents:
					self.rel_type = "os"
				elif "sub_channel=1" in contents:
					self.rel_type = "cn"
			if not isinstance(self.rel_type, str):
				abortlog("Failed to detect release type. " \
				         + f"config.ini in '{OPT.gamedir}' has wrong information.")

		infolog(f"Release type: {self.rel_type}")

		# Retrieve the installed game version
		if not OPT.ignore_conditions:
			if self.game_type == "hk4e":
				fullname = gamedir(self.gamedatadir, "globalgamemanagers")
				assert fullname.is_file(), "Game install is incomplete!"

				contents = fullname.read_bytes()
				ver = re.findall(br"\0(\d+\.\d+\.\d+)_\d+_\d+\0", contents)
				assert len(ver) == 1, "Broken script or corrupted game installation"

				self.installed_ver = ver[0].decode("utf-8")
				infolog(f"Installed game version: {self.installed_ver} (anchor 1: globalgamemanagers)")
			elif self.game_type == "nap":
				ver = get_game_version(gamedir(self.gamedatadir), 0xc4)
				assert ver, "Failed to retrieve game version from globalgamemanagers"
				self.installed_ver = ver
		else:
			# Change this if needed
			self.installed_ver = "5.5.0"

		# Compare game version with what's contained in "config.ini"
		self.check_config_ini()


	def check_config_ini(self):
		"""
		Internal function. Picks the version as follows: min(config.ini, globalgamemanagers)
		"""
		fullname = gamedir("config.ini")
		if not fullname.is_file():
			warnlog("config.ini not found")
			return

		contents = fullname.read_text()
		ver = re.findall(r"game_version=(\d+\.\d+\.\d+)", contents)
		if len(ver) != 1:
			warnlog("config.ini is incomplete or corrupt")
			return

		infolog(f"Installed game version: {ver[0]} (anchor 2: config.ini)")
		# config.ini is updated last. Use the older version
		ver_cfg = [int(v) for v in ver[0].split(".")]
		ver_ggm = [int(v) for v in self.installed_ver.split(".")]

		if cmp_versions(ver_cfg, ver_ggm) == 1:
			warnlog("Potential issue: config.ini documents a more recent version!")
			# keep `self.installed_ver` to continue the update if possible
		else:
			# equal version or lower
			self.installed_ver = ver[0]


	def get_voiceover_packs(self):
		"""
		Returns a set of the installed packs: { "en-us", "ja-jp", "ko-kr", "zh-cn" }
		"""

		# This path is also specified in 'getGameConfigs'
		fullname = gamedir(self.gamedatadir, "Persistent/audio_lang_14")

		packs = set()
		for line in fullname.open("r"):
			line = line.strip()
			if line == "":
				continue

			if not (line in VOICEOVERS_LUT):
				warnlog("Unknown voiceover pack in 'audio_lang_14': " + line)
				continue

			mediapath = gamedir(self.gamedatadir, "StreamingAssets/AudioAssets", line)
			num_files = len(list(mediapath.glob("*.*")))
			if num_files < 10:
				# These will be updated after the login screen
				infolog(f"Skipping voiceover pack '{line}': Pack was installed in-game.")
				continue

			packs.add(VOICEOVERS_LUT[line]["short"])

		debuglog("Found voiceover packs:", ", ".join(packs))
		return packs


	def update_voiceover_meta_file(self):
		"""
		[Install only] Auto-detect installed language packs and update audio_lang_14
		"""
		self._get_gamedatadir()

		languages = set()
		filename: pathlib.Path
		for filename in OPT.gamedir.glob("*"):
			groups = re.findall(r"^Audio_(.+)_pkg_version$", filename.name)
			if len(groups) != 1:
				continue
			longname = groups[0]
			if not (longname in VOICEOVERS_LUT):
				warnlog(f"Unknown voiceover pack '{filename.name}'")
				continue
			languages.add(longname)

		languages = list(languages)
		languages.sort()

		# Update the lang file
		langfile = gamedir(self.gamedatadir, "Persistent/audio_lang_14")
		lang_str = ", ".join(languages)
		if OPT.dry_run:
			infolog(f"[update lang file: {lang_str}]")
			return

		langfile.parent.mkdir(parents=True, exist_ok=True)
		with langfile.open("w", newline="\r\n") as fh:
			for lang in languages:
				fh.write(lang + "\n")
		infolog(f"Wrote the lang file to contain '{lang_str}'")


	def cleanup_temp(self):
		"""
		Removes all temporary files
		"""

		# DANGER
		if OPT.tempdir.resolve() in OPT.gamedir.resolve():
			abortlog("Temp is within the game directory.")
		if OPT.gamedir.resolve() in OPT.tempdir.resolve():
			abortlog("Temp is a parent of the game directory.")
		if OPT.tempdir.resolve() in SCRIPTDIR:
			abortlog("Temp is a parent of this script.")

		assert False
		if OPT.dry_run:
			info(f"[Delete temp dir '{OPT.tempdir}']")
			return

		shutil.rmtree(OPT.tempdir)


	def load_cached_api_file(self, fname, url, POST_data = None):
		"""
		Cached file download. For JSON (API) files only!

		fname: file name without path prefix
		url:   str or function ptr to retrieve the URL
		Returns: File handle
		"""
		fullname = tempdir(fname)
		do_download = True

		if fullname.is_file():
			# keep cached for 24 hours
			do_download = time.time() - fullname.stat().st_mtime > (24 * 3600)

		if OPT.force_use_cache:
			do_download = False

		if do_download:
			# Check whether the file is still up-to-date
			if callable(url):
				url = url()

			if POST_data != None:
				req = request.Request(url, data=POST_data)
				resp = request.urlopen(req)
				with fullname.open("wb") as fh:
					fh.write(resp.read())
			else:
				request.urlretrieve(url, fullname)
			debuglog(f"Downloaded new file '{fname}'") #, src={url}")
		else:
			debuglog(f"Loaded existing file '{fname}'")

		return fullname


	def load_or_download_json(self, fname, url):
		path = self.load_cached_api_file(fname, url)
		with path.open("rb") as fh:
			js = json.load(fh)
		ret = js["retcode"]
		assert ret == 0, (f"Failed to retrieve '{fname}': " +
			f"server returned status code {ret} ({js['message']})")
		return js["data"]


	def retrieve_API_keys(self):
		"""
		Retrieves passkeys for authentication to download URLs
		Depends on "initialize_*".
		"""

		assert isinstance(self.rel_type, str), "Missing initialize"

		base_url: str = None
		if self.rel_type == "os":
			base_url = "https://sg-hyp-api.hoy" + "overse.com/hyp/hyp-connect/api"
		else:
			base_url = "https://hyp-api.mih" + "oyo.com/hyp/hyp-connect/api"
			warnlog("CN/BB is yet not tested!")

		game_ids: str = None
		launcher_id: str = None

		assert self.game_type in ["hk4e", "nap", "hkrpg"], "Unknown game type. Must be 'hk4e' or 'nap'."

		if self.rel_type == "os":
			# Up-to-date as of 2024-06-15 (4.7.0)
			if self.game_type == "nap":
				game_ids = "U5hbdsT9W7"
			elif self.game_type == "hk4e":
				game_ids = "gopR6Cufr3"
			elif self.game_type == "hkrpg":
				game_ids = "4ziysqXOQ8"
			launcher_id = "VYTpXlbWo8"
		elif self.rel_type == "cn":
			# From DGP-Studio/Snap.Hutao (GitHub), MIT
			launcher_id = "jGHBHlcOq1"
			if self.game_type == "nap":
				game_ids = "x6znKlJ0xK"
			elif self.game_type == "hk4e":
				game_ids = "1Z8W5NHUQb"
			elif self.game_type == "hkrpg":
				game_ids = "64kMb5iAWu"
		elif self.rel_type == "bb":
			# From DGP-Studio/Snap.Hutao (GitHub), MIT
			assert self.game_type == "hk4e", "Bilibili is only available for 'hk4e' game type"
			launcher_id = "umfgRO5gh5"
			game_ids = "T2S0Gz4Dr2"
		else:
			assert False, "unhandled rel_type"

		tail = f"game_ids[]={game_ids}&launcher_id={launcher_id}"

		if not self.branches_json:
			# MANDATORY. JSON with package_id, password and tag(s)
			js = self.load_or_download_json("getGameBranches.json", f"{base_url}/getGameBranches?{tail}")

			# Array length corresponds to the amount of "game_ids" requested.
			self.branches_json = js["game_branches"][0][self.branch]
			assert self.branches_json is not None, \
				"Cannot find API keys for the selected branch. Maybe retry without pre-download?"

			ver = self.branches_json["tag"]
			infolog(f"Sophon provides game version {ver}")

		if False:  # TODO
			# JSON with game paths for voiceover packs, logs, screenshots
			self.load_cached_api_file("getGameConfigs.json", f"{base_url}/getGameConfigs?{tail}")

		if False:  # TODO
			# JSON with SDK files (BiliBili ?)
			channel = 1
			sub_channel = 0
			self.load_cached_api_file("getGameChannelSDKs.json",
			                          f"{base_url}/getGameChannelSDKs?channel={channel}&{tail}&sub_channel={sub_channel}")


	def make_getBuild_url(self, api_file):
		"""
		Compose the URL for the main JSON file for chunk-based downloads (sophon)
		api_file: 'getPatchBuild' or 'getBuild'
		Returns: URL
		"""
		if not self.branches_json:
			self.retrieve_API_keys()


		url: str = None
		if OPT.do_update:
			if self.rel_type == "os":
				url = "sg-downloader-api.ho" + "yoverse.com"
			elif self.rel_type == "cn":
				assert False, "TODO"
		else:
			if self.rel_type == "os":
				url = "sg-public-api.ho" + "yoverse.com"
			elif self.rel_type == "cn":
				url = "api-takumi.mih" + "oyo.com"

		assert not (url is None), f"Unhandled release type {self.rel_type}"

		url = (
				"https://" + url + "/downloader/sophon_chunk/api/" + api_file
				+ "?branch=" + self.branches_json["branch"]
				+ "&package_id=" + self.branches_json["package_id"]
				+ "&password=" + self.branches_json["password"]
		)

		infolog("Created " + api_file + " JSON URL")
		return url


	def get_getBuild_json(self, is_new_file: bool):
		"""
		Returns the main JSON for manifest and chunk/diff information
		is_new_file:
			True:  For new files manifest
			False: For patch files manifest
		"""
		api = "getBuild" if is_new_file else "getPatchBuild"
		path = self.load_cached_api_file(f"{api}.json", lambda : self.make_getBuild_url(api),
		                                 # POST is required for patch
		                                 None if is_new_file else []
		                                 )
		contents = None
		with path.open("rb") as fh:
			contents = json.load(fh)
		debuglog(f"Loaded {api} JSON")
		return contents


	def _select_category(self, dlinfo: DownloadInfo, cat_name):
		"""
		Retrieves the manifest to download the specified category
		Fills in the 'DownloadInfo' values
		"""

		jd = dlinfo.getBuild_json["data"]
		infolog(dlinfo.name, f"Server provides game version {jd['tag']}")

		category = None
		fuzzy_str = ""
		# Precise search
		for jdm in jd["manifests"]:
			if jdm["matching_field"] == cat_name:
				category = jdm
				break

		if not category and not cat_name == "main":
			fuzzy_str = " (fuzzy match)"
			# Fuzzy match
			for jdm in jd["manifests"]:
				if cat_name in jdm["matching_field"]:
					if category:
						abortlog(f"Ambigous category '{cat_name}'")
					category = jdm
			cat_name = category["matching_field"]

		assert not (category is None), f"Cannot find the specified field '{cat_name}'"
		debuglog(dlinfo.name, f"Found category '{cat_name}'" + fuzzy_str)
		dlinfo.category_json = category

		# Download and decompress manifest protobuf
		fname_raw = category["manifest"]["id"]
		url = category["manifest_download"]["url_prefix"] + "/" + category["manifest"]["id"]

		zstd_path = self.load_cached_api_file(fname_raw + ".zstd", url)
		with zstd_path.open('br') as zfh:
			reader = zstandard.ZstdDecompressor().stream_reader(zfh)
			pb = None
			if dlinfo == self.di_diffs:
				pb = manifest_ldiff_pb2.DiffManifest()
			elif dlinfo == self.di_chunks:
				pb = manifest_pb2.Manifest()
			else:
				assert False, "unknown instance"
			pb.ParseFromString(reader.read())
		nfiles = len(pb.files)
		debuglog(dlinfo.name, f"Decompressed manifest protobuf ({nfiles} files)")

		if EXPORT_JSON_FILES:
			# For development purposes: write the manifest as JSON to a file
			# NOTE: Underscores may be converted to uppercase letters
			json_fname = tempdir(fname_raw + ".json")
			if not json_fname.is_file():
				with json_fname.open("w+") as jfh:
					json.dump(json.loads(MessageToJson(pb)), jfh)
				infolog(dlinfo.name, "Exported protobuf to JSON file")

		dlinfo.manifest = pb


	def load_manifest(self, cat_name):
		"""
		Retrieve information about available patches/chunks for each game version
		cat_name: "game", "en-us", "zh-cn", "ja-jp", "ko-kr"
		"""

		if not self.di_chunks.getBuild_json:
			self.di_chunks.getBuild_json = self.get_getBuild_json(True)

		if OPT.do_update:
			# Error early.
			if self.installed_ver == self.di_chunks.getBuild_json["data"]["tag"]:
				abortlog("There is no update available.")


		# The rest of the fucking owl
		self._select_category(self.di_chunks, cat_name)

		if OPT.do_update:
			# Do almost the same thing again
			if not self.di_diffs.getBuild_json:
				self.di_diffs.getBuild_json = self.get_getBuild_json(False)

			self._select_category(self.di_diffs, cat_name)


	def ldiff_manifest_required(self):
		assert isinstance(self.di_diffs.manifest, manifest_ldiff_pb2.DiffManifest), \
			"ldiff manifest is missing or invalid"


	def find_chunks_by_file_name(self, file_name):
		"""
		Helper function. Searches a specific file name in the manifest
		Returns: FileInfo or None
		"""
		assert isinstance(file_name, str)
		for v in self.di_chunks.manifest.files:
			if v.filename == file_name:
				return v

		warnlog(f"Cannot find chunks for file: {file_name}")
		return None


	def get_chunk_download_size(self, filter_by_new: bool) -> int:
		"""
		Returns the sum of the chunk sizes
		"""
		download_size_total: int = 0
		for v in self.di_chunks.manifest.files:
			if filter_by_new:
				if not (v.filename in self.new_files_to_download):
					continue
			for c in v.chunks:
				download_size_total += c.compressed_size
		return download_size_total


	def _download_file_resume(self, url: str, dstfile: pathlib.Path, dstsize: int):
		filesize = try_get_file_size(dstfile)
		if filesize == dstsize:
			return
		if filesize > dstsize:
			if OPT.dry_run:
				warnlog(f"[remove corrupted file '{dstfile.name}'")
			else:
				warnlog(f"Removing corrupted file: {dstfile.name}")
				dstfile.unlink()
				filesize = 0

		errCnt = 0
		errLogs = []
		while True: # run up to 5 times
			buffer = BytesIO()
			c = pycurl.Curl()
			c.setopt(c.URL, url)
			if filesize > 0:
				c.setopt(c.RANGE, f"{filesize}-")
			c.setopt(c.WRITEDATA, buffer)

			response_code = None
			try:
				c.perform()
				response_code = c.getinfo(c.RESPONSE_CODE)
				c.close()

				if response_code == 416:
					# 416: Out of range. Our _tmp file is already complete.
					infolog(f"File '{dstfile.name}' is already downloaded.")
					return

				break
			except pycurl.error as e:
				errno, errstr = e.args
				errCnt += 1
				errLogs.append(f"Error {errno}: {errstr}")
				if errCnt >= 5:
					abortlog(f"Cannot download file '{dstfile.name}': " + ", ".join(errLogs))
				else:
					warnlog(f"Error {errno}: {errstr}. Retrying ({errCnt}/5)...")
					time.sleep(10)
				return

		with dstfile.open("ab") as fh:
			fh.write(buffer.getvalue())

	def download_game_file(self, file_info: manifest_pb2.FileInfo, install_progress_handler = None, cancel_event = None):
		"""
		Downloads the chunks and patches a file
		file_info: FileInfo, one of the manifest.files[] objects

		Returns `True` if the file is (now) present.
		"""

		if install_progress_handler:
			install_progress_handler.file_download_start(file_info.filename)

		if file_info.flags == 64:
			# Created as soon a file is put inside
			infolog(f"Skipping directory entry: {file_info.filename}")
			if install_progress_handler:
				install_progress_handler.file_download_skipped(file_info.filename, "directory")
			return False
		assert (file_info.flags == 0), f"Unknown flags {file_info.flags} for '{file_info.filename}'"

		if OPT.TESTING_FILE and not (OPT.TESTING_FILE in file_info.filename):
			return True

		filename_safety_check(file_info.filename)
		filename = pathlib.Path(file_info.filename) # "UnityGame_Data/Subdirectory/file.txt"

		# Check whether the file already exists
		if try_get_file_size(gamedir(filename)) == file_info.size:
			if install_progress_handler:
				install_progress_handler.file_download_skipped(file_info.filename, "exists")
			#infolog(f"File '{filename.name}' already exists. ")
			return True

		CHUNK_URL_PREFIX = self.di_chunks.category_json["chunk_download"]["url_prefix"]

		# Inform the user
		size_mib = bytes_to_MiB(file_info.size)
		infolog(f"Downloading '{filename.name}', {size_mib} MiB, {len(file_info.chunks)} chunks")
		if install_progress_handler:
			install_progress_handler.chunk_download_progress(filename.name, len(file_info.chunks), 0, 0.0, 0, file_info.size, 0)

		if OPT.disallow_download:
			warnlog(f"NOT downloading chunks for {filename.name}")
			return

		# Download to the temporary directory. Move after we're done.
		dstfile = tempdir(filename.name)
		bytes_written = 0

		while True: # run once
			if try_get_file_size(dstfile) == file_info.size:
				# File was already downloaded but not moved (e.g. out of space)
				break

			fh = dstfile.open("wb")
			# Download all chunks
			for chunk in file_info.chunks:
				if cancel_event and cancel_event.is_set():
					if install_progress_handler:
						install_progress_handler.file_download_error(filename.name)
					return False
				cfname = tempdir(chunk.chunk_id) # compressed file path

				if chunk.offset != bytes_written:
					warnlog("\t Unexpected offset. Seek may fail.")

				# Download chunk if not already done
				self._download_file_resume(CHUNK_URL_PREFIX + "/" + chunk.chunk_id, cfname, chunk.compressed_size)

				# Write chunk to file
				with cfname.open("rb") as zfh:
					reader = zstandard.ZstdDecompressor().stream_reader(zfh)
					data = reader.read()
					fh.seek(chunk.offset)
					fh.write(data)
					bytes_written += len(data)

				debuglog(f"\t Progress: {(bytes_written * 100 / file_info.size):2.0f} % | "
				         + f" {bytes_to_MiB(bytes_written)} / {size_mib} MiB", end="\r")
				if install_progress_handler:
					install_progress_handler.chunk_download_progress(
						filename.name, len(file_info.chunks), chunk.chunk_id, bytes_written * 100 / file_info.size, bytes_written, file_info.size, chunk.compressed_size)
			print("") # Keep the last "100 %" line

		# Verify file integrity
		md5 = hashlib.md5(dstfile.read_bytes()).hexdigest()
		if file_info.md5 == md5:
			infolog("\t File is correct (md5 check)")
		else:
			dstfile.unlink() # delete
			abortlog(f"\t File is corrupt after download: {filename.name}. Please retry.")

		# Remove chunks after downloading
		for chunk in file_info.chunks:
			tempdir(chunk.chunk_id).unlink(True)

		# Move the completed files to the game directory
		if OPT.dry_run:
			infolog(f"[move new '{filename.name}' -> game dir]")
			return True
		gamefile = gamedir(filename).resolve()
		gamefile.parent.mkdir(parents=True, exist_ok=True)
		shutil.move(dstfile, gamefile)
		if install_progress_handler:
			install_progress_handler.file_download_complete(filename.name, file_info.size)
		return True


	def update_config_ini_version(self):
		"""
		Quick file sanity check + file update after install or update
		"""
		if OPT.do_install + OPT.do_update != 1:
			abortlog("Invalid operation")

		confname = gamedir("config.ini")
		contents = confname.read_text()
		ver = re.findall(r"game_version=(\d+\.\d+\.\d+)", contents)
		if len(ver) != 1:
			warnlog("config.ini is incomplete or corrupt")
			return

		infolog("Checking game file integrity (quick) ...")
		# Do not abort in dry run
		error_fn = warnlog if OPT.dry_run else abortlog
		if OPT.do_install:
			for v in self.di_chunks.manifest.files:
				if v.flags == 64: # directory
					continue

				if try_get_file_size(gamedir(v.filename)) != v.size:
					error_fn(f"File missing or invalid size: {v.filename}")

		# Similar check after updating
		if OPT.do_update:
			self.ldiff_manifest_required()

			for v in self.di_diffs.manifest.files:
				if try_get_file_size(gamedir(v.filename)) != v.size:
					error_fn(f"File missing or invalid size: {v.filename}")

			# Check whether all old files are gone
			# Similar to "self.process_deletefiles"

			# Default to empty list in case there are no files to delete.
			deletelist: manifest_ldiff_pb2.PatchInfo = []
			for v in self.di_diffs.manifest.files_delete:
				if v.key == self.installed_ver:
					deletelist = v.info.list

			for v in deletelist:
				if gamedir(v.filename).is_file():
					error_fn(f"Old file still exists: {v.filename}")

		self.installed_ver = self.di_chunks.getBuild_json["data"]["tag"] # "MAJOR.MINOR.PATCH"
		contents = contents.replace(ver[0], self.installed_ver)
		if OPT.dry_run:
			infolog(f"[update config.ini to {self.installed_ver}]")
			return

		confname.write_text(contents)
		infolog(f"Updated config.ini to {self.installed_ver}")


	def get_ldiff_patchinfo(self, v) -> manifest_ldiff_pb2.PatchInfo:
		"""
		Helper function. Find the patch file for our installed binary

		May return `None` if the file has not been changed.
		"""
		pinfo: manifest_ldiff_pb2.PatchInfo = None
		for w in v.patches:
			if w.key == self.installed_ver:
				pinfo = w.info
				break

		return pinfo


	def _download_ldiff_file(self, ldiff_dir: pathlib.Path, v: manifest_ldiff_pb2.DiffFileInfo, progress_handler = None):
		"""
		Helper function to download one diff file.

		Returns the patch file name on success, else None.
		"""
		if progress_handler:
			progress_handler.ldiff_download_start(v.filename)

		if len(v.patches) == 0:
			# These will be downloaded by chunks.
			fn = pathlib.Path(v.filename).name
			debuglog(f"File '{fn}' has no patches. Need to download by chunks.")
			if progress_handler:
				progress_handler.ldiff_download_skipped(v.filename, "no file")
			self.new_files_to_download.add(v.filename)
			return None

		if OPT.TESTING_FILE:
			if not (OPT.TESTING_FILE in v.filename):
				return None
			else:
				print("ENTER TO DOWNLOAD: ", v.filename)
				input()

		filename_safety_check(v.filename)

		# Find the patch file for our installed binary
		pinfo = self.get_ldiff_patchinfo(v)
		if not pinfo:
			if progress_handler:
				progress_handler.ldiff_download_skipped(v.filename, "not modified")
			return None # The file was not modified in the new version

		# Check whether the file is ready for patching
		while True: # run once
			gamefile = gamedir(v.filename)
			gamefilesize = try_get_file_size(gamefile)
			md5 = None

			if gamefilesize == pinfo.original_size:
				# Ready for patching (do we want to compute the md5 hash here?)
				break

			if gamefilesize == v.size:
				# Maybe already up-to-date?
				md5 = hashlib.md5(gamefile.read_bytes()).hexdigest()
				if md5 == v.hash:
					if progress_handler:
						progress_handler.ldiff_download_skipped(v.filename, "already updated")
					debuglog(f"File '{gamefile.name}' is already up-to-date. Skipping.")
					return None

			if gamefilesize == -1:
				# For some reason, patch files may be given for new files (?)
				# How did they generate the patch?
				if progress_handler:
					progress_handler.ldiff_download_skipped(v.filename, "file missing")
				infolog(f"Cannot find file '{gamefile.name}'. Adding to chunk download queue.")
				self.new_files_to_download.add(v.filename)
				return None

			md5 = md5 if md5 else hashlib.md5(gamefile.read_bytes()).hexdigest()
			if progress_handler:
				progress_handler.ldiff_download_skipped(v.filename, "file corrupt")
			warnlog(f"md5 hash mismatch in '{gamefile.name}'. is={md5}, should={pinfo.original_hash} or {v.hash}")
			self.new_files_to_download.add(v.filename)
			# TODO. shall the file be removed?
			return None

		ldiffname = ldiff_dir.joinpath(pinfo.patch_id)

		if try_get_file_size(ldiffname) == pinfo.patch_size:
			# Already downloaded. Skip.
			# TODO: do a proper hash check
			if progress_handler:
				progress_handler.ldiff_download_skipped(v.filename, "already present")
			debuglog(f"Diff '{ldiffname.name}' is already present. Skipping download.")
			return ldiffname.name

		tmp_file = pathlib.Path(f"{ldiffname}_tmp")

		size_mib = bytes_to_MiB(pinfo.patch_size)
		infolog(f"Downloading diff for '{v.filename}', {size_mib} MiB\n"
		        f"\t -> {pinfo.patch_id}"
		        )

		if OPT.disallow_download:
			warnlog(f"NOT downloading diff for {ldiffname.name}")
			return None

		DIFF_URL_PREFIX = self.di_diffs.category_json["diff_download"]["url_prefix"]
		self._download_file_resume(DIFF_URL_PREFIX + "/" + pinfo.patch_id, tmp_file, pinfo.patch_size)
		debuglog("Download done")

		# Verify patch file size (TODO: what's the purpose of the file name?)
		assert tmp_file.stat().st_size == pinfo.patch_size, "Corrupted patch download"

		# Move to original ldiff file name (without _tmp)
		# This does not need special dry-run handling (game files are not affected)
		shutil.move(tmp_file, ldiffname)
		if progress_handler:
			progress_handler.ldiff_download_complete(v.filename, pinfo.patch_size)
		return ldiffname.name


	def _apply_ldiff_file(self, ldiff_dir: pathlib.Path, v: manifest_ldiff_pb2.DiffFileInfo, progress_handler = None):
		"""
		Helper function to apply one diff file.
		"""

		assert (not OPT.predownload or OPT.TESTING_FILE), "Not allowed for pre-downloads."
		assert not (v.filename in self.new_files_to_download), "invalid script usage"

		if OPT.TESTING_FILE and not (OPT.TESTING_FILE in v.filename):
			return

		filename_safety_check(v.filename)

		# Find the patch file for our installed binary
		pinfo = self.get_ldiff_patchinfo(v)
		if not pinfo:
			return

		gamefile = gamedir(v.filename)

		# Patched file goes into the temporary directory (at first)
		dstfile = tempdir(pathlib.Path(v.filename).name)
		dstfile.unlink(True)  # remove any existing duplicate temporary file

		ldiffname = ldiff_dir.joinpath(pinfo.patch_id)

		if not ldiffname.is_file():
			if OPT.disallow_download:
				return
			if progress_handler:
				progress_handler.ldiff_patch_error(v.filename, "diff file missing")
			abortlog(f"Diff file {ldiffname.name} is missing. Please redownload.")

		# Apply the patch file
		done = hpatchz_patch_file(gamefile, dstfile, ldiffname, pinfo.patch_offset, pinfo.patch_length)
		if not done:
			# retry with longer timeout
			done = hpatchz_patch_file(gamefile, dstfile, ldiffname, pinfo.patch_offset, pinfo.patch_length, 300)

		# Verify patched file integrity (NOTE: hpatchz might already have checked it)
		assert dstfile.stat().st_size == v.size
		md5 = hashlib.md5(dstfile.read_bytes()).hexdigest()
		if md5 != v.hash:
			if progress_handler:
				progress_handler.ldiff_patch_error(v.filename, "checksum failed")
			warnlog(f"Checksum failed on file {v.filename}. Corrupt?")
			# Retry by downloading from scratch
			self.new_files_to_download.add(v.filename)
		else:
			infolog(f"Patched file {v.filename}")

		# Replace the game install file
		if OPT.dry_run:
			infolog(f"[move patched '{dstfile.name}' -> game dir]")
			return

		shutil.move(dstfile, gamefile)


	def apply_or_prepare_ldiff_files(self, progress_handler = None):
		"""
		Downloads the ldiff files and patches the destination file if not predownload.
		Requires self.load_manifest(CATEGORY)
		"""
		self.ldiff_manifest_required()

		assert len(self.new_files_to_download) == 0, "List must be empty!"

		ldiff_dir = gamedir("ldiff")
		ldiff_dir.mkdir(exist_ok=True)

		# Sum up the entire download size
		download_sizes_checked = set() # values: patchname
		download_size_total = 0
		for v in self.di_diffs.manifest.files:
			pinfo = self.get_ldiff_patchinfo(v)
			if not pinfo:
				continue
			if pinfo.patch_id in download_sizes_checked:
				continue

			download_sizes_checked.add(pinfo.patch_id)
			download_size_total += pinfo.patch_size
		infolog(f"Downloading ldiff files (up to {bytes_to_MiB(download_size_total)} MiB) ...")
		if progress_handler:
			progress_handler.ldiff_download_summary(
				total_files=len(self.di_diffs.manifest.files),
				total_size=download_size_total,
			)
		del download_sizes_checked
		del download_size_total

		# Not accurate when there are too many new files (chunks)
		files_total = len(self.di_diffs.manifest.files)
		files_done = 0

		what_txt = " and patched" if OPT.predownload else ""

		checked = set()
		# Loop through the file list and download what's missing
		for v in self.di_diffs.manifest.files:
			# TODO: Download one file an apply the patches to all files that make use of it
			# Motivation: less space consumption by temporary files

			downloaded = self._download_ldiff_file(ldiff_dir, v, progress_handler=progress_handler)
			if downloaded:
				self.ldiff_files_to_remove.add(downloaded)
				if not OPT.predownload:
					# Normal case: update the file
					if progress_handler:
						progress_handler.ldiff_patch_start(v.filename)
					self._apply_ldiff_file(ldiff_dir, v, progress_handler=progress_handler)
					if progress_handler:
						progress_handler.ldiff_patch_complete(v.filename)
				elif OPT.TESTING_FILE and (OPT.TESTING_FILE in v.filename):
					# Allow patching individual files beforehand
					warnlog(f"ENTER TO APPLY PATCH (will create backup file): ", OPT.TESTING_FILE)
					input()
					gamefile = gamedir(v.filename)
					shutil.copy2(gamefile, f"{gamefile}.bak")
					self._apply_ldiff_file(ldiff_dir, v)

			files_done += 1
			relname = pathlib.Path(v.filename).name
			infolog(f"Progress: {files_done} / {files_total} files | Downloaded: {relname}", end="\r")
			if files_done % 100 == 0:
				print("")
		infolog("\nFiles downloaded" + what_txt + ".") # keep the last "100 %" line

	# Note: the downloaded ldiff files are removed by `self.remove_ldiff_files`


	def process_deletefiles(self, progress_handler = None):
		"""
		[Update only] Remove old files
		"""
		self.ldiff_manifest_required()
		assert not OPT.predownload, "Not allowed for pre-downloads."

		# Default to empty list in case there are no files to delete.
		deletelist: manifest_ldiff_pb2.PatchInfo = []
		for v in self.di_diffs.manifest.files_delete:
			if v.key == self.installed_ver:
				deletelist = v.info.list

		infolog(f"Deleting {len(deletelist)} old files ...")
		if progress_handler:
			progress_handler.delete_file_summary(
				total_files=len(deletelist)
			)

		for v in deletelist:
			filename_safety_check(v.filename)
			gamefile = gamedir(v.filename)

			if not gamefile.is_file():
				continue

			# Remove the file
			if OPT.dry_run:
				infolog(f"[delete old file {v.filename}]")
				continue

			infolog(f"Deleted old file: {v.filename}")
			if progress_handler:
				progress_handler.delete_file(v.filename)
			gamefile.unlink() # remove


	def diff_download_new_files(self, progress_handler = None, cancel_event = None):
		"""
		[Update/repair only] Downloads files that were added in the new version.
		"""

		if OPT.predownload:
			infolog("New files download is DISABLED for predownloads!")
			self.new_files_to_download.clear()
			return

		download_size_total = self.get_chunk_download_size(True)
		infolog(f"New files to download: {len(self.new_files_to_download)} files\n")
		infolog(f"Downloading newly added files (up to {bytes_to_MiB(download_size_total)} MiB) ...")
		if progress_handler:
			progress_handler.download_summary(
				game_version = self.di_chunks.getBuild_json["data"]["tag"],
				download_size = download_size_total,
				download_file_count = len(self.new_files_to_download),
				download_categories = [ "game" ]
			)
		del download_size_total

		# Not accurate when there are too many new files (chunks)
		files_total = len(self.new_files_to_download)
		files_done = 0

		def download_file(v):
			err_cnt = 0
			err_logs = []
			while err_cnt < 5:
				try:
					if cancel_event and cancel_event.is_set():
						progress_handler.job_error("cancelled")
						raise Exception("Installation cancelled")
					self.download_game_file(v, install_progress_handler=progress_handler, cancel_event=cancel_event)
					break
				except Exception as e:
					err_cnt += 1
					err_logs.append(str(e))
			if err_cnt == 5:
				raise Exception(f"Download file {v.name} failed after 3 attempts: {err_logs}")["pkg_version", ""]

		with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
			repair_files = [v for v in self.di_chunks.manifest.files if v.filename in self.new_files_to_download]
			futures = [executor.submit(download_file, v) for v in repair_files]
			for future in concurrent.futures.as_completed(futures):
				future.result()

		infolog("Download complete.")
		self.new_files_to_download.clear()


	def remove_ldiff_files(self, progress_handler = None):
		"""
		[Update only] Removes all downloaded ldiff files
		"""
		self.ldiff_manifest_required()
		assert not OPT.predownload, "Not allowed for pre-downloads."

		ldiff_dir = gamedir("ldiff")
		if not ldiff_dir.is_dir():
			warnlog(f"Directory {ldiff_dir} not found. Cannot cleanup.")
			return

		count = 0
		# TODO: This does not remove all files downloaded by the official launcher
		# because it also downloads new files. How can those be applied?
		if progress_handler:
			progress_handler.delete_file_summary(
				total_files=len(self.ldiff_files_to_remove),
				ldiff=True
			)
		for v in self.ldiff_files_to_remove:
			filename : pathlib.Path = ldiff_dir.joinpath(v)
			if not filename.is_file():
				if progress_handler:
					progress_handler.delete_file(filename.name, ldiff=True)
				continue

			count += 1
			if OPT.dry_run:
				infolog(f"[remove now unused ldiff '{v}']")
				continue

			filename.unlink() # delete
			if progress_handler:
				progress_handler.delete_file(filename.name, ldiff=True)
		infolog(f"Cleaned up {count} now unused ldiff files.")


	def repair_by_category(self, cat_name: str, repair_progress_handler = None, cancel_event = None):
		"""
		Use sophon chunks to restore missing or incorrect files
		`load_manifest` must be used to select the correct category to repair
		"""
		assert not OPT.predownload, "Not allowed for pre-downloads."

		# Here we can either use the manifest or pkg_version

		self.load_manifest(cat_name)

		if self.installed_ver != self.di_chunks.getBuild_json["data"]["tag"]:
			abortlog(f"The installed version is outdated. {self.installed_ver} / {self.di_chunks.getBuild_json['data']['tag']} Run an update first.")

		self.new_files_to_download.clear()

		reliable_checking = (OPT.repair_mode == "reliable")
		infolog(f"Repair started. Mode: {reliable_checking}")

		files_checked = 0
		files_total = len(self.di_chunks.manifest.files)

		if repair_progress_handler:
			repair_progress_handler.repair_summary(
				repair_mode=OPT.repair_mode,
				total_files=files_total
			)
		import threading
		lock = threading.Lock()
		def _verify_file(v):
			if cancel_event and cancel_event.is_set():
				if repair_progress_handler:
					repair_progress_handler.job_error("cancelled")
				raise Exception("Repair cancelled")

			reason = None
			gamefile = gamedir(v.filename)
			gamefilesize = try_get_file_size(gamefile)
			if gamefilesize != v.size:
				reason = f"size mismatch. is={gamefilesize}, should={v.size}"
			elif reliable_checking:
				md5 = hashlib.md5(gamefile.read_bytes()).hexdigest()
				if md5 != v.md5:
					reason = f"md5 mismatch. is={md5}, should={v.md5}"

			if repair_progress_handler:
				repair_progress_handler.check_file(
					filename=v.filename,
					requires_repair= (reason is not None),
					reason=reason,
				)

			if not reason:
				return # file is OK

			print("")
			infolog(f"Need to repair file '{v.filename}': " + reason)
			with lock:
				self.new_files_to_download.add(v.filename)

		with concurrent.futures.ThreadPoolExecutor(max_workers=psutil.cpu_count(logical=False) - 4) as executor:
			futures = [
				executor.submit(_verify_file, v) for v in self.di_chunks.manifest.files
			]
			for future in concurrent.futures.as_completed(futures):
				future.result()

		print("") # Keep the last "100 %" line
		self.diff_download_new_files(progress_handler=repair_progress_handler, cancel_event=cancel_event)
