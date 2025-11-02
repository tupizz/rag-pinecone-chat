"""
Structured logging configuration for production CloudWatch integration.
"""
import logging
import sys
import json
from datetime import datetime, timezone
from typing import Any, Dict
from contextvars import ContextVar

# Context variable for request ID tracking
request_id_var: ContextVar[str] = ContextVar("request_id", default="")


class JSONFormatter(logging.Formatter):
    """
    Custom JSON formatter for structured logging.
    Outputs logs in JSON format for easy parsing by CloudWatch Logs Insights.
    """

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON string."""
        log_data: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Add request ID if available
        request_id = request_id_var.get()
        if request_id:
            log_data["request_id"] = request_id

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Add extra fields from record
        if hasattr(record, "extra_data"):
            log_data["extra"] = record.extra_data

        return json.dumps(log_data)


def setup_logging(level: str = "INFO", json_logs: bool = True) -> None:
    """
    Configure application logging.

    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        json_logs: Whether to use JSON formatting (True for production)
    """
    log_level = getattr(logging, level.upper(), logging.INFO)

    # Create handler
    handler = logging.StreamHandler(sys.stdout)

    # Set formatter
    if json_logs:
        handler.setFormatter(JSONFormatter())
    else:
        # Human-readable format for development
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        handler.setFormatter(formatter)

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    root_logger.handlers.clear()
    root_logger.addHandler(handler)

    # Reduce noise from third-party libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the given name.

    Args:
        name: Logger name (typically __name__)

    Returns:
        Configured logger instance
    """
    return logging.getLogger(name)


def log_with_context(logger: logging.Logger, level: str, message: str, **kwargs) -> None:
    """
    Log a message with additional context data.

    Args:
        logger: Logger instance
        level: Log level (debug, info, warning, error, critical)
        message: Log message
        **kwargs: Additional context data to include in log
    """
    log_method = getattr(logger, level.lower())
    extra = {"extra_data": kwargs} if kwargs else {}
    log_method(message, extra=extra)
