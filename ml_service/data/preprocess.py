import pandas as pd
import numpy as np
from pathlib import Path

DATA_DIR = Path(__file__).parent


def load_training_data() -> pd.DataFrame:
    csv_path = DATA_DIR / 'training_telemetry.csv'
    df = pd.read_csv(csv_path)
    return df


def load_nasa_events() -> pd.DataFrame:
    csv_path = DATA_DIR / 'nasa_donki_events.csv'
    if not csv_path.exists():
        return pd.DataFrame()
    return pd.read_csv(csv_path)


def preprocess_telemetry(df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    feature_names = [
        'altitude_km', 'velocity_kms', 'temperature_c', 'battery_pct',
        'solar_flux', 'signal_snr_db', 'orbital_inclination', 'eccentricity', 'in_eclipse'
    ]

    X = df[feature_names].values
    y = df['is_anomaly'].values

    return X, y


def split_data(X: np.ndarray, y: np.ndarray, test_size: float = 0.2, random_state: int = 42):
    from sklearn.model_selection import train_test_split
    return train_test_split(X, y, test_size=test_size, random_state=random_state, stratify=y)


def main():
    print("Loading training data...")
    df = load_training_data()

    print(f"Total samples: {len(df)}")
    print(f"Features: {df.columns.tolist()}")

    X, y = preprocess_telemetry(df)

    print(f"Feature matrix shape: {X.shape}")
    print(f"Target shape: {y.shape}")
    print(f"Anomaly rate: {y.mean()*100:.2f}%")

    X_train, X_test, y_train, y_test = split_data(X, y)

    print(f"\nTraining set: {X_train.shape[0]} samples")
    print(f"Test set: {X_test.shape[0]} samples")


if __name__ == '__main__':
    main()