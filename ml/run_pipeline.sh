#!/bin/bash
set -e

echo "=== SATGUARD AI — ML Pipeline ==="

echo "Step 1: Collecting real satellite data..."
python3 ml/collect_data.py

echo "Step 2: Training anomaly detection model..."
python3 ml/train.py

echo "Step 3: Smoke test inference..."
python3 ml/infer.py '{"altitude_km": 408, "velocity_km_s": 7.66, "inclination_deg": 51.6, "eccentricity": 0.001, "mean_motion_rev_day": 15.5, "period_min": 92.9, "bstar": 0.0001, "kp": 3.5, "solar_wind_bz": -2.1}'

echo "✅ ML pipeline complete. Model saved to public/models/"