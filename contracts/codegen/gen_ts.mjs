#!/usr/bin/env node
/**
 * AAHAR Contract Code Generator — TypeScript
 *
 * Generates TypeScript interfaces, Zod schemas, and type utilities from:
 *   - /contracts/schema/*.schema.json
 *   - /contracts/enums/index.json
 *   - /contracts/units.json
 *   - /contracts/thresholds.json
 *
 * Output:
 *   - mobile/src/types/contracts.ts
 *   - dashboard/src/types/contracts.ts
 *
 * Usage: node contracts/codegen/gen_ts.mjs
 * CI usage: node contracts/codegen/validate.mjs (checks hash of output)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const CONTRACTS = join(__dirname, '..');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function indent(str, n = 2) {
  return str.split('\n').map(l => ' '.repeat(n) + l).join('\n');
}

const HEADER = `/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  AAHAR — AUTO-GENERATED FROM /contracts — DO NOT EDIT       ║
 * ║  Source: contracts/codegen/gen_ts.mjs                       ║
 * ║  To change types, edit the JSON Schema and re-run codegen.  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Generated at: ${new Date().toISOString()}
 * Schema version: see individual interface JSDoc
 */

/* eslint-disable */
// @ts-nocheck — This file is generated. Linting runs on the source schemas.

`;

// ─── JSON Schema → TypeScript type mapper ─────────────────────────────────────

function jsonTypeToTs(prop, required = true) {
  const nullable = Array.isArray(prop.type) && prop.type.includes('null');
  const rawType = Array.isArray(prop.type)
    ? prop.type.find(t => t !== 'null')
    : prop.type;

  let tsType;
  switch (rawType) {
    case 'string':
      if (prop.enum) {
        tsType = prop.enum.map(e => e === null ? 'null' : `'${e}'`).join(' | ');
      } else if (prop.format === 'uuid') {
        tsType = 'string /* uuid */';
      } else if (prop.format === 'date-time') {
        tsType = 'string /* ISO 8601 datetime */';
      } else if (prop.format === 'date') {
        tsType = 'string /* ISO 8601 date */';
      } else if (prop.format === 'uri') {
        tsType = 'string /* URI */';
      } else {
        tsType = 'string';
      }
      break;
    case 'number':   tsType = 'number'; break;
    case 'integer':  tsType = 'number'; break;
    case 'boolean':  tsType = 'boolean'; break;
    case 'array':
      if (prop.items) {
        if (prop.items.$ref) {
          tsType = `${refToTypeName(prop.items.$ref)}[]`;
        } else if (prop.items.type) {
          tsType = `${jsonTypeToTs(prop.items, true)}[]`;
        } else {
          tsType = 'unknown[]';
        }
      } else {
        tsType = 'unknown[]';
      }
      break;
    case 'object':
      if (prop.additionalProperties && prop.additionalProperties.type) {
        tsType = `Record<string, ${jsonTypeToTs(prop.additionalProperties, true)}>`;
      } else if (prop.additionalProperties === true || !prop.properties) {
        tsType = 'Record<string, unknown>';
      } else {
        tsType = schemaToInlineType(prop);
      }
      break;
    default:
      tsType = 'unknown';
  }

  return nullable ? `${tsType} | null` : tsType;
}

function refToTypeName(ref) {
  // Handles $defs references like #/$defs/NumericResult
  const parts = ref.split('/');
  return parts[parts.length - 1];
}

function schemaToInlineType(schema) {
  if (!schema.properties) return 'Record<string, unknown>';
  const required = schema.required || [];
  const lines = Object.entries(schema.properties).map(([key, prop]) => {
    const opt = required.includes(key) ? '' : '?';
    const tsType = jsonTypeToTs(prop);
    const desc = prop.description ? `  /** ${prop.description} */\n` : '';
    return `${desc}  ${key}${opt}: ${tsType};`;
  });
  return `{\n${lines.join('\n')}\n}`;
}

function schemaToInterface(name, schema, defs = {}) {
  const required = schema.required || [];
  const props = schema.properties || {};

  const fields = Object.entries(props).map(([key, prop]) => {
    const isRequired = required.includes(key);
    const opt = isRequired ? '' : '?';
    let tsType;

    if (prop.$ref) {
      tsType = refToTypeName(prop.$ref);
    } else if (prop.oneOf) {
      tsType = prop.oneOf.map(s => {
        if (s.$ref) return refToTypeName(s.$ref);
        if (s.type === 'null') return 'null';
        return jsonTypeToTs(s);
      }).join(' | ');
    } else {
      tsType = jsonTypeToTs(prop);
    }

    const desc = prop.description
      ? `  /**\n   * ${prop.description.replace(/\n/g, '\n   * ')}\n   */\n`
      : '';
    return `${desc}  ${key}${opt}: ${tsType};`;
  }).join('\n\n');

  // Extract $defs as separate interfaces
  const defInterfaces = Object.entries(defs).map(([defName, defSchema]) => {
    return schemaToInterface(defName, defSchema);
  }).join('\n\n');

  return `export interface ${name} {\n${fields}\n}${defInterfaces ? '\n\n' + defInterfaces : ''}`;
}

// ─── Enum generator ────────────────────────────────────────────────────────────

function generateEnums(enumsJson) {
  const lines = ['// ─── Enumerations ────────────────────────────────────────────────────────────\n'];

  for (const [enumName, enumDef] of Object.entries(enumsJson.enums)) {
    lines.push(`/** ${enumDef.description} */`);
    lines.push(`export type ${enumName} =`);
    const values = enumDef.values.map(v => `  | '${v.key}'`);
    lines.push(values.join('\n') + ';\n');

    // Also generate a const object with metadata
    lines.push(`export const ${enumName}Meta: Record<${enumName}, {`);
    // Infer metadata shape from first entry
    const firstVal = enumDef.values[0];
    const metaKeys = Object.keys(firstVal).filter(k => k !== 'key');
    for (const mk of metaKeys) {
      const sample = firstVal[mk];
      const tsT = sample === null ? 'string | null' : typeof sample === 'boolean' ? 'boolean' : typeof sample === 'number' ? 'number' : 'string';
      lines.push(`  ${mk}: ${tsT};`);
    }
    lines.push(`}> = {`);
    for (const v of enumDef.values) {
      const { key, ...meta } = v;
      lines.push(`  '${key}': ${JSON.stringify(meta)},`);
    }
    lines.push(`};\n`);
  }

  return lines.join('\n');
}

// ─── Zod schema generator ──────────────────────────────────────────────────────

function generateZodSchemas(enumsJson) {
  const lines = [
    `// ─── Zod Runtime Validators ───────────────────────────────────────────────────`,
    `// These are generated alongside the TypeScript types for runtime validation`,
    `// of sync payloads received from devices and the cloud.\n`,
    `import { z } from 'zod';\n`,
  ];

  for (const [enumName, enumDef] of Object.entries(enumsJson.enums)) {
    const values = enumDef.values.map(v => `'${v.key}'`);
    lines.push(`export const z${enumName} = z.enum([${values.join(', ')}]);`);
  }
  lines.push('');

  // NumericResult zod schema (used everywhere)
  lines.push(`export const zNumericResult = z.object({`);
  lines.push(`  value:      z.number(),`);
  lines.push(`  ci_low:     z.number(),`);
  lines.push(`  ci_high:    z.number(),`);
  lines.push(`  confidence: z.number().min(0).max(1),`);
  lines.push(`  unit:       z.string(),`);
  lines.push(`});\n`);

  lines.push(`export type NumericResult = z.infer<typeof zNumericResult>;\n`);

  // SyncEnvelope zod schema
  lines.push(`export const zSyncEnvelope = z.object({`);
  lines.push(`  id:                 z.string().uuid(),`);
  lines.push(`  entity:             z.enum(['measurement','spectrum','farm','herd','bunker','probe_reading','advisory','batch','sync_run','device_calibration','ota_event']),`);
  lines.push(`  schema_version:     z.number().int().positive(),`);
  lines.push(`  farm_id:            z.string().uuid(),`);
  lines.push(`  device_id:          z.string().regex(/^AAHAR-(P|L|S|G)-[0-9]{6}$/),`);
  lines.push(`  captured_at:        z.string().datetime({ offset: true }),`);
  lines.push(`  server_received_at: z.string().datetime({ offset: true }).nullable(),`);
  lines.push(`  clock:              z.object({ device: z.string(), counter: z.number().int().min(0) }),`);
  lines.push(`  sync_state:         z.enum(['pending','in_flight','synced','conflict','rejected']),`);
  lines.push(`  sync_reject_reason: z.string().nullable().optional(),`);
  lines.push(`  payload_hash:       z.string().regex(/^sha256:[a-f0-9]{64}$/),`);
  lines.push(`  payload:            z.record(z.unknown()),`);
  lines.push(`  tags:               z.array(z.string().max(64)).max(20).optional(),`);
  lines.push(`});\n`);
  lines.push(`export type SyncEnvelope = z.infer<typeof zSyncEnvelope>;\n`);

  return lines.join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function generate() {
  console.log('🔧 AAHAR TypeScript codegen starting...\n');

  const enumsJson = readJson(join(CONTRACTS, 'enums', 'index.json'));
  const schemas = [
    'sync_envelope', 'measurement', 'spectrum', 'farm',
    'herd', 'bunker', 'probe_reading', 'advisory', 'batch'
  ];

  const schemaParsed = {};
  for (const s of schemas) {
    schemaParsed[s] = readJson(join(CONTRACTS, 'schema', `${s}.schema.json`));
  }

  // Build the output
  let output = HEADER;

  // Enums section
  output += generateEnums(enumsJson) + '\n';

  // Zod + types
  output += generateZodSchemas(enumsJson) + '\n';

  // Core shared type
  output += `// ─── Core Shared Types ────────────────────────────────────────────────────────\n\n`;
  output += `/** NumericResult: every measurement value with confidence interval. Never display value without CI. */\n`;
  output += `export interface NumericResult {\n`;
  output += `  value:      number;\n`;
  output += `  ci_low:     number; // Lower bound of 95% CI\n`;
  output += `  ci_high:    number; // Upper bound of 95% CI\n`;
  output += `  confidence: number; // 0–1. < 0.6 = low confidence warning\n`;
  output += `  unit:       string; // Key from units.json\n`;
  output += `}\n\n`;

  // LamportClock
  output += `export interface LamportClock { device: string; counter: number; }\n\n`;

  // SyncEnvelope
  output += schemaToInterface('SyncEnvelope', schemaParsed['sync_envelope']) + '\n\n';

  // All other schemas
  const tsNames = {
    'measurement': 'Measurement',
    'spectrum': 'Spectrum',
    'farm': 'Farm',
    'herd': 'Herd',
    'bunker': 'Bunker',
    'probe_reading': 'ProbeReading',
    'advisory': 'Advisory',
    'batch': 'Batch',
  };

  for (const [key, tsName] of Object.entries(tsNames)) {
    const schema = schemaParsed[key];
    const defs = schema['$defs'] || {};
    output += `// ── ${tsName} (schema v${schema.version ?? 1}) ──\n`;
    if (schema.description) {
      output += `/** ${schema.description} */\n`;
    }
    output += schemaToInterface(tsName, schema, defs) + '\n\n';
  }

  // Utility types
  output += `
// ─── Utility Types ────────────────────────────────────────────────────────────

/** A sync envelope wrapping a specific entity payload */
export type TypedSyncEnvelope<T extends SyncEnvelope['entity'], P> = Omit<SyncEnvelope, 'entity' | 'payload'> & {
  entity: T;
  payload: P;
};

export type MeasurementEnvelope  = TypedSyncEnvelope<'measurement',  Measurement>;
export type SpectrumEnvelope      = TypedSyncEnvelope<'spectrum',     Spectrum>;
export type FarmEnvelope          = TypedSyncEnvelope<'farm',         Farm>;
export type HerdEnvelope          = TypedSyncEnvelope<'herd',         Herd>;
export type BunkerEnvelope        = TypedSyncEnvelope<'bunker',       Bunker>;
export type ProbeReadingEnvelope  = TypedSyncEnvelope<'probe_reading',ProbeReading>;
export type AdvisoryEnvelope      = TypedSyncEnvelope<'advisory',     Advisory>;
export type BatchEnvelope         = TypedSyncEnvelope<'batch',        Batch>;

/** All syncable record types as a discriminated union */
export type AnyRecord =
  | MeasurementEnvelope
  | SpectrumEnvelope
  | FarmEnvelope
  | HerdEnvelope
  | BunkerEnvelope
  | ProbeReadingEnvelope
  | AdvisoryEnvelope
  | BatchEnvelope;

/** Sync push request body */
export interface SyncPushRequest {
  records: AnyRecord[];
  idempotency_key: string; // sha256 of sorted record IDs
}

/** Sync push response per record */
export interface SyncPushResult {
  id: string;
  status: 'accepted' | 'duplicate' | 'conflict' | 'rejected';
  reject_reason?: string;
  server_received_at?: string;
}

/** Sync push response body */
export interface SyncPushResponse {
  results: SyncPushResult[];
  server_time: string;
}

/** Sync pull response */
export interface SyncPullResponse {
  records: AnyRecord[];
  cursor: string;
  has_more: boolean;
  server_time: string;
}

/** Sync handshake response */
export interface SyncHandshake {
  server_time:      string;
  schema_version:   number;
  model_version:    string;
  firmware_version: string;
  cursor:           string;
  thresholds_hash:  string; // sha256 of thresholds.json — if different, pull new thresholds
}
`;

  // Write to both targets
  const targets = [
    join(ROOT, 'mobile', 'src', 'types', 'contracts.ts'),
    join(ROOT, 'dashboard', 'src', 'types', 'contracts.ts'),
  ];

  for (const target of targets) {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, output, 'utf-8');
    console.log(`  ✅ Written: ${target.replace(ROOT, '.')}`);
  }

  // Write hash file — normalise CRLF→LF so hash is platform-independent
  const normalised = output.replace(/\r\n/g, '\n');
  const hash = createHash('sha256').update(normalised).digest('hex');
  writeFileSync(join(CONTRACTS, 'codegen', '.ts_hash'), hash, 'utf-8');
  console.log(`\n  📌 Hash recorded: ${hash.slice(0, 16)}…`);
  console.log('\n✅ TypeScript codegen complete.\n');
}

generate();
