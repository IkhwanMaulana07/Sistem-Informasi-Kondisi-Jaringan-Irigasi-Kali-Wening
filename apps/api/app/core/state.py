import threading
from typing import Literal

HealthStatusType = Literal["memuat", "siap", "gagal"]


class AppState:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(AppState, cls).__new__(cls)
                    cls._instance._status: HealthStatusType = "memuat"
                    cls._instance._import_lock = threading.Lock()
                    cls._instance._last_error = None
        return cls._instance

    @property
    def status(self) -> HealthStatusType:
        return self._status

    @status.setter
    def status(self, val: HealthStatusType):
        self._status = val

    @property
    def import_lock(self) -> threading.Lock:
        return self._import_lock

    @property
    def last_error(self):
        return self._last_error

    @last_error.setter
    def last_error(self, err):
        self._last_error = err


app_state = AppState()
