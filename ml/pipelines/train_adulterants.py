"""
AAHAR ML — Training Pipeline: Adulterant Detection (nir-adulterant-v1)
Multi-label CNN + peak classifier for Urea, Sand/Silica, Melamine.
Exit criteria: F1 ≥ 0.93 for Urea @ ≥0.5%, F1 ≥ 0.90 for Silica @ ≥2%.
"""

import json
import sys
from pathlib import Path
from typing import Dict, Optional, Tuple

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, TensorDataset
from sklearn.model_selection import train_test_split
from sklearn.metrics import f1_score, roc_auc_score

sys.path.insert(0, str(Path(__file__).parents[2]))
from ml.data.generator import generate_dataset
from ml.pipelines.preprocessing import preprocess
from ml.models.architectures import NIRAdulterant

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
N_EPOCHS = 80
LR = 5e-4
BATCH_SIZE = 32

# Detection thresholds (probability → 1)
THRESH_UREA = 0.40
THRESH_SILICA = 0.45
THRESH_MELAMINE = 0.40


def _build_xy(meta, spectra_raw: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    X = preprocess(spectra_raw)
    Y = np.array([
        [
            float(m["adulterants"]["urea_pct"] >= 0.5),
            float(m["adulterants"]["silica_pct"] >= 2.0),
            float(m["adulterants"]["melamine_pct"] >= 0.5),
        ]
        for m in meta
    ])
    return X, Y


def train(out_dir: Optional[Path] = None, n_samples: int = 600) -> Dict:
    print("=== nir-adulterant-v1 Training Pipeline ===")
    spectra_raw, meta, _ = generate_dataset(n_samples_per_feed=max(40, n_samples // 15), spiked_ratio=0.35)
    print(f"Dataset: {len(meta)} samples  |  Spiked: {sum(m['is_adulterated'] for m in meta)}")

    X, Y = _build_xy(meta, spectra_raw)
    X_tr, X_val, Y_tr, Y_val = train_test_split(X, Y, test_size=0.2, random_state=42)

    model = NIRAdulterant(n_bands=X_tr.shape[1]).to(DEVICE)
    optimizer = torch.optim.Adam(model.parameters(), lr=LR, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.OneCycleLR(
        optimizer, max_lr=LR * 5, epochs=N_EPOCHS, steps_per_epoch=max(1, len(X_tr) // BATCH_SIZE)
    )

    # Weighted BCE: positive class weight for imbalanced labels
    pos_counts = Y_tr.sum(axis=0)
    neg_counts = len(Y_tr) - pos_counts
    pos_weight = torch.tensor(neg_counts / np.maximum(pos_counts, 1), dtype=torch.float32).to(DEVICE)

    Xtt = torch.tensor(X_tr.astype(np.float32)).to(DEVICE)
    Ytt = torch.tensor(Y_tr.astype(np.float32)).to(DEVICE)
    Xvt = torch.tensor(X_val.astype(np.float32)).to(DEVICE)
    dataset = TensorDataset(Xtt, Ytt)
    loader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)

    best_f1 = 0.0
    best_state = None

    for epoch in range(N_EPOCHS):
        model.train()
        for xb, yb in loader:
            optimizer.zero_grad()
            logits = model(xb)
            loss = F.binary_cross_entropy_with_logits(logits, yb, pos_weight=pos_weight)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            scheduler.step()

        # Evaluate
        model.eval()
        with torch.no_grad():
            logits_val = model(Xvt).cpu().numpy()
        probs = 1.0 / (1.0 + np.exp(-logits_val))
        thresholds = [THRESH_UREA, THRESH_SILICA, THRESH_MELAMINE]
        preds = (probs > np.array(thresholds)).astype(int)
        f1_urea = f1_score(Y_val[:, 0], preds[:, 0], zero_division=0)
        if f1_urea > best_f1:
            best_f1 = f1_urea
            best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}

        if (epoch + 1) % 20 == 0:
            print(f"  Epoch {epoch+1}/{N_EPOCHS} — F1(urea)={f1_urea:.3f}")

    model.load_state_dict(best_state)

    # Final evaluation
    model.eval()
    with torch.no_grad():
        logits_val = model(Xvt).cpu().numpy()
    probs = 1.0 / (1.0 + np.exp(-logits_val))
    preds = (probs > np.array([THRESH_UREA, THRESH_SILICA, THRESH_MELAMINE])).astype(int)

    labels = ["urea", "silica", "melamine"]
    f1_targets = [0.93, 0.90, 0.88]
    metrics = {}
    all_pass = True

    print("\n── Adulterant Detection Metrics ──────────────────────────────")
    for i, (label, target) in enumerate(zip(labels, f1_targets)):
        f1 = f1_score(Y_val[:, i], preds[:, i], zero_division=0)
        try:
            auc = roc_auc_score(Y_val[:, i], probs[:, i])
        except Exception:
            auc = 0.0
        passed = f1 >= target
        all_pass = all_pass and passed
        status = "✅ PASS" if passed else f"⚠️  FAIL (target {target})"
        print(f"  {label:12s}  F1={f1:.3f}  AUC={auc:.3f}  {status}")
        metrics[label] = {"f1": round(f1, 3), "auc": round(auc, 3), "target_f1": target, "pass": passed}

    if out_dir:
        out_dir.mkdir(parents=True, exist_ok=True)
        torch.save(model.state_dict(), out_dir / "cnn_adulterant.pt")
        with open(out_dir / "adulterant_metrics.json", "w") as f:
            json.dump(metrics, f, indent=2)
        with open(out_dir / "adulterant_thresholds.json", "w") as f:
            json.dump({"urea": THRESH_UREA, "silica": THRESH_SILICA, "melamine": THRESH_MELAMINE}, f)
        print(f"\nArtefacts saved to: {out_dir}")

    print(f"\n{'✅ ALL PASS' if all_pass else '❌ SOME TARGETS MISSED'}")
    return {"metrics": metrics, "all_pass": all_pass}


if __name__ == "__main__":
    result = train(out_dir=Path("ml/models/weights"), n_samples=600)
    print(json.dumps(result, indent=2))
