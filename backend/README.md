# SATGUARD AI - ML Backend

This folder contains the Python FastAPI backend for ML-based anomaly detection.

## Features

- **Real Satellite Data**: Fetches live TLE data from Celestrak
- **ML Model**: Isolation Forest for anomaly detection
- **Training**: Auto-trains on historical satellite data
- **Prediction**: Real-time anomaly detection for satellite telemetry

## Quick Start

### Option 1: Local Development

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python main.py
```

The API will be available at `http://localhost:8000`

### Option 2: Deploy to Render/Railway/HuggingFace

1. Push the `backend/` folder to a separate repository
2. Connect to Render.com or Railway.app
3. Set the start command: `python main.py`
4. Get your deployed URL

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API info |
| `/train` | POST | Train ML model (background) |
| `/status` | GET | Get model training status |
| `/predict` | POST | Make anomaly prediction |
| `/satellites` | GET | Get real satellite data |
| `/anomalies` | GET | Get current detected anomalies |

## Connect to Frontend

After deploying, update the frontend to call your backend URL:

```typescript
// In src/app/page.tsx
const response = await fetch("https://your-backend-url.com/predict", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    telemetry: {
      satellite_name: "ISS",
      altitude: 420,
      velocity: 7.66,
      inclination: 51.6,
      eccentricity: 0.0006,
      period: 92.9,
      temperature: -15,
      battery: 85,
      signal_strength: 90
    }
  })
});
```

## ML Model Details

- **Algorithm**: Isolation Forest
- **Features**: altitude, velocity, inclination, eccentricity, period, temperature, battery, signal
- **Contamination**: 20% (expected anomaly rate)
- **Training Data**: 500 samples from real TLE data + synthetic anomalies

## Real-Time Data Sources

- ISS position: https://api.wheretheiss.at/v1/satellites/25544
- TLE data: https://celestrak.org/NORAD/elements/gp.php

## Environment Variables

Create a `.env` file:
```
CELESTRAK_API=https://celestrak.org/NORAD/elements/gp.php
```

## Current Status

⚠️ **Note**: The ML backend runs separately from the Next.js frontend. To fully enable ML predictions:

1. Deploy this backend to Render/Railway
2. Update frontend to call the backend API
3. The frontend currently shows real satellite positions from the Next.js API route

---

For the full ML pipeline to work in production, you would need:
- A hosted Python backend (for ML inference)
- A database for historical telemetry storage
- Continuous model retraining with new data