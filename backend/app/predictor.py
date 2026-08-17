"""
Traffic Prediction Service.

Loads pre-trained Gradient Boosting models and provides inference
for 5/10/15/30-minute traffic prediction horizons.
"""

import os
from pathlib import Path
from typing import Optional

import numpy as np
import joblib


MODEL_DIR = str(Path(__file__).parent.parent / "models" / "trained")

# Singleton-loaded models (loaded once on first call)
_models: dict[int, object] = {}
_label_encoder: Optional[object] = None
_metadata: Optional[dict] = None


def _ensure_loaded() -> None:
    """Lazy-load all 4 horizon models + label encoder + metadata."""
    global _models, _label_encoder, _metadata

    if _metadata is not None:
        return  # already loaded

    meta_path = os.path.join(MODEL_DIR, "metadata.joblib")
    if not os.path.exists(meta_path):
        raise FileNotFoundError(
            f"Trained models not found at {MODEL_DIR}. "
            "Run: python backend/models/train_model.py"
        )

    _metadata = joblib.load(meta_path)
    _label_encoder = joblib.load(os.path.join(MODEL_DIR, "junction_label_encoder.joblib"))

    for h in _metadata["horizons"]:
        model_path = os.path.join(MODEL_DIR, f"model_{h}m.joblib")
        _models[h] = joblib.load(model_path)

    print(f"[OK] Loaded {len(_models)} prediction models from {MODEL_DIR}")


def get_junction_ids() -> list[str]:
    """Return the list of known junction IDs."""
    _ensure_loaded()
    assert _metadata is not None
    return _metadata["junction_ids"]


def predict(
    junction_id: str,
    lanes: int,
    capacity: int,
    hour: int,
    minute: int,
    day_of_week: int,
    is_weekend: int,
    weather_code: int,
    base_volume_pct: int,
    current_vehicles: int,
    current_speed: float,
    current_density: float,
) -> dict:
    """
    Run inference for a single junction snapshot.

    Returns a dict with keys: "5m", "10m", "15m", "30m",
    each containing: vehicles, speed, density, congestion_probability,
    congestion_level.
    """
    _ensure_loaded()
    assert _label_encoder is not None and _metadata is not None

    # Encode junction_id → integer index
    try:
        junction_idx = int(_label_encoder.transform([junction_id])[0])
    except ValueError:
        raise ValueError(f"Unknown junction_id: {junction_id}. Known: {list(_label_encoder.classes_)}")

    features = np.array([[
        junction_idx,
        lanes,
        capacity,
        hour,
        minute,
        day_of_week,
        is_weekend,
        weather_code,
        base_volume_pct,
        current_vehicles,
        current_speed,
        current_density,
    ]], dtype=np.float64)

    results = {}
    for h in _metadata["horizons"]:
        model = _models[h]
        pred = model.predict(features)[0]  # shape (4,)

        pred_vehicles = max(5, int(round(pred[0])))
        pred_speed = max(3, round(float(pred[1]), 1))
        pred_density = max(3, min(100, int(round(pred[2]))))
        pred_cong_prob = max(5, min(99, int(round(pred[3]))))

        # Derive congestion level from predicted density
        if pred_density > 75:
            cong_level = "High"
        elif pred_density > 45:
            cong_level = "Medium"
        else:
            cong_level = "Low"

        results[f"{h}m"] = {
            "predicted_vehicle_count": pred_vehicles,
            "predicted_speed": pred_speed,
            "predicted_density": pred_density,
            "congestion_probability": pred_cong_prob,
            "congestion_level": cong_level,
        }

    return results
