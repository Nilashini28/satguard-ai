// @ts-ignore
const sat = require('satellite.js')

const GS = { lat: 13.08 * Math.PI / 180, lng: 80.27 * Math.PI / 180 }
const EARTH_R = 6371

export interface PropResult {
  altitude: number
  velocity: number
  lat: number
  lng: number
  eclipseStatus: 'sunlit' | 'eclipse'
  elevationDeg: number
}

function sunECI(date: Date): { x: number; y: number; z: number } {
  const jd = date.getTime() / 86400000 + 2440587.5
  const T = (jd - 2451545.0) / 36525
  const L0 = 280.46646 + 36000.76983 * T
  const M = ((357.52911 + 35999.05029 * T) * Math.PI) / 180
  const C = (1.914602 - 0.004817 * T) * Math.sin(M) + 0.019993 * Math.sin(2 * M)
  const lng = ((L0 + C) * Math.PI) / 180
  const obl = ((23.439291 - 0.013004 * T) * Math.PI) / 180
  const AU = 149597870.7
  return { x: AU * Math.cos(lng), y: AU * Math.cos(obl) * Math.sin(lng), z: AU * Math.sin(obl) * Math.sin(lng) }
}

export function propagate(tle1: string, tle2: string, date: Date): PropResult | null {
  try {
    const satrec = sat.twoline2satrec(tle1, tle2)
    const pv = sat.propagate(satrec, date)
    if (!pv || typeof pv.position === 'boolean') return null

    const pos = pv.position as any
    const vel = pv.velocity as any
    const gmst = sat.gstime(date)
    const geo = sat.eciToGeodetic(pos, gmst)

    const altitude = Math.round(geo.height * 100) / 100
    const velocity = Math.round(Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2) * 1000) / 1000
    const lat = Math.round(sat.degreesLat(geo.latitude) * 1000) / 1000
    const lng = Math.round(sat.degreesLong(geo.longitude) * 1000) / 1000

    // Eclipse detection
    const sun = sunECI(date)
    const sunMag = Math.sqrt(sun.x ** 2 + sun.y ** 2 + sun.z ** 2)
    const sunUnit = { x: sun.x / sunMag, y: sun.y / sunMag, z: sun.z / sunMag }
    const dot = pos.x * sunUnit.x + pos.y * sunUnit.y + pos.z * sunUnit.z
    let eclipseStatus: 'sunlit' | 'eclipse' = 'sunlit'
    if (dot < 0) {
      const perpX = pos.x - dot * sunUnit.x
      const perpY = pos.y - dot * sunUnit.y
      const perpZ = pos.z - dot * sunUnit.z
      if (Math.sqrt(perpX ** 2 + perpY ** 2 + perpZ ** 2) < EARTH_R) {
        eclipseStatus = 'eclipse'
      }
    }

    // Elevation angle from Chennai
    const sLat = geo.latitude
    const sLng = geo.longitude
    const ca = Math.acos(
      Math.sin(GS.lat) * Math.sin(sLat) +
      Math.cos(GS.lat) * Math.cos(sLat) * Math.cos(sLng - GS.lng)
    )
    const elevRad = Math.atan2(Math.cos(ca) - EARTH_R / (EARTH_R + altitude), Math.sin(ca))
    const elevationDeg = (elevRad * 180) / Math.PI

    return { altitude, velocity, lat, lng, eclipseStatus, elevationDeg }
  } catch (e) {
    console.error('[SATGUARD] Propagation error:', e)
    return null
  }
}

export function deriveTemp(eclipse: 'sunlit' | 'eclipse', prev: number | null, noradId: string): number {
  const seed = (parseInt(noradId.slice(-3)) % 97) / 97
  const noise = Math.sin(Date.now() / 8000 + seed * 50) * 1.2
  if (eclipse === 'sunlit') {
    const target = 85 + seed * 35
    if (prev !== null && prev < 0) return Math.round(Math.min(target, prev + 6 + noise) * 10) / 10
    return Math.round((target + noise) * 10) / 10
  } else {
    const target = -95 + seed * 35
    if (prev !== null && prev > 0) return Math.round(Math.max(target, prev - 6 + noise) * 10) / 10
    return Math.round((target + noise) * 10) / 10
  }
}

export function deriveBattery(eclipse: 'sunlit' | 'eclipse', prev: number): number {
  const delta = eclipse === 'sunlit' ? 0.5 / 6 : -0.3 / 6
  return Math.round(Math.min(100, Math.max(5, prev + delta)) * 10) / 10
}

export function deriveSignal(elevDeg: number): number | null {
  if (elevDeg < 5) return null
  return Math.round((-105 + Math.min(elevDeg / 90, 1) * 25) * 10) / 10
}

export function deriveStatus(temp: number, battery: number, signal: number | null): 'nominal' | 'warning' | 'critical' {
  if (temp > 125 || temp < -100 || battery < 10) return 'critical'
  if (temp > 110 || temp < -85 || battery < 20 || (signal !== null && signal < -110)) return 'warning'
  return 'nominal'
}