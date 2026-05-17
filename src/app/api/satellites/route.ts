import { NextResponse } from 'next/server';
import * as satellite from 'satellite.js';

const ACTIVE_URL = 'https://celestrak.org/gp.php?GROUP=active&FORMAT=json';

interface TleRecord {
  OBJECT_NAME: string;
  NORAD_CAT_ID: number;
  TLE_LINE1: string;
  TLE_LINE2: string;
}

interface SatelliteData {
  id: number;
  name: string;
  lat: number;
  lng: number;
  altKm: number;
  velocityKms: number;
  inclination: number;
  eccentricity: number;
  period: number;
  epoch: string;
}

let tleCache: { data: SatelliteData[]; ts: number } | null = null;

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const now = Date.now();

    if (tleCache && now - tleCache.ts < 60 * 60 * 1000) {
      return NextResponse.json({ satellites: tleCache.data, cached: true });
    }

    const res = await fetch(ACTIVE_URL, {
      headers: { 'User-Agent': 'SATGUARD-AI/1.0 (educational project)' },
      next: { revalidate: 3600 },
    });

    if (!res.ok) throw new Error(`CelesTrak returned ${res.status}`);

    const raw: TleRecord[] = await res.json();
    const top50 = raw.slice(0, 50);
    const nowDate = new Date();

    const satellites: SatelliteData[] = top50
      .map((obj: TleRecord) => {
        try {
          const satrec = satellite.twoline2satrec(obj.TLE_LINE1, obj.TLE_LINE2);
          const pv = satellite.propagate(satrec, nowDate);
          if (!pv.position || typeof pv.position === 'boolean') return null;

          const gmst = satellite.gstime(nowDate);
          const geo = satellite.eciToGeodetic(
            pv.position as satellite.EciVec3<number>,
            gmst
          );

          const vel = pv.velocity as satellite.EciVec3<number>;
          const speed = Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2);

          return {
            id: obj.NORAD_CAT_ID,
            name: obj.OBJECT_NAME.trim(),
            lat: satellite.degreesLat(geo.latitude),
            lng: satellite.degreesLong(geo.longitude),
            altKm: geo.height,
            velocityKms: speed,
            inclination: satrec.inclo * (180 / Math.PI),
            eccentricity: satrec.ecco,
            period: (2 * Math.PI) / satrec.no / 60,
            epoch: obj.TLE_LINE1.substring(18, 32).trim(),
          } as SatelliteData;
        } catch {
          return null;
        }
      })
      .filter((s): s is SatelliteData => s !== null);

    tleCache = { data: satellites, ts: now };
    return NextResponse.json({ satellites, cached: false, count: satellites.length });
  } catch (err) {
    console.error('Satellite API error:', err);
    if (tleCache) {
      return NextResponse.json({ satellites: tleCache.data, cached: true, stale: true });
    }
    return NextResponse.json({ error: 'Failed to fetch satellite data' }, { status: 502 });
  }
}