import logging
import re
import sys

from pythonjsonlogger.json import JsonFormatter

from app.core.config import get_settings

_PHONE_RE = re.compile(r"(\+[1-9]\d{7,14})")
_PHONE_MASK = "+***********"

_BEARER_RE = re.compile(r"(\bBearer\s+)([A-Za-z0-9._-]{8,})")
_BEARER_MASK = r"\1***"

_PASSWORD_KEY_RE = re.compile(
    r"(password|passwd|pwd|api[_-]?key|secret|token)\s*[:=]\s*[\"']?[^\s\"']+",
    re.IGNORECASE,
)


def redact_text(text: str) -> str:
    """Mask phone numbers, bearer tokens, and inline credentials in a string."""
    text = _PHONE_RE.sub(_PHONE_MASK, text)
    text = _BEARER_RE.sub(_BEARER_MASK, text)
    text = _PASSWORD_KEY_RE.sub(lambda m: f"{m.group(1)}=***", text)
    return text


class RedactionFilter(logging.Filter):
    """Scrub sensitive values (phones, tokens, inline credentials) from log lines.

    Applies to the message template and to every string argument/extra value so
    secrets never reach the sink even when a log call uses ``%s`` formatting.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = redact_text(str(record.msg))
        if record.args:
            record.args = self._redact_args(record.args)
        return True

    def _redact_args(self, args: object) -> object:
        if isinstance(args, dict):
            return {
                key: redact_text(value) if isinstance(value, str) else value
                for key, value in args.items()
            }
        if isinstance(args, (tuple, list)):
            return tuple(redact_text(value) if isinstance(value, str) else value for value in args)
        return args


def configure_logging() -> None:
    settings = get_settings()
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
    handler.addFilter(RedactionFilter())
    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(settings.log_level.upper())