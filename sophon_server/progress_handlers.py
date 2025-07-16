import time, threading
from utils import ConnectionManager
from models import TaskStatus
from typing import Dict, List, Optional

class InstallProgressHandler:
    def __init__(self, task_id: str, conn_manager: ConnectionManager, tasks: Dict[str, TaskStatus]):
        self.tasks = tasks
        self.conn_manager = conn_manager
        self.task_id = task_id
        self.download_size = 0
        self.downloaded_size = 0
        self.download_speed = 0
        self._speed_thread = None
        self.interval_cnt = 0

    def _speed_calculator_worker(self):
        # Wait for task to start running
        while self.task_id not in self.tasks or self.tasks[self.task_id].status != "running":
            time.sleep(1)

        # Calculate speed while running
        while self.task_id in self.tasks and self.tasks[self.task_id].status == "running":
            print("Calculating download speed...")
            prev_dl_size = self.downloaded_size
            time.sleep(10)
            current_dl_size = self.downloaded_size
            self.download_speed = (current_dl_size - prev_dl_size) / 10  # bytes per second
            print(f"Download speed: {self.download_speed} bytes in 10 seconds")

    def _calculate_speed(self):
        if not self._speed_thread or not self._speed_thread.is_alive():
            self._speed_thread = threading.Thread(target=self._speed_calculator_worker, daemon=True)
            self._speed_thread.start()


    def job_start(self):
        self.conn_manager.send_message_threadsafe({
            "type": "job_start",
            "task_id": self.task_id
        }, self.task_id)

    def job_end(self):
        self.conn_manager.send_message_threadsafe({
            "type": "job_end",
            "task_id": self.task_id
        }, self.task_id)

    def job_error(self, error: str):
        self.conn_manager.send_message_threadsafe({
            "type": "job_error",
            "task_id": self.task_id,
            "error": error
        }, self.task_id)

    def download_summary(self, game_version: str, download_size: int, download_file_count: int, download_categories: List[str]):
        self.download_speed = 0
        self.interval_cnt = 0
        self.downloaded_size = 0
        self.conn_manager.send_message_threadsafe({
            "type": "download_summary",
            "task_id": self.task_id,
            "game_version": game_version,
            "download_size": download_size,
            "download_file_count": download_file_count,
            "download_categories": download_categories
        }, self.task_id)
        self.download_size = download_size
        self._calculate_speed()

    def chunk_download_progress(self, filename:str, total_chunks: int, current_chunk: int, progress_percent: float, current_byte: int, total_bytes: int, chunk_size: int):
        self.downloaded_size += chunk_size
        self.interval_cnt += 1
        if self.interval_cnt % 20 == 0:
            self.conn_manager.send_message_threadsafe({
                "type": "chunk_progress",
                "task_id": self.task_id,
                "filename": filename,
                "total_chunks": total_chunks,
                "current_chunk": current_chunk,
                "progress_percent": progress_percent,
                "current_byte": current_byte,
                "total_bytes": total_bytes, # don't use other things than chunk_size because it is not compressed size
                "chunk_size": chunk_size,
                "overall_progress": {
                    "downloaded_size": self.downloaded_size,
                    "total_size": self.download_size,
                    "overall_percent": (self.downloaded_size / self.download_size) * 100 if self.download_size > 0 else 0,
                    "download_speed": self.download_speed
                }
            }, self.task_id)
            print(f"Current progress: {self.downloaded_size}/{self.download_size} bytes ({(self.downloaded_size / self.download_size) * 100 if self.download_size > 0 else 0:.2f}%)")

    def file_download_start(self, filename: str):
        self.conn_manager.send_message_threadsafe({
            "type": "file_download_start",
            "task_id": self.task_id,
            "filename": filename
        }, self.task_id)

    def file_download_skipped(self, filename: str, reason: str):
        # Reason could be "exists", "directory"
        self.conn_manager.send_message_threadsafe({
            "type": "file_download_skipped",
            "task_id": self.task_id,
            "filename": filename,
            "reason": reason
        }, self.task_id)

    def file_download_complete(self, filename: str, file_size: int):
        self.conn_manager.send_message_threadsafe({
            "type": "file_download_complete",
            "task_id": self.task_id,
            "filename": filename,
            "file_size": file_size
        }, self.task_id)

    def file_download_error(self, filename: str, error: str):
        self.conn_manager.send_message_threadsafe({
            "type": "file_download_error",
            "task_id": self.task_id,
            "filename": filename,
            "error": error
        }, self.task_id)

class RepairProgressHandler(InstallProgressHandler):
    def __init__(self, task_id: str, conn_manager: ConnectionManager, tasks: Dict[str, TaskStatus]):
        super().__init__(task_id, conn_manager, tasks)
        self.repair_mode = None
        self.total_file_cnt = 0
        self.current_checked_file_cnt = 0

    def repair_summary(self, repair_mode: str, total_files: int):
        self.repair_mode = repair_mode
        self.total_file_cnt = total_files
        self.conn_manager.send_message_threadsafe({
            "type": "repair_summary",
            "task_id": self.task_id,
            "repair_mode": repair_mode,
            "total_files": total_files
        }, self.task_id)

    def check_file(self, filename: str, requires_repair: bool, reason: Optional[str] = None):
        """Send a message about a file that needs repair or is fine"""
        self.current_checked_file_cnt += 1
        if self.current_checked_file_cnt % 10 == 0:
            self.conn_manager.send_message_threadsafe({
                "type": "check_file",
                "task_id": self.task_id,
                "filename": filename,
                "requires_repair": requires_repair,
                "reason": "" if reason is None else reason,
                "overall_progress": {
                    "total_files": self.total_file_cnt,
                    "checked_files": self.current_checked_file_cnt,
                    "overall_percent": (self.current_checked_file_cnt / self.total_file_cnt) * 100 if self.total_file_cnt > 0 else 0
                }
            }, self.task_id)

class UpdateProgressHandler(InstallProgressHandler):
    def __init__(self, task_id: str, conn_manager: ConnectionManager, tasks: Dict[str, TaskStatus]):
        super().__init__(task_id, conn_manager, tasks)
        self.predownload = False
        self.total_delete_files = 0
        self.current_deleted_files = 0
        self._ldiff_speed_thread = None

    def _calculate_ldiff_speed(self):
        '''We will reuse the worker function and instance variables because
        ldiff download and normal download is not performed cocurrently'''
        if not self._ldiff_speed_thread or not self._ldiff_speed_thread.is_alive():
            self._ldiff_speed_thread = threading.Thread(target=self._speed_calculator_worker, daemon=True)
            self._ldiff_speed_thread.start()

    def delete_file_summary(self, total_files: int, ldiff: bool = False):
        self.current_deleted_files = 0
        self.total_delete_files = 0
        self.conn_manager.send_message_threadsafe({
            "type": f"delete{'_ldiff' if ldiff else ''}_file_summary",
            "task_id": self.task_id,
            "total_files": total_files
        }, self.task_id)
        self.total_delete_files = total_files

    def delete_file(self, filename: str, ldiff: bool = False):
        self.current_deleted_files += 1
        self.conn_manager.send_message_threadsafe({
            "type": f"delete{'_ldiff' if ldiff else ''}_file",
            "task_id": self.task_id,
            "filename": filename,
            "overall_progress": {
                "total_files": self.total_delete_files,
                "deleted_files": self.current_deleted_files,
                "overall_percent": (self.current_deleted_files / self.total_delete_files) * 100 if self.total_delete_files > 0 else 0
            }
        }, self.task_id)

    def ldiff_download_summary(self, total_files: int, total_size: int):
        self.downloaded_size = 0
        self.download_size = total_size
        self.download_speed = 0
        self.interval_cnt = 0
        self.conn_manager.send_message_threadsafe({
            "type": "ldiff_download_summary",
            "task_id": self.task_id,
            "ldiff_file_count": total_files,
            "ldiff_total_size": total_size
        }, self.task_id)
        self._calculate_ldiff_speed()

    def ldiff_download_start(self, filename: str):
        self.conn_manager.send_message_threadsafe({
            "type": "ldiff_download_start",
            "task_id": self.task_id,
            "filename": filename,
        }, self.task_id)

    def ldiff_download_skipped(self, filename: str, reason: str):
        self.conn_manager.send_message_threadsafe({
            "type": "ldiff_download_skipped",
            "task_id": self.task_id,
            "filename": filename,
            "reason": reason
        }, self.task_id)

    def ldiff_download_complete(self, filename: str, file_size: int):
        self.downloaded_size += file_size
        self.interval_cnt += 1
        self.conn_manager.send_message_threadsafe({
            "type": "ldiff_download_complete",
            "task_id": self.task_id,
            "filename": filename,
            "file_size": file_size,
            "overall_progress": {
                "downloaded_size": self.downloaded_size,
                "total_size": self.download_size,
                "overall_percent": (self.downloaded_size / self.download_size) * 100 if self.download_size > 0 else 0,
                "download_speed": self.download_speed
            }
        }, self.task_id)

    def ldiff_download_error(self, filename: str, error: str):
        self.conn_manager.send_message_threadsafe({
            "type": "ldiff_download_error",
            "task_id": self.task_id,
            "filename": filename,
            "error": error
        }, self.task_id)

    def ldiff_patch_start(self, filename: str):
        self.conn_manager.send_message_threadsafe({
            "type": "ldiff_patch_start",
            "task_id": self.task_id,
            "filename": filename
        }, self.task_id)

    def ldiff_patch_complete(self, filename: str):
        self.conn_manager.send_message_threadsafe({
            "type": "ldiff_patch_complete",
            "task_id": self.task_id,
            "filename": filename
        }, self.task_id)

    def ldiff_patch_error(self, filename: str, error: str):
        self.conn_manager.send_message_threadsafe({
            "type": "ldiff_patch_error",
            "task_id": self.task_id,
            "filename": filename,
            "error": error
        }, self.task_id)

    def ldiff_patch_skipped(self, filename: str, reason: str):
        self.conn_manager.send_message_threadsafe({
            "type": "ldiff_patch_skipped",
            "task_id": self.task_id,
            "filename": filename,
            "reason": reason
        }, self.task_id)
