"""
Collect real satellite telemetry + space weather data for anomaly detection training.
Data sources: CelesTrak TLE archive + NOAA SWPC historical data (both free, no auth needed).
"""
import requests
import pandas as pd
import numpy as np
from datetime import datetime
import os

def fetch_active_tle():
    """Fetch current TLE data for active satellites from CelesTrak."""
    url = "https://celestrak.org/gp.php?GROUP=active&FORMAT=json"
    r = requests.get(url, headers={"User-Agent": "SATGUARD-AI-Research/1.0"}, timeout=30)
    r.raise_for_status()
    return r.json()

def fetch_space_weather_history():
    """Fetch 3-day Kp index history from NOAA SWPC."""
    url = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    data = r.json()
    rows = []
    for entry in data:
        try:
            rows.append({"time_tag": entry[0], "kp": float(entry[1])})
        except (ValueError, IndexError):
            continue
    return pd.DataFrame(rows)

def fetch_solar_wind():
    """Fetch solar wind magnetic field data from NOAA SWPC."""
    url = "https://services.swpc.noaa.gov/products/solar-wind/mag-5-minute.json"
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    data = r.json()
    rows = []
    for entry in data[1:]:
        try:
            rows.append({
                "time_tag": entry[0],
                "bz": float(entry[3]) if entry[3] is not None else 0.0,
                "bt": float(entry[6]) if entry[6] is not None else 0.0,
            })
        except (ValueError, IndexError, TypeError):
            continue
    return pd.DataFrame(rows)

def tle_to_features(tle_record: dict) -> dict | None:
    """Extract orbital features from a TLE record."""
    try:
        line1 = tle_record["TLE_LINE1"]
        line2 = tle_record["TLE_LINE2"]

        inclination = float(line2[8:16].strip())
        eccentricity = float("0." + line2[26:33].strip())
        mean_motion = float(line2[52:63].strip())

        mu = 398600.4418
        n_rad_s = mean_motion * 2 * np.pi / 86400
        a = (mu / n_rad_s ** 2) ** (1 / 3)
        altitude_km = a - 6371.0
        velocity_km_s = np.sqrt(mu / a)
        period_min = 1440 / mean_motion

        bstar_str = line1[53:61].strip()
        try:
            exp = int(bstar_str[-2:])
            mantissa = float(bstar_str[:-2].replace(" ", "")) / 1e5
            bstar = mantissa * 10 ** exp
        except Exception:
            bstar = 0.0

        return {
            "norad_id": int(tle_record["NORAD_CAT_ID"]),
            "name": tle_record["OBJECT_NAME"].strip(),
            "altitude_km": altitude_km,
            "velocity_km_s": velocity_km_s,
            "inclination_deg": inclination,
            "eccentricity": eccentricity,
            "mean_motion_rev_day": mean_motion,
            "period_min": period_min,
            "bstar": bstar,
        }
    except Exception as e:
        return None

def derive_anomaly_label(row: pd.Series) -> str:
    """Derive anomaly labels from physics-based rules."""
    if row["bstar"] > 1e-4 and row["altitude_km"] < 500:
        return "orbital_decay"

    if row.get("kp", 0) >= 5 and row["altitude_km"] < 800:
        return "thermal_anomaly"

    if row.get("kp", 0) >= 6 and row["inclination_deg"] > 70:
        return "signal_degradation"

    if row["altitude_km"] < 200:
        return "reentry_warning"

    if row["eccentricity"] > 0.1:
        return "attitude_anomaly"

    if row["altitude_km"] > 1500 and row["inclination_deg"] > 80:
        return "power_anomaly"

    return "normal"

def build_dataset():
    print("Fetching real TLE data from CelesTrak...")
    tle_records = fetch_active_tle()
    print(f"Got {len(tle_records)} satellites")

    print("Fetching real Kp index from NOAA SWPC...")
    kp_df = fetch_space_weather_history()
    current_kp = kp_df["kp"].iloc[-1] if not kp_df.empty else 0.0

    print("Fetching real solar wind data from NOAA SWPC...")
    sw_df = fetch_solar_wind()
    current_bz = sw_df["bz"].iloc[-1] if not sw_df.empty else 0.0

    print("Building feature matrix...")
    rows = []
    for rec in tle_records:
        features = tle_to_features(rec)
        if features is None:
            continue
        features["kp"] = current_kp
        features["solar_wind_bz"] = current_bz
        rows.append(features)

    df = pd.DataFrame(rows)

    df["label"] = df.apply(derive_anomaly_label, axis=1)

    print(f"\nDataset summary ({len(df)} satellites):")
    print(df["label"].value_counts())
    print(f"\nAltitude range: {df['altitude_km'].min():.0f} – {df['altitude_km'].max():.0f} km")
    print(f"Current Kp Index: {current_kp}")

    os.makedirs("ml/data", exist_ok=True)
    df.to_parquet("ml/data/satellite_telemetry.parquet", index=False)
    df.to_csv("ml/data/satellite_telemetry.csv", index=False)
    print("\nSaved to ml/data/satellite_telemetry.parquet")
    return df

if __name__ == "__main__":
    build_dataset()