'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { SatelliteState, SATELLITES, TelemetrySnapshot, DataSource } from '@/types/satellite'
import { fetchTLEs, TLERecord } from '@/lib/tleService'
import { propagate, deriveTemp, deriveBattery, deriveSignal, deriveStatus } from '@/lib/propagator'

function blank(noradId: string, name: string): SatelliteState {
  return {
    noradId, name, altitude: 0, velocity: 0, temperature: 0,
    battery: 80, signalStrength: null, lat: 0, lng: 0,
    eclipseStatus: 'sunlit', status: 'nominal', history: [], dataSource: 'loading',
  }
}

export function useTelemetry() {
  const [satellites, setSatellites] = useState<SatelliteState[]>(
    SATELLITES.map(s => blank(s.noradId, s.name))
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [dataSource, setDataSource] = useState<DataSource>('loading')

  const tleRef = useRef<TLERecord[]>([])
  const stateRef = useRef<Map<string, SatelliteState>>(new Map())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const tick = useCallback(() => {
    const now = new Date()
    const updated: SatelliteState[] = []

    for (const tle of tleRef.current) {
      const prev = stateRef.current.get(tle.noradId) ?? blank(tle.noradId, tle.name)
      const prop = propagate(tle.tle1, tle.tle2, now)

      let next: SatelliteState
      if (prop) {
        const temperature = deriveTemp(prop.eclipseStatus, prev.temperature, tle.noradId)
        const battery = deriveBattery(prop.eclipseStatus, prev.battery)
        const signalStrength = deriveSignal(prop.elevationDeg)
        const status = deriveStatus(temperature, battery, signalStrength)
        const snap: TelemetrySnapshot = {
          timestamp: now.getTime(),
          altitude: prop.altitude, velocity: prop.velocity,
          temperature, battery, signalStrength,
        }
        next = {
          ...prev,
          altitude: prop.altitude, velocity: prop.velocity,
          lat: prop.lat, lng: prop.lng,
          eclipseStatus: prop.eclipseStatus,
          temperature, battery, signalStrength, status,
          history: [...prev.history.slice(-59), snap],
          dataSource: tle.isLive ? 'live' : 'cached',
          name: tle.name,
        }
        console.log(
          `[SATGUARD] ${tle.name} | Alt:${prop.altitude}km | ` +
          `Vel:${prop.velocity}km/s | ${prop.eclipseStatus} | ` +
          `Temp:${temperature}°C | Bat:${battery}% | ` +
          `Signal:${signalStrength ?? 'OOR'}dBm | ` +
          `Src:${tle.isLive ? 'LIVE' : 'FALLBACK'}`
        )
      } else {
        next = prev
      }
      stateRef.current.set(tle.noradId, next)
      updated.push(next)
    }

    if (updated.length > 0) {
      setSatellites(updated)
      setLastUpdated(new Date())
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTLEs().then(tles => {
      tleRef.current = tles
      const isLive = tles.some(t => t.isLive)
      setDataSource(isLive ? 'live' : 'cached')
      if (!isLive) setError('CelesTrak unavailable — using fallback TLE data')
      tick()
      timerRef.current = setInterval(tick, 10000)
    })
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [tick])

  return { satellites, loading, error, lastUpdated, dataSource }
}