import { useState, useEffect, useRef, useCallback } from 'react';
import type { LiveTelemetry } from './useLiveTelemetry';

export interface AnomalyAlert {
  id: string;
  satellite: string;
  timestamp: string;
  isAnomaly: boolean;
  confidence: number;
  anomalyScore: number;
  severity?: string;
  category?: string;
  description?: string;
  recommendedAction?: string;
  affectedFeatures?: string[];
  telemetrySnapshot?: Record<string, number>;
}

const MAX_ALERTS = 50;

export function useAnomalies(satellites: LiveTelemetry[]) {
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [processing, setProcessing] = useState(false);
  const lastProcessedRef = useRef<Set<string>>(new Set());
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const checkAnomaly = useCallback(async (satellite: LiveTelemetry) => {
    const key = `${satellite.noradId}-${satellite.timestamp}`;
    if (lastProcessedRef.current.has(key)) {
      return;
    }
    lastProcessedRef.current.add(key);

    if (lastProcessedRef.current.size > 1000) {
      const entries = Array.from(lastProcessedRef.current);
      lastProcessedRef.current = new Set(entries.slice(-500));
    }

    try {
      const features = {
        altitude_km: satellite.altitude,
        velocity_kms: satellite.velocity,
        temperature_c: satellite.temperature,
        battery_pct: satellite.battery,
        solar_flux: 150,
        signal_snr_db: satellite.signalStrength,
        orbital_inclination: satellite.noradId === 25544 ? 51.6 : 53,
        eccentricity: 0.0001,
        in_eclipse: satellite.inEclipse ? 1 : 0
      };

      const response = await fetch('/api/anomalies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noradId: satellite.noradId,
          name: satellite.name,
          ...features,
          inEclipse: satellite.inEclipse
        })
      });

      if (response.ok) {
        const result = await response.json();

        if (result.is_anomaly) {
          setAlerts(prev => {
            const newAlert: AnomalyAlert = {
              id: result.id || `alert-${Date.now()}`,
              satellite: result.satellite,
              timestamp: result.detectedAt || result.timestamp,
              isAnomaly: true,
              confidence: result.confidence,
              anomalyScore: result.anomalyScore,
              severity: result.severity,
              category: result.category,
              description: result.description,
              recommendedAction: result.recommendedAction,
              affectedFeatures: result.affectedFeatures,
              telemetrySnapshot: result.telemetrySnapshot
            };

            const existingIndex = prev.findIndex(a => a.id === newAlert.id);
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = newAlert;
              return updated;
            }

            return [newAlert, ...prev].slice(0, MAX_ALERTS);
          });
        } else if (!result.is_anomaly && result.error !== 'ML service unavailable') {
          setAlerts(prev => prev.filter(a => a.satellite !== satellite.name || !a.isAnomaly));
        }
      }
    } catch (e) {
      console.error('Anomaly check failed:', e);
    }
  }, []);

  useEffect(() => {
    if (satellites.length === 0 || processing) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setProcessing(true);
      satellites.forEach(sat => checkAnomaly(sat));
      setProcessing(false);
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [satellites, checkAnomaly, processing]);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return {
    alerts,
    processing,
    clearAlerts
  };
}