# AAHAR Cloud API Specification (v1)

**Service:** AAHAR Cloud Core  
**Protocol:** REST + WebSocket + MQTT  
**Auth:** Phone Number OTP -> JWT Access (15 min) + Refresh Token (30 days)  
**Schema Version:** 3  

---

## 1. Core Endpoints Summary

| Method | Path | Purpose | Auth Required |
|--------|------|---------|---------------|
| `POST` | `/auth/otp/request` | Request 6-digit SMS/voice OTP | No |
| `POST` | `/auth/otp/verify` | Verify OTP, receive JWT tokens | No |
| `POST` | `/auth/refresh` | Exchange refresh token for new access token | No |
| `GET` | `/auth/me` | Fetch active user profile and farm role | Yes (Bearer) |
| `GET` | `/sync/handshake` | Time sync, schema/model versions, cursor | Yes (Bearer) |
| `POST` | `/sync/push` | Idempotent batch upsert with Lamport clocks | Yes (Bearer) |
| `GET` | `/sync/pull` | Cursor-paged delta query | Yes (Bearer) |
| `POST` | `/media/upload/init` | Start resumable chunked upload | Yes (Bearer) |
| `PUT` | `/media/upload/{id}/part` | Upload chunk part | No (Session ID) |
| `POST` | `/media/upload/{id}/complete` | Assemble and commit media file | No (Session ID) |
| `GET` | `/media/{id}` | Stream binary media file | No |
| `GET` | `/models/manifest` | Signed ML model catalog & metadata | No |
| `GET` | `/models/{id}/download` | Download model bundle (.tflite) | No |
| `GET` | `/firmware/manifest` | Handheld & probe firmware OTA catalog | No |
| `GET` | `/firmware/{id}` | Download OTA binary | No |
| `POST` | `/advisory/recompute` | Server-side authoritative advisory computation | No |
| `POST` | `/batches` | Register feed mill batch with declared profile | Yes |
| `GET` | `/batches/{qr}` | Query batch details, aggregate tests & disputes | No |
| `POST` | `/batches/{qr}/dispute` | Log farmer / FPO quality dispute | Yes |
| `GET` | `/farms/{id}/analytics` | Aggregate quality trends, CP, adulteration rate | Yes (RLS) |
| `GET` | `/farms/{id}/export` | DPDP Act 2023 portable data export | Yes (RLS) |
| `DELETE` | `/farms/{id}/data` | DPDP Act 2023 right to erasure | Yes (RLS) |
| `WS` | `/ws/alerts` | Real-time WebSocket probe & safety alerts | No |
| `MQTT` | `aahar/{farm}/{probe}/reading` | Probe sensor telemetry ingestion | Device mTLS |

---

## 2. Synchronization Architecture

### 2.1 Universal Record Envelope
Every syncable entity across all four surfaces conforms to `contracts/schema/sync_envelope.schema.json`:
- `id`: UUIDv7 time-ordered identifier (millisecond epoch in highest 48 bits)
- `entity`: discriminator string (`measurement`, `spectrum`, `farm`, `herd`, `bunker`, `probe_reading`, `advisory`, `batch`)
- `schema_version`: integer version
- `clock`: `{"device": str, "counter": int}` (Lamport logical clock)
- `payload_hash`: SHA-256 of canonical payload
- `payload`: entity JSON payload

### 2.2 Conflict Resolution
- **Immutable Entities** (`measurement`, `spectrum`, `probe_reading`): Append-only. Exact re-submissions return `status: duplicate`.
- **Mutable Entities** (`farm`, `herd`, `bunker`): Resolved using **Field-Level Lamport Clocks** (ADR-002). Two offline devices editing different fields (e.g. device A updates farm name, device B updates contact phone) will both have their changes preserved. Concurrent edits to the exact same field resolve via deterministic Last-Write-Wins on clock counter and device ID.

---

## 3. High-Throughput Verification
- Verified by automated test `cloud/tests/integration/test_fake_device_sync_10k.py`.
- 10,000 records synced in under 16 seconds (>800 records/sec) with zero data loss under simulated network dropouts, 1,000 duplicate re-sends, and 500 reordered packets.
