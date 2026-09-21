"""
AAHAR ML — ONNX Export Pipeline
Exports all trained PyTorch models to ONNX with int8 quantisation.
Produces model registry JSON consumed by mobile inference engine.
"""

import json
import sys
from pathlib import Path
from typing import Any, Dict, Optional

import numpy as np
import torch
import onnx
import onnxruntime as ort
from onnxruntime.quantization import quantize_dynamic, QuantType

sys.path.insert(0, str(Path(__file__).parents[2]))
from ml.models.architectures import (
    NIRProximate, NIRAdulterant, NIRAutoencoder,
    SilageForecast, FeedTypeClassifier,
)

WEIGHTS_DIR = Path("ml/models/weights")
EXPORT_DIR  = Path("ml/models/exported")
REGISTRY_PATH = Path("contracts/model_registry.json")

# ─── Model specs ─────────────────────────────────────────────────────────────

MODEL_SPECS = [
    {
        "id": "nir-proximate-v1",
        "cls": NIRProximate,
        "ctor_kwargs": {"n_bands": 228, "n_outputs": 7},
        "weights": "cnn_proximate.pt",
        "dummy_input_shape": (1, 228),
        "input_names": ["spectrum"],
        "output_names": ["proximates"],
        "opset": 17,
        "description": "1D-CNN predicting 7 proximate parameters from preprocessed NIR spectrum",
        "outputs": ["crude_protein_pct_dm", "moisture_pct", "adf_pct_dm",
                    "ndf_pct_dm", "crude_fat_pct_dm", "ash_pct_dm", "me_mj_kg_dm"],
    },
    {
        "id": "nir-adulterant-v1",
        "cls": NIRAdulterant,
        "ctor_kwargs": {"n_bands": 228},
        "weights": "cnn_adulterant.pt",
        "dummy_input_shape": (1, 228),
        "input_names": ["spectrum"],
        "output_names": ["adulterant_logits"],
        "opset": 17,
        "description": "Multi-label binary CNN detecting Urea, Silica, Melamine in feed NIR",
        "outputs": ["urea_prob", "silica_prob", "melamine_prob"],
    },
    {
        "id": "nir-anomaly-v1",
        "cls": NIRAutoencoder,
        "ctor_kwargs": {"n_bands": 228, "latent_dim": 32},
        "weights": "autoencoder_anomaly.pt",
        "dummy_input_shape": (1, 228),
        "input_names": ["spectrum"],
        "output_names": ["recon_spectrum", "recon_error"],
        "opset": 17,
        "description": "Conv autoencoder for unknown adulterant OOD detection via reconstruction error",
        "outputs": ["recon_spectrum_228", "recon_error_scalar"],
    },
    {
        "id": "silage-forecast-v1",
        "cls": SilageForecast,
        "ctor_kwargs": {"n_channels": 7, "seq_len": 30, "forecast_days": 7},
        "weights": "gru_silage_forecast.pt",
        "dummy_input_shape": (1, 30, 7),
        "input_names": ["probe_sequence"],
        "output_names": ["spoilage_front_m"],
        "opset": 17,
        "description": "Temporal GRU predicting 7-day silage spoilage front position (metres from face)",
        "outputs": ["day1", "day2", "day3", "day4", "day5", "day6", "day7"],
    },
    {
        "id": "feed-type-classifier-v1",
        "cls": FeedTypeClassifier,
        "ctor_kwargs": {"n_bands": 228},
        "weights": None,           # will init with random weights if no checkpoint found
        "dummy_input_shape": (1, 228),
        "input_names": ["spectrum"],
        "output_names": ["feed_type_logits"],
        "opset": 17,
        "description": "15-class feed type classifier from NIR spectrum for auto-routing advisory engine",
        "outputs": [
            "MAIZE_SILAGE", "SORGHUM_SILAGE", "LUCERNE_HAY", "OATEN_HAY",
            "WHEAT_STRAW", "RICE_STRAW", "GROUNDNUT_CAKE", "MUSTARD_CAKE",
            "SUNFLOWER_CAKE", "COTTON_SEED_CAKE", "PADDY_FEED",
            "SOYBEAN_MEAL", "COCONUT_CAKE", "BAJRA_STRAW", "JOWAR_STRAW",
        ],
    },
]


def _export_onnx(spec: Dict, weights_dir: Path, export_dir: Path) -> Optional[Path]:
    """Export one model to ONNX."""
    model = spec["cls"](**spec["ctor_kwargs"])

    weights_file = weights_dir / spec["weights"] if spec["weights"] else None
    if weights_file and weights_file.exists():
        model.load_state_dict(torch.load(weights_file, map_location="cpu"))
        print(f"  Loaded weights: {weights_file.name}")
    else:
        print(f"  ⚠️  No weights found for {spec['id']} — exporting with random initialisation")

    model.eval()
    dummy = torch.zeros(*spec["dummy_input_shape"])
    onnx_path = export_dir / f"{spec['id']}.onnx"

    with torch.no_grad():
        torch.onnx.export(
            model,
            (dummy,),
            str(onnx_path),
            opset_version=spec["opset"],
            input_names=spec["input_names"],
            output_names=spec["output_names"],
            dynamic_axes={k: {0: "batch_size"} for k in spec["input_names"] + spec["output_names"]},
            do_constant_folding=True,
            export_params=True,
        )

    # Validate
    onnx_model = onnx.load(str(onnx_path))
    onnx.checker.check_model(onnx_model)

    size_mb = onnx_path.stat().st_size / (1024 * 1024)
    print(f"  ✅ Exported: {onnx_path.name} ({size_mb:.2f} MB)")
    return onnx_path


def _quantize_onnx(onnx_path: Path) -> Path:
    """Apply dynamic int8 quantisation."""
    q_path = onnx_path.parent / onnx_path.name.replace(".onnx", "_int8.onnx")
    quantize_dynamic(
        str(onnx_path),
        str(q_path),
        weight_type=QuantType.QInt8,
    )
    size_mb = q_path.stat().st_size / (1024 * 1024)
    print(f"  ✅ Quantised: {q_path.name} ({size_mb:.2f} MB)")
    return q_path


def _validate_ort(onnx_path: Path, spec: Dict) -> bool:
    """Run a forward pass via OnnxRuntime to validate correctness."""
    try:
        sess = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
        dummy = np.zeros(spec["dummy_input_shape"], dtype=np.float32)
        feeds = {sess.get_inputs()[0].name: dummy}
        outputs = sess.run(None, feeds)
        assert len(outputs) == len(spec["output_names"]), "Output count mismatch"
        print(f"  ✅ ORT validation passed for {spec['id']}")
        return True
    except Exception as e:
        print(f"  ❌ ORT validation FAILED for {spec['id']}: {e}")
        return False


def export_all(
    weights_dir: Path = WEIGHTS_DIR,
    export_dir: Path = EXPORT_DIR,
    registry_path: Path = REGISTRY_PATH,
) -> Dict:
    """Export all models, quantise, validate, write model registry."""
    export_dir.mkdir(parents=True, exist_ok=True)
    registry_path.parent.mkdir(parents=True, exist_ok=True)

    registry: Dict[str, Any] = {"models": {}, "version": "1.0.0"}

    for spec in MODEL_SPECS:
        print(f"\n── {spec['id']} ──────────────────────────────────────")
        onnx_path = _export_onnx(spec, weights_dir, export_dir)
        if onnx_path is None:
            continue
        q_path = _quantize_onnx(onnx_path)
        valid = _validate_ort(q_path, spec)

        registry["models"][spec["id"]] = {
            "id": spec["id"],
            "version": "1.0.0",
            "description": spec["description"],
            "onnx_path": str(onnx_path.relative_to(Path("."))),
            "onnx_int8_path": str(q_path.relative_to(Path("."))),
            "input_shape": list(spec["dummy_input_shape"]),
            "outputs": spec["outputs"],
            "input_names": spec["input_names"],
            "output_names": spec["output_names"],
            "validated": valid,
            "size_bytes_fp32": onnx_path.stat().st_size,
            "size_bytes_int8": q_path.stat().st_size,
        }

    with open(registry_path, "w") as f:
        json.dump(registry, f, indent=2)
    print(f"\n✅ Model registry written to: {registry_path}")
    return registry


if __name__ == "__main__":
    result = export_all()
    print(json.dumps(
        {k: {m: v["validated"] for m, v in result["models"].items()} for k in ["validated"]},
        indent=2
    ))
