"use client";

import { useMemo } from 'react';
import type { SatelliteState, ForecastPoint } from '@/types/satellite';
import { generateForecast } from '@/lib/forecastEngine';

export function useForecast(satellite: SatelliteState | null) {
  const temperatureForecast = useMemo((): ForecastPoint[] => {
    if (!satellite || !satellite.history || satellite.history.length < 10) return [];
    return generateForecast(satellite.history, 'temperature');
  }, [satellite]);

  const batteryForecast = useMemo((): ForecastPoint[] => {
    if (!satellite || !satellite.history || satellite.history.length < 10) return [];
    return generateForecast(satellite.history, 'battery');
  }, [satellite]);

  const signalForecast = useMemo((): ForecastPoint[] => {
    if (!satellite || !satellite.history || satellite.history.length < 10) return [];
    return generateForecast(satellite.history, 'signalStrength');
  }, [satellite]);

  const altitudeForecast = useMemo((): ForecastPoint[] => {
    if (!satellite || !satellite.history || satellite.history.length < 10) return [];
    return generateForecast(satellite.history, 'altitude');
  }, [satellite]);

  const velocityForecast = useMemo((): ForecastPoint[] => {
    if (!satellite || !satellite.history || satellite.history.length < 10) return [];
    return generateForecast(satellite.history, 'velocity');
  }, [satellite]);

  const hasPredictedAnomaly = useMemo(() => {
    return (
      temperatureForecast.some(f => f.isAnomaly) ||
      batteryForecast.some(f => f.isAnomaly) ||
      signalForecast.some(f => f.isAnomaly)
    );
  }, [temperatureForecast, batteryForecast, signalForecast]);

  const timeToAnomaly = useMemo(() => {
    const allForecasts = [
      ...temperatureForecast.filter(f => f.isAnomaly),
      ...batteryForecast.filter(f => f.isAnomaly),
      ...signalForecast.filter(f => f.isAnomaly)
    ];

    if (allForecasts.length === 0) return null;

    allForecasts.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const firstAnomaly = allForecasts[0];
    const minutesUntil = Math.round((firstAnomaly.timestamp.getTime() - Date.now()) / 60000);

    return minutesUntil > 0 ? minutesUntil : null;
  }, [temperatureForecast, batteryForecast, signalForecast]);

  return {
    temperatureForecast,
    batteryForecast,
    signalForecast,
    altitudeForecast,
    velocityForecast,
    hasPredictedAnomaly,
    timeToAnomaly
  };
}