"""
AAHAR Lamport Clock & Field-Level Merge Resolver
Implements ADR-002: Offline-First Architecture with Field-Level Lamport Clocks
"""
from typing import Any, Dict, Tuple


def compare_clocks(
    incoming_clock: Dict[str, Any],
    existing_clock: Dict[str, Any],
) -> int:
    """
    Compares two Lamport clocks: {"device": str, "counter": int}.
    Returns:
       1 if incoming strictly dominates existing
      -1 if existing strictly dominates incoming
       0 if concurrent / tied
    """
    c_in = incoming_clock.get("counter", 0)
    c_ex = existing_clock.get("counter", 0)

    if c_in > c_ex:
        return 1
    elif c_in < c_ex:
        return -1
    else:
        # Same counter: tie-break deterministically using device ID
        dev_in = incoming_clock.get("device", "")
        dev_ex = existing_clock.get("device", "")
        if dev_in > dev_ex:
            return 1
        elif dev_in < dev_ex:
            return -1
        return 0


def merge_field_level_entity(
    existing_payload: Dict[str, Any],
    incoming_payload: Dict[str, Any],
    incoming_envelope_clock: Dict[str, Any],
) -> Tuple[Dict[str, Any], bool, bool]:
    """
    Performs field-level Last-Write-Wins merge using field-level Lamport clocks.
    
    Returns:
        (merged_payload, had_changes, had_conflicts)
    """
    merged = dict(existing_payload)
    existing_field_clocks = dict(existing_payload.get("fields", {}))
    incoming_field_clocks = dict(incoming_payload.get("fields", {}))

    merged_field_clocks = dict(existing_field_clocks)
    had_changes = False
    had_conflicts = False

    all_keys = set(incoming_payload.keys()) | set(existing_payload.keys())

    for key in all_keys:
        if key == "fields":
            continue

        in_has_val = key in incoming_payload
        ex_has_val = key in existing_payload

        in_clock = incoming_field_clocks.get(key, incoming_envelope_clock)
        ex_clock = existing_field_clocks.get(key, {"device": "origin", "counter": 0})

        cmp = compare_clocks(in_clock, ex_clock)

        if in_has_val and not ex_has_val:
            # New field added by incoming
            merged[key] = incoming_payload[key]
            merged_field_clocks[key] = in_clock
            had_changes = True
        elif not in_has_val and ex_has_val:
            # Field exists only on server, keep it
            pass
        else:
            # Both have value
            in_val = incoming_payload[key]
            ex_val = existing_payload[key]

            if in_val != ex_val:
                if cmp > 0:
                    # Incoming wins
                    merged[key] = in_val
                    merged_field_clocks[key] = in_clock
                    had_changes = True
                elif cmp < 0:
                    # Existing wins
                    had_conflicts = True
                else:
                    # Tie break on value or accept incoming
                    merged[key] = in_val
                    merged_field_clocks[key] = in_clock
                    had_changes = True
            else:
                # Same values, take clock with highest counter
                if cmp > 0:
                    merged_field_clocks[key] = in_clock

    merged["fields"] = merged_field_clocks
    return merged, had_changes, had_conflicts
