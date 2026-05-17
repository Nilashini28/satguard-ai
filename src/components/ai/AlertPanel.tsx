'use client'
import { AnomalyAlert } from '@/types/satellite'

const SEV = {
  HIGH:   { bar: 'border-l-red-500',   badge: 'bg-red-900 text-red-300' },
  MEDIUM: { bar: 'border-l-amber-500', badge: 'bg-amber-900 text-amber-300' },
  LOW:    { bar: 'border-l-blue-500',  badge: 'bg-blue-900 text-blue-300' },
}

export function AlertPanel({ alerts, onAcknowledge, onInvestigate }: {
  alerts: AnomalyAlert[]
  onAcknowledge: (id: string) => void
  onInvestigate: (a: AnomalyAlert) => void
}) {
  if (alerts.length === 0) return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center">
      <div className="text-3xl mb-2">✅</div>
      <p className="text-sm font-medium text-gray-200">All systems nominal</p>
      <p className="text-xs text-gray-500 mt-1">AI anomaly detection running</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {alerts.map(a => (
        <div key={a.id} className={`bg-gray-900 rounded-xl border border-gray-800 border-l-4 ${SEV[a.severity].bar} p-4`}>
          <div className="flex justify-between items-start gap-2 mb-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${SEV[a.severity].badge}`}>{a.severity}</span>
              <span className="text-sm font-medium text-gray-100">{a.satelliteName}</span>
              <span className="text-xs text-gray-500">{a.metric}</span>
            </div>
            <span className="text-xs text-gray-600">{a.timestamp.toLocaleTimeString()}</span>
          </div>
          <div className="flex gap-4 text-sm mb-3">
            <div><span className="text-xs text-gray-500 block">Current</span>
              <span className="font-semibold text-red-400">{a.currentValue.toFixed(1)}</span></div>
            <div><span className="text-xs text-gray-500 block">Baseline</span>
              <span className="font-semibold text-gray-300">{a.baselineValue.toFixed(1)}</span></div>
            <div className="ml-auto text-right"><span className="text-xs text-gray-500 block">Confidence</span>
              <span className="font-semibold text-gray-300">{a.confidence}%</span></div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 mb-3 min-h-12">
            {a.narrationLoading ? (
              <div className="flex items-center gap-2">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
                ))}
                <span className="text-xs text-gray-500">AI analyzing...</span>
              </div>
            ) : <p className="text-xs text-gray-300 leading-relaxed">{a.narration}</p>}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">{a.detectionMethod} detection</span>
            <div className="flex gap-2">
              <button onClick={() => onInvestigate(a)}
                className="text-xs px-2.5 py-1 rounded bg-blue-900 text-blue-300 hover:bg-blue-800 transition-colors">
                Investigate →
              </button>
              <button onClick={() => onAcknowledge(a.id)}
                className="text-xs px-2.5 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors">
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}