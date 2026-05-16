import numpy as np
import joblib
import json
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime
import uuid


class AnomalyDetector:
    def __init__(
        self,
        isolation_forest_path: Path,
        scaler_path: Path,
        lstm_path: Optional[Path] = None,
        metadata_path: Optional[Path] = None
    ):
        self.isolation_forest = joblib.load(isolation_forest_path)
        self.scaler = joblib.load(scaler_path)
        self.lstm_model = None
        self.metadata = {}

        if lstm_path and lstm_path.exists():
            try:
                from tensorflow.keras.models import load_model
                self.lstm_model = load_model(str(lstm_path))
            except Exception as e:
                print(f"Warning: Could not load LSTM model: {e}")

        if metadata_path and metadata_path.exists():
            with open(metadata_path, 'r') as f:
                self.metadata = json.load(f)

    def predict(self, telemetry: Dict[str, float], satellite_name: str) -> Dict[str, Any]:
        feature_names = [
            'altitude_km', 'velocity_kms', 'temperature_c', 'battery_pct',
            'solar_flux', 'signal_snr_db', 'orbital_inclination', 'eccentricity', 'in_eclipse'
        ]

        features = []
        for name in feature_names:
            value = telemetry.get(name, 0)
            features.append(value)

        features_array = np.array([features])
        scaled_features = self.scaler.transform(features_array)

        iso_prediction = self.isolation_forest.predict(scaled_features)[0]
        iso_decision = self.isolation_forest.decision_function(scaled_features)[0]

        anomaly_score = -iso_decision
        confidence = min(1.0, max(0.0, anomaly_score + 0.5))

        is_anomaly = iso_prediction == -1

        if not is_anomaly:
            return {
                "is_anomaly": False,
                "satellite": satellite_name,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "confidence": round(confidence, 3),
                "anomaly_score": round(anomaly_score, 3)
            }

        scaled_values = scaled_features[0]
        feature_deviations = list(zip(feature_names, scaled_values))
        feature_deviations.sort(key=lambda x: abs(x[1]), reverse=True)
        top_deviant = [f[0] for f in feature_deviations[:3]]

        category_map = {
            'temperature_c': 'Thermal',
            'battery_pct': 'Power',
            'signal_snr_db': 'Signal',
            'altitude_km': 'Orbit',
            'velocity_kms': 'Orbit'
        }

        primary_category = category_map.get(top_deviant[0], 'General')

        severity_score = anomaly_score
        if severity_score > 0.8:
            severity = "CRITICAL"
        elif severity_score > 0.6:
            severity = "HIGH"
        elif severity_score > 0.4:
            severity = "MEDIUM"
        else:
            severity = "LOW"

        action_map = {
            'Thermal': "Investigate thermal control system. Check radiator orientation and heater operation.",
            'Power': "Check solar panel orientation and battery health. Monitor power consumption patterns.",
            'Signal': "Verify antenna alignment and ground station connectivity. Check for interference.",
            'Orbit': "Analyze orbital decay rate. Check propulsion system status and conjunction warnings.",
            'General': "Review all telemetry for additional anomalies. Consult mission operations."
        }

        descriptions = {
            'Thermal': f"Temperature deviation detected: {telemetry.get('temperature_c', 0):.1f}°C",
            'Power': f"Battery level abnormal: {telemetry.get('battery_pct', 0):.1f}%",
            'Signal': f"Signal degradation detected: {telemetry.get('signal_snr_db', 0):.1f} dB",
            'Orbit': f"Orbital parameter deviation: altitude {telemetry.get('altitude_km', 0):.1f} km, velocity {telemetry.get('velocity_kms', 0):.2f} km/s",
            'General': "Multiple telemetry parameters deviate from normal range"
        }

        return {
            "is_anomaly": True,
            "satellite": satellite_name,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "id": str(uuid.uuid4()),
            "detectedAt": datetime.utcnow().isoformat() + "Z",
            "confidence": round(confidence, 3),
            "anomalyScore": round(anomaly_score, 3),
            "severity": severity,
            "category": primary_category,
            "description": descriptions.get(primary_category, descriptions['General']),
            "recommendedAction": action_map[primary_category],
            "affectedFeatures": top_deviant,
            "telemetrySnapshot": telemetry
        }