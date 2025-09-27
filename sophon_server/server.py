import uuid, shutil, threading, ssl
from datetime import datetime
from asyncio import AbstractEventLoop
from typing import Literal, Union

from fastapi import FastAPI, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from utils import *
from models import *
from tasks import *

# Disable SSL verification
ssl._create_default_https_context = ssl._create_unverified_context

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
    def _worker(target_pid: int):
        import os, time, psutil, signal
        while True:
            if not psutil.pid_exists(target_pid):
                # daemon threads somehow doesn't die with SIGTERM
                # TODO: Terminate gracefully: event based termination
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
    else:
        return TaskResponse(
            task_id=task_id,
            status="failed",
            message="Invalid task type"
        )
    return TaskResponse(
        task_id=task_id,
        status="pending",
        message="Task started"
    )

@app.post("/api/{task_type}")
async def handle_game_operation(task_type: Literal["install", "repair", "update"], request: Union[InstallRequest, RepairRequest, UpdateRequest]) -> TaskResponse:
    return run_task(task_type, request)

@app.get("/api/tasks/{task_id}/status")
async def get_task_status(task_id: str) -> TaskStatus:
    if task_id not in tasks:
        return TaskStatus(
            task_id = task_id,
            status = "",
            error = "Task not found"
        )
    return tasks[task_id]


@app.delete("/api/tasks/{task_id}")
async def cancel_task(task_id: str):
    if task_id in tasks:
        task_cancel_events[task_id].set()
    return {"message": f"Task {task_id} cancelled"}

@app.get("/api/game/online_info")
async def get_online_game_info(reltype: str, game: Literal["nap", "hk4e"]) -> OnlineGameInfo:
    return fetch_online_game_info(reltype, game)

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

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("SOPHON_PORT", 8000))
    host = os.environ.get("SOPHON_HOST", "127.0.0.1")
    uvicorn.run(app, host=host, port=port)
