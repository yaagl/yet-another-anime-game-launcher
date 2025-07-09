import uuid, shutil, threading
from datetime import datetime
from asyncio import AbstractEventLoop
from typing import Literal, Union

from fastapi import FastAPI, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from utils import *
from models import *
from tasks import *

app = FastAPI(title="Sophon Game Updater", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

main_event_loop: AbstractEventLoop = None
manager: ConnectionManager = None
tasks: Dict[str, TaskStatus] = {}
task_cancel_events: Dict[str, threading.Event] = {}


def terminate_with_process(pid: int):
    print(f"Monitoring process {pid} for termination...")
    def _worker(pid: str):
        import os, time, psutil, signal
        while True:
            if not psutil.pid_exists(pid):
                os.kill(os.getpid(), signal.SIGKILL)
            time.sleep(1)
    threading.Thread(target=_worker, args=(pid,), daemon=True).start()


def run_task(task_type: Literal["install", "repair", "update"], request: Union[InstallRequest, RepairRequest, UpdateRequest]):
    task_id = str(uuid.uuid4())

    tasks[task_id] = TaskStatus(
        task_id=task_id,
        status="pending",
    )
    task_cancel_events[task_id] = threading.Event()

    if task_type == "install":
        run_task_in_thread(manager, tasks, task_id, perform_install, manager, tasks, task_id, request, task_cancel_events[task_id])
    elif task_type == "repair":
        run_task_in_thread(manager, tasks, task_id, perform_repair, manager, tasks, task_id, request, task_cancel_events[task_id])
    elif task_type == "update":
        run_task_in_thread(manager, tasks, task_id, perform_update, manager, tasks, task_id, request, task_cancel_events[task_id])

    return TaskResponse(
        task_id=task_id,
        status="pending",
        message="Installation started"
    )


@app.post("/api/install")
async def install_game(request: InstallRequest):
    return run_task("install", request)

@app.post("/api/repair")
async def repair_game(request: RepairRequest):
    return run_task("repair", request)

@app.post("/api/update")
async def repair_game(request: UpdateRequest):
    return run_task("update", request)

@app.get("/api/tasks/{task_id}/status")
async def get_task_status(task_id: str):
    if task_id not in tasks:
        return {"error": "Task not found"}
    return tasks[task_id]


@app.delete("/api/tasks/{task_id}")
async def cancel_task(task_id: str):
    if task_id in tasks:
        task_cancel_events[task_id].set()
    return {"message": f"Task {task_id} cancelled"}


@app.get("/api/game/installed_info")
async def get_game_info(gamedir: str):
    try:
        options = Options()
        options.gamedir = pathlib.Path(gamedir)

        if not options.gamedir.exists():
            return {"installed": False}

        cli = SophonClient()
        cli.initialize(options)

        info = {
            "installed": True,
            "gamedir": str(options.gamedir),
            "version": getattr(cli, 'installed_ver', None),
            "release_type": getattr(cli, 'rel_type', None),
        }
        return info
    except Exception as e:
        return {"error": str(e), "installed": False}


@app.get("/api/game/online_info")
async def get_online_game_info(reltype: str, game: str):
    try:
        if game.lower() == "hk4e":
            options = Options()
            options.install_reltype = reltype
            options.ignore_conditions = True
            options.gamedir = pathlib.Path("./sidecar/sophon_server/gametemp") # TODO: Change to proper dir
            options.tempdir = options.gamedir

            cli = SophonClient()
            cli.initialize(options)
            cli.retrieve_API_keys()

            online_info = {
                "version": cli.branches_json["tag"],
                "updatable_versions": cli.branches_json["diff_tags"],
                "release_type": reltype,
            }
            # remove all files in gamedir
            shutil.rmtree(options.gamedir, ignore_errors=True)
            return online_info
        else:
            raise ValueError("Unsupported game type. Only 'hk4e' is supported.")
    except Exception as e:
        return {"error": str(e)}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }

@app.websocket("/ws/{task_id}")
async def websocket_endpoint(websocket: WebSocket, task_id: str):
    await websocket.accept()
    manager.connect(task_id, websocket)

    try:
        while True:
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
            except asyncio.TimeoutError:
                continue
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(task_id)


@app.on_event("startup")
def startup_event():
    global main_event_loop
    global tasks
    global manager
    global task_cancel_events
    main_event_loop = asyncio.get_event_loop()
    manager = ConnectionManager(main_event_loop)
    if os.environ.get("TERMINATE_WITH_PID"):
        pid = int(os.environ["TERMINATE_WITH_PID"])
        terminate_with_process(pid)
