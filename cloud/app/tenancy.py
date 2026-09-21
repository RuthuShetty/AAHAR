"""
AAHAR tenancy / row-level access control.

Replaces the previous FarmAccessChecker, which granted every
`fpo_supervisor`, `vet` and `mill_qc` account read AND write access to
*every farm in the deployment* and merely wrote an audit row about it.
Access is now scoped to the actor's organisation.
"""
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from cloud.app.auth import get_current_user
from cloud.app.database import get_db
from cloud.app.models.entities import AuditLog, Farm, User, utc_now

# Roles that may read farms other than their own, within their own org.
ORG_READ_ROLES = {"fpo_supervisor", "vet", "mill_qc"}
# Roles that may mutate or erase another farm's data within their own org.
ORG_WRITE_ROLES = {"fpo_supervisor"}
# Global roles. Deliberately narrow.
GLOBAL_ROLES = {"admin"}


async def log_audit_event(
    db: AsyncSession,
    actor: User,
    target_farm_id: str,
    action: str,
    entity: str,
    entity_id: Optional[str] = None,
    request: Optional[Request] = None,
    commit: bool = False,
) -> AuditLog:
    """
    Record cross-farm access. Does NOT commit by default — the caller owns the
    transaction, so an audit row can never be committed for an action that
    later rolls back.
    """
    ip_address = None
    user_agent = None
    if request is not None:
        ip_address = request.client.host if request.client else None
        ua = request.headers.get("user-agent")
        user_agent = ua[:255] if ua else None

    entry = AuditLog(
        actor_id=actor.id,
        farm_id=actor.farm_id or "NONE",
        target_farm_id=target_farm_id,
        action=action,
        entity=entity,
        entity_id=entity_id,
        timestamp=utc_now(),
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(entry)
    if commit:
        await db.commit()
    return entry


async def assert_farm_access(
    db: AsyncSession,
    user: User,
    farm_id: str,
    action: str = "read",
    entity: str = "farm",
    request: Optional[Request] = None,
) -> None:
    """
    Raise 403 unless `user` may perform `action` on `farm_id`.

    Ownership -> allowed silently.
    Same-org elevated role -> allowed, audit row written.
    Anything else -> 403, with a message that does not disclose whether
    the farm exists.
    """
    if user.farm_id and user.farm_id == farm_id:
        return

    denied = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have permission to access this farm's data.",
    )

    if user.role in GLOBAL_ROLES:
        await log_audit_event(db, user, farm_id, action, entity, request=request)
        return

    allowed_roles = ORG_WRITE_ROLES if action != "read" else ORG_READ_ROLES
    if user.role not in allowed_roles:
        raise denied

    # Org scoping: the actor must have an org, and the target farm must be in it.
    if not user.org_id:
        raise denied
    farm = await db.get(Farm, farm_id)
    if farm is None or farm.org_id != user.org_id:
        raise denied

    await log_audit_event(db, user, farm_id, action, entity, request=request)


class FarmAccess:
    """Path-parameter dependency: enforces access on `/{farm_id}/...` routes."""

    def __init__(self, action: str = "read", entity: str = "farm"):
        self.action = action
        self.entity = entity

    async def __call__(
        self,
        farm_id: str,
        request: Request,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        await assert_farm_access(
            db, current_user, farm_id, self.action, self.entity, request
        )
        return current_user


require_farm_read = FarmAccess(action="read")
require_farm_write = FarmAccess(action="write")
