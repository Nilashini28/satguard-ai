'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { AnomalyAlert, SatelliteState } from '@/types/satellite'
import { detectAnomalies } from '@/lib/anomalyEngine'
import { narrate } from '@/lib/groqClient'

export function useAnomalyDetection(satellites: SatelliteState[]) {
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([])
  const seen = useRef<Set<string>>(new Set())

  const addNarration = useCallback(async (id: string, alert: AnomalyAlert) => {
    const narration = await narrate(alert)
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, narration, narrationLoading: false } : a))
  }, [])

  useEffect(() => {
    if (!satellites.length) return
    const newAlerts: AnomalyAlert[] = []
    for (const sat of satellites) {
      for (const raw of detectAnomalies(sat, seen.current)) {
        const alert: AnomalyAlert = { ...raw, narration: '', narrationLoading: true, acknowledged: false }
        newAlerts.push(alert)
      }
    }
    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 50))
      newAlerts.forEach(a => addNarration(a.id, a))
    }
  }, [satellites, addNarration])

  const acknowledge = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a))
  }, [])

  return {
    activeAlerts: alerts.filter(a => !a.acknowledged),
    historicalAlerts: alerts.filter(a => a.acknowledged),
    acknowledge,
  }
}