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
        """Connect a client and start the global worker if needed"""
        with self._lock:
            self.active_connections[client_id] = websocket
            self._start_worker_if_needed()

    def disconnect(self, client_id: str):
        """Disconnect a client"""
        with self._lock:
            if client_id in self.active_connections:
                print(f"Disconnecting client {client_id}")
                del self.active_connections[client_id]

    def _start_worker_if_needed(self):
        """Start the global worker thread if not already running"""
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
        asyncio.run_coroutine_threadsafe(
            asyncio.sleep(0),
            self._event_loop
        )

    def _message_worker(self):
        """Single global worker that processes all messages"""
        print("Message worker running...")
        while not self._stop_event.is_set():
            try:
                message, client_id = self._queue.get()

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
                # No messages, continue loop
                continue
            except Exception as e:
                print(f"Worker error: {e}")
                time.sleep(1)

    def send_message_threadsafe(self, message: dict, client_id: str):
        """Thread-safe method to queue a message for sending"""
        try:
            self._queue.put_nowait((message, client_id))
        except queue.Full:
            print(f"Message queue full for client {client_id}")

    def get_connected_clients(self):
        """Get list of connected client IDs"""
        with self._lock:
            return list(self.active_connections.keys())

    def stop_worker(self):
        """Stop the global worker (for cleanup)"""
        self._stop_event.set()
        if self._worker_thread and self._worker_thread.is_alive():
            self._worker_thread.join(timeout=5.0)

def run_task_in_thread(manager: ConnectionManager, tasks: Dict[str, TaskStatus], task_id: str, operation_func, *args):
    """Run a task in a separate thread"""
    def task_runner():
        try:
            tasks[task_id].status = "running"
            result = operation_func(*args)

            # Send completion message
            manager.send_message_threadsafe({
                "type": "completed",
                "task_id": task_id,
                "result": result
            }, task_id)

            tasks[task_id].status = "completed"

        except Exception as e:
            # Send error message
            manager.send_message_threadsafe({
                "type": "error",
                "task_id": task_id,
                "error": str(e)
            }, task_id)

            tasks[task_id].status = "failed"
            tasks[task_id].error = str(e)

    thread = threading.Thread(target=task_runner)
    thread.start()
