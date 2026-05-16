import requests
import pandas as pd
import os
from datetime import datetime, timedelta

NASA_DONKI_BASE = 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/donki'
DATA_DIR = os.path.dirname(os.path.abspath(__file__))

def get_nasa_api_key():
    return os.environ.get('NASA_API_KEY', '')


def map_flare_class_to_f107(flare_class: str) -> int:
    class_letter = flare_class.strip().upper()
    if not class_letter:
        return 150

    letter = class_letter[0]
    try:
        number = float(class_letter[1:]) if len(class_letter) > 1 else 1
    except:
        number = 1

    base_flux = {'A': 70, 'B': 100, 'C': 150, 'M': 200, 'X': 280}
    base = base_flux.get(letter, 150)
    scale = number * (20 if letter == 'X' else 10)
    return min(280, base + scale)


def fetch_solar_flares(start_date: str, end_date: str) -> list:
    api_key = get_nasa_api_key()
    headers = {
        'Accept': 'application/json',
        'Authorization': f'Apikey {api_key}' if api_key else ''
    }

    try:
        url = f'{NASA_DONKI_BASE}/FLR?startDate={start_date}&endDate={end_date}&level=ALL'
        response = requests.get(url, headers=headers, timeout=30)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"Error fetching solar flares: {e}")

    return []


def fetch_geomagnetic_storms(start_date: str, end_date: str) -> list:
    api_key = get_nasa_api_key()
    headers = {
        'Accept': 'application/json',
        'Authorization': f'Apikey {api_key}' if api_key else ''
    }

    try:
        url = f'{NASA_DONKI_BASE}/GST?startDate={start_date}&endDate={end_date}'
        response = requests.get(url, headers=headers, timeout=30)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"Error fetching geomagnetic storms: {e}")

    return []


def fetch_sep_events(start_date: str, end_date: str) -> list:
    api_key = get_nasa_api_key()
    headers = {
        'Accept': 'application/json',
        'Authorization': f'Apikey {api_key}' if api_key else ''
    }

    try:
        url = f'{NASA_DONKI_BASE}/SEP?startDate={start_date}&endDate={end_date}'
        response = requests.get(url, headers=headers, timeout=30)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"Error fetching SEP events: {e}")

    return []


def generate_training_samples(num_samples: int = 50000) -> pd.DataFrame:
    np = None
    try:
        import numpy as np
    except ImportError:
        import random
        class NpWrapper:
            pass
        np = NpWrapper

    import numpy as np

    np.random.seed(42)

    data = {
        'altitude_km': np.random.normal(408, 12, num_samples),
        'orbital_inclination': np.random.normal(51.6, 0.1, num_samples),
        'eccentricity': np.clip(np.random.normal(0.0001, 0.00005, num_samples), 0, 0.01),
        'in_eclipse': np.random.binomial(1, 0.38, num_samples)
    }

    GM = 398600.4418
    data['velocity_kms'] = np.sqrt(GM / (6371 + data['altitude_km']))

    sunlit_mask = data['in_eclipse'] == 0
    eclipse_mask = data['in_eclipse'] == 1

    data['temperature_c'] = np.zeros(num_samples)
    data['temperature_c'][sunlit_mask] = np.random.normal(90, 20, sunlit_mask.sum())
    data['temperature_c'][eclipse_mask] = np.random.normal(-120, 15, eclipse_mask.sum())

    data['battery_pct'] = np.zeros(num_samples)
    data['battery_pct'][sunlit_mask] = np.random.normal(90, 8, sunlit_mask.sum())
    data['battery_pct'][eclipse_mask] = np.random.normal(55, 10, eclipse_mask.sum())
    data['battery_pct'] = np.clip(data['battery_pct'], 20, 100)

    data['solar_flux'] = np.clip(np.random.normal(150, 40, num_samples), 70, 280)
    data['signal_snr_db'] = np.random.normal(18, 4, num_samples)

    df = pd.DataFrame(data)
    df['is_anomaly'] = 0

    num_anomalies = int(num_samples * 0.05)
    anomaly_indices = np.random.choice(num_samples, num_anomalies, replace=False)

    for idx in anomaly_indices:
        anomaly_type = np.random.choice(['thermal', 'power', 'signal'])
        if anomaly_type == 'thermal':
            df.loc[idx, 'temperature_c'] = np.random.uniform(150, 200)
        elif anomaly_type == 'power':
            df.loc[idx, 'battery_pct'] = np.random.uniform(5, 15)
            df.loc[idx, 'temperature_c'] = np.random.uniform(-30, 0)
        else:
            df.loc[idx, 'signal_snr_db'] = np.random.uniform(-5, 5)

        df.loc[idx, 'is_anomaly'] = 1

    return df


def main():
    print("Fetching NASA DONKI data...")

    end_date = datetime.now().strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')

    flares = fetch_solar_flares(start_date, end_date)
    print(f"Fetched {len(flares)} solar flare events")

    storms = fetch_geomagnetic_storms(start_date, end_date)
    print(f"Fetched {len(storms)} geomagnetic storm events")

    sep_events = fetch_sep_events(start_date, end_date)
    print(f"Fetched {len(sep_events)} SEP events")

    nasa_events = []

    for flare in flares:
        nasa_events.append({
            'event_type': 'Solar Flare',
            'class_type': flare.get('classType', 'Unknown'),
            'start_time': flare.get('beginTime', ''),
            'peak_time': flare.get('peakTime', ''),
            'f10_7_equivalent': map_flare_class_to_f107(flare.get('classType', 'C1'))
        })

    for storm in storms:
        nasa_events.append({
            'event_type': 'Geomagnetic Storm',
            'class_type': storm.get('gmtSummary', 'Unknown'),
            'start_time': storm.get('startTime', ''),
            'peak_time': storm.get('peakTime', ''),
            'kp_index': int(storm.get('gmtSummary', 'G1').replace('G', '') or '1')
        })

    for sep in sep_events:
        nasa_events.append({
            'event_type': 'SEP Event',
            'class_type': sep.get('protonFluxThreshold', 'Unknown'),
            'start_time': sep.get('eventTime', ''),
            'peak_time': sep.get('eventTime', ''),
            'flux_threshold': sep.get('protonFluxThreshold', 'Unknown')
        })

    nasa_df = pd.DataFrame(nasa_events)
    nasa_df.to_csv(os.path.join(DATA_DIR, 'nasa_donki_events.csv'), index=False)
    print(f"Saved NASA DONKI events to nasa_donki_events.csv")

    print("Generating training telemetry samples...")
    training_df = generate_training_samples(50000)
    training_df.to_csv(os.path.join(DATA_DIR, 'training_telemetry.csv'), index=False)
    print(f"Saved {len(training_df)} training samples to training_telemetry.csv")
    print(f"Anomaly rate: {training_df['is_anomaly'].mean()*100:.2f}%")


if __name__ == '__main__':
    main()