import { NextResponse } from 'next/server';

const NOAA_BASE = 'https://services.swpc.noaa.gov';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [kpRes, solarWindRes, xrayRes] = await Promise.allSettled([
      fetch(`${NOAA_BASE}/products/noaa-planetary-k-index.json`, { next: { revalidate: 300 } }),
      fetch(`${NOAA_BASE}/products/solar-wind/mag-5-minute.json`, { next: { revalidate: 300 } }),
      fetch(`${NOAA_BASE}/json/goes/primary/xrays-6-hour.json`, { next: { revalidate: 300 } }),
    ]);

    let kpIndex = 0;
    let kpHistory: { time: string; kp: number }[] = [];
    if (kpRes.status === 'fulfilled' && kpRes.value.ok) {
      const kpData = await kpRes.value.json();
      const recent = kpData.slice(-24);
      kpIndex = parseFloat(recent[recent.length - 1]?.[1] ?? '0');
      kpHistory = recent.map((r: string[]) => ({ time: r[0], kp: parseFloat(r[1]) }));
    }

    let solarWindBz = 0;
    let solarWindSpeed = 0;
    if (solarWindRes.status === 'fulfilled' && solarWindRes.value.ok) {
      const swData = await solarWindRes.value.json();
      const last = swData[swData.length - 1];
      solarWindBz = parseFloat(last?.[3] ?? '0');
      solarWindSpeed = parseFloat(last?.[6] ?? '0');
    }

    let xrayFlux = 0;
    let flareClass = 'A';
    if (xrayRes.status === 'fulfilled' && xrayRes.value.ok) {
      const xData = await xrayRes.value.json();
      const last = xData[xData.length - 1];
      xrayFlux = parseFloat(last?.flux ?? '0');
      if (xrayFlux >= 1e-4) flareClass = 'X';
      else if (xrayFlux >= 1e-5) flareClass = 'M';
      else if (xrayFlux >= 1e-6) flareClass = 'C';
      else if (xrayFlux >= 1e-7) flareClass = 'B';
    }

    const riskLevel =
      kpIndex >= 7 ? 'SEVERE' :
      kpIndex >= 5 ? 'MODERATE' :
      kpIndex >= 3 ? 'LOW' : 'QUIET';

    return NextResponse.json({
      kpIndex,
      kpHistory,
      solarWindBz,
      solarWindSpeed,
      xrayFlux,
      flareClass,
      riskLevel,
      timestamp: new Date().toISOString(),
      source: 'NOAA SWPC',
    });
  } catch (err) {
    console.error('Space weather error:', err);
    return NextResponse.json({ error: 'Failed to fetch space weather' }, { status: 502 });
  }
}