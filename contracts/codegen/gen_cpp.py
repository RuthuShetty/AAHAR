#!/usr/bin/env python3
"""
AAHAR Contract Code Generator — C++17

Generates C++17 structs with nlohmann/json serialisation from:
  - contracts/schema/*.schema.json
  - contracts/enums/index.json

Output:
  - firmware-handheld/include/contracts/contracts.h
  - firmware-probe/include/contracts/contracts.h

The firmware targets do not use all fields — only the subset relevant to the device.
The full struct is still generated; unused fields are simply never populated.
This ensures schema changes are always visible at compile time.
"""
from __future__ import annotations

import datetime
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).parent.parent.parent
CONTRACTS = Path(__file__).parent.parent

HEADER = """\
/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  AAHAR — AUTO-GENERATED FROM /contracts — DO NOT EDIT       ║
 * ║  Source: contracts/codegen/gen_cpp.py                       ║
 * ║  To change types, edit the JSON Schema and re-run codegen.  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Generated at: {ts}
 *
 * Dependencies:
 *   - nlohmann/json (included via idf_component_manager or platformio lib)
 *   - C++17 or later
 */

#pragma once
#ifndef AAHAR_CONTRACTS_H
#define AAHAR_CONTRACTS_H

#include <cstdint>
#include <optional>
#include <string>
#include <vector>
#include <unordered_map>
#include <nlohmann/json.hpp>

namespace aahar::contracts {{

using json = nlohmann::json;

"""

FOOTER = """\

}} // namespace aahar::contracts

#endif // AAHAR_CONTRACTS_H
"""


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def json_type_to_cpp(prop: dict, required: bool = True) -> str:
    """Convert JSON Schema property to C++ type."""
    types = prop.get("type", "object")
    nullable = isinstance(types, list) and "null" in types
    raw_type = next((t for t in types if t != "null"), types) if isinstance(types, list) else types

    if prop.get("$ref"):
        ref_name = prop["$ref"].split("/")[-1]
        cpp_type = ref_name
    elif raw_type == "string":
        if prop.get("format") in ("date-time", "date", "uri"):
            cpp_type = "std::string"
        else:
            cpp_type = "std::string"
    elif raw_type == "number":
        cpp_type = "float"
    elif raw_type == "integer":
        # Choose sized int based on range
        max_val = prop.get("maximum", 2**31)
        if max_val <= 255:
            cpp_type = "uint8_t"
        elif max_val <= 65535:
            cpp_type = "uint16_t"
        elif max_val <= 2**32 - 1:
            cpp_type = "uint32_t"
        else:
            cpp_type = "uint64_t"
    elif raw_type == "boolean":
        cpp_type = "bool"
    elif raw_type == "array":
        items = prop.get("items", {})
        if items.get("$ref"):
            item_type = items["$ref"].split("/")[-1]
        else:
            item_type = json_type_to_cpp(items) if items else "json"
        cpp_type = f"std::vector<{item_type}>"
    elif raw_type == "object":
        if prop.get("additionalProperties"):
            add = prop["additionalProperties"]
            val_type = json_type_to_cpp(add) if isinstance(add, dict) else "json"
            cpp_type = f"std::unordered_map<std::string, {val_type}>"
        else:
            cpp_type = "json"  # Untyped nested object
    else:
        cpp_type = "json"

    if nullable or not required:
        return f"std::optional<{cpp_type}>"
    return cpp_type


def generate_enum_classes(enums_json: dict) -> str:
    lines = ["// ─── Enumerations ─────────────────────────────────────────────────────────────\n"]

    for enum_name, enum_def in enums_json["enums"].items():
        lines.append(f"/** {enum_def['description']} */")
        lines.append(f"enum class {enum_name} : uint8_t {{")
        for i, v in enumerate(enum_def["values"]):
            comma = "," if i < len(enum_def["values"]) - 1 else ""
            lines.append(f"    {v['key']}{comma}")
        lines.append("};\n")

        # String conversion helpers
        lines.append(f"inline const char* to_string({enum_name} v) {{")
        lines.append(f"    switch (v) {{")
        for v in enum_def["values"]:
            lines.append(f'        case {enum_name}::{v["key"]}: return "{v["key"]}";')
        lines.append(f'        default: return "UNKNOWN";')
        lines.append(f"    }}")
        lines.append("}\n")

        lines.append(f"inline {enum_name} {enum_name}_from_string(const std::string& s) {{")
        for v in enum_def["values"]:
            lines.append(f'    if (s == "{v["key"]}") return {enum_name}::{v["key"]};')
        lines.append(f'    return {enum_name}::{enum_def["values"][0]["key"]}; // default')
        lines.append("}\n")

    return "\n".join(lines)


def schema_to_struct(struct_name: str, schema: dict, defs: dict | None = None) -> str:
    lines = []
    required_fields = set(schema.get("required", []))
    props = schema.get("properties", {})
    desc = schema.get("description", "")

    if desc:
        lines.append(f"/** {desc[:120]} */")  # Truncate for header width

    lines.append(f"struct {struct_name} {{")

    for field_name, prop in props.items():
        is_req = field_name in required_fields
        cpp_type = json_type_to_cpp(prop, is_req)
        field_desc = prop.get("description", "")
        if field_desc:
            lines.append(f"    /** {field_desc[:100]} */")
        lines.append(f"    {cpp_type} {field_name}{{}};")

    # JSON serialisation / deserialisation
    lines.append("")
    lines.append(f"    static {struct_name} from_json(const json& j) {{")
    lines.append(f"        {struct_name} s;")
    for field_name, prop in props.items():
        is_req = field_name in required_fields
        if is_req:
            lines.append(f'        if (j.contains("{field_name}")) s.{field_name} = j["{field_name}"].get<decltype(s.{field_name})>();')
        else:
            lines.append(f'        if (j.contains("{field_name}") && !j["{field_name}"].is_null()) s.{field_name} = j["{field_name}"].get<std::remove_reference_t<decltype(*s.{field_name})>>();')
    lines.append("        return s;")
    lines.append("    }")
    lines.append("")
    lines.append("    json to_json() const {")
    lines.append("        json j;")
    for field_name, prop in props.items():
        is_req = field_name in required_fields
        if is_req:
            lines.append(f'        j["{field_name}"] = {field_name};')
        else:
            lines.append(f'        if ({field_name}.has_value()) j["{field_name}"] = *{field_name}; else j["{field_name}"] = nullptr;')
    lines.append("        return j;")
    lines.append("    }")
    lines.append("};")
    lines.append("")

    return "\n".join(lines)


def generate() -> None:
    print("🔧 AAHAR C++17 codegen starting...\n")

    ts = datetime.datetime.now().isoformat()
    enums_json = read_json(CONTRACTS / "enums" / "index.json")

    schema_files = [
        ("sync_envelope", "SyncEnvelope"),
        ("measurement",   "MeasurementPayload"),
        ("spectrum",      "SpectrumPayload"),
        ("probe_reading", "ProbeReadingPayload"),
    ]

    output = HEADER.format(ts=ts)

    # Enums
    output += generate_enum_classes(enums_json) + "\n"

    # Shared types
    output += """// ─── Shared Types ─────────────────────────────────────────────────────────────

struct LamportClock {
    std::string device;
    uint64_t    counter{0};

    json to_json() const { return {{"device", device}, {"counter", counter}}; }
    static LamportClock from_json(const json& j) {
        return {j["device"].get<std::string>(), j["counter"].get<uint64_t>()};
    }
};

/** Every numeric measurement — always carry CI and confidence. Never transmit bare value. */
struct NumericResult {
    float value{0.0f};
    float ci_low{0.0f};
    float ci_high{0.0f};
    float confidence{0.0f}; // 0–1
    std::string unit;

    json to_json() const {
        return {{"value", value}, {"ci_low", ci_low}, {"ci_high", ci_high},
                {"confidence", confidence}, {"unit", unit}};
    }
    static NumericResult from_json(const json& j) {
        return {j["value"], j["ci_low"], j["ci_high"], j["confidence"], j["unit"]};
    }
};

"""

    # Schemas — firmware only needs a subset
    for schema_file, struct_name in schema_files:
        schema = read_json(CONTRACTS / "schema" / f"{schema_file}.schema.json")
        defs = schema.get("$defs", {})
        if defs:
            for def_name, def_schema in defs.items():
                output += f"// ── {def_name} ──\n"
                output += schema_to_struct(def_name, def_schema) + "\n"
        output += f"// ── {struct_name} (schema v{schema.get('version', 1)}) ──\n"
        output += schema_to_struct(struct_name, schema) + "\n"

    output += FOOTER

    # Write to both firmware targets
    targets = [
        ROOT / "firmware-handheld" / "include" / "contracts" / "contracts.h",
        ROOT / "firmware-probe"    / "include" / "contracts" / "contracts.h",
    ]

    for target in targets:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(output, encoding="utf-8")
        print(f"  ✅ Written: {target.relative_to(ROOT)}")

    # Record hash
    hash_val = hashlib.sha256(output.encode()).hexdigest()
    hash_file = CONTRACTS / "codegen" / ".cpp_hash"
    hash_file.write_text(hash_val, encoding="utf-8")
    print(f"  📌 Hash recorded: {hash_val[:16]}…")
    print("\n✅ C++17 codegen complete.\n")


if __name__ == "__main__":
    generate()
