'use client'
import { SatelliteState } from '@/types/satellite'
import { MetricCard } from './MetricCard'

interface SatellitePanelProps {
  satellite: SatelliteState
  loading: boolean
}

export function SatellitePanel({ satellite, loading }: SatellitePanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className={`w-2 h-2 rounded-full ${satellite.eclipseStatus === 'sunlit' ? 'bg-yellow-400' : 'bg-indigo-500'}`} />
        <span>{satellite.eclipseStatus === 'sunlit' ? 'Sunlit orbit' : 'Eclipse'}</span>
        <span className="text-gray-700">·</span>
        <span>{satellite.lat.toFixed(2)}°N {satellite.lng.toFixed(2)}°E</span>
        <span className="text-gray-700">·</span>
        <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${satellite.dataSource === 'live' ? 'bg-green-900 text-green-400' : 'bg-amber-900 text-amber-400'}`}>
          {satellite.dataSource === 'live' ? 'LIVE' : 'CACHED'} TLE
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Altitude" value={satellite.altitude} unit="km"
          metricKey="altitude" history={satellite.history}
          status="nominal" icon="🛰" decimals={1} />
        <MetricCard label="Velocity" value={satellite.velocity} unit="km/s"
          metricKey="velocity" history={satellite.history}
          status="nominal" icon="⚡" decimals={3} />
        <MetricCard label="Temperature" value={satellite.temperature} unit="°C"
          metricKey="temperature" history={satellite.history}
          status={satellite.temperature > 110 || satellite.temperature < -85 ?
            satellite.temperature > 125 || satellite.temperature < -100 ? 'critical' : 'warning'
            : 'nominal'}
          icon="🌡" decimals={1} />
        <MetricCard label="Battery" value={satellite.battery} unit="%"
          metricKey="battery" history={satellite.history}
          status={satellite.battery < 10 ? 'critical' : satellite.battery < 20 ? 'warning' : 'nominal'}
          icon="🔋" decimals={0} />
      </div>
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400 uppercase tracking-wide">📡 Signal Strength</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            satellite.signalStrength === null ? 'bg-gray-800 text-gray-500' :
            satellite.signalStrength < -110 ? 'bg-red-900 text-red-400' : 'bg-green-900 text-green-400'
          }`}>
            {satellite.signalStrength === null ? 'Out of range' : satellite.signalStrength < -110 ? 'Weak' : 'Good'}
          </span>
        </div>
        <div className="text-2xl font-semibold text-gray-100 mt-1 tabular-nums">
          {satellite.signalStrength === null ? <span className="text-gray-600 text-base">Below horizon</span>
            : <>{satellite.signalStrength.toFixed(1)}<span className="text-sm text-gray-500 ml-1">dBm</span></>}
        </div>
      </div>
    </div>
  )
}