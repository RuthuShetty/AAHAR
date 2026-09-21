"""
AAHAR ML — Training Pipeline: Anomaly Autoencoder (nir-anomaly-v1)
Conv autoencoder for unknown adulterant detection via reconstruction error.
Exit criteria: AUC ≥ 0.88 on held-out out-of-distribution anomalies.
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
from sklearn.metrics import roc_auc_score

sys.path.insert(0, str(Path(__file__).parents[2]))
from ml.data.generator import generate_dataset, synthesize_spectrum
from ml.pipelines.preprocessing import preprocess
from ml.models.architectures import NIRAutoencoder

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
N_EPOCHS = 80
LR = 5e-4
BATCH_SIZE = 32
AUC_TARGET = 0.88


def train(out_dir: Optional[Path] = None, n_samples: int = 600) -> Dict:
    print("=== nir-anomaly-v1 Autoencoder Training Pipeline ===")

    # Train only on clean samples (no adulterant spiking)
    spectra_raw, meta, _ = generate_dataset(n_samples_per_feed=max(40, n_samples // 15), spiked_ratio=0.0)
    clean_idx = [i for i, m in enumerate(meta) if not m["is_adulterated"]]
    X_clean = preprocess(spectra_raw[clean_idx])
    print(f"Clean training set: {len(X_clean)} samples")

    X_tr, X_val = train_test_split(X_clean, test_size=0.2, random_state=42)

    model = NIRAutoencoder(n_bands=X_tr.shape[1]).to(DEVICE)
    optimizer = torch.optim.Adam(model.parameters(), lr=LR)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=N_EPOCHS)

    Xtt = torch.tensor(X_tr.astype(np.float32)).to(DEVICE)
    dataset = TensorDataset(Xtt)
    loader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)

    print("Training autoencoder on clean spectra …")
    best_loss = float("inf")
    best_state = None

    for epoch in range(N_EPOCHS):
        model.train()
        for (xb,) in loader:
            optimizer.zero_grad()
            _, errors = model(xb)
            loss = errors.mean()
            loss.backward()
            optimizer.step()
        scheduler.step()

        model.eval()
        with torch.no_grad():
            Xvt = torch.tensor(X_val.astype(np.float32)).to(DEVICE)
            _, val_errors = model(Xvt)
            val_loss = val_errors.mean().item()

        if val_loss < best_loss:
            best_loss = val_loss
            best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}

        if (epoch + 1) % 20 == 0:
            print(f"  Epoch {epoch+1}/{N_EPOCHS} — val_recon_error={val_loss:.4f}")

    model.load_state_dict(best_state)

    # ── Evaluate: AUC of reconstruction error for anomaly detection ──────────
    # Anomalies: spiked samples with melamine (unusual pattern)
    anoms_raw, anom_meta, _ = generate_dataset(n_samples_per_feed=10, spiked_ratio=0.80)
    spiked_idx = [i for i, m in enumerate(anom_meta) if m["adulterants"]["melamine_pct"] > 0]
    if len(spiked_idx) == 0:
        # Force some melamine spikes for evaluation
        spiked_raw = []
        for _ in range(40):
            prox = {"moisture_pct": 10.0, "crude_protein_pct_dm": 35.0, "adf_pct_dm": 16.0,
                    "ndf_pct_dm": 28.0, "crude_fat_pct_dm": 8.0, "ash_pct_dm": 7.0, "me_mj_kg_dm": 12.0}
            adlt = {"melamine_pct": np.random.choice([1.0, 2.5, 5.0])}
            spiked_raw.append(synthesize_spectrum("MUSTARD_CAKE", prox, adlt))
        spiked_raw = np.array(spiked_raw)
        spiked_idx = list(range(len(spiked_raw)))
    else:
        spiked_raw = anoms_raw[spiked_idx]

    X_anoms = preprocess(spiked_raw)
    X_eval = np.vstack([X_val, X_anoms])
    y_labels = np.array([0] * len(X_val) + [1] * len(X_anoms))

    model.eval()
    with torch.no_grad():
        Xe = torch.tensor(X_eval.astype(np.float32)).to(DEVICE)
        _, errors = model(Xe)
        errors_np = errors.cpu().numpy()

    auc = roc_auc_score(y_labels, errors_np)
    passed = auc >= AUC_TARGET
    status = "✅ PASS" if passed else f"⚠️  FAIL (target {AUC_TARGET})"
    print(f"\n── Anomaly AUC = {auc:.3f}  {status}")

    # Determine threshold from clean val set (99th percentile)
    with torch.no_grad():
        Xvt2 = torch.tensor(X_val.astype(np.float32)).to(DEVICE)
        _, clean_errors = model(Xvt2)
        threshold = float(np.percentile(clean_errors.cpu().numpy(), 99.0))
    print(f"   Reconstruction error threshold (99th pct): {threshold:.4f}")

    metrics = {
        "auc": round(auc, 4),
        "target_auc": AUC_TARGET,
        "pass": passed,
        "threshold_99pct": round(threshold, 6),
    }

    if out_dir:
        out_dir.mkdir(parents=True, exist_ok=True)
        torch.save(model.state_dict(), out_dir / "autoencoder_anomaly.pt")
        with open(out_dir / "anomaly_metrics.json", "w") as f:
            json.dump(metrics, f, indent=2)
        print(f"\nArtefacts saved to: {out_dir}")

    return {"metrics": metrics, "all_pass": passed}


if __name__ == "__main__":
    result = train(out_dir=Path("ml/models/weights"), n_samples=600)
    print(json.dumps(result, indent=2))
