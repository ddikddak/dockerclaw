"""DockerClaw custom exceptions."""


class DockerClawError(Exception):
    """Base exception for all DockerClaw errors."""
    
    def __init__(self, message: str, status_code: int | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class AuthenticationError(DockerClawError):
    """Raised when API authentication fails (401)."""
    
    def __init__(self, message: str = "Invalid or missing API key") -> None:
        super().__init__(message, status_code=401)


class NotFoundError(DockerClawError):
    """Raised when a requested resource is not found (404)."""
    
    def __init__(self, message: str = "Resource not found") -> None:
        super().__init__(message, status_code=404)


class ValidationError(DockerClawError):
    """Raised when request validation fails (400)."""
    
    def __init__(self, message: str = "Invalid input", details: dict | None = None) -> None:
        super().__init__(message, status_code=400)
        self.details = details


class ServerError(DockerClawError):
    """Raised when server encounters an error (500)."""
    
    def __init__(self, message: str = "Server error") -> None:
        super().__init__(message, status_code=500)
