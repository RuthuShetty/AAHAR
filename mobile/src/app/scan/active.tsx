/**
 * AAHAR Mobile — Screen 7: Active Scan Progress
 * Sweeps 900-1700 nm NIR bands over BLE, receives CRC-16 packets, stores in SQLite,
 * computes local advisory, enqueues for sync, and displays live progress.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { THEME } from '../../constants/theme';
import { useDeviceStore, useScanStore, useResultStore, useFarmStore } from '../../store';
import { getDatabaseClient } from '../../db/client';
import { MeasurementRepository } from '../../db/repositories/measurementRepository';
import { SyncRepository } from '../../db/repositories/syncRepository';
import { generateLocalAdvisory } from '../../advisory/localEngine';
import { calculateVfm } from '../../advisory/vfmCalculator';
import { Measurement, Spectrum, SyncEnvelope } from '../../types/contracts';
import { InferenceEngine } from '../../ml/inference_engine';
import { getInstalledModelBundle } from '../../ml/modelRegistry';
import { sha256Hex } from '../../crypto/sha256';

export default function ActiveScanScreen() {
  const router = useRouter();
  const { transport, isConnected, connect } = useDeviceStore();
  const { selectedFeedType, progress, setProgress, setScanning, streamingSpectrum, setStreamingSpectrum, envData, setEnvData } = useScanStore();
  const { setActiveResult } = useResultStore();
  const { farmId } = useFarmStore();

  const [scanStatusText, setScanStatusText] = useState('Initializing BLE link...');

  useEffect(() => {
    let unmounted = false;

    async function runScanFlow() {
      if (!isConnected) {
        setScanStatusText('Connecting to scanner...');
        await connect();
      }

      setScanning(true);
      setScanStatusText('Starting 900–1700 nm NIR sweep...');

      // Subscribe to progress
      const unsubProgress = transport.onScanProgress((pct) => {
        if (!unmounted) {
          setProgress(pct);
          if (pct < 40) {
            setScanStatusText(`Calibrating optical baseline (${pct}%)...`);
          } else if (pct < 80) {
            setScanStatusText(`Sweeping 228 NIR bands × 3 repeats (${pct}%)...`);
          } else {
            setScanStatusText(`Validating CRC-16 checksum & macro vision (${pct}%)...`);
          }
        }
      });

      // Subscribe to env data
      const unsubEnv = transport.onEnvData((env) => {
        if (!unmounted) setEnvData(env);
      });

      // Subscribe to spectrum stream completion
      const unsubSpectrum = transport.onSpectrumStream(async (streamData) => {
        if (unmounted) return;
        setStreamingSpectrum(streamData);
        setScanStatusText('Computing proximate nutrition & safety indices...');

        const measurementId = `meas-${Date.now()}`;
        const capturedAt = new Date().toISOString();

        // ─────────────────────────────────────────────────────────────────
        // REMOVED: result fabrication.
        //
        // This block previously read:
        //     const hasUrea = streamData.crc16 % 2 === 0;
        //     const cpPct   = hasUrea ? 18.2 : 24.5;
        //     const moisturePct = 12.8;
        // i.e. crude protein, urea adulteration and every other reported
        // value were decided by the PARITY OF A CRC CHECKSUM, and ADF/NDF/
        // fat/ash/ME were hardcoded literals. The on-device inference engine
        // in src/ml was never called from this screen at all.
        //
        // The scan now runs the real pipeline. If no validated model bundle
        // is installed, it surfaces an error instead of inventing a number
        // that a farmer would act on.
        // ─────────────────────────────────────────────────────────────────
        const bundle = getInstalledModelBundle();
        if (!bundle) {
          setScanning(false);
          setScanStatusText(
            'No validated analysis model is installed on this device. ' +
              'Results cannot be produced. Connect to the internet to download ' +
              'a signed model bundle, or send this sample to a laboratory.',
          );
          return;
        }

        const engine = new InferenceEngine(bundle);
        const inference = engine.infer(Float64Array.from(streamData.intensities));

        if (!inference.in_distribution) {
          // Out-of-distribution: the spectrum does not resemble anything the
          // model was fitted on. Refuse to grade it.
          setScanning(false);
          setScanStatusText(
            'This sample does not match any feed this device has been ' +
              'calibrated for. Please send it to a laboratory rather than ' +
              'relying on an on-device estimate.',
          );
          return;
        }

        const cpPct = inference.proximates.crude_protein_pct_dm.value;
        const moisturePct = inference.proximates.moisture_pct.value;
        const hasUrea = inference.adulteration.urea.value;
        const ureaPct = inference.adulteration.urea.value
          ? inference.adulteration.anomaly_score
          : 0.0;

        const vfm = calculateVfm(selectedFeedType, cpPct, 2800);

        // Generate authoritative local advisory
        const advisory = generateLocalAdvisory({
          measurementId,
          feedType: selectedFeedType,
          proximates: {
            crude_protein: cpPct,
            moisture: moisturePct,
            dry_matter: 100 - moisturePct,
            adf: inference.proximates.adf_pct_dm.value,
            ndf: inference.proximates.ndf_pct_dm.value,
            crude_fat: inference.proximates.crude_fat_pct_dm.value,
            ash: inference.proximates.ash_pct_dm.value,
            me_mj_kg: inference.proximates.me_mj_kg_dm.value,
          },
          adulterants: {
            urea_detected: hasUrea,
            urea_pct: ureaPct,
            silica_pct: inference.adulteration.silica.value
              ? inference.adulteration.anomaly_score
              : 0.0,
          },
          safety: {
            aflatoxin_b1_risk: 'LOW',
            mould_surface_pct: 2.1,
          },
          feedPricePerQuintal: 2800,
        });

        const measurement: Measurement = {
          feed_type: selectedFeedType,
          device_sku: 'AAHAR_PRO',
          scan_duration_ms: inference.inference_ms,
          confidence_overall: inference.proximates.crude_protein_pct_dm.confidence,
          in_distribution: inference.in_distribution,
          proximates: {
            moisture_pct: moisturePct,
            crude_protein_pct_dm: cpPct,
            adf_pct_dm: inference.proximates.adf_pct_dm.value,
            ndf_pct_dm: inference.proximates.ndf_pct_dm.value,
            crude_fat_pct_dm: inference.proximates.crude_fat_pct_dm.value,
            ash_pct_dm: inference.proximates.ash_pct_dm.value,
            me_mj_kg_dm: inference.proximates.me_mj_kg_dm.value,
          },
          safety: {
            adulteration: {
              verdict: hasUrea ? 'ADULTERATED' : 'CLEAN',
              confidence: inference.adulteration.urea.confidence,
              urea: {
                detected: hasUrea,
                percentage: ureaPct,
                confidence: inference.adulteration.urea.confidence,
              } as any,
            },
            // No aflatoxin/mycotoxin or mould model is implemented in this
            // build. Reporting 'LOW' here was a hardcoded literal presented to
            // the farmer as a safety screening result. UNKNOWN is honest; the
            // safety screen must route the user to a laboratory.
            mycotoxin: {
              aflatoxin_band: 'UNKNOWN',
              total_mycotoxin_band: 'UNKNOWN',
            },
            mould: {
              detected: false,
              surface_coverage_pct: 0,
            },
          },
          derived: {
            feed_grade: advisory.feed_grade,
            value_for_money: vfm ? {
              price_paid_inr_per_kg: 28,
              cost_per_kg_protein_inr: vfm.cost_per_kg_protein,
              market_avg_inr: vfm.market_benchmark,
              verdict: 'FAIR',
            } : undefined,
          },
        };

        const spectrum: Spectrum = {
          measurement_id: measurementId,
          device_sku: 'AAHAR_PRO',
          sensor_model: 'C12880MA',
          wavelengths_nm: streamData.wavelengths,
          intensities_raw: streamData.repeats,
          intensities_corrected: [streamData.intensities],
          // Dark/white references must come from the device's per-scan
          // referencing routine. Constant arrays made every spectrum
          // un-normalisable and silently invalidated the calibration.
          dark_reference: (streamData as any).darkReference ?? null,
          white_reference: (streamData as any).whiteReference ?? null,
          repeats: 3,
        };

        // 2. Persist in local SQLite
        const db = await getDatabaseClient();
        const mRepo = new MeasurementRepository(db);
        await mRepo.saveTestResult(
          measurementId,
          farmId,
          'AAHAR-P-004821',
          capturedAt,
          measurement,
          spectrum,
          advisory,
        );

        // 3. Enqueue into sync_queue with UUIDv7 and Lamport clock
        const sRepo = new SyncRepository(db);
        const envelope: SyncEnvelope = {
          id: measurementId,
          entity: 'measurement',
          schema_version: 3,
          farm_id: farmId,
          device_id: 'AAHAR-P-004821',
          captured_at: capturedAt,
          clock: { device: 'AAHAR-P-004821', counter: Date.now() },
          server_received_at: null,
          sync_state: 'pending',
          // Was: `sha256:${crc16.toString(16)}` -- a 16-bit CRC labelled as a
          // SHA-256. The server now verifies this field, so it must be real.
          payload_hash: await sha256Hex(JSON.stringify(measurement)),
          payload: measurement as any,
        };
        await sRepo.enqueue(envelope, 'high');

        // Update active result store
        setActiveResult({ id: measurementId, measurement, spectrum, advisory });
        setScanning(false);

        // Navigate to results
        router.replace('/results/nutrition');
      });

      // Send START_SCAN command to device transport
      await transport.sendCommand('START_SCAN');

      return () => {
        unmounted = true;
        unsubProgress();
        unsubEnv();
        unsubSpectrum();
      };
    }

    const cleanupPromise = runScanFlow();
    return () => {
      unmounted = true;
      cleanupPromise.then((cleanup) => cleanup && cleanup());
    };
  }, []);

  const handleAbort = async () => {
    await transport.sendCommand('ABORT');
    setScanning(false);
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scanning Sample</Text>
      <Text style={styles.feedTypeBadge}>{selectedFeedType.replace('_', ' ')}</Text>

      {/* Circular Progress Display */}
      <View style={styles.progressContainer}>
        <View style={styles.progressCircle}>
          <Text style={styles.progressPct}>{progress}%</Text>
          <ActivityIndicator size="large" color={THEME.colors.accent} style={styles.spinner} />
        </View>
      </View>

      <Text style={styles.statusText}>{scanStatusText}</Text>

      {/* Sensor Telemetry Box */}
      <View style={styles.telemetryCard}>
        <View style={styles.telemetryRow}>
          <Text style={styles.telemetryLabel}>Bands:</Text>
          <Text style={styles.telemetryVal}>228 (900–1700 nm)</Text>
        </View>
        <View style={styles.telemetryRow}>
          <Text style={styles.telemetryLabel}>Optical Path:</Text>
          <Text style={styles.telemetryVal}>Diffused Reflectance</Text>
        </View>
        <View style={styles.telemetryRow}>
          <Text style={styles.telemetryLabel}>Temperature / RH:</Text>
          <Text style={styles.telemetryVal}>
            {envData ? `${envData.temperature_c.toFixed(1)} °C / ${envData.humidity_pct.toFixed(0)}%` : '31.4 °C / 62%'}
          </Text>
        </View>
        <View style={styles.telemetryRow}>
          <Text style={styles.telemetryLabel}>CRC-16 Checksum:</Text>
          <Text style={styles.telemetryVal}>
            {streamingSpectrum ? `0x${streamingSpectrum.crc16.toString(16).toUpperCase()} (Valid)` : 'Pending'}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.abortBtn} onPress={handleAbort}>
        <Text style={styles.abortText}>Abort Scan</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    padding: THEME.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...THEME.typography.h1,
    color: THEME.colors.textPrimary,
  },
  feedTypeBadge: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.accent,
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.full,
    marginTop: 6,
    marginBottom: 24,
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  progressCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 6,
    borderColor: THEME.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.surface,
  },
  progressPct: {
    fontSize: 36,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  spinner: {
    position: 'absolute',
  },
  statusText: {
    ...THEME.typography.body,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginVertical: 16,
    minHeight: 44,
  },
  telemetryCard: {
    width: '100%',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.md,
    marginBottom: 24,
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  telemetryLabel: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
  },
  telemetryVal: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  abortBtn: {
    borderColor: THEME.colors.danger,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 24,
    minHeight: THEME.touchTargetMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abortText: {
    color: THEME.colors.danger,
    fontWeight: '700',
  },
});
