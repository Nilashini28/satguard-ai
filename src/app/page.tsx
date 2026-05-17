'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useTelemetry } from '@/hooks/useTelemetry'
import { useAnomalyDetection } from '@/hooks/useAnomalyDetection'
import { Header } from '@/components/layout/Header'
import { SatSelector } from '@/components/telemetry/SatSelector'
import { SatellitePanel } from '@/components/telemetry/SatellitePanel'
import { TelemetryChart } from '@/components/visualization/Chart'
import { AlertPanel } from '@/components/ai/AlertPanel'
import { ChatWidget } from '@/components/ai/ChatWidget'
import { Terminal } from '@/components/commands/Terminal'
import { AnomalyAlert } from '@/types/satellite'

const Globe = dynamic(
  () => import('@/components/visualization/Globe').then(m => m.Globe),
  {
    ssr: false,
    loading: () => (
      <div className="bg-gray-950 rounded-xl border border-gray-800 h-64 flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-gray-500 text-xs">Loading orbital view...</p>
        </div>
      </div>
    ),
  }
)

export default function Page() {
  const { satellites, loading, error, lastUpdated, dataSource } = useTelemetry()
  const { activeAlerts, acknowledge } = useAnomalyDetection(satellites)
  const [activeSat, setActiveSat] = useState('25544')
  const [activeMetric, setActiveMetric] = useState<'temperature' | 'battery' | 'altitude' | 'velocity'>('temperature')
  const [prefill, setPrefill] = useState<string | undefined>()
  const [dark, setDark] = useState(true)

  const satellite = satellites.find(s => s.noradId === activeSat) ?? satellites[0]

  if (!satellite || loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-400 text-sm">Fetching live TLE data from CelesTrak...</p>
        <p className="text-gray-600 text-xs">Propagating orbital mechanics via satellite.js</p>
      </div>
    </div>
  )

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
        <Header
          lastUpdated={lastUpdated}
          activeAlertCount={activeAlerts.length}
          satelliteCount={satellites.length}
          dataSource={dataSource}
          darkMode={dark}
          onToggleDark={() => setDark(d => !d)}
        />

        {error && (
          <div className="bg-amber-950 border-b border-amber-800 px-6 py-2 text-xs text-amber-400 text-center">
            ⚠ {error}
          </div>
        )}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
          <SatSelector satellites={satellites} active={activeSat} onSelect={setActiveSat} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Column 1: Globe + Terminal */}
            <div className="space-y-5">
              <Globe satellites={satellites} />
              <Terminal satellite={satellite} />
            </div>

            {/* Column 2: Metrics + Charts */}
            <div className="space-y-4">
              <SatellitePanel satellite={satellite} loading={loading} />

              <div className="flex gap-2 flex-wrap">
                {(['temperature','battery','altitude','velocity'] as const).map(m => (
                  <button key={m} onClick={() => setActiveMetric(m)}
                    className={`text-xs px-3 py-1.5 rounded-lg border capitalize transition-colors ${
                      activeMetric === m
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-gray-900 text-gray-400 border-gray-700 hover:border-gray-500'
                    }`}>
                    {m}
                  </button>
                ))}
              </div>

              <TelemetryChart satellite={satellite} metric={activeMetric} />
            </div>

            {/* Column 3: AI Alerts */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-100">AI Anomaly Alerts</h2>
                {activeAlerts.length > 0 && (
                  <span className="text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded-full">
                    {activeAlerts.length} active
                  </span>
                )}
              </div>
              <AlertPanel
                alerts={activeAlerts}
                onAcknowledge={acknowledge}
                onInvestigate={(a: AnomalyAlert) => setPrefill(
                  `Investigate: ${a.satelliteName} — ${a.metric} is ${a.currentValue} vs baseline ${a.baselineValue}. Severity: ${a.severity}.`
                )}
              />
            </div>
          </div>
        </main>

        <ChatWidget
          satellites={satellites}
          alerts={activeAlerts}
          prefill={prefill}
          onClearPrefill={() => setPrefill(undefined)}
        />
      </div>
    </div>
  )
}