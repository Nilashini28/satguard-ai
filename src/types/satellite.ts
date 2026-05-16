export interface TleData {
  name: string;
  line1: string;
  line2: string;
  noradId?: number;
}

export interface TelemetrySnapshot {
  timestamp: Date;
  altitude: number;
  velocity: number;
  temperature: number;
  battery: number;
  signalStrength: number | null;
  lat: number;
  lng: number;
  eclipseStatus: 'sunlit' | 'eclipse';
}

export type SatelliteStatus = 'nominal' | 'warning' | 'critical';

export interface SatelliteState {
  noradId: string;
  name: string;
  altitude: number;
  velocity: number;
  temperature: number;
  battery: number;
  signalStrength: number | null;
  lat: number;
  lng: number;
  eclipseStatus: 'sunlit' | 'eclipse';
  status: SatelliteStatus;
  history: TelemetrySnapshot[];
}

export type AnomalySeverity = 'HIGH' | 'MEDIUM' | 'LOW';
export type DetectionMethod = 'statistical' | 'threshold' | 'trend';

export interface AnomalyAlert {
  id: string;
  satelliteName: string;
  metric: string;
  currentValue: number;
  baselineValue: number;
  threshold: number;
  severity: AnomalySeverity;
  confidence: number;
  detectionMethod: DetectionMethod;
  timestamp: Date;
  narration: string;
  narrationLoading: boolean;
  acknowledged: boolean;
}

export interface SatellitePosition {
  lat: number;
  lng: number;
  altitude: number;
}

export interface ForecastPoint {
  timestamp: Date;
  value: number;
  lower: number;
  upper: number;
  isAnomaly: boolean;
}

export interface TrackedSatellite {
  id: string;
  name: string;
  noradId: number;
  tle: TleData;
}

export const TRACKED_SATELLITES: TrackedSatellite[] = [
  { id: 'ISS', name: 'ISS (ZARYA)', noradId: 25544, tle: { name: 'ISS (ZARYA)', line1: '', line2: '' } },
  { id: 'NOAA-19', name: 'NOAA 19', noradId: 33591, tle: { name: 'NOAA 19', line1: '', line2: '' } },
  { id: 'TERRA', name: 'TERRA', noradId: 25994, tle: { name: 'TERRA', line1: '', line2: '' } },
  { id: 'AQUA', name: 'AQUA', noradId: 27424, tle: { name: 'AQUA', line1: '', line2: '' } },
  { id: 'SENTINEL-2A', name: 'SENTINEL-2A', noradId: 40697, tle: { name: 'SENTINEL-2A', line1: '', line2: '' } },
];

export const GROUND_STATION = {
  lat: 13.08,
  lng: 80.27,
  name: 'Chennai, India'
};