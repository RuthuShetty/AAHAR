/**
 * AAHAR Mobile — Bunker & Probe Reading Repository
 * Aligned with contracts/schema/bunker.schema.json and probe_reading.schema.json.
 */

import { IDatabaseClient } from '../client';
import { Bunker, ProbeReading } from '../../types/contracts';

export class BunkerRepository {
  constructor(private db: IDatabaseClient) {}

  async listBunkers(farmId: string): Promise<Array<Bunker & { id: string }>> {
    const rows = await this.db.getAllAsync<any>(
      'SELECT * FROM bunkers WHERE farm_id = ? ORDER BY updated_at DESC',
      [farmId],
    );

    return rows.map((r) => ({
      id: r.id,
      farm_id: r.farm_id,
      name: r.name,
      type: r.structure_type === 'BUNKER_WALL' ? 'BUNKER' : r.structure_type,
      dimensions: JSON.parse(r.dimensions),
      ensiling_date: r.ensiling_date,
      crop_type: r.crop_type,
      probe_positions: JSON.parse(r.probe_ids).map((pid: string, idx: number) => ({
        probe_device_id: pid,
        x_m: 5.0 * (idx + 1),
        y_m: 1.5,
        z_m: 2.0,
      })),
      fields: JSON.parse(r.lamport_clocks),
    }));
  }

  async getBunker(id: string): Promise<(Bunker & { id: string }) | null> {
    const r = await this.db.getFirstAsync<any>(
      'SELECT * FROM bunkers WHERE id = ? LIMIT 1',
      [id],
    );
    if (!r) return null;

    return {
      id: r.id,
      farm_id: r.farm_id,
      name: r.name,
      type: r.structure_type === 'BUNKER_WALL' ? 'BUNKER' : r.structure_type,
      dimensions: JSON.parse(r.dimensions),
      ensiling_date: r.ensiling_date,
      crop_type: r.crop_type,
      probe_positions: JSON.parse(r.probe_ids).map((pid: string, idx: number) => ({
        probe_device_id: pid,
        x_m: 5.0 * (idx + 1),
        y_m: 1.5,
        z_m: 2.0,
      })),
      fields: JSON.parse(r.lamport_clocks),
    };
  }

  async upsertBunker(id: string, bunker: Bunker): Promise<void> {
    const probeIds = bunker.probe_positions.map((p) => p.probe_device_id);
    await this.db.runAsync(
      `INSERT OR REPLACE INTO bunkers (
        id, farm_id, name, structure_type, dimensions, ensiling_date,
        crop_type, probe_ids, lamport_clocks, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        bunker.farm_id,
        bunker.name,
        bunker.type,
        JSON.stringify(bunker.dimensions),
        bunker.ensiling_date,
        bunker.crop_type,
        JSON.stringify(probeIds),
        JSON.stringify(bunker.fields ?? {}),
        new Date().toISOString(),
      ],
    );
  }

  async saveProbeReading(id: string, reading: ProbeReading): Promise<void> {
    const coreTemp = reading.temperatures_c[0]?.value_c ?? 26.5;
    await this.db.runAsync(
      `INSERT OR REPLACE INTO probe_readings (
        id, probe_id, bunker_id, captured_at, depth_m, ph, core_temperature_c,
        moisture_pct, co2_ppm, o2_pct, voc_index, fermentation_index
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        reading.probe_device_id,
        reading.bunker_id,
        new Date().toISOString(),
        reading.temperatures_c[0]?.depth_cm ? reading.temperatures_c[0].depth_cm / 100 : 1.2,
        reading.ph.value,
        coreTemp,
        reading.moisture_pct.value,
        reading.co2_ppm.value,
        reading.o2_pct.value,
        reading.voc?.voc_index ?? 35,
        reading.fermentation_quality_index,
      ],
    );
  }

  async getLatestReadings(bunkerId: string): Promise<Array<ProbeReading & { id: string }>> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM probe_readings WHERE bunker_id = ? ORDER BY captured_at DESC LIMIT 20`,
      [bunkerId],
    );

    return rows.map((r) => ({
      id: r.id,
      bunker_id: r.bunker_id,
      probe_device_id: r.probe_id,
      ph: { value: r.ph, raw_mv: 412 },
      temperatures_c: [{ depth_cm: r.depth_m * 100, value_c: r.core_temperature_c }],
      moisture_pct: { value: r.moisture_pct },
      co2_ppm: { value: r.co2_ppm },
      o2_pct: { value: r.o2_pct },
      fermentation_quality_index: r.fermentation_index,
    }));
  }
}
