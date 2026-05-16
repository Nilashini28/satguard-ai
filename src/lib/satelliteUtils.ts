import * as satellite from 'satellite.js';
import type { TleData, TelemetrySnapshot, SatellitePosition } from '@/types/satellite';

export function parseTleFromCelestrak(data: string): TleData[] {
  const lines = data.trim().split('\n').filter(line => line.trim());
  const tles: TleData[] = [];

  for (let i = 0; i < lines.length - 2; i += 3) {
    const name = lines[i]?.trim();
    const line1 = lines[i + 1]?.trim();
    const line2 = lines[i + 2]?.trim();

    if (name && line1 && line2 && line1.length >= 60 && line2.length >= 60) {
      const noradMatch = line1.match(/^1\s+(\d{5})/);
      const noradId = noradMatch ? parseInt(noradMatch[1]) : undefined;
      tles.push({ name, line1, line2, noradId });
    }
  }

  return tles;
}

export function propagateSatellite(tle: TleData, date: Date = new Date()): SatellitePosition | null {
  try {
    if (!tle.line1 || !tle.line2) return null;

    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
    const position = satellite.propagate(satrec, date);

    if (!position || !position.position || typeof position.position === 'boolean') {
      return null;
    }

    const gmst = satellite.gstime(date);
    const coords = satellite.eciToGeodetic(position.position as any, gmst);

    return {
      lat: coords.latitude * (180 / Math.PI),
      lng: coords.longitude * (180 / Math.PI),
      altitude: coords.height
    };
  } catch {
    return null;
  }
}

export function calculateVelocity(tle: TleData, date: Date = new Date()): number {
  try {
    if (!tle.line1 || !tle.line2) return 0;

    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
    const position = satellite.propagate(satrec, date);

    if (!position || !position.velocity) return 0;

    const vel = position.velocity as any;
    return Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2);
  } catch {
    return 0;
  }
}

export function calculateEclipseStatus(tle: TleData, date: Date = new Date()): 'sunlit' | 'eclipse' {
  try {
    if (!tle.line1 || !tle.line2) return 'sunlit';

    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
    const position = satellite.propagate(satrec, date);

    if (!position || !position.position) return 'sunlit';

    const sunPosition = getSunPosition(date);
    const satPosition = position.position as any;

    const dotProduct = sunPosition.x * satPosition.x + sunPosition.y * satPosition.y + sunPosition.z * satPosition.z;
    const sunMagnitude = Math.sqrt(sunPosition.x ** 2 + sunPosition.y ** 2 + sunPosition.z ** 2);
    const satMagnitude = Math.sqrt(satPosition.x ** 2 + satPosition.y ** 2 + satPosition.z ** 2);

    const angle = Math.acos(dotProduct / (sunMagnitude * satMagnitude));
    return angle > Math.PI / 2 ? 'eclipse' : 'sunlit';
  } catch {
    return 'sunlit';
  }
}

function getSunPosition(date: Date): { x: number; y: number; z: number } {
  const j2000 = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
  const daysSinceJ2000 = (date.getTime() - j2000.getTime()) / (1000 * 60 * 60 * 24);

  const meanLongitude = (280.46 + 0.9856474 * daysSinceJ2000) % 360;
  const meanAnomaly = (357.528 + 0.9856003 * daysSinceJ2000) % 360;
  const eclipticLongitude = meanLongitude + 1.915 * Math.sin(meanAnomaly * Math.PI / 180) + 0.02 * Math.sin(2 * meanAnomaly * Math.PI / 180);

  const obliquity = 23.439 - 0.0000004 * daysSinceJ2000;
  const obliquityRad = obliquity * Math.PI / 180;
  const eclipticRad = eclipticLongitude * Math.PI / 180;

  return {
    x: Math.cos(eclipticRad),
    y: Math.cos(obliquityRad) * Math.sin(eclipticRad),
    z: Math.sin(obliquityRad) * Math.sin(eclipticRad)
  };
}

export function calculateElevation(lat: number, lng: number, satLat: number, satLng: number, satAlt: number): number {
  const R = 6371;
  const r = R + satAlt;

  const dLat = (satLat - lat) * Math.PI / 180;
  const dLng = (satLng - lng) * Math.PI / 180;

  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * Math.PI / 180) * Math.cos(satLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  const elevation = Math.asin((r ** 2 - R ** 2 - distance ** 2) / (2 * R * distance)) * 180 / Math.PI;

  return elevation;
}

export function calculateTemperature(eclipseStatus: 'sunlit' | 'eclipse', transitionProgress: number): number {
  if (eclipseStatus === 'sunlit') {
    return 85 + transitionProgress * 35;
  } else {
    return -60 - (1 - transitionProgress) * 35;
  }
}

export function calculateBattery(current: number, isSunlit: boolean): number {
  const change = isSunlit ? 0.5 : -0.3;
  return Math.max(5, Math.min(100, current + change));
}

export function calculateSignalStrength(elevation: number): number | null {
  if (elevation < 5) return null;
  if (elevation > 30) return -80;
  return -105 + (elevation - 5) * (25 / 25);
}

export function generateOrbitPath(tle: TleData, numPoints: number = 90): { lat: number; lng: number }[] {
  const positions: { lat: number; lng: number }[] = [];
  const now = new Date();

  for (let i = 0; i < numPoints; i++) {
    const time = new Date(now.getTime() + i * 60 * 1000);
    const pos = propagateSatellite(tle, time);
    if (pos) {
      positions.push({ lat: pos.lat, lng: pos.lng });
    }
  }

  return positions;
}

export function latLngToVector3(lat: number, lng: number, radius: number): { x: number; y: number; z: number } {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lng + 180) * Math.PI / 180;

  return {
    x: -radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta)
  };
}