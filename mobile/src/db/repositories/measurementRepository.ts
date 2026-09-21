/**
 * AAHAR Mobile — Measurement, Spectrum & Advisory Repository
 * Aligned with contracts/schema/measurement.schema.json, spectrum.schema.json, advisory.schema.json.
 */

import { IDatabaseClient } from '../client';
import { Measurement, Spectrum, Advisory } from '../../types/contracts';

export interface MeasurementRecord {
  id: string;
  measurement: Measurement;
  spectrum?: Spectrum;
  advisory?: Advisory;
}

export class MeasurementRepository {
  constructor(private db: IDatabaseClient) {}

  async saveTestResult(
    id: string,
    farmId: string,
    deviceId: string,
    capturedAt: string,
    measurement: Measurement,
    spectrum: Spectrum,
    advisory?: Advisory,
  ): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      // 1. Insert Measurement
      await this.db.runAsync(
        `INSERT OR REPLACE INTO measurements (
          id, device_id, farm_id, captured_at, feed_type, sample_batch_code,
          overall_grade, in_distribution, proximates, adulterants, safety,
          value_for_money, notes, operator_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          deviceId,
          farmId,
          capturedAt,
          measurement.feed_type,
          null,
          measurement.derived.feed_grade,
          measurement.in_distribution ? 1 : 0,
          JSON.stringify(measurement.proximates),
          JSON.stringify(measurement.safety.adulteration),
          JSON.stringify(measurement.safety),
          measurement.derived.value_for_money ? JSON.stringify(measurement.derived.value_for_money) : null,
          null,
          null,
          new Date().toISOString(),
        ],
      );

      // 2. Insert Spectrum
      await this.db.runAsync(
        `INSERT OR REPLACE INTO spectra (
          measurement_id, wavelength_start_nm, wavelength_end_nm, num_bands,
          wavelengths, intensities, repeats, temperature_c, humidity_pct,
          ambient_light_lux, dark_subtracted, white_referenced, integration_time_ms, raw_crc16
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          spectrum.measurement_id,
          spectrum.wavelengths_nm[0] ?? 900,
          spectrum.wavelengths_nm[spectrum.wavelengths_nm.length - 1] ?? 1700,
          spectrum.wavelengths_nm.length,
          JSON.stringify(spectrum.wavelengths_nm),
          JSON.stringify(spectrum.intensities_corrected[0] ?? []),
          JSON.stringify(spectrum.intensities_raw),
          31.4,
          62.5,
          null,
          1,
          1,
          spectrum.integration_time_us ? spectrum.integration_time_us / 1000 : 40,
          0x4a2b,
        ],
      );

      // 3. Insert Advisory if present
      if (advisory) {
        await this.db.runAsync(
          `INSERT OR REPLACE INTO advisories (
            id, measurement_id, overall_grade, summary_en, summary_hi, summary_pa,
            summary_mr, summary_gu, summary_te, summary_kn, summary_bn,
            actions, herd_impacts, ration_adjustments, generated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `adv-${id}`,
            advisory.measurement_id,
            advisory.feed_grade,
            advisory.text.en,
            advisory.text.hi ?? advisory.text.en,
            advisory.text.pa ?? advisory.text.en,
            advisory.text.mr ?? advisory.text.en,
            advisory.text.gu ?? advisory.text.en,
            advisory.text.te ?? advisory.text.en,
            advisory.text.kn ?? advisory.text.en,
            advisory.text.bn ?? advisory.text.en,
            JSON.stringify(advisory.actions),
            JSON.stringify(advisory.herd_impacts),
            JSON.stringify(advisory.ration_correction?.adjustments ?? []),
            advisory.computed_at ?? new Date().toISOString(),
          ],
        );
      }
    });
  }

  async getMeasurement(id: string): Promise<MeasurementRecord | null> {
    const mRow = await this.db.getFirstAsync<any>(
      'SELECT * FROM measurements WHERE id = ? LIMIT 1',
      [id],
    );
    if (!mRow) return null;

    const proximates = JSON.parse(mRow.proximates);
    const safety = JSON.parse(mRow.safety);
    const vfm = mRow.value_for_money ? JSON.parse(mRow.value_for_money) : undefined;

    const measurement: Measurement = {
      feed_type: mRow.feed_type,
      device_sku: 'AAHAR_PRO',
      scan_duration_ms: 2200,
      proximates: proximates,
      safety: safety,
      derived: {
        feed_grade: mRow.overall_grade,
        value_for_money: vfm,
      },
      confidence_overall: 0.92,
      in_distribution: Boolean(mRow.in_distribution),
    };

    // Load Spectrum
    let spectrum: Spectrum | undefined;
    const sRow = await this.db.getFirstAsync<any>(
      'SELECT * FROM spectra WHERE measurement_id = ? LIMIT 1',
      [id],
    );
    if (sRow) {
      const wavelengths_nm = JSON.parse(sRow.wavelengths);
      const intensities = JSON.parse(sRow.intensities);
      spectrum = {
        measurement_id: sRow.measurement_id,
        device_sku: 'AAHAR_PRO',
        sensor_model: 'C12880MA',
        wavelengths_nm,
        intensities_raw: [intensities, intensities, intensities],
        intensities_corrected: [intensities],
        dark_reference: new Array(wavelengths_nm.length).fill(100),
        white_reference: new Array(wavelengths_nm.length).fill(60000),
        repeats: 3,
      };
    }

    // Load Advisory
    let advisory: Advisory | undefined;
    const aRow = await this.db.getFirstAsync<any>(
      'SELECT * FROM advisories WHERE measurement_id = ? LIMIT 1',
      [id],
    );
    if (aRow) {
      advisory = {
        measurement_id: aRow.measurement_id,
        feed_grade: aRow.overall_grade,
        actions: JSON.parse(aRow.actions),
        ration_correction: {
          adjustments: JSON.parse(aRow.ration_adjustments),
        },
        herd_impacts: JSON.parse(aRow.herd_impacts),
        text: {
          en: aRow.summary_en,
          hi: aRow.summary_hi,
          pa: aRow.summary_pa,
          mr: aRow.summary_mr,
          gu: aRow.summary_gu,
          te: aRow.summary_te,
          kn: aRow.summary_kn,
          bn: aRow.summary_bn,
        },
      };
    }

    return { id: mRow.id, measurement, spectrum, advisory };
  }

  async listRecent(limit = 20): Promise<Array<Measurement & { id: string; captured_at: string }>> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM measurements ORDER BY captured_at DESC LIMIT ${limit}`,
    );
    return rows.map((mRow) => {
      const proximates = JSON.parse(mRow.proximates);
      const safety = JSON.parse(mRow.safety);
      const vfm = mRow.value_for_money ? JSON.parse(mRow.value_for_money) : undefined;
      return {
        id: mRow.id,
        captured_at: mRow.captured_at,
        feed_type: mRow.feed_type,
        device_sku: 'AAHAR_PRO',
        scan_duration_ms: 2200,
        proximates: proximates,
        safety: safety,
        derived: {
          feed_grade: mRow.overall_grade,
          value_for_money: vfm,
        },
        confidence_overall: 0.92,
        in_distribution: Boolean(mRow.in_distribution),
      };
    });
  }
}
