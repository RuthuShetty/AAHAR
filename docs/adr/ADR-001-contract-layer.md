# ADR-001: Single-Source Contract Layer

**Date:** 2026-09-18  
**Status:** Accepted  
**Deciders:** Tech Lead, Backend, Mobile, Embedded  

## Context

AAHAR runs on four surfaces: ESP32 firmware (C++), a React Native mobile app (TypeScript), a FastAPI cloud service (Python), and a React dashboard (TypeScript). All four exchange the same data — measurements, spectra, farm profiles, probe readings — over BLE, HTTPS, MQTT, and WebSocket.

Without a single source of truth, a field added to the measurement schema on the cloud would need to be manually replicated to three other codebases. History shows this causes:
- Silent data loss when new fields are written by one surface and ignored by another
- Type mismatches discovered only at runtime in the field
- "Works on my device" bugs that are impossible to reproduce

## Decision

All data contracts are defined once in `/contracts/` as JSON Schema (draft 2020-12). A codegen pipeline (`contracts/codegen/`) generates:
- TypeScript interfaces + Zod validators for mobile and dashboard
- Python Pydantic v2 models for the cloud API
- C++17 structs with nlohmann/json serialisation for both firmware targets

The CI pipeline (`.github/workflows/ci.yml`) runs the drift validator as the **first job**, blocking all other jobs if generated files are out of sync with the schemas.

**A field added to a JSON Schema appears on all four surfaces, or the build fails.**

## Alternatives Considered

| Option | Rejected because |
|--------|-----------------|
| Protocol Buffers / gRPC | Adds significant firmware complexity; ESP32 BLE + MQTT transport doesn't map cleanly to gRPC. Protobufs have weak support in React Native. |
| OpenAPI → generated clients | OpenAPI is an API spec, not a data model. Doesn't cover BLE GATT payloads, MQTT messages, or C++ firmware structs. |
| Shared TypeScript types + manual Python/C++ | Manual translation is the problem we're solving. One mistake = silent data loss in the field. |
| GraphQL | No offline/BLE story. Over-fetching concerns on 2G. |

## Consequences

**Positive:**
- Zero-drift guarantee enforced by CI, not by convention
- A new developer can add a field in one place and trust it appears everywhere
- The 3D scenes, charts, advisories, and voice output all read from the same generated types — the "binding pattern" from Section 6.6 is enforced by the type system

**Negative / mitigations:**
- Developers must run `npm run codegen:all` after schema changes — mitigated by `preinstall` hook and the CI gate
- JSON Schema is verbose — mitigated by the codegen generating concise, readable output with JSDoc
- C++ structs generated from JSON Schema are simpler than hand-written ones (no RAII, etc.) — mitigated by keeping firmware logic out of the struct layer; structs are pure data holders

## Schema Versioning

Every schema carries a `version` integer. The sync envelope carries `schema_version`. If the server receives a record with an older `schema_version` than the current server version, it migrates forward using a registered migration function (cloud only — the device always sends what its firmware version knows).

If the phone's app schema is *older* than the server's, the sync handshake returns an upgrade prompt and blocks writes (reads still work for offline viewing).
