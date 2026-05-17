"""
Inference script — called from Next.js API route.
"""
import sys, json
import joblib
import numpy as np

FEATURES = [
    "altitude_km", "velocity_km_s", "inclination_deg", "eccentricity",
    "mean_motion_rev_day", "period_min", "bstar", "kp", "solar_wind_bz",
]

MODEL_PATH = "public/models/anomaly_model.pkl"

def infer(telemetry: dict) -> dict:
    try:
        pipeline = joblib.load(MODEL_PATH)
    except Exception as e:
        return {
            "prediction": "normal",
            "confidence": 0.5,
            "severity": "LOW",
            "probabilities": {"normal": 0.5, "anomaly": 0.5},
            "is_anomaly": False,
            "error": f"Model not loaded: {e}",
        }

    X = np.array([[telemetry.get(f, 0.0) for f in FEATURES]])

    label = pipeline.predict(X)[0]
    proba = pipeline.predict_proba(X)[0]
    classes = pipeline.classes_

    confidence = float(max(proba))
    severity = "LOW"
    if label != "normal":
        if confidence > 0.8:
            severity = "HIGH"
        elif confidence > 0.6:
            severity = "MEDIUM"

    return {
        "prediction": label,
        "confidence": confidence,
        "severity": severity,
        "probabilities": {cls: float(p) for cls, p in zip(classes, proba)},
        "is_anomaly": label != "normal",
    }

if __name__ == "__main__":
    raw = sys.argv[1] if len(sys.argv) > 1 else sys.stdin.read()
    telemetry = json.loads(raw)
    result = infer(telemetry)
    print(json.dumps(result))