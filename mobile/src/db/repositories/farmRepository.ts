/**
 * AAHAR Mobile — Farm & Herd Repository
 */

import { IDatabaseClient } from '../client';
import { Farm, Herd } from '../../types/contracts';

export interface FarmRow {
  id: string;
  name: string;
  farmer_name: string;
  contact_phone: string;
  location?: string | null;
  fpo_id?: string | null;
  lamport_clocks: string;
  updated_at: string;
}

export interface HerdRow {
  farm_id: string;
  total_cattle: number;
  milking_cows: number;
  dry_cows: number;
  calves: number;
  breeds: string;
  avg_daily_yield_litres: number;
  feed_on_hand: string;
  lamport_clocks: string;
  updated_at: string;
}

export class FarmRepository {
  constructor(private db: IDatabaseClient) {}

  async getFarm(farmId: string): Promise<Farm | null> {
    const row = await this.db.getFirstAsync<FarmRow>(
      'SELECT * FROM farms WHERE id = ? LIMIT 1',
      [farmId],
    );
    if (!row) return null;

    return {
      name: row.name,
      owner_name: row.farmer_name,
      owner_phone: row.contact_phone,
      location: row.location ? JSON.parse(row.location) : { state: 'Punjab', district: 'Ludhiana' },
      fpo_id: row.fpo_id ?? undefined,
      fields: JSON.parse(row.lamport_clocks),
    };
  }

  async upsertFarm(farmId: string, farm: Farm): Promise<void> {
    const lamportJson = JSON.stringify(farm.fields ?? {});
    const locationJson = farm.location ? JSON.stringify(farm.location) : null;
    const updatedAt = new Date().toISOString();

    await this.db.runAsync(
      `INSERT OR REPLACE INTO farms (id, name, farmer_name, contact_phone, location, fpo_id, lamport_clocks, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [farmId, farm.name, farm.owner_name ?? '', farm.owner_phone, locationJson, farm.fpo_id ?? null, lamportJson, updatedAt],
    );
  }

  async getHerd(farmId: string): Promise<Herd | null> {
    const row = await this.db.getFirstAsync<HerdRow>(
      'SELECT * FROM herds WHERE farm_id = ? LIMIT 1',
      [farmId],
    );
    if (!row) return null;

    return {
      farm_id: row.farm_id,
      animals: JSON.parse(row.breeds),
      feed_on_hand: JSON.parse(row.feed_on_hand),
      total_animals: row.total_cattle,
      fields: JSON.parse(row.lamport_clocks),
    };
  }

  async upsertHerd(herd: Herd): Promise<void> {
    const animalsJson = JSON.stringify(herd.animals);
    const feedJson = JSON.stringify(herd.feed_on_hand ?? []);
    const lamportJson = JSON.stringify(herd.fields ?? {});
    const updatedAt = new Date().toISOString();

    await this.db.runAsync(
      `INSERT OR REPLACE INTO herds (farm_id, total_cattle, milking_cows, dry_cows, calves, breeds, avg_daily_yield_litres, feed_on_hand, lamport_clocks, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        herd.farm_id,
        herd.total_animals ?? 10,
        8,
        2,
        0,
        animalsJson,
        14.5,
        feedJson,
        lamportJson,
        updatedAt,
      ],
    );
  }
}
