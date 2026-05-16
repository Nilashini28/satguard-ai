"""
SATGUARD AI Backend - ML Anomaly Detection for Satellite Telemetry
=================================================================
This backend fetches real satellite data from Celestrak, trains an
Isolation Forest model for anomaly detection, and provides real predictions.
"""

import os
import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import requests
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="SATGUARD AI ML Backend", version="1.0.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Celestrak API endpoints
CELESTRAK_URL = "https://celestrak.org/NORAD/elements/gp.php"

# Satellite groups to fetch
SATELLITE_GROUPS = ["stations", "gps-ops", "weather", "starlink", "amateur"]

# Global variables
model = None
scaler = None
historical_data = []
is_model_trained = False


class SatelliteTelemetry(BaseModel):
    satellite_name: str
    altitude: float
    velocity: float
    inclination: float
    eccentricity: float
    period: float
    temperature: Optional[float] = None
    battery: Optional[float] = None
    signal_strength: Optional[float] = None


class PredictionRequest(BaseModel):
    telemetry: SatelliteTelemetry


class AnomalyResponse(BaseModel):
    is_anomaly: bool
    anomaly_score: float
    severity: str
    features_importance: Dict[str, float]
    prediction_timestamp: str


class TrainingStatus(BaseModel):
    is_trained: bool
    samples_used: int
    accuracy: Optional[float] = None
    last_trained: Optional[str] = None


def fetch_tle_data(group: str) -> List[Dict]:
    """Fetch TLE data from Celestrak for a given satellite group."""
    try:
        params = {
            "GROUP": group,
            "FORMAT": "tle"
        }
        response = requests.get(CELESTRAK_URL, params=params, timeout=10)
        response.raise_for_status()

        lines = response.text.strip().split("\n")
        satellites = []

        for i in range(0, len(lines) - 2, 3):
            if i + 2 >= len(lines):
                break
            name = lines[i].strip()
            line1 = lines[i + 1].strip()
            line2 = lines[i + 2].strip()

            if len(line1) >= 60 and len(line2) >= 60:
                satellites.append({
                    "name": name,
                    "line1": line1,
                    "line2": line2
                })

        logger.info(f"Fetched {len(satellites)} TLE entries for group: {group}")
        return satellites
    except Exception as e:
        logger.error(f"Error fetching TLE data for {group}: {e}")
        return []


def parse_tle_to_features(tle_data: Dict) -> Dict:
    """Parse TLE data and extract features for ML model."""
    try:
        import satellite
        from satellite import twoline2satrec, propagate, gst, eciToGeodetic

        line1 = tle_data["line1"]
        line2 = tle_data["line2"]

        # Parse TLE
        satrec = twoline2satrec(line1, line2)

        # Get current position
        position = propagate(satrec, datetime.utcnow())

        if position and position.position:
            gmst = gst(datetime.utcnow())
            coords = eciToGeodetic(position.position, gmst)

            # Calculate velocity
            velocity = np.sqrt(
                position.velocity.velocity.x**2 +
                position.velocity.velocity.y**2 +
                position.velocity.velocity.z**2
            )

            # Extract TLE parameters
            inclination = float(line2[8:16])
            eccentricity = float("0." + line2[26:33])
            period = float(line1[33:43])

            # Add simulated sensor data (in real scenario, this would come from actual telemetry)
            temperature = np.random.normal(-10, 15)  # Simulated temperature
            battery = np.random.uniform(60, 100)     # Simulated battery
            signal_strength = np.random.uniform(70, 100)  # Simulated signal

            return {
                "satellite_name": tle_data["name"],
                "altitude_km": coords.height,
                "latitude": np.degrees(coords.latitude),
                "longitude": np.degrees(coords.longitude),
                "velocity_km_s": velocity * 1000,  # Convert to km/s
                "inclination": inclination,
                "eccentricity": eccentricity,
                "period_minutes": period,
                "temperature_celsius": temperature,
                "battery_percent": battery,
                "signal_strength_dbm": signal_strength,
                "timestamp": datetime.utcnow().isoformat()
            }
    except Exception as e:
        logger.error(f"Error parsing TLE: {e}")
        return None


def generate_historical_data(num_samples: int = 500) -> pd.DataFrame:
    """Generate historical satellite data with normal and anomalous patterns."""
    data = []

    # Fetch real TLE data
    for group in SATELLITE_GROUPS:
        tle_data = fetch_tle_data(group)
        for tle in tle_data[:10]:  # Limit per group
            features = parse_tle_to_features(tle)
            if features:
                data.append(features)

    # Generate additional synthetic data with anomalies
    for _ in range(num_samples - len(data)):
        # Normal pattern
        if np.random.random() > 0.2:
            sample = {
                "satellite_name": f"SAT-{np.random.randint(1000, 9999)}",
                "altitude_km": np.random.normal(500, 100),
                "latitude": np.random.uniform(-90, 90),
                "longitude": np.random.uniform(-180, 180),
                "velocity_km_s": np.random.normal(7.5, 0.5),
                "inclination": np.random.uniform(0, 98),
                "eccentricity": np.random.uniform(0, 0.1),
                "period_minutes": np.random.normal(90, 10),
                "temperature_celsius": np.random.normal(-10, 8),
                "battery_percent": np.random.uniform(70, 100),
                "signal_strength_dbm": np.random.uniform(75, 100),
                "timestamp": datetime.utcnow().isoformat(),
                "is_anomaly": 0
            }
        else:
            # Anomaly patterns
            anomaly_type = np.random.choice(["thermal", "orbit", "power", "signal"])
            if anomaly_type == "thermal":
                sample = {
                    "satellite_name": f"SAT-{np.random.randint(1000, 9999)}",
                    "altitude_km": np.random.normal(500, 100),
                    "latitude": np.random.uniform(-90, 90),
                    "longitude": np.random.uniform(-180, 180),
                    "velocity_km_s": np.random.normal(7.5, 0.5),
                    "inclination": np.random.uniform(0, 98),
                    "eccentricity": np.random.uniform(0, 0.1),
                    "period_minutes": np.random.normal(90, 10),
                    "temperature_celsius": np.random.uniform(40, 80),  # High temp anomaly
                    "battery_percent": np.random.uniform(70, 100),
                    "signal_strength_dbm": np.random.uniform(75, 100),
                    "timestamp": datetime.utcnow().isoformat(),
                    "is_anomaly": 1
                }
            elif anomaly_type == "orbit":
                sample = {
                    "satellite_name": f"SAT-{np.random.randint(1000, 9999)}",
                    "altitude_km": np.random.uniform(150, 300),  # Low altitude
                    "latitude": np.random.uniform(-90, 90),
                    "longitude": np.random.uniform(-180, 180),
                    "velocity_km_s": np.random.uniform(7.8, 8.5),  # High velocity
                    "inclination": np.random.uniform(0, 98),
                    "eccentricity": np.random.uniform(0.15, 0.3),  # High eccentricity
                    "period_minutes": np.random.uniform(80, 88),  # Low period
                    "temperature_celsius": np.random.normal(-10, 8),
                    "battery_percent": np.random.uniform(70, 100),
                    "signal_strength_dbm": np.random.uniform(75, 100),
                    "timestamp": datetime.utcnow().isoformat(),
                    "is_anomaly": 1
                }
            else:
                sample = {
                    "satellite_name": f"SAT-{np.random.randint(1000, 9999)}",
                    "altitude_km": np.random.normal(500, 100),
                    "latitude": np.random.uniform(-90, 90),
                    "longitude": np.random.uniform(-180, 180),
                    "velocity_km_s": np.random.normal(7.5, 0.5),
                    "inclination": np.random.uniform(0, 98),
                    "eccentricity": np.random.uniform(0, 0.1),
                    "period_minutes": np.random.normal(90, 10),
                    "temperature_celsius": np.random.normal(-10, 8),
                    "battery_percent": np.random.uniform(10, 40),  # Low battery
                    "signal_strength_dbm": np.random.uniform(30, 50),  # Low signal
                    "timestamp": datetime.utcnow().isoformat(),
                    "is_anomaly": 1
                }

        data.append(sample)

    return pd.DataFrame(data)


def train_model(df: pd.DataFrame):
    """Train Isolation Forest model for anomaly detection."""
    global model, scaler, is_model_trained

    # Features for training
    feature_cols = [
        "altitude_km", "velocity_km_s", "inclination", "eccentricity",
        "period_minutes", "temperature_celsius", "battery_percent",
        "signal_strength_dbm"
    ]

    X = df[feature_cols].values

    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Train Isolation Forest
    model = IsolationForest(
        n_estimators=100,
        max_samples="auto",
        contamination=0.2,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_scaled)

    # Get training predictions
    predictions = model.predict(X_scaled)
    scores = model.decision_function(X_scaled)

    # Calculate accuracy (on labeled data)
    if "is_anomaly" in df.columns:
        y_true = (df["is_anomaly"] == 1).astype(int)
        y_pred = (predictions == -1).astype(int)

        accuracy = (y_pred == y_true).mean()
        logger.info(f"Model training completed. Accuracy: {accuracy:.2%}")

        # Save model
        joblib.dump(model, "anomaly_model.pkl")
        joblib.dump(scaler, "scaler.pkl")

    is_model_trained = True
    logger.info("ML model trained successfully")


def predict_anomaly(telemetry: SatelliteTelemetry) -> Dict:
    """Predict anomaly for given satellite telemetry."""
    global model, scaler

    if model is None or scaler is None:
        raise HTTPException(status_code=400, detail="Model not trained yet")

    # Prepare features
    features = np.array([[
        telemetry.altitude,
        telemetry.velocity,
        telemetry.inclination if telemetry.inclination else 0,
        telemetry.eccentricity if telemetry.eccentricity else 0,
        telemetry.period if telemetry.period else 90,
        telemetry.temperature if telemetry.temperature else -10,
        telemetry.battery if telemetry.battery else 80,
        telemetry.signal_strength if telemetry.signal_strength else 85
    ]])

    # Scale features
    features_scaled = scaler.transform(features)

    # Predict
    prediction = model.predict(features_scaled)
    anomaly_score = model.decision_function(features_scaled)[0]

    # Determine severity
    if anomaly_score < -0.5:
        severity = "critical"
    elif anomaly_score < -0.2:
        severity = "high"
    elif anomaly_score < 0:
        severity = "medium"
    else:
        severity = "low"

    # Calculate feature importance (simplified)
    feature_names = ["altitude", "velocity", "inclination", "eccentricity",
                     "period", "temperature", "battery", "signal"]
    importance = {
        name: float(abs(features[0][i] - np.mean(features)))
        for i, name in enumerate(feature_names)
    }

    # Normalize importance
    total = sum(importance.values())
    importance = {k: v/total for k, v in importance.items()}

    return {
        "is_anomaly": prediction[0] == -1,
        "anomaly_score": float(anomaly_score),
        "severity": severity,
        "features_importance": importance,
        "prediction_timestamp": datetime.utcnow().isoformat()
    }


@app.get("/")
def root():
    return {
        "message": "SATGUARD AI ML Backend",
        "version": "1.0.0",
        "endpoints": [
            "/train - Train the ML model",
            "/predict - Make anomaly prediction",
            "/status - Check model status",
            "/satellites - Get real satellite data",
            "/anomalies - Get current anomalies"
        ]
    }


@app.post("/train")
async def train(background_tasks: BackgroundTasks):
    """Train the ML model on satellite data."""
    global historical_data

    def train_task():
        logger.info("Starting model training...")
        df = generate_historical_data(num_samples=500)
        historical_data = df.to_dict("records")
        train_model(df)
        logger.info("Training completed")

    background_tasks.add_task(train_task)

    return {
        "message": "Model training started in background",
        "estimated_time": "30 seconds"
    }


@app.get("/status")
def get_status():
    """Get model training status."""
    return {
        "is_trained": is_model_trained,
        "samples_used": len(historical_data),
        "last_trained": datetime.utcnow().isoformat() if is_model_trained else None
    }


@app.post("/predict")
def predict(request: PredictionRequest):
    """Make anomaly prediction for satellite telemetry."""
    try:
        result = predict_anomaly(request.telemetry)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/satellites")
def get_satellites():
    """Get real satellite data from Celestrak."""
    all_satellites = []

    for group in SATELLITE_GROUPS:
        tle_data = fetch_tle_data(group)
        for tle in tle_data[:5]:  # Limit results
            features = parse_tle_to_features(tle)
            if features:
                all_satellites.append(features)

    return {
        "satellites": all_satellites[:20],
        "count": len(all_satellites),
        "last_updated": datetime.utcnow().isoformat()
    }


@app.get("/anomalies")
def get_anomalies():
    """Get current detected anomalies from real satellites."""
    anomalies = []

    for group in SATELLITE_GROUPS:
        tle_data = fetch_tle_data(group)
        for tle in tle_data[:5]:
            features = parse_tle_to_features(tle)
            if features and is_model_trained and model and scaler:
                # Create telemetry object
                telemetry = SatelliteTelemetry(
                    satellite_name=features["satellite_name"],
                    altitude=features["altitude_km"],
                    velocity=features["velocity_km_s"],
                    inclination=features["inclination"],
                    eccentricity=features["eccentricity"],
                    period=features["period_minutes"],
                    temperature=features.get("temperature_celsius"),
                    battery=features.get("battery_percent"),
                    signal_strength=features.get("signal_strength_dbm")
                )

                prediction = predict_anomaly(telemetry)

                if prediction["is_anomaly"]:
                    anomalies.append({
                        "satellite": features["satellite_name"],
                        "altitude": features["altitude_km"],
                        "latitude": features["latitude"],
                        "longitude": features["longitude"],
                        "anomaly_score": prediction["anomaly_score"],
                        "severity": prediction["severity"],
                        "timestamp": datetime.utcnow().isoformat()
                    })

    return {
        "anomalies": anomalies,
        "count": len(anomalies),
        "last_updated": datetime.utcnow().isoformat()
    }


@app.on_event("startup")
async def startup_event():
    """Initialize model on startup."""
    # Try to load saved model
    global model, scaler, is_model_trained

    try:
        if os.path.exists("anomaly_model.pkl") and os.path.exists("scaler.pkl"):
            model = joblib.load("anomaly_model.pkl")
            scaler = joblib.load("scaler.pkl")
            is_model_trained = True
            logger.info("Loaded saved model")
    except Exception as e:
        logger.warning(f"Could not load saved model: {e}")

    # Initial training
    logger.info("Starting initial model training...")
    df = generate_historical_data(num_samples=500)
    historical_data = df.to_dict("records")
    train_model(df)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)