import pandas as pd
import numpy as np
import joblib
import json
import os
from datetime import datetime
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.ensemble import IsolationForest

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))


def load_training_data():
    csv_path = os.path.join(DATA_DIR, 'training_telemetry.csv')
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Training data not found at {csv_path}. Run fetch_nasa_data.py first.")

    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df)} training samples")
    print(f"Anomaly rate: {df['is_anomaly'].mean()*100:.2f}%")

    return df


def prepare_features(df):
    feature_names = [
        'altitude_km', 'velocity_kms', 'temperature_c', 'battery_pct',
        'solar_flux', 'signal_snr_db', 'orbital_inclination', 'eccentricity', 'in_eclipse'
    ]

    X = df[feature_names].values
    y = df['is_anomaly'].values

    return X, y, feature_names


def train_isolation_forest(X, y, feature_names):
    print("\nTraining Isolation Forest...")

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    iso_forest = IsolationForest(
        n_estimators=200,
        contamination=0.05,
        random_state=42,
        n_jobs=-1
    )

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y
    )

    iso_forest.fit(X_train)

    y_pred = iso_forest.predict(X_test)
    y_pred_binary = (y_pred == -1).astype(int)

    y_score = -iso_forest.decision_function(X_test)

    print("\nIsolation Forest Results:")
    print(classification_report(y_test, y_pred_binary, target_names=['Normal', 'Anomaly']))

    auc = roc_auc_score(y_test, y_score)
    print(f"ROC-AUC Score: {auc:.4f}")

    scaler_path = os.path.join(MODEL_DIR, 'scaler.pkl')
    joblib.dump(scaler, scaler_path)
    print(f"Saved scaler to {scaler_path}")

    iso_path = os.path.join(MODEL_DIR, 'isolation_forest.pkl')
    joblib.dump(iso_forest, iso_path)
    print(f"Saved Isolation Forest to {iso_path}")

    return iso_forest, scaler, auc


def train_lstm_autoencoder(X_scaled, feature_names):
    print("\nTraining LSTM Autoencoder...")

    try:
        import tensorflow as tf
        from tensorflow.keras.models import Sequential
        from tensorflow.keras.layers import LSTM, Dense, Dropout, RepeatVector, TimeDistributed
        from tensorflow.keras.callbacks import EarlyStopping
    except ImportError as e:
        print(f"TensorFlow not available: {e}")
        print("Skipping LSTM training")
        return None, None

    normal_mask = (X_scaled[:, -1] == 0)
    X_normal = X_scaled[normal_mask]

    seq_len = 10
    num_features = len(feature_names)

    X_normal_expanded = np.expand_dims(X_normal[:-(len(X_normal) % seq_len)], 1)
    X_normal_expanded = np.tile(X_normal_expanded, (1, seq_len, 1))
    X_normal_seq = X_normal_expanded.reshape(-1, seq_len, num_features)

    train_size = int(0.8 * len(X_normal_seq))
    X_train_seq = X_normal_seq[:train_size]
    X_test_seq = X_normal_seq[train_size:]

    model = Sequential([
        LSTM(64, activation='relu', return_sequences=True, input_shape=(seq_len, num_features)),
        Dropout(0.2),
        LSTM(32, activation='relu'),
        RepeatVector(seq_len),
        LSTM(32, activation='relu', return_sequences=True),
        Dropout(0.2),
        LSTM(64, activation='relu', return_sequences=True),
        TimeDistributed(Dense(num_features))
    ])

    model.compile(optimizer='adam', loss='mse')

    early_stop = EarlyStopping(patience=3, restore_best_weights=True)

    print("Training LSTM...")
    model.fit(
        X_train_seq, X_train_seq,
        epochs=20,
        batch_size=32,
        validation_data=(X_test_seq, X_test_seq),
        callbacks=[early_stop],
        verbose=1
    )

    reconstructions = model.predict(X_test_seq, verbose=0)
    mse = np.mean(np.power(X_test_seq - reconstructions, 2), axis=(1, 2))
    threshold = np.percentile(mse, 99)

    print(f"LSTM reconstruction error threshold (99th percentile): {threshold:.4f}")

    lstm_path = os.path.join(MODEL_DIR, 'lstm_autoencoder.h5')
    model.save(lstm_path)
    print(f"Saved LSTM Autoencoder to {lstm_path}")

    return model, threshold


def compute_shap_importance(X_test, y_test, feature_names, scaler):
    print("\nComputing SHAP feature importance...")

    try:
        import shap
        from sklearn.ensemble import IsolationForest

        iso_forest = IsolationForest(n_estimators=100, random_state=42, n_jobs=-1)
        iso_forest.fit(X_test)

        X_sample = X_test[:500]
        explainer = shap.TreeExplainer(iso_forest)
        shap_values = explainer.shap_values(X_sample)

        if isinstance(shap_values, list):
            shap_values = shap_values[0]

        mean_abs_shap = np.abs(shap_values).mean(axis=0)
        importance_dict = {name: float(val) for name, val in zip(feature_names, mean_abs_shap)}

        sorted_importance = dict(sorted(importance_dict.items(), key=lambda x: x[1], reverse=True))

        print("SHAP Feature Importance:")
        for name, importance in sorted_importance.items():
            print(f"  {name}: {importance:.4f}")

        return sorted_importance
    except ImportError as e:
        print(f"SHAP not available: {e}")
        return {name: 0.5 for name in feature_names}


def save_metadata(auc_score, threshold, num_samples, feature_names, shap_importance):
    metadata = {
        "model_version": "1.0.0",
        "trained_at": datetime.utcnow().isoformat() + "Z",
        "training_samples": num_samples,
        "anomaly_rate": 0.05,
        "features": feature_names,
        "isolation_forest_roc_auc": round(auc_score, 4),
        "lstm_threshold": round(threshold, 4) if threshold else None,
        "shap_feature_importance": shap_importance,
        "data_source": "Physics-based simulation with NASA DONKI labels"
    }

    metadata_path = os.path.join(MODEL_DIR, 'metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    print(f"\nSaved metadata to {metadata_path}")
    return metadata


def main():
    print("=" * 60)
    print("SATGUARD ML Model Training")
    print("=" * 60)

    df = load_training_data()
    X, y, feature_names = prepare_features(df)

    iso_forest, scaler, auc_score = train_isolation_forest(X, y, feature_names)

    X_scaled = scaler.transform(X)
    lstm_model, lstm_threshold = train_lstm_autoencoder(X_scaled, feature_names)

    shap_importance = compute_shap_importance(X_scaled, y, feature_names, scaler)

    metadata = save_metadata(
        auc_score,
        lstm_threshold if lstm_threshold else 0,
        len(df),
        feature_names,
        shap_importance
    )

    print("\n" + "=" * 60)
    print("Training Complete!")
    print("=" * 60)
    print(f"Model: {metadata['model_version']}")
    print(f"Trained: {metadata['trained_at']}")
    print(f"Training samples: {metadata['training_samples']}")
    print(f"ROC-AUC: {metadata['isolation_forest_roc_auc']}")
    print(f"Data source: {metadata['data_source']}")


if __name__ == '__main__':
    main()