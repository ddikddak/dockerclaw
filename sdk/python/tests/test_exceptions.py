"""Tests for DockerClaw exceptions."""

import pytest

from dockerclaw.exceptions import (
    AuthenticationError,
    DockerClawError,
    NotFoundError,
    ServerError,
    ValidationError,
)


def test_base_error():
    """Test base DockerClawError."""
    error = DockerClawError("Something went wrong", status_code=500)
    assert str(error) == "Something went wrong"
    assert error.status_code == 500
    assert error.message == "Something went wrong"


def test_authentication_error():
    """Test AuthenticationError."""
    error = AuthenticationError()
    assert error.status_code == 401
    assert "Invalid" in error.message
    
    error_custom = AuthenticationError("Custom message")
    assert str(error_custom) == "Custom message"


def test_not_found_error():
    """Test NotFoundError."""
    error = NotFoundError()
    assert error.status_code == 404
    assert "not found" in error.message


def test_validation_error():
    """Test ValidationError."""
    error = ValidationError()
    assert error.status_code == 400
    assert error.details is None
    
    details = [{"field": "title", "message": "Required"}]
    error_with_details = ValidationError("Invalid input", details=details)
    assert error_with_details.details == details


def test_server_error():
    """Test ServerError."""
    error = ServerError()
    assert error.status_code == 500
    assert "Server error" in error.message


def test_error_inheritance():
    """Test that all errors inherit from DockerClawError."""
    assert issubclass(AuthenticationError, DockerClawError)
    assert issubclass(NotFoundError, DockerClawError)
    assert issubclass(ValidationError, DockerClawError)
    assert issubclass(ServerError, DockerClawError)
