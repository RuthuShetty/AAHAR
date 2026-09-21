#!/usr/bin/env python3
"""
Offline static checks for the issues found in the audit. No third-party deps,
so it runs in CI before anything is installed.
"""
import ast, io, pathlib, re, sys, tokenize

ROOT = pathlib.Path(__file__).resolve().parent.parent


def code_only(path: pathlib.Path) -> str:
    """
    Strip comments and docstrings before pattern-matching, PRESERVING the
    original spacing.

    Two bugs were found in earlier versions of this function, both of which
    produced false failures:
      1. It matched its own explanatory comments (the docstring "no DEV_MODE
         branch here" tripped the DEV_MODE check).
      2. The fix joined tokens with " ", turning `secrets.choice(` into
         `secrets . choice (`, so four correct implementations were reported
         as broken.
    tokenize.untokenize() round-trips with original positions, which avoids
    both. Erlang-style %% comments are stripped for .conf files.
    """
    src = path.read_text(encoding="utf-8")

    if path.suffix == ".py":
        kept, prev_type = [], tokenize.INDENT
        try:
            for tok in tokenize.generate_tokens(io.StringIO(src).readline):
                if tok.type == tokenize.COMMENT:
                    continue
                if tok.type == tokenize.STRING and prev_type in (
                    tokenize.INDENT, tokenize.NEWLINE, tokenize.NL, tokenize.DEDENT,
                ):
                    continue  # docstring
                kept.append(tok)
                if tok.type not in (tokenize.NL, tokenize.NEWLINE):
                    prev_type = tok.type
            return tokenize.untokenize(
                [(t.type, t.string, t.start, t.end, t.line) for t in kept]
            )
        except (tokenize.TokenError, IndentationError, ValueError):
            return src

    if path.suffix == ".conf":
        return "\n".join(l for l in src.splitlines() if not l.lstrip().startswith("%%"))

    # TS / TSX / C++ style.
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
    return "\n".join(l for l in src.splitlines() if not l.strip().startswith("//"))


failures, passes = [], []

def check(name, ok, detail=""):
    (passes if ok else failures).append(f"{name}{(' — ' + detail) if detail else ''}")

# 1. Every Python file parses.
bad = []
for f in ROOT.rglob("*.py"):
    if "node_modules" in f.parts: continue
    try: ast.parse(f.read_text(encoding="utf-8"))
    except SyntaxError as e: bad.append(f"{f.relative_to(ROOT)}:{e.lineno}")
check("All Python files parse", not bad, ", ".join(bad))

# 2. No auth bypass.
auth = code_only(ROOT/"cloud/app/auth.py")
check("No DEV_MODE auth bypass in get_current_user",
      "DEV_MODE" not in auth.split("async def get_current_user")[1])
check("OTP uses secrets, not random.randint",
      "secrets.choice" in auth and "random.randint" not in auth)
check("OTP compared in constant time", "hmac.compare_digest" in auth)

# 3. No plaintext OTP anywhere.
api_auth = code_only(ROOT/"cloud/app/api/auth.py")
check("dev_code never returned in an HTTP response", "\"dev_code\"" not in api_auth)
check("OTP attempt limit enforced", "OTP_MAX_ATTEMPTS" in api_auth)

# 4. Sync authorisation.
sync = code_only(ROOT/"cloud/app/api/sync.py")
check("sync/pull authorises farm access", "assert_farm_access" in sync.split("async def sync_pull")[1])
check("sync/push authorises farm access", "assert_farm_access" in sync.split("async def sync_push")[1])

engine_src = (ROOT/"cloud/app/sync/engine.py").read_text(encoding="utf-8")
engine = code_only(ROOT/"cloud/app/sync/engine.py")
check("payload_hash verified server-side", "payload_hash does not match" in engine_src)
check("keyset pagination in pull_deltas", "_parse_cursor" in engine and "or_(" in engine)
check("no fabricated probe defaults (sync engine)",
      'payload.get("ph", 4.0)' not in engine and 'payload.get("co2_ppm", 500.0)' not in engine)

# 5. Media.
media = code_only(ROOT/"cloud/app/api/media.py")
for route in ["upload_part", "complete_media_upload", "get_media"]:
    body = media.split(f"async def {route}")[1].split("\n\n\n")[0]
    check(f"media.{route} requires authentication", "get_current_user" in body)
check("media filenames sanitised", "def sanitize_filename" in media)
check("media paths confined to root", "def resolve_within" in media)
check("media content_hash verified", "does not match declared content_hash" in media)

# 6. No fake artifact hashes.
mf = code_only(ROOT/"cloud/app/api/models_firmware.py")
EMPTY_SHA = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
check("no empty-string digest presented as a model hash", EMPTY_SHA not in mf)
check("no dummy binary served as firmware", "AAHAR_OTA_FIRMWARE_" not in mf)

# 7. Config.
cfg = code_only(ROOT/"cloud/app/config.py")
check("no hardcoded JWT secret default as a Settings field",
      'JWT_SECRET: str = "aahar-secret-key' not in cfg)
check("DEV_MODE defaults off", "DEV_MODE: bool = False" in cfg)
check("production config validated", "_enforce_production_safety" in cfg)

# 8. main.py
main = code_only(ROOT/"cloud/app/main.py")
check("create_all removed from startup", "metadata.create_all" not in main)
check("security headers applied", "SECURITY_HEADERS" in main)
check("readiness does not leak DB errors", "unhealthy: " not in main)

# 9. Mobile fabrication.
scan_code = code_only(ROOT/"mobile/src/app/scan/active.tsx")
check("scan result no longer derived from CRC parity", "crc16 % 2" not in scan_code)
check("scan calls the real inference engine", "new InferenceEngine(bundle)" in scan_code)
check("scan refuses to grade OOD samples", "!inference.in_distribution" in scan_code)
check("no hardcoded aflatoxin band", "aflatoxin_band: 'LOW'" not in scan_code)
check("payload_hash is a real sha256", "sha256Hex(" in scan_code)

# 10. Firmware fail-closed.
for drv, marker in [
    ("firmware-handheld/drivers/as7265x.cpp", "fallback to simulation"),
    ("firmware-handheld/drivers/bme688.cpp", "using fallback simulation"),
    ("firmware-handheld/drivers/camera_ov5640.cpp", "fallback to simulation"),
]:
    check(f"no silent simulation fallback in {pathlib.Path(drv).name}",
          marker not in code_only(ROOT/drv))
guard = (ROOT/"firmware-handheld/include/sensor_guard.h").read_text(encoding="utf-8")
check("sensor simulation gated behind AAHAR_TEST_BUILD", "AAHAR_SIMULATION_ALLOWED" in guard)
probe_ph = code_only(ROOT/"firmware-probe/sensors/isfet_ph.cpp")
check("pH sensor fails closed when absent", "PH_INVALID" in probe_ph)

# 11. MQTT ingestion.
worker = code_only(ROOT/"cloud/app/mqtt/worker.py")
check("MQTT verifies probe identity", "RegisteredProbe" in worker)
check("MQTT does not fabricate channels",
      'data.get("ph", 4.0)' not in worker and 'data.get("co2_ppm", 1000.0)' not in worker)
acl = code_only(ROOT/"infra/emqx/acl.conf")
check("MQTT ACL does not allow anonymous publish",
      "{allow, all, publish" not in acl)

# 12. Mobile production paths.
store = code_only(ROOT/"mobile/src/store/useDeviceStore.ts")
check("MockBleTransport is not the production transport", "MockBleTransport" not in store)
check("no fabricated device telemetry", "battery_pct: 88" not in store)
dbc = code_only(ROOT/"mobile/src/db/client.ts")
check("no silent in-memory persistence fallback",
      "activeClient = new InMemoryDatabaseClient()" not in dbc)
bunker = code_only(ROOT/"mobile/src/app/bunkers/[id].tsx")
check("no hardcoded spoilage forecast", "MOCK_FORECAST" not in bunker)
check("no fabricated probe telemetry", "'mock-1'" not in bunker)

# 13. Dashboard truthfulness.
dash_store = code_only(ROOT/"dashboard/src/store/dashboardStore.ts")
check("no fabricated Ed25519 signature",
      "ed25519:${Array.from" not in dash_store)
alerts = code_only(ROOT/"dashboard/src/pages/AlertConsolePage.tsx")
check("LIVE badge is bound to real socket state", "streamState" in alerts)
check("dashboard has a real API client", (ROOT/"dashboard/src/api/client.ts").exists())

# 14. Tests no longer encode the vulnerability.
conftest = (ROOT/"cloud/tests/conftest.py").read_text(encoding="utf-8")
check("test suite does not enable DEV_MODE", 'os.environ["DEV_MODE"] = "True"' not in conftest)
t_auth = code_only(ROOT/"cloud/tests/test_auth.py")
check("auth tests no longer assert the hardcoded OTP", 'data["dev_code"]' not in t_auth)
for f in ["test_authz_tenancy.py", "test_auth_hardening.py", "test_media_security.py"]:
    check(f"regression suite present: {f}", (ROOT/"cloud/tests"/f).exists())

# 15. Documentation honesty.
readme = (ROOT/"README.md").read_text(encoding="utf-8")
check("README no longer claims an unmeasured RMSEP as achieved",
      "**$\\text{RMSEP} = 0.42" not in readme)
check("README carries an implementation-status disclaimer",
      "There is no trained model" in readme)

# 16. Repo hygiene.
check("media_uploads/ removed", not (ROOT/"media_uploads").exists())
check("aahar_cloud.db removed", not (ROOT/"aahar_cloud.db").exists())
gi = (ROOT/".gitignore").read_text(encoding="utf-8")
check(".env gitignored", re.search(r"^\.env$", gi, re.M) is not None)
check("*.db gitignored", "*.db" in gi)
check(".env.example present", (ROOT/".env.example").exists())

print(f"PASS ({len(passes)})")
for p in passes: print("  [ok]  ", p)
if failures:
    print(f"\nFAIL ({len(failures)})")
    for f in failures: print("  [FAIL]", f)
print(f"\n{len(passes)} passed, {len(failures)} failed")
sys.exit(1 if failures else 0)
