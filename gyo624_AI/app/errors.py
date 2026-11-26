class AIServiceError(Exception):
    def __init__(self, message: str, status: int = 502, headers: dict | None = None):
        super().__init__(message)
        self.message = message
        self.status = status
        self.headers = headers or {}
