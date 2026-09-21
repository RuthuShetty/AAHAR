"""
AAHAR ML — Training Pipeline: Proximate Prediction (nir-proximate-v1)
PLS-R ensemble + 1D-CNN for CP, Moisture, ADF, NDF, EE, Ash, ME.
Exit criteria: per-parameter RMSEP ≤ Table 9.1 targets.
"""

import json
import sys
from pathlib import Path
from typing import Dict, Optional, Tuple

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from sklearn.cross_decomposition import PLSRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error

# Local imports
sys.path.insert(0, str(Path(__file__).parents[2]))
from ml.data.generator import generate_dataset
from ml.pipelines.preprocessing import preprocess, MahalanobisOOD
from ml.models.architectures import NIRProximate

# ─── Targets (Table 4.1 RMSEP budget) ──────────────────────────────────────
RMSEP_TARGETS = {
    "crude_protein_pct_dm": 1.5,
    "moisture_pct":          1.2,
    "adf_pct_dm":            2.1,
    "ndf_pct_dm":            2.6,
    "crude_fat_pct_dm":      0.8,
    "ash_pct_dm":            1.1,
    "me_mj_kg_dm":           0.6,
}
PROXIMATE_KEYS = list(RMSEP_TARGETS.keys())

# ─── Configuration ──────────────────────────────────────────────────────────
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
N_PLS_LV = 12       # PLS latent variables (Table 4.1: 12 LV)
N_EPOCHS = 60
LR = 1e-3
BATCH_SIZE = 32

def _build_xy(meta, spectra_raw: np.ndarray):
    """Preprocess spectra and extract label matrix."""
    X = preprocess(spectra_raw)
    Y = np.array([[m["proximates"].get(k, 0.0) for k in PROXIMATE_KEYS] for m in meta])
    return X, Y

def _rmsep(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return float(np.sqrt(mean_squared_error(y_true, y_pred)))

def train_pls(X_tr: np.ndarray, Y_tr: np.ndarray, X_val: np.ndarray, Y_val: np.ndarray) -> Tuple[PLSRegression, Dict]:
    """Fit PLS-R with 12 latent variables."""
    pls = PLSRegression(n_components=N_PLS_LV)
    pls.fit(X_tr, Y_tr)
    Y_pred = pls.predict(X_val)
    metrics = {}
    for i, key in enumerate(PROXIMATE_KEYS):
        rmsep = _rmsep(Y_val[:, i], Y_pred[:, i])
        target = RMSEP_TARGETS[key]
        metrics[key] = {"rmsep": round(rmsep, 3), "target": target, "pass": rmsep <= target}
    return pls, metrics

def train_cnn(X_tr: np.ndarray, Y_tr: np.ndarray, X_val: np.ndarray, Y_val: np.ndarray) -> Tuple[NIRProximate, Dict]:
    """Train 1D-CNN for proximate prediction with MSE loss."""
    model = NIRProximate(n_bands=X_tr.shape[1]).to(DEVICE)
    optimizer = torch.optim.Adam(model.parameters(), lr=LR, weight_decay=1e-5)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=N_EPOCHS)

    # Normalise labels per output
    Y_mean = Y_tr.mean(axis=0, keepdims=True)
    Y_std = Y_tr.std(axis=0, keepdims=True)
    Y_std[Y_std < 1e-8] = 1.0
    Y_tr_n = (Y_tr - Y_mean) / Y_std
    Y_val_n = (Y_val - Y_mean) / Y_std

    Xtt = torch.tensor(X_tr.astype(np.float32)).to(DEVICE)
    Ytt = torch.tensor(Y_tr_n.astype(np.float32)).to(DEVICE)
    Xvt = torch.tensor(X_val.astype(np.float32)).to(DEVICE)
    Yvt = torch.tensor(Y_val_n.astype(np.float32)).to(DEVICE)

    dataset = TensorDataset(Xtt, Ytt)
    loader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)

    best_val_loss = float("inf")
    best_state = None

    for epoch in range(N_EPOCHS):
        model.train()
        for xb, yb in loader:
            optimizer.zero_grad()
            pred = model(xb)
            loss = F.mse_loss(pred, yb)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
        scheduler.step()

        model.eval()
        with torch.no_grad():
            val_pred = model(Xvt)
            val_loss = F.mse_loss(val_pred, Yvt).item()

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}

        if (epoch + 1) % 20 == 0:
            print(f"  Epoch {epoch+1}/{N_EPOCHS} — val_loss={val_loss:.4f}")

    model.load_state_dict(best_state)

    # Evaluate CNN
    model.eval()
    with torch.no_grad():
        Y_pred_n = model(Xvt).cpu().numpy()
    Y_pred = Y_pred_n * Y_std + Y_mean
    metrics = {}
    for i, key in enumerate(PROXIMATE_KEYS):
        rmsep = _rmsep(Y_val[:, i], Y_pred[:, i])
        target = RMSEP_TARGETS[key]
        metrics[key] = {"rmsep": round(rmsep, 3), "target": target, "pass": rmsep <= target}

    return model, metrics

def train_ensemble(
    out_dir: Optional[Path] = None,
    n_samples: int = 600,
) -> Dict:
    """
    Full proximate training pipeline.
    Returns metrics dict and saves model artefacts to out_dir.
    """
    import torch.nn.functional as F
    print("=== nir-proximate-v1 Training Pipeline ===")
    spectra_raw, meta, _ = generate_dataset(n_samples_per_feed=max(40, n_samples // 15))
    print(f"Dataset: {len(meta)} samples generated")

    X, Y = _build_xy(meta, spectra_raw)
    X_tr, X_val, Y_tr, Y_val = train_test_split(X, Y, test_size=0.20, random_state=42)
    print(f"Train: {len(X_tr)}, Val: {len(X_val)}")

    # ── OOD detector on training spectra ────────────────────────────────────
    print("\n[1/3] Fitting Mahalanobis OOD detector …")
    ood = MahalanobisOOD(n_components=20, threshold_percentile=99.0)
    ood.fit(X_tr)

    # ── PLS-R ───────────────────────────────────────────────────────────────
    print("\n[2/3] Fitting PLS-R (12 LV) …")
    pls, pls_metrics = train_pls(X_tr, Y_tr, X_val, Y_val)

    # ── 1D-CNN ──────────────────────────────────────────────────────────────
    print("\n[3/3] Training 1D-CNN …")
    cnn, cnn_metrics = train_cnn(X_tr, Y_tr, X_val, Y_val)

    # ── Ensemble: average PLS + CNN predictions ──────────────────────────────
    pls_pred = pls.predict(X_val)
    cnn_model_eval = cnn.to(DEVICE).eval()
    with torch.no_grad():
        xv = torch.tensor(X_val.astype(np.float32)).to(DEVICE)
        cnn_raw = cnn_model_eval(xv).cpu().numpy()

    # Denormalise CNN (re-derive Y_mean/Y_std)
    Y_mean = Y_tr.mean(axis=0)
    Y_std = Y_tr.std(axis=0)
    Y_std[Y_std < 1e-8] = 1.0
    cnn_pred = cnn_raw * Y_std + Y_mean
    ens_pred = 0.5 * pls_pred + 0.5 * cnn_pred

    ensemble_metrics = {}
    print("\n── Ensemble RMSEP ─────────────────────────────────────────────")
    all_pass = True
    for i, key in enumerate(PROXIMATE_KEYS):
        rmsep = _rmsep(Y_val[:, i], ens_pred[:, i])
        target = RMSEP_TARGETS[key]
        passed = rmsep <= target
        all_pass = all_pass and passed
        status = "✅ PASS" if passed else f"⚠️  FAIL (target {target})"
        print(f"  {key:30s}: RMSEP={rmsep:.3f}  {status}")
        ensemble_metrics[key] = {"rmsep": round(rmsep, 3), "target": target, "pass": passed}

    # ── Save artefacts ───────────────────────────────────────────────────────
    if out_dir:
        out_dir.mkdir(parents=True, exist_ok=True)
        # PLS coefficients as JSON for mobile inference
        pls_coeffs = {
            "x_rotations": pls.x_rotations_.tolist(),
            "y_loadings": pls.y_loadings_.tolist(),
            "x_mean": pls.x_mean_.tolist(),
            "x_std": pls.x_std_.tolist() if hasattr(pls, "x_std_") else [1.0] * X_tr.shape[1],
            "y_mean": pls.y_mean_.tolist() if hasattr(pls, "y_mean_") else [0.0] * 7,
        }
        with open(out_dir / "pls_coefficients.json", "w") as f:
            json.dump(pls_coeffs, f)
        torch.save(cnn.state_dict(), out_dir / "cnn_proximate.pt")
        with open(out_dir / "ood_state.json", "w") as f:
            json.dump(ood.state_dict(), f)
        with open(out_dir / "proximate_metrics.json", "w") as f:
            json.dump({"ensemble": ensemble_metrics, "pls": pls_metrics, "cnn": cnn_metrics}, f, indent=2)
        print(f"\nArtefacts saved to: {out_dir}")

    print(f"\n{'✅ ALL PASS' if all_pass else '❌ SOME TARGETS MISSED'}")
    return {"ensemble": ensemble_metrics, "all_pass": all_pass}


if __name__ == "__main__":
    import torch.nn.functional as F   # noqa: E402 (needed in train_cnn)
    result = train_ensemble(
        out_dir=Path("ml/models/weights"),
        n_samples=600,
    )
    print(json.dumps(result, indent=2))
