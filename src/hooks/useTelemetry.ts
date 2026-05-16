"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SatelliteState, TelemetrySnapshot, TrackedSatellite } from '@/types/satellite';
import { TRACKED_SATELLITES, GROUND_STATION } from '@/types/satellite';
import * as satellite from 'satellite.js';
import {
  propagateSatellite,
  calculateVelocity,
  calculateEclipseStatus,
  calculateElevation,
  calculateTemperature,
  calculateBattery,
  calculateSignalStrength
} from '@/lib/satelliteUtils';

interface TelemetryData {
  satellites: SatelliteState[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

const CELESTRAK_API = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json';

async function fetchTleData(noradId: number): Promise<{ line1: string; line2: string } | null> {
  try {
    const response = await fetch(CELESTRAK_API);
    const data = await response.json();

    const sat = data.find((s: { NORAD_CAT_ID: number }) => s.NORAD_CAT_ID === noradId);
    if (sat) {
      return {
        line1: sat.TLE_LINE1,
        line2: sat.TLE_LINE2
      };
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch TLE for ${noradId}:`, error);
    return null;
  }
}

function createInitialHistory(): TelemetrySnapshot[] {
  const history: TelemetrySnapshot[] = [];
  const now = new Date();

  for (let i = 59; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 10000);
    history.push({
      timestamp: time,
      altitude: 400 + Math.random() * 20,
      velocity: 7.6 + Math.random() * 0.2,
      temperature: -15 + Math.random() * 10,
      battery: 80 + Math.random() * 10,
      signalStrength: -85 + Math.random() * 10,
      lat: 0,
      lng: 0,
      eclipseStatus: 'sunlit'
    });
  }

  return history;
}

export function useTelemetry(): TelemetryData {
  const [satellites, setSatellites] = useState<SatelliteState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const tleCache = useRef<Map<number, { line1: string; line2: string }>>(new Map());

  const updateSatelliteState = useCallback(async (sat: TrackedSatellite, history: TelemetrySnapshot[]) => {
    let tle: { line1: string; line2: string } | undefined = tleCache.current.get(sat.noradId);

    if (!tle) {
      const fetchedTle = await fetchTleData(sat.noradId);
      if (fetchedTle) {
        tle = fetchedTle;
        tleCache.current.set(sat.noradId, fetchedTle);
      }
    }

    const fallbackTle = {
      line1: '1 25544U 98067A   24141.90146947 -.00447018  00000-0 -12706-3 0  9991',
      line2: '2 25544  51.6393 328.3327 0008215  33.4513 326.6759 15.49837754711763'
    };

    const actualTle = tle || fallbackTle;

    try {
      const satrec = satellite.twoline2satrec(actualTle.line1, actualTle.line2);
      const position = satellite.propagate(satrec, new Date());

      if (!position || !position.position || typeof position.position === 'boolean') {
        return null;
      }

      const gmst = satellite.gstime(new Date());
      const coords = satellite.eciToGeodetic(position.position as any, gmst);

      const lat = coords.latitude * (180 / Math.PI);
      const lng = coords.longitude * (180 / Math.PI);
      const altitude = coords.height;

      const velocity = position.velocity
        ? Math.sqrt((position.velocity as any).x ** 2 + (position.velocity as any).y ** 2 + (position.velocity as any).z ** 2)
        : 7.5;

      const eclipseStatus = calculateEclipseStatus({ name: sat.name, line1: actualTle.line1, line2: actualTle.line2 }, new Date());

      const elevation = calculateElevation(GROUND_STATION.lat, GROUND_STATION.lng, lat, lng, altitude);
      const signalStrength = calculateSignalStrength(elevation);

      const lastSnapshot = history[history.length - 1];
      const isSunlit = eclipseStatus === 'sunlit';
      const temperature = isSunlit ? 85 + Math.random() * 35 : -60 - Math.random() * 35;
      const battery = lastSnapshot
        ? calculateBattery(lastSnapshot.battery, isSunlit)
        : 75 + Math.random() * 20;

      return {
        noradId: sat.noradId.toString(),
        name: sat.name,
        altitude: Math.round(altitude * 100) / 100,
        velocity: Math.round(velocity * 1000) / 1000,
        temperature: Math.round(temperature * 10) / 10,
        battery: Math.round(battery),
        signalStrength,
        lat,
        lng,
        eclipseStatus,
        status: 'nominal' as const,
        history: []
      };
    } catch (err) {
      console.error(`Error propagating ${sat.name}:`, err);
      return null;
    }
  }, []);

  useEffect(() => {
    const initializeSatellites = async () => {
      const initialHistory = createInitialHistory();

      const initializedSatellites: SatelliteState[] = await Promise.all(
        TRACKED_SATELLITES.map(async (sat) => {
          const state = await updateSatelliteState(sat, initialHistory);
          if (state) {
            return { ...state, history: initialHistory };
          }
          return {
            noradId: sat.noradId.toString(),
            name: sat.name,
            altitude: 420,
            velocity: 7.66,
            temperature: -15,
            battery: 82,
            signalStrength: -85,
            lat: 0,
            lng: 0,
            eclipseStatus: 'sunlit' as const,
            status: 'nominal' as const,
            history: initialHistory
          };
        })
      );

      setSatellites(initializedSatellites);
      setLoading(false);
      setLastUpdated(new Date());
    };

    initializeSatellites();
  }, [updateSatelliteState]);

  useEffect(() => {
    if (loading) return;

    const interval = setInterval(async () => {
      const updatedSatellites = await Promise.all(
        satellites.map(async (sat) => {
          const trackedSat = TRACKED_SATELLITES.find(ts => ts.noradId.toString() === sat.noradId);
          if (!trackedSat) return sat;

          const newState = await updateSatelliteState(trackedSat, sat.history);
          if (!newState) return sat;

          const newSnapshot: TelemetrySnapshot = {
            timestamp: new Date(),
            altitude: newState.altitude,
            velocity: newState.velocity,
            temperature: newState.temperature,
            battery: newState.battery,
            signalStrength: newState.signalStrength,
            lat: newState.lat,
            lng: newState.lng,
            eclipseStatus: newState.eclipseStatus
          };

          const newHistory = [...sat.history.slice(-59), newSnapshot];

          return {
            ...newState,
            history: newHistory
          };
        })
      );

      setSatellites(updatedSatellites);
      setLastUpdated(new Date());
    }, 10000);

    return () => clearInterval(interval);
  }, [loading, satellites, updateSatelliteState]);

  return { satellites, loading, error, lastUpdated };
}