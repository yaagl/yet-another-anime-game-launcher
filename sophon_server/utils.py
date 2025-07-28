import threading, queue, asyncio, json, time
from typing import Dict, Any
from fastapi import WebSocket
from models import TaskStatus

class ConnectionManager:
    def __init__(self, event_loop: asyncio.AbstractEventLoop):
        self.active_connections: Dict[str, Any] = {}  # client_id -> websocket
        self._queue = queue.Queue()
        self._worker_thread = None
        self._stop_event = threading.Event()
        self._lock = threading.Lock()
        self._started = False
        self._event_loop = event_loop

    def connect(self, client_id: str, websocket):
        with self._lock:
            self.active_connections[client_id] = websocket
            self._start_worker_if_needed()

    def disconnect(self, client_id: str):
        with self._lock:
            if client_id in self.active_connections:
                print(f"Disconnecting client {client_id}")
                del self.active_connections[client_id]

    def _start_worker_if_needed(self):
        if not self._started:
            self._started = True
            self._stop_event.clear()
            self._worker_thread = threading.Thread(target=self._message_worker, daemon=True)
            self._worker_thread.start()
            print("Global message worker started")

    def _send_message(self, message: Dict[str, Any], websocket: WebSocket):
        asyncio.run_coroutine_threadsafe(
            websocket.send_text(json.dumps(message)),
            self._event_loop
        )
        # Due to the way websockets library is designed
        # we need a asyncio.sleep() after sending a message
        # for the message to be sent properly
        asyncio.run_coroutine_threadsafe(
            asyncio.sleep(0),
            self._event_loop
        )

    def _message_worker(self):
        print("Message worker running...")
        while not self._stop_event.is_set():
            try:
                message, client_id = self._queue.get(block=True, timeout=None)

                with self._lock:
                    websocket: WebSocket = self.active_connections.get(client_id)
                    if websocket:
                        try:
                            self._send_message(message, websocket)
                        except Exception as e:
                            print(f"Error sending message to {client_id}: {e}")
                            self.disconnect(client_id)
                    else:
                        print(f"Client {client_id} not found, message discarded")

            except queue.Empty:
                continue
            except Exception as e:
                print(f"Worker error: {e}")
                time.sleep(1)

    def send_message_threadsafe(self, message: dict, client_id: str):
        try:
            self._queue.put_nowait((message, client_id))
        except queue.Full:
            print(f"Message queue full for client {client_id}")

    def stop_worker(self):
        self._stop_event.set()
        if self._worker_thread and self._worker_thread.is_alive():
            self._worker_thread.join(timeout=5.0)

def run_task_in_thread(manager: ConnectionManager, tasks: Dict[str, TaskStatus], task_id: str, operation_func, *args):
    def task_runner():
        try:
            tasks[task_id].status = "running"
            result = operation_func(*args)

            manager.send_message_threadsafe({
                "type": "completed",
                "task_id": task_id,
                "result": result
            }, task_id)

            tasks[task_id].status = "completed"

        except Exception as e:
            manager.send_message_threadsafe({
                "type": "error",
                "task_id": task_id,
                "error": str(e)
            }, task_id)

            tasks[task_id].status = "failed"
            tasks[task_id].error = str(e)

    thread = threading.Thread(target=task_runner, daemon=True)
    thread.start()
