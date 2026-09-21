#!/usr/bin/env python3
"""
AAHAR Contract Code Generator — Python (Pydantic v2)

Generates Pydantic v2 models from:
  - contracts/schema/*.schema.json
  - contracts/enums/index.json
  - contracts/units.json

Output:
  - cloud/app/schemas/contracts.py

Usage: python contracts/codegen/gen_py.py
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).parent.parent.parent
CONTRACTS = Path(__file__).parent.parent

HEADER = '''"""
╔══════════════════════════════════════════════════════════════╗
║  AAHAR — AUTO-GENERATED FROM /contracts — DO NOT EDIT       ║
║  Source: contracts/codegen/gen_py.py                        ║
║  To change models, edit the JSON Schema and re-run codegen. ║
╚══════════════════════════════════════════════════════════════╝

Generated at: {ts}
"""

from __future__ import annotations

import hashlib
import re
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Literal, Optional, Union
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

'''

FOOTER = '''
# ─── Discriminated Union ──────────────────────────────────────────────────────

AnyPayload = Union[
    MeasurementPayload,
    SpectrumPayload,
    FarmPayload,
    HerdPayload,
    BunkerPayload,
    ProbeReadingPayload,
    AdvisoryPayload,
    BatchPayload,
]

# ─── Sync API Models ──────────────────────────────────────────────────────────

class SyncPushRequest(BaseModel):
    model_config = ConfigDict(frozen=True)
    records: List[SyncEnvelope]
    idempotency_key: str = Field(..., description="sha256 of sorted record IDs")

class SyncPushResult(BaseModel):
    id: str
    status: Literal["accepted", "duplicate", "conflict", "rejected"]
    reject_reason: Optional[str] = None
    server_received_at: Optional[datetime] = None

class SyncPushResponse(BaseModel):
    results: List[SyncPushResult]
    server_time: datetime

class SyncPullResponse(BaseModel):
    records: List[SyncEnvelope]
    cursor: str
    has_more: bool
    server_time: datetime

class SyncHandshake(BaseModel):
    server_time: datetime
    schema_version: int
    model_version: str
    firmware_version: str
    cursor: str
    thresholds_hash: str  # sha256 of thresholds.json
'''


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def json_type_to_py(prop: dict, required: bool = True) -> str:
    """Convert a JSON Schema property to a Python type annotation string."""
    types = prop.get("type", "object")
    nullable = isinstance(types, list) and "null" in types
    raw_type = next((t for t in types if t != "null"), types) if isinstance(types, list) else types

    if prop.get("$ref"):
        ref_name = prop["$ref"].split("/")[-1]
        py_type = ref_name
    elif prop.get("oneOf"):
        subtypes = []
        for s in prop["oneOf"]:
            if s.get("type") == "null":
                subtypes.append("None")
            elif s.get("$ref"):
                subtypes.append(s["$ref"].split("/")[-1])
            else:
                subtypes.append(json_type_to_py(s))
        py_type = f"Optional[{subtypes[0]}]" if "None" in subtypes else f"Union[{', '.join(subtypes)}]"
        return py_type
    elif raw_type == "string":
        if prop.get("enum"):
            # Will be handled by Literal or Enum
            values = [v for v in prop["enum"] if v is not None]
            if len(values) == 1:
                py_type = f"Literal['{values[0]}']"
            else:
                py_type = "Literal[" + ", ".join(f"'{v}'" for v in values) + "]"
        elif prop.get("format") == "uuid":
            py_type = "str"  # Keep as str for simplicity; validate with regex
        elif prop.get("format") in ("date-time",):
            py_type = "datetime"
        elif prop.get("format") == "date":
            py_type = "str"  # date-only strings
        else:
            py_type = "str"
    elif raw_type == "number":
        py_type = "float"
    elif raw_type == "integer":
        py_type = "int"
    elif raw_type == "boolean":
        py_type = "bool"
    elif raw_type == "array":
        items = prop.get("items", {})
        item_type = json_type_to_py(items) if items else "Any"
        py_type = f"List[{item_type}]"
    elif raw_type == "object":
        if prop.get("additionalProperties"):
            add_type = json_type_to_py(prop["additionalProperties"])
            py_type = f"Dict[str, {add_type}]"
        else:
            py_type = "Dict[str, Any]"
    else:
        py_type = "Any"

    if nullable:
        return f"Optional[{py_type}]"
    return py_type


def generate_enum_classes(enums_json: dict) -> str:
    lines = ["# ─── Enumerations ────────────────────────────────────────────────────────────\n"]

    for enum_name, enum_def in enums_json["enums"].items():
        lines.append(f'class {enum_name}(str, Enum):')
        lines.append(f'    """{enum_def["description"]}"""')
        for v in enum_def["values"]:
            # Use the key as both name and value
            lines.append(f'    {v["key"]} = "{v["key"]}"')
        lines.append("")

    return "\n".join(lines)


def schema_to_pydantic(class_name: str, schema: dict, defs: dict | None = None) -> str:
    """Generate a Pydantic model class from a JSON Schema object."""
    lines = []
    required = set(schema.get("required", []))
    props = schema.get("properties", {})
    desc = schema.get("description", "")

    lines.append(f'class {class_name}(BaseModel):')
    if desc:
        lines.append(f'    """{desc}"""')
    lines.append('    model_config = ConfigDict(populate_by_name=True)')
    lines.append("")

    for field_name, prop in props.items():
        is_req = field_name in required
        py_type = json_type_to_py(prop, is_req)
        field_desc = prop.get("description", "")

        if not is_req:
            if "null" not in str(py_type):
                py_type = f"Optional[{py_type}]"
            default = " = None"
        else:
            default = ""

        if field_desc:
            default_expr = repr(None) if not is_req else "..."
            field_str = f'    {field_name}: {py_type} = Field({default_expr}, description={repr(field_desc)})'
        else:
            field_str = f'    {field_name}: {py_type}{default}'

        lines.append(field_str)

    lines.append("")

    # Nested $defs as inner classes would be separate top-level classes
    if defs:
        for def_name, def_schema in defs.items():
            lines.append("")
            lines.append(schema_to_pydantic(def_name, def_schema))

    return "\n".join(lines)


def generate() -> None:
    import datetime
    import sys
    # Ensure UTF-8 output on Windows
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    print("[GEN] AAHAR Python/Pydantic codegen starting...\n")

    enums_json = read_json(CONTRACTS / "enums" / "index.json")

    schema_files = [
        ("sync_envelope", "SyncEnvelope"),
        ("measurement",   "MeasurementPayload"),
        ("spectrum",      "SpectrumPayload"),
        ("farm",          "FarmPayload"),
        ("herd",          "HerdPayload"),
        ("bunker",        "BunkerPayload"),
        ("probe_reading", "ProbeReadingPayload"),
        ("advisory",      "AdvisoryPayload"),
        ("batch",         "BatchPayload"),
    ]

    output = HEADER.format(ts=datetime.datetime.now().isoformat())

    # Enums
    output += generate_enum_classes(enums_json) + "\n\n"

    # Shared types
    output += """# ─── Shared Types ────────────────────────────────────────────────────────────

class LamportClock(BaseModel):
    device: str = Field(..., description="device_id that owns this counter")
    counter: int = Field(..., ge=0)


class NumericResult(BaseModel):
    \"\"\"Every measurement value ships with a confidence interval. Never display without CI.\"\"\"
    model_config = ConfigDict(frozen=True)
    value:      float
    ci_low:     float = Field(..., description="Lower bound of 95% CI")
    ci_high:    float = Field(..., description="Upper bound of 95% CI")
    confidence: float = Field(..., ge=0.0, le=1.0)
    unit:       str   = Field(..., description="Key from units.json")


"""

    # All schemas
    for schema_file, class_name in schema_files:
        schema = read_json(CONTRACTS / "schema" / f"{schema_file}.schema.json")
        defs = schema.get("$defs", {})
        # Generate defs first (they're referenced by the main schema)
        if defs:
            for def_name, def_schema in defs.items():
                output += schema_to_pydantic(def_name, def_schema) + "\n\n"
        output += f"# ── {class_name} (schema v{schema.get('version', 1)}) ──\n"
        output += schema_to_pydantic(class_name, schema) + "\n\n"

    output += FOOTER

    # Normalize newlines
    output = output.replace("\r\n", "\n")

    # Write output
    target = ROOT / "cloud" / "app" / "schemas" / "contracts.py"
    target.parent.mkdir(parents=True, exist_ok=True)
    with open(target, "w", encoding="utf-8", newline="\n") as f:
        f.write(output)
    print(f"  [OK] Written: {target.relative_to(ROOT)}")

    # Record hash for drift detection
    hash_val = hashlib.sha256(output.encode("utf-8")).hexdigest()
    hash_file = CONTRACTS / "codegen" / ".py_hash"
    with open(hash_file, "w", encoding="utf-8", newline="\n") as f:
        f.write(hash_val)
    print(f"  [HASH] Hash recorded: {hash_val[:16]}...")
    print("\n[OK] Python/Pydantic codegen complete.\n")


if __name__ == "__main__":
    generate()
