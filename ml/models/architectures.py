"""
AAHAR ML — Model Architectures (PyTorch)
Section 9.1 Table: 1D-CNN ensemble, Autoencoder, Fusion classifier, Temporal GRU.
All models designed for TFLite int8 quantisation export.
"""

from typing import List, Optional, Tuple
import torch
import torch.nn as nn
import torch.nn.functional as F


# ---------------------------------------------------------------------------
# 1. 1D Squeeze-Excitation Block  (used in CNN + Proximate ensemble)
# ---------------------------------------------------------------------------

class SE1D(nn.Module):
    """1D Squeeze-and-Excitation channel attention block."""

    def __init__(self, channels: int, reduction: int = 8):
        super().__init__()
        self.fc = nn.Sequential(
            nn.AdaptiveAvgPool1d(1),
            nn.Flatten(),
            nn.Linear(channels, max(channels // reduction, 4)),
            nn.ReLU(),
            nn.Linear(max(channels // reduction, 4), channels),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (B, C, L)
        se = self.fc(x).unsqueeze(-1)   # (B, C, 1)
        return x * se


# ---------------------------------------------------------------------------
# 2. NIR Proximate 1D-CNN  (nir-proximate-v1, ~1.8 MB int8)
# ---------------------------------------------------------------------------

class NIRProximate(nn.Module):
    """
    1D-CNN + PLS ensemble for predicting: CP, Moisture, ADF, NDF, EE, Ash, ME.
    Input: (B, 228) preprocessed spectrum (SNV + 1st derivative).
    Output: (B, 7) predicted proximate values.
    """

    PROXIMATE_ORDER = ["crude_protein_pct_dm", "moisture_pct", "adf_pct_dm",
                       "ndf_pct_dm", "crude_fat_pct_dm", "ash_pct_dm", "me_mj_kg_dm"]

    def __init__(self, n_bands: int = 228, n_outputs: int = 7):
        super().__init__()
        self.encoder = nn.Sequential(
            # Block 1: broad features
            nn.Conv1d(1, 32, kernel_size=11, padding=5),
            nn.BatchNorm1d(32),
            nn.ReLU(),
            SE1D(32),
            nn.MaxPool1d(2),         # → 114

            # Block 2: mid-level features
            nn.Conv1d(32, 64, kernel_size=7, padding=3),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            SE1D(64),
            nn.MaxPool1d(2),         # → 57

            # Block 3: narrow band-specific features
            nn.Conv1d(64, 128, kernel_size=5, padding=2),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            SE1D(128),
            nn.MaxPool1d(3),         # → 19

            # Block 4: high-level
            nn.Conv1d(128, 64, kernel_size=3, padding=1),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.AdaptiveAvgPool1d(8),  # → 8
        )

        self.head = nn.Sequential(
            nn.Flatten(),           # 64 × 8 = 512
            nn.Linear(512, 128),
            nn.ReLU(),
            nn.Dropout(0.25),
            nn.Linear(128, n_outputs),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (B, 228)
        x = x.unsqueeze(1)          # → (B, 1, 228)
        feat = self.encoder(x)
        return self.head(feat)


# ---------------------------------------------------------------------------
# 3. NIR Adulterant Multi-label Classifier  (nir-adulterant-v1, ~0.9 MB int8)
# ---------------------------------------------------------------------------

class NIRAdulterant(nn.Module):
    """
    Multi-label binary classifier for Urea, Sand/Silica, Melamine.
    Input: (B, 228) preprocessed spectrum.
    Output: (B, 3) logits — apply sigmoid to get detection probabilities.
    """

    def __init__(self, n_bands: int = 228):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv1d(1, 32, kernel_size=9, padding=4), nn.ReLU(),
            nn.Conv1d(32, 64, kernel_size=7, padding=3), nn.ReLU(),
            SE1D(64),
            nn.MaxPool1d(4),         # → 57
            nn.Conv1d(64, 64, kernel_size=5, padding=2), nn.ReLU(),
            nn.AdaptiveAvgPool1d(6),
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),            # 64×6=384
            nn.Linear(384, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, 3),       # urea, silica, melamine
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = x.unsqueeze(1)
        feat = self.conv(x)
        return self.classifier(feat)


# ---------------------------------------------------------------------------
# 4. NIR Anomaly Autoencoder  (nir-anomaly-v1, ~0.6 MB int8)
# ---------------------------------------------------------------------------

class NIRAutoencoder(nn.Module):
    """
    Conv autoencoder for unknown adulterant detection via reconstruction error.
    High reconstruction error → anomaly flagged → lab referral triggered.
    Input: (B, 228) preprocessed spectrum.
    Output: (B, 228) reconstructed spectrum.
    """

    def __init__(self, n_bands: int = 228, latent_dim: int = 32):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Conv1d(1, 16, 11, padding=5), nn.ReLU(),
            nn.MaxPool1d(2),         # → 114
            nn.Conv1d(16, 32, 7, padding=3), nn.ReLU(),
            nn.MaxPool1d(2),         # → 57
            nn.Conv1d(32, 32, 5, padding=2), nn.ReLU(),
            nn.AdaptiveAvgPool1d(latent_dim),   # → 32
        )
        self.decoder = nn.Sequential(
            nn.Upsample(scale_factor=4),        # → 128
            nn.Conv1d(32, 32, 5, padding=2), nn.ReLU(),
            nn.Upsample(size=228),
            nn.Conv1d(32, 16, 7, padding=3), nn.ReLU(),
            nn.Conv1d(16, 1, 11, padding=5),
        )

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        inp = x.unsqueeze(1)
        latent = self.encoder(inp)
        recon = self.decoder(latent).squeeze(1)
        # Reconstruction error per sample
        error = F.mse_loss(recon, x, reduction='none').mean(dim=1)
        return recon, error


# ---------------------------------------------------------------------------
# 5. Toxin Fusion Classifier  (fusion-toxin-v1, ~0.3 MB int8)
# ---------------------------------------------------------------------------

class ToxinFusion(nn.Module):
    """
    Gradient-boosting inspired MLP over 64-dim fused features:
    [NIR spectral summary (32), UV fluorescence (4), vision texture (16), storage history (12)].
    Output: 3-class Aflatoxin band: LOW/MEDIUM/HIGH.
    """

    def __init__(self, feature_dim: int = 64, n_classes: int = 3):
        super().__init__()
        self.head = nn.Sequential(
            nn.Linear(feature_dim, 128),
            nn.ReLU(),
            nn.Dropout(0.35),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, n_classes),
        )
        # NIR → 32-dim summary
        self.nir_encoder = nn.Sequential(
            nn.Conv1d(1, 16, 11, padding=5), nn.ReLU(),
            nn.AdaptiveAvgPool1d(16),
            nn.Flatten(),
            nn.Linear(256, 32),
            nn.ReLU(),
        )

    def forward(
        self,
        spectrum: torch.Tensor,          # (B, 228)
        uv_features: torch.Tensor,       # (B, 4)  [fluorescence, rgb_r, rgb_g, rgb_b]
        vision_features: torch.Tensor,   # (B, 16) mould texture features
        storage_features: torch.Tensor,  # (B, 12) [moisture_at_storage, days, temp_avg, ...]
    ) -> torch.Tensor:
        nir_feat = self.nir_encoder(spectrum.unsqueeze(1))    # (B, 32)
        fused = torch.cat([nir_feat, uv_features, vision_features, storage_features], dim=1)  # (B, 64)
        return self.head(fused)


# ---------------------------------------------------------------------------
# 6. Silage Forecast Temporal GRU  (silage-forecast-v1, ~1.2 MB int8)
# ---------------------------------------------------------------------------

class SilageForecast(nn.Module):
    """
    Temporal CNN + GRU for 7-day silage spoilage front propagation forecast.
    Input: (B, T=30, C=7) multivariate probe time series.
    Channels: [pH, core_temp_c, moisture_pct, co2_ppm, o2_pct, voc_index, days_since_sealing]
    Output: (B, 7) spoilage front position in metres from face for days 1-7.
    """

    def __init__(self, n_channels: int = 7, seq_len: int = 30, forecast_days: int = 7):
        super().__init__()
        # Temporal conv for short-range pattern extraction
        self.tcn = nn.Sequential(
            nn.Conv1d(n_channels, 32, kernel_size=3, padding=1), nn.ReLU(),
            nn.Conv1d(32, 64, kernel_size=3, padding=1), nn.ReLU(),
        )
        self.gru = nn.GRU(input_size=64, hidden_size=128, num_layers=2,
                          batch_first=True, dropout=0.25)
        self.fc = nn.Sequential(
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, forecast_days),
            nn.ReLU(),      # spoilage front position ≥ 0
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (B, T, C)
        tcn_in = x.permute(0, 2, 1)          # → (B, C, T)
        feat = self.tcn(tcn_in)               # → (B, 64, T)
        feat = feat.permute(0, 2, 1)          # → (B, T, 64)
        _, h = self.gru(feat)
        h_last = h[-1]                        # → (B, 128)
        return self.fc(h_last)                # → (B, 7)


# ---------------------------------------------------------------------------
# 7. Feed Type Classifier (for advisory engine routing)
# ---------------------------------------------------------------------------

class FeedTypeClassifier(nn.Module):
    """
    15-class feed type classifier from NIR spectrum.
    Used to auto-suggest feed type if farmer skips manual selection.
    """
    N_FEED_TYPES = 15

    def __init__(self, n_bands: int = 228):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv1d(1, 32, 9, padding=4), nn.ReLU(),
            nn.MaxPool1d(2),
            nn.Conv1d(32, 64, 7, padding=3), nn.ReLU(),
            nn.AdaptiveAvgPool1d(8),
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),       # 64×8=512
            nn.Linear(512, 64),
            nn.ReLU(),
            nn.Linear(64, self.N_FEED_TYPES),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.classifier(self.features(x.unsqueeze(1)))
