import threading, os, pathlib, concurrent.futures, re, shutil
from typing import Dict, Optional, Literal

from progress_handlers import InstallProgressHandler, RepairProgressHandler, UpdateProgressHandler
from models import InstallRequest, RepairRequest, UpdateRequest, TaskStatus, OnlineGameInfo
from utils import ConnectionManager
from sophon_api import Options, SophonClient


def update_config_ini_version(gamedir: pathlib.Path, version: str):
    confname = gamedir / "config.ini"
    contents = confname.read_text()
    ver = re.findall(r"game_version=(\d+\.\d+\.\d+)", contents)
    if len(ver) != 1:
        raise ValueError(f"Invalid config.ini format: {confname} does not contain a valid game_version")

    contents = contents.replace(ver[0], version)
    confname.write_text(contents)

def perform_install(manager: ConnectionManager, tasks: Dict[str, TaskStatus], task_id: str, request: InstallRequest, cancel_event: Optional[threading.Event] = None):
    progress = InstallProgressHandler(task_id, manager, tasks)
    progress.job_start()

    options = Options()
    options.gamedir = pathlib.Path(request.gamedir)
    options.do_install = True
    options.install_reltype = request.install_reltype
    options.game_type = request.game_type
    if request.tempdir:
        options.tempdir = pathlib.Path(request.tempdir)
    else:
        options.tempdir = pathlib.Path(request.gamedir) / ".tmp"

    os.makedirs(options.gamedir, exist_ok=True)

    cli = SophonClient()
    cli.initialize(options)
    cli.retrieve_API_keys()

    cli.load_manifest("game")
    update_config_ini_version(options.gamedir, cli.di_chunks.getBuild_json["data"]["tag"])

    download_size_total = cli.get_chunk_download_size(False)
    progress.download_summary(
        game_version=cli.installed_ver,
        download_size=download_size_total,
        download_file_count=len(cli.di_chunks.manifest.files),
        download_categories=["game"]
    )

    def download_file(v):
        err_cnt = 0
        err_logs = []
        while err_cnt < 5:
            try:
                if cancel_event and cancel_event.is_set():
                    progress.job_error("cancelled")
                    raise Exception("Installation cancelled")
                cli.download_game_file(v, install_progress_handler=progress, cancel_event=cancel_event)
                break
            except Exception as e:
                err_cnt += 1
                err_logs.append(str(e))
        if err_cnt == 5:
            raise Exception(f"Download file {v.name} failed after 3 attempts: {err_logs}")

    positive_substr = ['globalgamemanagers', 'pkg_version']
    negative_substr = ['/']
    def key_func(x):
        priority = 0

        for string in positive_substr:
            if string in x.filename:
                priority -= 1

        for string in negative_substr:
            if string in x.filename:
                priority += 1

        return priority

    worker_cnt = 16
    with concurrent.futures.ThreadPoolExecutor(max_workers=worker_cnt) as executor:
        futures = [
            executor.submit(download_file, v) for v in
            sorted(
                cli.di_chunks.manifest.files,
                key = key_func
            )
        ]
        for future in concurrent.futures.as_completed(futures):
            future.result()

    cli.load_manifest("game")
    cli.update_config_ini_version()

    del cli
    del options
    progress.job_end()

def perform_repair(manager: ConnectionManager, tasks: Dict[str, TaskStatus], task_id: str, request: RepairRequest, cancel_event: Optional[threading.Event] = None):
    progress = RepairProgressHandler(task_id, manager, tasks)
    progress.job_start()

    options = Options()
    options.gamedir = pathlib.Path(request.gamedir)
    options.game_type = request.game_type
    options.repair_mode = request.repair_mode
    if request.tempdir:
        options.tempdir = pathlib.Path(request.tempdir)
    else:
        options.tempdir = pathlib.Path(request.gamedir) / ".tmp"

    cli = SophonClient()
    cli.initialize(options)
    cli.retrieve_API_keys()

    cli.repair_by_category("game", repair_progress_handler=progress, cancel_event=cancel_event)

    del cli
    del options
    progress.job_end()

def perform_update(manager: ConnectionManager, tasks: Dict[str, TaskStatus], task_id: str, request: UpdateRequest, cancel_event: Optional[threading.Event] = None):
    progress = UpdateProgressHandler(task_id, manager, tasks)
    progress.job_start()

    options = Options()
    options.gamedir = pathlib.Path(request.gamedir)
    options.do_update = True
    options.game_type = request.game_type
    options.predownload = request.predownload
    if request.tempdir:
        options.tempdir = pathlib.Path(request.tempdir)
    else:
        options.tempdir = pathlib.Path(request.gamedir) / ".tmp"

    cli = SophonClient()
    cli.initialize(options)
    cli.retrieve_API_keys()
    cli.load_manifest("game")

    if not options.predownload:
        cli.process_deletefiles(progress_handler=progress)

    cli.apply_or_prepare_ldiff_files(progress_handler=progress)
    cli.diff_download_new_files(progress_handler=progress)

    if not options.predownload:
        cli.load_manifest("game")
        cli.update_config_ini_version()
        cli.remove_ldiff_files(progress_handler=progress)

    del cli
    del options
    progress.job_end()

def fetch_online_game_info(reltype: str, game: Literal["nap", "hk4e"]) -> OnlineGameInfo:
    try:
        if game in ["hk4e", "nap"]:
            options = Options()
            options.game_type = game
            options.install_reltype = reltype
            options.ignore_conditions = True
            options.gamedir = pathlib.Path("./sidecar/sophon_server/gametemp")  # TODO: Change to proper dir
            options.tempdir = options.gamedir

            if not options.gamedir.exists():
                options.gamedir.mkdir(parents=True, exist_ok=True)

            cli = SophonClient()
            cli.initialize(options)
            cli.retrieve_API_keys()
            cli.load_manifest("game")

            online_info = {
                "version": cli.branches_json["tag"],
                "install_size": int(cli.get_chunk_download_size(False)),
                "updatable_versions": cli.branches_json["diff_tags"],
                "release_type": reltype,
            }

            del cli

            shutil.rmtree(options.gamedir, ignore_errors=True)
            options.predownload = True

            cli = SophonClient()
            cli.initialize(options)

            try:
                cli.retrieve_API_keys()
                online_info['pre_download'] = True
                online_info['pre_download_version'] = cli.branches_json["tag"]
            except AssertionError:
                online_info['pre_download'] = False
                online_info["pre_download_version"] = "0.0.0"

            shutil.rmtree(options.gamedir, ignore_errors=True)
            del cli
            del options

            return OnlineGameInfo(
                game_type=game,
                version=online_info["version"],
                install_size=online_info["install_size"],
                updatable_versions=online_info["updatable_versions"],
                release_type=online_info["release_type"],
                pre_download=online_info["pre_download"],
                pre_download_version=online_info["pre_download_version"],
                error=None
            )
        else:
            raise ValueError("Unsupported game type. Only 'hk4e' and 'nap' is supported.")
    except Exception as e:
        return OnlineGameInfo(
            game_type="",
            version="",
            install_size=0,
            updatable_versions=[],
            release_type=reltype,
            pre_download=False,
            error=str(e)
        )
