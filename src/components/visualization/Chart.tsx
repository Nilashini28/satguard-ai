'use client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { SatelliteState } from '@/types/satellite'
import { forecast } from '@/lib/forecaster'

const CFG = {
  temperature: { label: 'Temperature (°C)', color: '#f59e0b', hiLine: 125, loLine: -100 },
  battery:     { label: 'Battery (%)',       color: '#10b981', hiLine: null, loLine: 15 },
  altitude:    { label: 'Altitude (km)',     color: '#3b82f6', hiLine: null, loLine: null },
  velocity:    { label: 'Velocity (km/s)',   color: '#8b5cf6', hiLine: null, loLine: null },
}

export function TelemetryChart({ satellite, metric }: { satellite: SatelliteState; metric: keyof typeof CFG }) {
  const cfg = CFG[metric]
  const hist = satellite.history.slice(-60)
  const histData = hist.map(h => ({
    t: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    v: h[metric as keyof typeof h] as number,
  }))
  const vals = hist.map(h => h[metric as keyof typeof h] as number)
  const fc = forecast(vals, metric)
  const fcData = fc.points.map(p => ({
    t: new Date(p.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    f: Math.round(p.value * 100) / 100,
  }))
  const allData = [...histData.map(d => ({ ...d, f: undefined })), ...fcData.map(d => ({ ...d, v: undefined }))]

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs text-gray-400 font-medium">{cfg.label}</span>
        {fc.breaches && fc.breachMs && (
          <span className="text-xs bg-red-900 text-red-400 px-2 py-0.5 rounded-full animate-pulse">
            ⚠ Breach in {Math.round(fc.breachMs / 1000)}s
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={allData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="t" tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 11, color: '#f9fafb' }} />
          {cfg.hiLine && <ReferenceLine y={cfg.hiLine} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1} />}
          {cfg.loLine && <ReferenceLine y={cfg.loLine} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1} />}
          <Line dataKey="v" stroke={cfg.color} strokeWidth={2} dot={false} connectNulls name="Actual" />
          <Line dataKey="f" stroke={cfg.color} strokeWidth={1.5} strokeDasharray="5 3" dot={false} connectNulls name="Forecast" opacity={0.6} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}