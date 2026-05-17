"""
Train satellite anomaly detection model on real CelesTrak + NOAA data.
"""
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import RobustScaler
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import classification_report, f1_score
from sklearn.pipeline import Pipeline
import joblib, json, os
from datetime import datetime

FEATURES = [
    "altitude_km",
    "velocity_km_s",
    "inclination_deg",
    "eccentricity",
    "mean_motion_rev_day",
    "period_min",
    "bstar",
    "kp",
    "solar_wind_bz",
]

MODEL_DIR = "public/models"

def train():
    df = pd.read_parquet("ml/data/satellite_telemetry.parquet")
    print(f"Loaded {len(df)} real satellite records")
    print("Label distribution:\n", df["label"].value_counts())

    X = df[FEATURES].fillna(0)
    y = df["label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    pipeline = Pipeline([
        ("scaler", RobustScaler()),
        ("clf", RandomForestClassifier(
            n_estimators=300,
            max_depth=15,
            min_samples_leaf=2,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        )),
    ])

    print("\nRunning 5-fold cross-validation...")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(pipeline, X_train, y_train, cv=cv, scoring="f1_weighted", n_jobs=-1)
    print(f"CV F1 (weighted): {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    test_f1 = f1_score(y_test, y_pred, average="weighted")
    print(f"\nTest F1 (weighted): {test_f1:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))

    importances = pipeline.named_steps["clf"].feature_importances_
    feat_imp = dict(zip(FEATURES, importances.tolist()))
    print("\nFeature Importances:")
    for feat, imp in sorted(feat_imp.items(), key=lambda x: -x[1]):
        print(f"  {feat}: {imp:.4f}")

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(pipeline, f"{MODEL_DIR}/anomaly_model.pkl")

    metadata = {
        "trained_at": datetime.now().isoformat(),
        "n_training_samples": int(len(X_train)),
        "n_test_samples": int(len(X_test)),
        "features": FEATURES,
        "classes": list(pipeline.classes_),
        "cv_f1_mean": float(cv_scores.mean()),
        "cv_f1_std": float(cv_scores.std()),
        "test_f1": float(test_f1),
        "feature_importances": feat_imp,
        "data_sources": [
            "CelesTrak active satellites TLE",
            "NOAA SWPC Kp index",
            "NOAA SWPC solar wind",
        ],
        "model_type": "RandomForestClassifier + RobustScaler pipeline",
    }

    with open(f"{MODEL_DIR}/model_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\n Model saved to {MODEL_DIR}/anomaly_model.pkl")
    print(f" Metadata saved to {MODEL_DIR}/model_metadata.json")
    return pipeline, metadata

if __name__ == "__main__":
    train()