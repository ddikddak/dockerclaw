"""DockerClaw SDK exceptions."""

from typing import Optional


class DockerClawError(Exception):
    """Base exception for DockerClaw SDK."""
    
    def __init__(self, message: str, code: Optional[str] = None, status_code: Optional[int] = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
    
    def __str__(self) -> str:
        if self.code:
            return f"[{self.code}] {self.message}"
        return self.message


class AuthenticationError(DockerClawError):
    """Raised when authentication fails."""
    
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, code="UNAUTHORIZED", status_code=401)


class NotFoundError(DockerClawError):
    """Raised when a resource is not found."""
    
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, code="NOT_FOUND", status_code=404)


class ValidationError(DockerClawError):
    """Raised when request validation fails."""
    
    def __init__(self, message: str = "Validation failed", details: Optional[dict] = None):
        super().__init__(message, code="VALIDATION_ERROR", status_code=400)
        self.details = details


class RateLimitError(DockerClawError):
    """Raised when rate limit is exceeded."""
    
    def __init__(self, message: str = "Rate limit exceeded", retry_after: Optional[int] = None):
        super().__init__(message, code="RATE_LIMIT", status_code=429)
        self.retry_after = retry_after


class ServerError(DockerClawError):
    """Raised when server returns an error."""
    
    def __init__(self, message: str = "Server error", status_code: int = 500):
        super().__init__(message, code="SERVER_ERROR", status_code=status_code)