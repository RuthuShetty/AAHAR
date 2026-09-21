"""
Pytest Fixtures for AAHAR Cloud Service
Sets up async database, test client, and authenticated test user.
"""
import asyncio
import os
import uuid
from typing import AsyncGenerator
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Test environment.
# Was: DEV_MODE=True, which enabled the anonymous-request authentication
# bypass. The whole suite therefore exercised the insecure path and would
# have gone green against a build that authenticated nobody.
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_aahar.db"
os.environ["ENVIRONMENT"] = "test"
os.environ["DEV_MODE"] = "False"
os.environ["JWT_SECRET"] = "test-only-secret-not-used-anywhere-else-000000"
os.environ["CORS_ORIGINS"] = "http://localhost:5173"

from cloud.app.config import settings
from cloud.app.database import Base, get_db
from cloud.app.main import app
from cloud.app.rate_limit import limiter
from cloud.app.models.entities import Farm, User, utc_now
from cloud.app.auth import create_access_token

TEST_DB_URL = "sqlite+aiosqlite:///./test_aahar.db"

test_engine = create_async_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    future=True,
)

TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_test_database():
    limiter.reset()
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()
    if os.path.exists("./test_aahar.db"):
        try:
            os.remove("./test_aahar.db")
        except OSError:
            pass


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with TestingSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def seed_data(db_session: AsyncSession):
    farm_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    now = utc_now()

    farm = Farm(
        id=farm_id,
        name="Test Dairy Farm",
        village="Rampur",
        district="Ludhiana",
        state="Punjab",
        pin_code="141001",
        contact_phone="+919876543210",
        device_id="AAHAR-P-004821",
        lamport_counter=1,
        field_clocks={"name": {"device": "AAHAR-P-004821", "counter": 1}},
        created_at=now,
        updated_at=now,
    )
    db_session.add(farm)

    user = User(
        id=user_id,
        phone="+919876543210",
        name="Jaspreet Singh",
        role="farmer",
        farm_id=farm_id,
        is_active=True,
        created_at=now,
    )
    db_session.add(user)
    await db_session.commit()

    token = create_access_token(
        data={"sub": user_id, "phone": user.phone, "role": user.role, "farm_id": farm_id}
    )

    return {
        "farm_id": farm_id,
        "user_id": user_id,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
    }


@pytest_asyncio.fixture
async def second_farm(db_session: AsyncSession):
    """A second tenant, used to prove cross-farm access is denied."""
    farm_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    now = utc_now()

    db_session.add(Farm(id=farm_id, name="Other Farm", contact_phone="+919000000001",
                        created_at=now, updated_at=now))
    db_session.add(User(id=user_id, phone="+919000000001", name="Other Farmer",
                        role="farmer", farm_id=farm_id, is_active=True, created_at=now))
    await db_session.commit()

    token = create_access_token(
        data={"sub": user_id, "role": "farmer", "farm_id": farm_id, "org_id": None}
    )
    return {"farm_id": farm_id, "user_id": user_id, "token": token,
            "headers": {"Authorization": f"Bearer {token}"}}
