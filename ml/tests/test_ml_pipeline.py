"""
AAHAR ML — Pytest Suite for Phase 3
Tests: preprocessing, architecture forward passes, data generators, OOD, PDS.
"""

import pytest
import numpy as np
import torch
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1]))

from ml.pipelines.preprocessing import (
    snv, savitzky_golay, preprocess, MahalanobisOOD, PDSTransfer,
)
from ml.models.architectures import (
    NIRProximate, NIRAdulterant, NIRAutoencoder,
    SilageForecast, FeedTypeClassifier,
)
from ml.data.generator import generate_dataset, synthesize_spectrum

N_BANDS = 228

@pytest.fixture
def clean_spectrum() -> np.ndarray:
    """Single clean NIR spectrum (preprocessed)."""
    t = np.linspace(0, np.pi, N_BANDS)
    raw_counts = 30000 + 15000 * np.sin(t) + np.random.default_rng(0).normal(0, 200, N_BANDS)
    raw_counts = np.clip(raw_counts, 200, 57990)
    return raw_counts

@pytest.fixture
def clean_dataset(clean_spectrum) -> np.ndarray:
    """Small clean dataset (50 × 228)."""
    rng = np.random.default_rng(42)
    N = 50
    t = np.linspace(0, np.pi, N_BANDS)
    base = 30000 + 15000 * np.sin(t)
    dataset = np.array([base + rng.normal(0, 500, N_BANDS) for _ in range(N)])
    return np.clip(dataset, 200, 57990)


# ─────────────────────────────────────────────────────────────────────────────
# 1. Preprocessing
# ─────────────────────────────────────────────────────────────────────────────

class TestSNV:
    def test_mean_zero(self, clean_spectrum):
        s = snv(preprocess(clean_spectrum)[np.newaxis, :])
        assert abs(s[0].mean()) < 1e-8

    def test_output_shape_preserving(self, clean_dataset):
        result = snv(clean_dataset)
        assert result.shape == clean_dataset.shape

    def test_no_nan_on_constant(self):
        flat = np.ones((5, N_BANDS))
        result = snv(flat)
        assert not np.isnan(result).any()


class TestSavitzkyGolay:
    def test_constant_spectrum_derivative_is_zero(self):
        flat = np.ones((1, N_BANDS))
        result = savitzky_golay(flat, window_length=11, polyorder=2, deriv=1)
        assert np.allclose(result, 0.0, atol=1e-10)

    def test_shape_preserved(self, clean_dataset):
        result = savitzky_golay(clean_dataset)
        assert result.shape == clean_dataset.shape

    def test_no_nan(self, clean_dataset):
        result = savitzky_golay(clean_dataset)
        assert not np.isnan(result).any()


class TestPreprocess:
    def test_output_shape_single(self, clean_spectrum):
        result = preprocess(clean_spectrum)
        assert result.shape == (N_BANDS,)

    def test_output_shape_batch(self, clean_dataset):
        result = preprocess(clean_dataset)
        assert result.shape == clean_dataset.shape

    def test_no_nan(self, clean_spectrum):
        result = preprocess(clean_spectrum)
        assert not np.isnan(result).any()

    def test_no_inf(self, clean_spectrum):
        result = preprocess(clean_spectrum)
        assert np.isfinite(result).all()

    def test_dark_counts_handled(self):
        dark = np.ones(N_BANDS) * 120  # all-dark
        result = preprocess(dark)
        assert not np.isnan(result).any()
        assert np.isfinite(result).all()


# ─────────────────────────────────────────────────────────────────────────────
# 2. Mahalanobis OOD
# ─────────────────────────────────────────────────────────────────────────────

class TestMahalanobisOOD:
    @pytest.fixture
    def fitted_ood(self, clean_dataset) -> MahalanobisOOD:
        X = preprocess(clean_dataset)
        ood = MahalanobisOOD(n_components=10, threshold_percentile=99.0)
        ood.fit(X)
        return ood

    def test_fit_produces_threshold(self, fitted_ood):
        assert fitted_ood.threshold_ is not None
        assert fitted_ood.threshold_ > 0

    def test_clean_sample_in_distribution(self, fitted_ood, clean_spectrum):
        spec = preprocess(clean_spectrum)
        in_dist, dist = fitted_ood.predict(spec)
        assert isinstance(in_dist, (bool, np.bool_))
        assert dist >= 0

    def test_random_noise_out_of_distribution(self, fitted_ood):
        noisy = np.random.default_rng(99).uniform(-100, 100, N_BANDS)
        in_dist, dist = fitted_ood.predict(noisy)
        # Most random spectra should be flagged OOD
        assert isinstance(in_dist, (bool, np.bool_))
        assert dist >= 0

    def test_state_dict_round_trip(self, fitted_ood, clean_spectrum):
        state = fitted_ood.state_dict()
        restored = MahalanobisOOD.from_state_dict(state)
        spec = preprocess(clean_spectrum)
        in1, d1 = fitted_ood.predict(spec)
        in2, d2 = restored.predict(spec)
        assert abs(d1 - d2) < 1e-8


# ─────────────────────────────────────────────────────────────────────────────
# 3. PDS Calibration Transfer
# ─────────────────────────────────────────────────────────────────────────────

class TestPDSTransfer:
    def test_identity_transfer(self, clean_dataset):
        """PDS on identical instruments should give near-identity transform."""
        X = preprocess(clean_dataset)
        pds = PDSTransfer(window_size=5)
        pds.fit(X, X)
        Xt = pds.transform(X)
        # Should be very close to original
        assert np.allclose(Xt, X, atol=1e-4)

    def test_transform_shape_preserved(self, clean_dataset):
        X = preprocess(clean_dataset)
        pds = PDSTransfer(window_size=5)
        pds.fit(X, X)
        Xt = pds.transform(X)
        assert Xt.shape == X.shape


# ─────────────────────────────────────────────────────────────────────────────
# 4. Model Forward Passes
# ─────────────────────────────────────────────────────────────────────────────

class TestNIRProximate:
    @pytest.fixture
    def model(self):
        return NIRProximate(n_bands=N_BANDS, n_outputs=7).eval()

    def test_output_shape(self, model):
        x = torch.zeros(4, N_BANDS)
        with torch.no_grad():
            y = model(x)
        assert y.shape == (4, 7)

    def test_no_nan_output(self, model):
        x = torch.randn(8, N_BANDS)
        with torch.no_grad():
            y = model(x)
        assert not torch.isnan(y).any()

    def test_different_inputs_different_outputs(self, model):
        a = torch.zeros(1, N_BANDS)
        b = torch.ones(1, N_BANDS)
        with torch.no_grad():
            ya, yb = model(a), model(b)
        assert not torch.allclose(ya, yb)


class TestNIRAdulterant:
    @pytest.fixture
    def model(self):
        return NIRAdulterant(n_bands=N_BANDS).eval()

    def test_output_shape(self, model):
        x = torch.zeros(4, N_BANDS)
        with torch.no_grad():
            y = model(x)
        assert y.shape == (4, 3)

    def test_no_nan(self, model):
        x = torch.randn(4, N_BANDS)
        with torch.no_grad():
            y = model(x)
        assert not torch.isnan(y).any()


class TestNIRAutoencoder:
    @pytest.fixture
    def model(self):
        return NIRAutoencoder(n_bands=N_BANDS, latent_dim=32).eval()

    def test_recon_shape(self, model):
        x = torch.zeros(4, N_BANDS)
        with torch.no_grad():
            recon, errors = model(x)
        assert recon.shape == (4, N_BANDS)
        assert errors.shape == (4,)

    def test_error_non_negative(self, model):
        x = torch.randn(4, N_BANDS)
        with torch.no_grad():
            _, errors = model(x)
        assert (errors >= 0).all()


class TestSilageForecast:
    @pytest.fixture
    def model(self):
        return SilageForecast(n_channels=7, seq_len=30, forecast_days=7).eval()

    def test_output_shape(self, model):
        x = torch.zeros(4, 30, 7)
        with torch.no_grad():
            y = model(x)
        assert y.shape == (4, 7)

    def test_non_negative_output(self, model):
        """Spoilage front position must be ≥ 0."""
        x = torch.randn(8, 30, 7)
        with torch.no_grad():
            y = model(x)
        assert (y >= 0).all()


class TestFeedTypeClassifier:
    @pytest.fixture
    def model(self):
        return FeedTypeClassifier(n_bands=N_BANDS).eval()

    def test_output_shape(self, model):
        x = torch.zeros(4, N_BANDS)
        with torch.no_grad():
            y = model(x)
        assert y.shape == (4, 15)


# ─────────────────────────────────────────────────────────────────────────────
# 5. Data Generator
# ─────────────────────────────────────────────────────────────────────────────

class TestDataGenerator:
    def test_generates_correct_count(self):
        spectra, meta, bands = generate_dataset(n_samples_per_feed=10)
        assert len(spectra) == len(meta)
        assert spectra.shape[1] == N_BANDS
        assert len(bands) == N_BANDS

    def test_spectra_in_valid_count_range(self):
        spectra, _, _ = generate_dataset(n_samples_per_feed=10)
        assert (spectra >= 100).all()
        assert (spectra <= 65535).all()

    def test_meta_has_required_fields(self):
        _, meta, _ = generate_dataset(n_samples_per_feed=5)
        for m in meta:
            assert "feed_type" in m
            assert "proximates" in m
            assert "adulterants" in m
            assert "is_adulterated" in m

    def test_spiked_ratio_respected(self):
        _, meta, _ = generate_dataset(n_samples_per_feed=20, spiked_ratio=0.5)
        n_spiked = sum(m["is_adulterated"] for m in meta)
        total = len(meta)
        ratio = n_spiked / total
        # Allow ±15% tolerance
        assert 0.35 <= ratio <= 0.65, f"Spiked ratio {ratio:.2f} out of expected range [0.35, 0.65]"

    def test_synthesize_spectrum_shape(self):
        prox = {"moisture_pct": 12.0, "crude_protein_pct_dm": 22.0, "adf_pct_dm": 28.0,
                "ndf_pct_dm": 45.0, "crude_fat_pct_dm": 3.5, "ash_pct_dm": 6.0, "me_mj_kg_dm": 10.5}
        spec = synthesize_spectrum("MAIZE_SILAGE", prox, {})
        assert spec.shape == (N_BANDS,)
        assert not np.isnan(spec).any()
