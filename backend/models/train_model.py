"""
Train a Gradient Boosting Regressor (multi-output) on the synthetic
Nagpur traffic dataset.

Produces 4 separate models — one per prediction horizon (5m, 10m, 15m, 30m).
Each model predicts: (vehicles, speed, density, congestion_probability).

Saves models to  backend/models/trained/*.joblib
"""

import os
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.multioutput import MultiOutputRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.preprocessing import LabelEncoder

DATA_PATH = str(Path(__file__).parent.parent / "data" / "nagpur_synthetic_traffic.csv")
MODEL_DIR = str(Path(__file__).parent / "trained")

FEATURE_COLS = [
    "junction_idx",    # label-encoded junction id
    "lanes",
    "capacity",
    "hour",
    "minute",
    "day_of_week",
    "is_weekend",
    "weather_code",
    "base_volume_pct",
    "current_vehicles",
    "current_speed",
    "current_density",
]

HORIZONS = [5, 10, 15, 30]

TARGET_GROUPS = {
    h: [f"vehicles_{h}m", f"speed_{h}m", f"density_{h}m", f"congestion_prob_{h}m"]
    for h in HORIZONS
}


def train() -> None:
    print("=" * 60)
    print("  Nagpur AI Traffic - Model Training Pipeline")
    print("=" * 60)

    # ---- Load data ----
    if not os.path.exists(DATA_PATH):
        print(f"[ERROR] Dataset not found at {DATA_PATH}")
        print("   Run `python backend/data/generate_synthetic_data.py` first.")
        sys.exit(1)

    t0 = time.time()
    df = pd.read_csv(DATA_PATH)
    print(f"\n[DATA] Loaded dataset: {len(df):,} rows, {df.shape[1]} columns  ({time.time()-t0:.1f}s)")

    # ---- Encode junction_id -> integer index ----
    le = LabelEncoder()
    df["junction_idx"] = le.fit_transform(df["junction_id"])

    os.makedirs(MODEL_DIR, exist_ok=True)
    # Save encoder for inference
    joblib.dump(le, os.path.join(MODEL_DIR, "junction_label_encoder.joblib"))

    X = df[FEATURE_COLS].values
    X_train, X_test = train_test_split(X, test_size=0.15, random_state=42)

    for horizon in HORIZONS:
        targets = TARGET_GROUPS[horizon]
        y = df[targets].values
        y_train = y[: len(X_train)]
        y_test = y[len(X_train):]

        print(f"\n{'-'*50}")
        print(f"[TRAIN] Training +{horizon}-minute prediction model ...")
        print(f"   Targets: {targets}")
        print(f"   Train: {len(X_train):,}  |  Test: {len(X_test):,}")

        t1 = time.time()
        model = MultiOutputRegressor(
            GradientBoostingRegressor(
                n_estimators=200,
                max_depth=6,
                learning_rate=0.1,
                subsample=0.8,
                min_samples_leaf=10,
                random_state=42,
            ),
            n_jobs=-1,
        )
        model.fit(X_train, y_train)
        elapsed = time.time() - t1

        y_pred = model.predict(X_test)
        mae_per_target = mean_absolute_error(y_test, y_pred, multioutput="raw_values")
        r2_per_target = r2_score(y_test, y_pred, multioutput="raw_values")

        print(f"   [OK] Trained in {elapsed:.1f}s")
        for i, tgt in enumerate(targets):
            print(f"      {tgt:>25s}  MAE={mae_per_target[i]:.2f}  R2={r2_per_target[i]:.4f}")

        model_path = os.path.join(MODEL_DIR, f"model_{horizon}m.joblib")
        joblib.dump(model, model_path)
        print(f"   [SAVED] -> {model_path}")

    # ---- Save feature metadata ----
    metadata = {
        "feature_cols": FEATURE_COLS,
        "horizons": HORIZONS,
        "junction_ids": list(le.classes_),
    }
    joblib.dump(metadata, os.path.join(MODEL_DIR, "metadata.joblib"))

    print(f"\n{'='*60}")
    print(f"  [OK] All 4 horizon models trained and saved!")
    print(f"  [DIR] Models directory: {MODEL_DIR}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    train()
