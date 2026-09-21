# ADR-002: Offline-First Architecture with Lamport Clocks

**Date:** 2026-09-18  
**Status:** Accepted  

## Context

60% of AAHAR sessions occur with no network connectivity (2G/no signal). The app must perform a full test, run inference, generate an advisory, and render every 3D view with the network switched off. Cloud is a sync target, never a dependency.

At the same time, a farm may have multiple devices (a handheld and 2–3 probes) that all write to the same entities (farm profile, herd, bunker geometry) while offline for extended periods. When connectivity returns, conflicts can arise.

## Decision

**Every record is either immutable or uses field-level last-write-wins with Lamport clocks.**

### Immutable records (measurements, spectra, probe readings)
- Append-only. Never updated after creation.
- No conflicts possible. Two offline devices writing the same measurement are by definition different measurements.
- UUIDv7 IDs (time-ordered, generated offline) ensure global uniqueness without coordination.

### Mutable records (farm, herd, bunker)
- Each top-level field carries its own `LamportClock { device: string, counter: integer }`.
- On merge, for each field: the version with the higher Lamport counter wins.
- Two offline edits to **different fields** both survive (no data loss).
- Two offline edits to the **same field** follow last-write-wins on the Lamport counter.
- If counters are equal and values differ: server timestamps break the tie; this is logged to Screen 17 (Sync Centre) for human review.

### Why Lamport clocks over CRDTs
CRDTs (e.g., LWW-Element-Set, OR-Set) would be more theoretically correct but:
- Significantly more complex to implement in C++ firmware and on SQLite mobile
- The data model doesn't require it: farm/herd/bunker are simple key-value-like records, not sets or sequences
- Field-level LWW is sufficient for the access patterns: supervisor edits farm profile on web dashboard, farmer edits herd from phone — these rarely conflict on the same field

### Why UUIDv7 over UUIDv4
UUIDv7 encodes a millisecond timestamp in the first 48 bits:
- Time-ordered: records inserted in UUID order have temporal locality in the B-tree index
- Offline-safe: collision probability is 2^-74 per millisecond (effectively impossible)
- Human-inspectable: the timestamp tells you when the record was created without a separate field

## Sync State Machine

```
pending → in_flight → synced
                    ↘ conflict (mutable, LWW applied)
                    ↘ rejected (schema mismatch, auth failure)
```

Failed uploads return to `pending` after backoff. The sync queue is ordered by `(priority, captured_at)` to ensure recent safety-critical readings sync before old spectra.

## Consequences

- The phone is the primary compute node. Removing cloud connectivity changes nothing about the farmer's experience.
- The test suite includes "chaos tests": drop 40% of sync packets, duplicate 10%, reorder 20%, verify final state is consistent.
- The "Sync Centre" screen (Screen 17) surfaces any field-level conflicts for human resolution, but these are expected to be rare.
