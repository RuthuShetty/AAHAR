"""
Deprecated shim. The permissive FarmAccessChecker that lived here granted
every elevated role access to every farm in the deployment. It has been
replaced by cloud.app.tenancy, which scopes access by organisation.

Kept only so existing imports resolve to the SECURE implementation.
"""
from cloud.app.tenancy import (  # noqa: F401
    FarmAccess,
    assert_farm_access,
    log_audit_event,
    require_farm_read,
    require_farm_write,
)

# Backwards-compatible alias.
FarmAccessChecker = FarmAccess

__all__ = [
    "FarmAccess",
    "FarmAccessChecker",
    "assert_farm_access",
    "log_audit_event",
    "require_farm_read",
    "require_farm_write",
]
