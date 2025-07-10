from pydantic import BaseModel
from typing import Optional, List


class GameOperationRequest(BaseModel):
    gamedir: str
    tempdir: Optional[str] = None

class InstallRequest(GameOperationRequest):
    install_reltype: str  # "os", "cn", or "bb"

class UpdateRequest(GameOperationRequest):
    predownload: bool = False

class RepairRequest(GameOperationRequest):
    repair_mode: str  # "quick" or "reliable"


class TaskResponse(BaseModel):
    task_id: str
    status: str
    message: str

class TaskStatus(BaseModel):
    task_id: str
    status: str  # running, completed, failed, cancelled, pending
    progress: Optional[float] = None
    error: Optional[str] = None


class OnlineGameInfo(BaseModel):
    version: str
    updatable_versions: List[str]
    release_type: str
    pre_download: bool
    error: Optional[str] = None
