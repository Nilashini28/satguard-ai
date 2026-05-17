'use client'
import { TelemetrySnapshot } from '@/types/satellite'

interface MetricCardProps {
  label: string
  value: number | null
  unit: string
  metricKey: keyof TelemetrySnapshot
  history: TelemetrySnapshot[]
  status: 'nominal' | 'warning' | 'critical'
  icon: string
  decimals?: number
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <div className="h-6" />
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) =>
    `${(i / (values.length - 1)) * 80},${24 - ((v - min) / range) * 22}`
  ).join(' ')
  return (
    <svg width="80" height="24" viewBox="0 0 80 24">
      <polyline points={pts} fill="none" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        className="text-blue-400" />
    </svg>
  )
}

const statusStyle = {
  nominal: 'text-green-400',
  warning: 'text-amber-400',
  critical: 'text-red-400',
}

export function MetricCard({ label, value, unit, metricKey, history, status, icon, decimals = 1 }: MetricCardProps) {
  const vals = history.map(h => {
    const v = h[metricKey]
    return typeof v === 'number' ? v : null
  }).filter((v): v is number => v !== null).slice(-10)

  const trend = vals.length >= 3
    ? vals[vals.length - 1] - vals[vals.length - 3] > 0.01 ? '↑'
    : vals[vals.length - 1] - vals[vals.length - 3] < -0.01 ? '↓' : '→'
    : null

  if (value === null) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 animate-pulse">
        <div className="h-3 bg-gray-700 rounded w-1/2 mb-2" />
        <div className="h-6 bg-gray-700 rounded w-3/4 mb-2" />
        <p className="text-xs text-gray-600">Connecting...</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 hover:border-gray-600 transition-colors">
      <div className="flex justify-between items-start mb-1">
        <span className="text-xs text-gray-400 uppercase tracking-wide">{icon} {label}</span>
        {trend && <span className={`text-xs ${statusStyle[status]}`}>{trend}</span>}
      </div>
      <div className={`text-2xl font-semibold tabular-nums ${statusStyle[status]}`}>
        {value.toFixed(decimals)}
        <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>
      </div>
      <div className="mt-2 opacity-60"><Sparkline values={vals} /></div>
    </div>
  )
}