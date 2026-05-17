export type EclipseStatus = 'sunlit' | 'eclipse'
export type SatelliteStatus = 'nominal' | 'warning' | 'critical'
export type AlertSeverity = 'HIGH' | 'MEDIUM' | 'LOW'
export type DetectionMethod = 'statistical' | 'threshold'
export type DataSource = 'live' | 'cached' | 'loading'

export interface TelemetrySnapshot {
  timestamp: number
  altitude: number
  velocity: number
  temperature: number
  battery: number
  signalStrength: number | null
}

export interface SatelliteState {
  noradId: string
  name: string
  altitude: number
  velocity: number
  temperature: number
  battery: number
  signalStrength: number | null
  lat: number
  lng: number
  eclipseStatus: EclipseStatus
  status: SatelliteStatus
  history: TelemetrySnapshot[]
  dataSource: DataSource
}

export interface AnomalyAlert {
  id: string
  satelliteName: string
  noradId: string
  metric: string
  currentValue: number
  baselineValue: number
  severity: AlertSeverity
  confidence: number
  detectionMethod: DetectionMethod
  timestamp: Date
  narration: string
  narrationLoading: boolean
  acknowledged: boolean
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface CommandLog {
  id: string
  text: string
  type: 'system' | 'info' | 'success' | 'error'
  timestamp: number
}

export const SATELLITES = [
  { noradId: '25544', name: 'ISS (ZARYA)' },
  { noradId: '33591', name: 'NOAA 19' },
  { noradId: '25994', name: 'TERRA' },
  { noradId: '27424', name: 'AQUA' },
  { noradId: '40697', name: 'SENTINEL-2A' },
]

export const THRESHOLDS = {
  temperature: { critical_high: 125, critical_low: -100, warn_high: 110, warn_low: -85 },
  battery: { critical_low: 10, warn_low: 20 },
  signal: { warn: -110, critical: -118 },
}