from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import json
from datetime import datetime
from pathlib import Path

from model.anomaly_detector import AnomalyDetector

app = FastAPI(title="SATGUARD ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_DIR = Path(__file__).parent / "model"

detector: Optional[AnomalyDetector] = None


def get_model_path(filename: str) -> Path:
    return MODEL_DIR / filename


@app.on_event("startup")
async def startup_event():
    global detector
    try:
        detector = AnomalyDetector(
            isolation_forest_path=get_model_path("isolation_forest.pkl"),
            scaler_path=get_model_path("scaler.pkl"),
            lstm_path=get_model_path("lstm_autoencoder.h5"),
            metadata_path=get_model_path("metadata.json")
        )
        print("ML models loaded successfully")
    except Exception as e:
        print(f"Warning: Could not load ML models: {e}")
        detector = None


class TelemetryInput(BaseModel):
    telemetry: Dict[str, float]
    satellite_name: Optional[str] = None


class BatchTelemetryInput(BaseModel):
    telemetry_list: List[TelemetryInput]


@app.get("/health")
async def health():
    if detector is None:
        return {"status": "error", "model": "not loaded"}
    return {"status": "ok", "model": "loaded"}


@app.get("/model/info")
async def model_info():
    metadata_path = get_model_path("metadata.json")
    if not metadata_path.exists():
        raise HTTPException(status_code=404, detail="Model metadata not found")

    with open(metadata_path, 'r') as f:
        metadata = json.load(f)

    return metadata


@app.post("/predict")
async def predict(input_data: TelemetryInput):
    if detector is None:
        raise HTTPException(status_code=503, detail="ML model not loaded")

    try:
        result = detector.predict(input_data.telemetry, input_data.satellite_name or "Unknown")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/batch")
async def predict_batch(input_data: BatchTelemetryInput):
    if detector is None:
        raise HTTPException(status_code=503, detail="ML model not loaded")

    results = []
    for item in input_data.telemetry_list:
        try:
            result = detector.predict(item.telemetry, item.satellite_name or "Unknown")
            results.append(result)
        except Exception as e:
            results.append({"error": str(e), "satellite": item.satellite_name})

    return {"results": results}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)