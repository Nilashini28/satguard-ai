export interface ForecastPoint { time: number; value: number; upper: number; lower: number }
export interface Forecast { points: ForecastPoint[]; breaches: boolean; breachMs: number | null }

function linReg(vals: number[]) {
  const n = vals.length
  if (n < 3) return { slope: 0, intercept: vals[vals.length - 1] ?? 0 }
  const xs = vals.map((_, i) => i)
  const sx = xs.reduce((a, b) => a + b, 0)
  const sy = vals.reduce((a, b) => a + b, 0)
  const sxy = xs.reduce((s, x, i) => s + x * vals[i], 0)
  const sx2 = xs.reduce((s, x) => s + x * x, 0)
  const d = n * sx2 - sx * sx
  if (d === 0) return { slope: 0, intercept: sy / n }
  return { slope: (n * sxy - sx * sy) / d, intercept: (sy - ((n * sxy - sx * sy) / d) * sx) / n }
}

function getLimit(metric: string) {
  if (metric === 'temperature') return { hi: 125, lo: -100 }
  if (metric === 'battery') return { hi: null, lo: 15 }
  if (metric === 'signal') return { hi: null, lo: -118 }
  return { hi: null, lo: null }
}

export function forecast(vals: number[], metric: string, tickMs = 10000): Forecast {
  const window = vals.slice(-20)
  const avg = window.reduce((a, b) => a + b, 0) / (window.length || 1)
  const sd = Math.sqrt(window.reduce((s, v) => s + (v - avg) ** 2, 0) / (window.length || 1))
  const { slope, intercept } = linReg(window)
  const n = window.length
  const lim = getLimit(metric)
  const now = Date.now()
  const points: ForecastPoint[] = []
  let breaches = false
  let breachMs: number | null = null

  for (let i = 1; i <= 18; i++) {
    const value = Math.round((slope * (n + i - 1) + intercept) * 100) / 100
    points.push({ time: now + i * tickMs, value, upper: value + sd, lower: value - sd })
    if (!breaches) {
      if ((lim.hi !== null && value > lim.hi) || (lim.lo !== null && value < lim.lo)) {
        breaches = true; breachMs = i * tickMs
      }
    }
  }
  return { points, breaches, breachMs }
}