"""Structured JSON logging with secret redaction."""
import json
import logging
import re
import sys

# Ordered rules. Each is applied in turn.
# NOTE: `\b` on the right of the keyword was wrong -- it made `jwt_secret`
# and `refresh_token` unmatchable, and the Authorization rule consumed the
# "Bearer" scheme word instead of the credential after it.
_REDACT_RULES = [
    # Authorization: <scheme> <credential>
    (re.compile(r"(?i)\b(authorization|proxy-authorization)\s*[=:]\s*"
                r"(bearer|basic|digest|token)?\s*\S+"), r"\1=***"),
    # Any key whose NAME contains a sensitive word, with optional prefix/suffix.
    (re.compile(r"(?i)([A-Za-z0-9_.-]*"
                r"(?:password|passwd|secret|token|credential|otp|code_hash|"
                r"api[_-]?key|access[_-]?key|private[_-]?key|session)"
                r"[A-Za-z0-9_.-]*)\s*[=:]\s*\"?[^\s\",;}]+"), r"\1=***"),
    # Bare JWTs anywhere in the line (header.payload.signature).
    (re.compile(r"\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]*"), "***JWT***"),
    # Indian phone numbers.
    (re.compile(r"\+91[6-9][0-9]{9}"), "+91*********"),
]


def redact(message: str) -> str:
    for pattern, replacement in _REDACT_RULES:
        message = pattern.sub(replacement, message)
    return message


_RESERVED = set(logging.LogRecord("", 0, "", 0, "", (), None).__dict__) | {"message", "asctime"}


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "message": redact(record.getMessage()),
        }
        for key, value in record.__dict__.items():
            if key not in _RESERVED and not key.startswith("_"):
                payload[key] = redact(value) if isinstance(value, str) else value
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)


def configure_logging(environment: str, debug: bool) -> None:
    handler = logging.StreamHandler(sys.stdout)
    if environment in ("staging", "production"):
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(
            logging.Formatter("%(asctime)s %(levelname)-8s %(name)s: %(message)s")
        )
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.DEBUG if debug else logging.INFO)
    logging.getLogger("uvicorn.access").handlers = [handler]
