import { AnomalyAlert, AlertSeverity, DetectionMethod, SatelliteState, THRESHOLDS } from '@/types/satellite'

function mean(arr: number[]) { return arr.reduce((a, b) => a + b, 0) / arr.length }
function std(arr: number[], avg: number) {
  return Math.sqrt(arr.reduce((s, v) => s + (v - avg) ** 2, 0) / arr.length)
}

export function detectAnomalies(
  sat: SatelliteState,
  seen: Set<string>
): Omit<AnomalyAlert, 'narration' | 'narrationLoading' | 'acknowledged'>[] {
  const results: Omit<AnomalyAlert, 'narration' | 'narrationLoading' | 'acknowledged'>[] = []
  const bucket = Math.floor(Date.now() / 30000)

  function check(
    key: keyof typeof THRESHOLDS | string,
    label: string,
    current: number | null,
    getHistory: () => number[]
  ) {
    if (current === null) return
    const id = `${sat.noradId}-${key}-${bucket}`
    if (seen.has(id)) return

    let detected = false
    let severity: AlertSeverity = 'LOW'
    let confidence = 70
    let method: DetectionMethod = 'threshold'
    let baseline = current

    // Rule-based
    if (key === 'temperature') {
      if (current > THRESHOLDS.temperature.critical_high || current < THRESHOLDS.temperature.critical_low) {
        detected = true; severity = 'HIGH'; confidence = 95
      } else if (current > THRESHOLDS.temperature.warn_high || current < THRESHOLDS.temperature.warn_low) {
        detected = true; severity = 'MEDIUM'; confidence = 80
      }
    }
    if (key === 'battery') {
      if (current < THRESHOLDS.battery.critical_low) { detected = true; severity = 'HIGH'; confidence = 99; baseline = 50 }
      else if (current < THRESHOLDS.battery.warn_low) { detected = true; severity = 'MEDIUM'; confidence = 85; baseline = 50 }
    }
    if (key === 'signal' && current < THRESHOLDS.signal.critical) {
      detected = true; severity = 'MEDIUM'; confidence = 75; baseline = -95
    }

    // Statistical fallback
    if (!detected) {
      const hist = getHistory()
      if (hist.length >= 8) {
        const avg = mean(hist)
        const sd = std(hist, avg)
        baseline = Math.round(avg * 100) / 100
        if (sd > 0) {
          const z = Math.abs(current - avg) / sd
          if (z > 2.5) {
            detected = true
            method = 'statistical'
            confidence = Math.min(100, Math.round((z / 2.5) * 100))
            severity = z > 4 ? 'HIGH' : z > 3 ? 'MEDIUM' : 'LOW'
          }
        }
      }
    }

    if (!detected) return
    console.log(`[SATGUARD ANOMALY] ${sat.name} | ${label} | current: ${current} | baseline: ${baseline} | ${severity} | ${confidence}%`)
    seen.add(id)
    results.push({
      id, satelliteName: sat.name, noradId: sat.noradId,
      metric: label, currentValue: current, baselineValue: baseline,
      severity, confidence, detectionMethod: method, timestamp: new Date(),
    })
  }

  check('temperature', 'Temperature', sat.temperature, () => sat.history.map(h => h.temperature))
  check('battery', 'Battery', sat.battery, () => sat.history.map(h => h.battery))
  check('signal', 'Signal Strength', sat.signalStrength, () => sat.history.map(h => h.signalStrength ?? -95))
  check('altitude', 'Altitude', sat.altitude, () => sat.history.map(h => h.altitude))
  check('velocity', 'Velocity', sat.velocity, () => sat.history.map(h => h.velocity))

  return results
}