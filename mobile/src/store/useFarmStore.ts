/**
 * AAHAR Mobile — Farm & Herd Store (Zustand)
 * Aligned with contracts/schema/farm.schema.json and herd.schema.json.
 */

import { create } from 'zustand';
import { Farm, Herd } from '../types/contracts';

interface FarmState {
  farmId: string;
  farm: Farm | null;
  herd: Herd | null;

  setFarm: (id: string, farm: Farm) => void;
  setHerd: (herd: Herd) => void;
}

export const useFarmStore = create<FarmState>((set) => ({
  farmId: 'farm-def-001',
  farm: {
    name: 'Green Dairy Farm',
    owner_phone: '+919876543210',
    owner_name: 'Gurpreet Singh',
    location: {
      state: 'Punjab',
      district: 'Ludhiana',
      village: 'Samrala',
    },
    language_preference: 'pa',
    fields: {
      name: { device: 'AAHAR-P-004821', counter: 1 },
    },
  },
  herd: {
    farm_id: 'farm-def-001',
    animals: [
      {
        id: 'group-01',
        breed: 'MURRAH',
        lactation_stage: 'MID_LACTATION',
        count: 8,
        milk_yield_kg_day: 14.5,
      },
      {
        id: 'group-02',
        breed: 'HF_CROSS',
        lactation_stage: 'DRY_PREGNANT',
        count: 4,
        milk_yield_kg_day: 0,
      },
    ],
    feed_on_hand: [
      { feed_type: 'COTTONSEED_CAKE', quantity_kg: 500 },
      { feed_type: 'MAIZE_SILAGE', quantity_kg: 4000 },
      { feed_type: 'WHEAT_STRAW', quantity_kg: 1200 },
    ],
    total_animals: 12,
    fields: {
      animals: { device: 'AAHAR-P-004821', counter: 1 },
    },
  },

  setFarm: (farmId, farm) => set({ farmId, farm }),
  setHerd: (herd) => set({ herd }),
}));
