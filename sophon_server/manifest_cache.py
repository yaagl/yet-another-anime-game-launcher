import hashlib

import zstandard
from google.protobuf.message import DecodeError


class ManifestDecodeError(IOError):
	pass


def decode_manifest(path, compression, expected_size, manifest_type,
	                expected_md5=None):
	with path.open("rb") as manifest_file:
		if compression == 0:
			manifest_bytes = manifest_file.read()
		elif compression == 1:
			with zstandard.ZstdDecompressor().stream_reader(manifest_file) as reader:
				manifest_bytes = reader.read()
		else:
			raise ValueError(f"Unsupported manifest compression type: {compression}")

	if len(manifest_bytes) != expected_size:
		raise ManifestDecodeError(
			"Decompressed manifest size mismatch: "
			f"expected {expected_size}, got {len(manifest_bytes)}"
		)

	if expected_md5 is not None:
		actual_md5 = hashlib.md5(manifest_bytes).hexdigest()
		if actual_md5.lower() != expected_md5.lower():
			raise ManifestDecodeError(
				"Decompressed manifest checksum mismatch: "
				f"expected {expected_md5}, got {actual_md5}"
			)

	manifest = manifest_type()
	manifest.ParseFromString(manifest_bytes)
	return manifest


def load_manifest_with_retry(load_path, cached_path, compression, expected_size,
	                         manifest_type, force_use_cache, warn,
	                         expected_md5=None):
	for attempt in range(2):
		try:
			manifest_path = load_path()
		except IOError:
			if attempt == 1 or force_use_cache:
				raise
			warn("Manifest download failed; retrying.")
			continue

		try:
			return decode_manifest(
				manifest_path, compression, expected_size, manifest_type,
				expected_md5,
			)
		except (ManifestDecodeError, zstandard.ZstdError, DecodeError):
			if force_use_cache:
				raise

			cached_path.unlink(missing_ok=True)
			if attempt == 1:
				raise
			warn("Manifest cache is invalid; downloading it again.")

	raise AssertionError("Manifest retry loop exited unexpectedly")
