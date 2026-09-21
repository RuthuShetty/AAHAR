/**
 * AAHAR Mobile — Field-Level Lamport Clock Conflict Resolver
 * Implements ADR-002: mutable entities merge per-field without data loss.
 */

export interface LamportClock {
  counter: number;
  device: string;
}

export type EntityClocks = Record<string, LamportClock>;

export function mergeFieldLevel<T extends Record<string, any>>(
  localObj: T,
  localClocks: EntityClocks,
  remoteObj: T,
  remoteClocks: EntityClocks,
): { merged: T; clocks: EntityClocks; hadConflict: boolean } {
  const merged = { ...localObj } as T;
  const mergedClocks = { ...localClocks };
  let hadConflict = false;

  const allFields = new Set([...Object.keys(localObj), ...Object.keys(remoteObj)]);

  for (const field of allFields) {
    if (field === 'id' || field === 'farm_id' || field === 'fields' || field === 'updated_at') {
      continue;
    }

    const lClock = localClocks[field];
    const rClock = remoteClocks[field];

    if (!lClock && rClock) {
      // Remote field has clock, local doesn't
      merged[field as keyof T] = remoteObj[field];
      mergedClocks[field] = rClock;
    } else if (lClock && rClock) {
      if (rClock.counter > lClock.counter) {
        // Remote wins
        merged[field as keyof T] = remoteObj[field];
        mergedClocks[field] = rClock;
      } else if (rClock.counter === lClock.counter) {
        // Tie breaker: lexicographical comparison of device
        if (rClock.device > lClock.device) {
          merged[field as keyof T] = remoteObj[field];
          mergedClocks[field] = rClock;
        }
        if (JSON.stringify(localObj[field]) !== JSON.stringify(remoteObj[field])) {
          hadConflict = true;
        }
      }
      // If local clock is higher, keep local field unchanged
    } else if (lClock && !rClock) {
      // Keep local
    } else {
      // Neither has clock, fallback to remote if exists
      if (remoteObj[field] !== undefined) {
        merged[field as keyof T] = remoteObj[field];
      }
    }
  }

  return { merged, clocks: mergedClocks, hadConflict };
}
