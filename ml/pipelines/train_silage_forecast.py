"""
AAHAR ML — Training Pipeline: Silage Spoilage Forecast (silage-forecast-v1)
Temporal GRU for 7-day spoilage front propagation prediction.
Exit criteria: MAE ≤ 0.4 day on held-out bunkers.
"""

import json
import sys
from pathlib import Path
from typing import Dict, Optional

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, TensorDataset
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

sys.path.insert(0, str(Path(__file__).parents[2]))
from ml.models.architectures import SilageForecast

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
N_EPOCHS = 100
LR = 5e-4
BATCH_SIZE = 32
SEQ_LEN = 30       # 30 time steps of probe readings
N_CHANNELS = 7     # [pH, core_temp_c, moisture_pct, co2_ppm, o2_pct, voc_index, days]
FORECAST_DAYS = 7
MAE_TARGET = 0.4


def _generate_silage_dataset(n_bunkers: int = 300) -> tuple:
    """
    Generates synthetic silage probe time-series data.
    Models aerobic spoilage front propagation governed by:
      - pH: starts 3.8-4.2, rises as O2 breaches seal
      - Temperature: rises 3-8°C at spoilage front
      - O2: < 0.5% inside, > 2% near face/seal breach
      - CO2: peaks 2000-5000 ppm during active fermentation
    """
    np.random.seed(42)
    X_all = []    # (n, SEQ_LEN, N_CHANNELS)
    Y_all = []    # (n, FORECAST_DAYS) — spoilage front position

    for b in range(n_bunkers):
        # Initial conditions
        base_temp = np.random.uniform(20.0, 30.0)
        initial_ph = np.random.uniform(3.7, 4.2)
        seal_quality = np.random.uniform(0.5, 1.0)   # 1.0 = perfect, 0.5 = leaky
        days_since_seal = np.random.uniform(3, 90)
        moisture = np.random.uniform(58.0, 72.0)

        # O2 ingress rate depends on seal quality
        o2_rate = (1.0 - seal_quality) * 0.08 + np.random.normal(0, 0.01)
        o2_ingress = np.clip(o2_rate * (days_since_seal - 5), 0, 12.0)

        # Temperature rises as aerobic spoilage begins
        temp_rise = max(0.0, (o2_ingress - 2.0) * 1.2 + np.random.normal(0, 0.5))

        # Generate 30 days of readings
        series = []
        for t in range(SEQ_LEN):
            day = days_since_seal - SEQ_LEN + t
            # pH rises as fermentation ends and O2 infiltrates
            ph = initial_ph + max(0.0, (o2_ingress - 2.0) * 0.15) + np.random.normal(0, 0.05)
            ph = float(np.clip(ph, 3.5, 6.5))
            core_temp = base_temp + temp_rise * (1 - np.exp(-0.1 * max(0, t - 20))) + np.random.normal(0, 0.3)
            co2 = max(0.0, 3500.0 - o2_ingress * 200 + np.random.normal(0, 100))
            o2 = float(np.clip(o2_ingress + np.random.normal(0, 0.1), 0, 20))
            voc = float(np.clip(temp_rise * 8 + np.random.normal(0, 2), 0, 100))
            series.append([ph, float(core_temp), float(moisture), float(co2), o2, voc, float(max(0, day))])
        X_all.append(series)

        # Spoilage front position: grows from face as a function of O2 and temperature
        face_dist = 0.0  # metres from face
        front_forecast = []
        for d in range(FORECAST_DAYS):
            daily_advance = max(0.0, (o2_ingress - 1.5) * 0.08 * (1 + temp_rise * 0.05) + np.random.normal(0, 0.05))
            face_dist += daily_advance
            front_forecast.append(float(np.clip(face_dist, 0, 15)))
        Y_all.append(front_forecast)

    return np.array(X_all, dtype=np.float32), np.array(Y_all, dtype=np.float32)


def train(out_dir: Optional[Path] = None, n_bunkers: int = 300) -> Dict:
    print("=== silage-forecast-v1 Training Pipeline ===")
    X, Y = _generate_silage_dataset(n_bunkers=n_bunkers)
    print(f"Dataset: {len(X)} bunker time-series, shape X={X.shape}, Y={Y.shape}")

    X_tr, X_val, Y_tr, Y_val = train_test_split(X, Y, test_size=0.20, random_state=42)

    model = SilageForecast(n_channels=N_CHANNELS, seq_len=SEQ_LEN, forecast_days=FORECAST_DAYS).to(DEVICE)
    optimizer = torch.optim.Adam(model.parameters(), lr=LR, weight_decay=1e-5)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=N_EPOCHS)

    # Normalise inputs
    X_mean = X_tr.mean(axis=(0, 1), keepdims=True)
    X_std  = X_tr.std(axis=(0, 1), keepdims=True)
    X_std[X_std < 1e-6] = 1.0
    X_tr_n  = (X_tr - X_mean) / X_std
    X_val_n = (X_val - X_mean) / X_std

    Xtt = torch.tensor(X_tr_n).to(DEVICE)
    Ytt = torch.tensor(Y_tr).to(DEVICE)
    Xvt = torch.tensor(X_val_n).to(DEVICE)
    dataset = TensorDataset(Xtt, Ytt)
    loader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)

    best_mae = float("inf")
    best_state = None

    for epoch in range(N_EPOCHS):
        model.train()
        for xb, yb in loader:
            optimizer.zero_grad()
            pred = model(xb)
            loss = F.huber_loss(pred, yb, delta=0.5)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
        scheduler.step()

        model.eval()
        with torch.no_grad():
            pred_val = model(Xvt).cpu().numpy()
        mae = float(np.mean(np.abs(pred_val - Y_val)))
        if mae < best_mae:
            best_mae = mae
            best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}

        if (epoch + 1) % 25 == 0:
            print(f"  Epoch {epoch+1}/{N_EPOCHS} — val_MAE={mae:.4f} days")

    model.load_state_dict(best_state)
    model.eval()
    with torch.no_grad():
        final_pred = model(Xvt).cpu().numpy()
    final_mae = float(np.mean(np.abs(final_pred - Y_val)))
    passed = final_mae <= MAE_TARGET
    status = "✅ PASS" if passed else f"⚠️  FAIL (target {MAE_TARGET})"
    print(f"\n── Silage Forecast MAE = {final_mae:.4f} days  {status}")

    metrics = {
        "mae_days": round(final_mae, 4),
        "target_mae": MAE_TARGET,
        "pass": passed,
        "normalization": {
            "X_mean": X_mean.squeeze().tolist(),
            "X_std":  X_std.squeeze().tolist(),
        }
    }

    if out_dir:
        out_dir.mkdir(parents=True, exist_ok=True)
        torch.save(model.state_dict(), out_dir / "gru_silage_forecast.pt")
        with open(out_dir / "silage_forecast_metrics.json", "w") as f:
            json.dump(metrics, f, indent=2)
        print(f"\nArtefacts saved to: {out_dir}")

    return {"metrics": metrics, "all_pass": passed}


if __name__ == "__main__":
    result = train(out_dir=Path("ml/models/weights"), n_bunkers=300)
    print(json.dumps(result, indent=2))
