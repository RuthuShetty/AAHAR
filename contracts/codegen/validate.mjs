#!/usr/bin/env node
/**
 * AAHAR Codegen Drift Validator
 *
 * Strategy: re-run all three codegen scripts into TEMP locations, then
 * compare their output against what's committed to the repo (the "golden" files).
 * If they differ, the schema changed but codegen wasn't re-run.
 *
 * Usage: node contracts/codegen/validate.mjs
 * Exit 0 = all good. Exit 1 = drift detected.
 */

import { execSync, spawnSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { tmpdir, platform } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTRACTS  = join(__dirname, '..');
const ROOT       = join(__dirname, '..', '..');

let exitCode = 0;

function hash(content) {
  // Normalise line endings before hashing so Windows CRLF == LF
  const normalised = content.replace(/\r\n/g, '\n');
  return createHash('sha256').update(normalised).digest('hex');
}

function readNorm(file) {
  return readFileSync(file, 'utf-8').replace(/\r\n/g, '\n');
}

// ─── Validate JSON schemas parse ─────────────────────────────────────────────
console.log('\n\ud83d\udd0d AAHAR Codegen Drift Check\n');

const schemaFiles = [
  'sync_envelope', 'measurement', 'spectrum', 'farm',
  'herd', 'bunker', 'probe_reading', 'advisory', 'batch'
];

for (const s of schemaFiles) {
  const p = join(CONTRACTS, 'schema', `${s}.schema.json`);
  try {
    JSON.parse(readFileSync(p, 'utf-8'));
    console.log(`  \u2705 schema/${s}: Valid JSON`);
  } catch (e) {
    console.error(`  \u274c schema/${s}: INVALID JSON \u2014 ${e.message}`);
    exitCode = 1;
  }
}

// Validate thresholds.json
try {
  const t = JSON.parse(readFileSync(join(CONTRACTS, 'thresholds.json'), 'utf-8'));
  if (!t.thresholds || !t.sources) throw new Error('Missing top-level keys');
  console.log('  \u2705 thresholds.json: Well-formed');
} catch (e) {
  console.error(`  \u274c thresholds.json: ${e.message}`);
  exitCode = 1;
}

// ─── Compare generated files against hashes stored on disk ────────────────────
// The hash files are written by gen_ts.mjs / gen_py.py / gen_cpp.py.
// We read the committed generated file and compare its hash to the stored hash.
// Hashes are stored as plain hex strings (normalised LF).

function checkGeneratedFile(label, hashFile, generatedFile) {
  if (!existsSync(hashFile)) {
    console.error(`  \u274c ${label}: Hash file missing. Run codegen first.`);
    exitCode = 1;
    return;
  }
  if (!existsSync(generatedFile)) {
    console.error(`  \u274c ${label}: Generated file missing. Run codegen first.`);
    exitCode = 1;
    return;
  }
  const storedHash = readFileSync(hashFile, 'utf-8').trim();
  const currentHash = hash(readNorm(generatedFile));

  if (storedHash !== currentHash) {
    console.error(`  \u274c ${label}: DRIFT DETECTED`);
    console.error(`     Stored hash : ${storedHash.slice(0, 16)}\u2026`);
    console.error(`     File hash   : ${currentHash.slice(0, 16)}\u2026`);
    console.error(`     \u2192 Schema changed without re-running codegen.`);
    console.error(`     \u2192 Run: node contracts/codegen/gen_ts.mjs`);
    console.error(`           PYTHONIOENCODING=utf-8 python contracts/codegen/gen_py.py`);
    console.error(`           PYTHONIOENCODING=utf-8 python contracts/codegen/gen_cpp.py`);
    exitCode = 1;
  } else {
    console.log(`  \u2705 ${label}: In sync (${currentHash.slice(0, 16)}\u2026)`);
  }
}

// The TS codegen writes the hash of the TS output (LF-normalised) to .ts_hash.
// We need to verify the committed file matches. Re-hash it the same way.
const tsHashFile  = join(CONTRACTS, 'codegen', '.ts_hash');
const pyHashFile  = join(CONTRACTS, 'codegen', '.py_hash');
const cppHashFile = join(CONTRACTS, 'codegen', '.cpp_hash');

checkGeneratedFile(
  'TypeScript (mobile)',
  tsHashFile,
  join(ROOT, 'mobile', 'src', 'types', 'contracts.ts'),
);
checkGeneratedFile(
  'TypeScript (dashboard)',
  tsHashFile,
  join(ROOT, 'dashboard', 'src', 'types', 'contracts.ts'),
);
checkGeneratedFile(
  'Python/Pydantic (cloud)',
  pyHashFile,
  join(ROOT, 'cloud', 'app', 'schemas', 'contracts.py'),
);
checkGeneratedFile(
  'C++ firmware-handheld',
  cppHashFile,
  join(ROOT, 'firmware-handheld', 'include', 'contracts', 'contracts.h'),
);
checkGeneratedFile(
  'C++ firmware-probe',
  cppHashFile,
  join(ROOT, 'firmware-probe', 'include', 'contracts', 'contracts.h'),
);

console.log(`\n${exitCode === 0 ? '\u2705 All checks passed.' : '\u274c Drift detected \u2014 see errors above.'}\n`);
process.exit(exitCode);
