import { useState, useEffect, useCallback } from "react";
import * as satellite from "satellite.js";

interface TleData {
  name: string;
  line1: string;
  line2: string;
}

export interface TrackedSatellite {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  inclination: number;
  eccentricity: number;
  period: number;
  isAnomaly: boolean;
  anomalyScore: number;
  severity: "low" | "medium" | "high" | "critical";
  orbit: string;
  tle: TleData | null;
}

export interface AnomalyData {
  totalSatellites: number;
  anomaliesDetected: number;
  criticalAlerts: number;
  modelStatus: string;
  lastUpdated: string;
}

const SATELLITE_GROUPS = ["stations", "gps-ops", "weather", "starlink", "amateur"];

export function useSatelliteTracking() {
  const [satellites, setSatellites] = useState<TrackedSatellite[]>([]);
  const [anomalyData, setAnomalyData] = useState<AnomalyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSatellite, setSelectedSatellite] = useState<TrackedSatellite | null>(null);

  const fetchTLEData = useCallback(async (group: string): Promise<TleData[]> => {
    try {
      const response = await fetch(
        `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle`
      );
      const text = await response.text();
      const lines = text.split("\n").filter((line) => line.trim() !== "");

      const tles: TleData[] = [];
      for (let i = 0; i < lines.length - 2; i += 3) {
        const name = lines[i]?.trim();
        const line1 = lines[i + 1]?.trim();
        const line2 = lines[i + 2]?.trim();

        if (name && line1 && line2 && line1.length >= 60 && line2.length >= 60) {
          tles.push({ name, line1, line2 });
        }
      }
      return tles;
    } catch (err) {
      console.error(`Failed to fetch TLE for ${group}:`, err);
      return [];
    }
  }, []);

  const calculatePosition = useCallback((tle: TleData): TrackedSatellite | null => {
    try {
      const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
      const position = satellite.propagate(satrec, new Date()) as any;

      if (!position || !position.position || typeof position.position === 'boolean') return null;

      const gmst = satellite.gstime(new Date());
      const coords = satellite.eciToGeodetic(position.position, gmst);

      const altitudeKm = coords.height;
      let velocity = 0;
      if (position.velocity) {
        const vel = position.velocity.velocity as { x: number; y: number; z: number };
        velocity = Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2);
      }

      const orbit = altitudeKm < 2000 ? "LEO" : altitudeKm < 20000 ? "MEO" : "GEO";

      // Parse orbital elements for anomaly detection
      const inclination = parseFloat(tle.line2.substring(8, 16));
      const eccentricity = parseFloat("0." + tle.line2.substring(26, 33));
      const period = parseFloat(tle.line1.substring(33, 43));

      // Simple anomaly detection based on orbital parameters
      let isAnomaly = false;
      let anomalyScore = 0;
      let severity: "low" | "medium" | "high" | "critical" = "low";

      // Check for unusual altitude (decay orboost)
      if (altitudeKm < 200 || altitudeKm > 50000) {
        isAnomaly = true;
        anomalyScore += 0.5;
      }

      // Check for unusual eccentricity
      if (eccentricity > 0.1) {
        isAnomaly = true;
        anomalyScore += 0.3;
      }

      // Determine severity
      if (anomalyScore > 0.7) severity = "critical";
      else if (anomalyScore > 0.5) severity = "high";
      else if (anomalyScore > 0.3) severity = "medium";

      return {
        id: `${tle.name}-${Math.random().toString(36).substr(2, 9)}`,
        name: tle.name,
        latitude: satellite.degreesToRadians(coords.latitude),
        longitude: satellite.degreesToRadians(coords.longitude),
        altitude: altitudeKm,
        velocity: velocity,
        inclination,
        eccentricity,
        period,
        isAnomaly,
        anomalyScore,
        severity,
        orbit,
        tle: { name: tle.name, line1: tle.line1, line2: tle.line2 },
      };
    } catch (err) {
      console.error(`Failed to calculate position for ${tle.name}:`, err);
      return null;
    }
  }, []);

  const fetchSatellites = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch TLE data from multiple groups
      const allTLEs: TleData[] = [];
      for (const group of SATELLITE_GROUPS) {
        const tles = await fetchTLEData(group);
        allTLEs.push(...tles);
        // Limit to avoid too many satellites
        if (allTLEs.length >= 50) break;
      }

      // Calculate positions for each satellite
      const trackedSatellites: TrackedSatellite[] = [];
      for (const tle of allTLEs) {
        const sat = calculatePosition(tle);
        if (sat) {
          trackedSatellites.push(sat);
        }
        if (trackedSatellites.length >= 30) break;
      }

      setSatellites(trackedSatellites);

      // Also fetch anomaly data from existing API
      try {
        const anomalyResponse = await fetch("/api/anomaly");
        const anomalyJson = await anomalyResponse.json();
        setAnomalyData({
          totalSatellites: trackedSatellites.length,
          anomaliesDetected: anomalyJson.anomaliesDetected || trackedSatellites.filter(s => s.isAnomaly).length,
          criticalAlerts: trackedSatellites.filter(s => s.severity === "critical" || s.severity === "high").length,
          modelStatus: "Active",
          lastUpdated: new Date().toISOString(),
        });
      } catch {
        // Continue without anomaly data
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch satellite data");
    } finally {
      setIsLoading(false);
    }
  }, [fetchTLEData, calculatePosition]);

  // Initial fetch and periodic updates
  useEffect(() => {
    fetchSatellites();

    const interval = setInterval(() => {
      fetchSatellites();
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [fetchSatellites]);

  const selectSatellite = useCallback((satellite: TrackedSatellite | null) => {
    setSelectedSatellite(satellite);
  }, []);

  return {
    satellites,
    anomalyData,
    isLoading,
    error,
    selectedSatellite,
    selectSatellite,
    refreshData: fetchSatellites,
  };
}