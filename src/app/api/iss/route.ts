import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch('http://api.open-notify.org/iss-now.json', {
      next: { revalidate: 5 },
    });
    if (!res.ok) throw new Error('ISS API failed');
    const data = await res.json();
    return NextResponse.json({
      lat: parseFloat(data.iss_position.latitude),
      lng: parseFloat(data.iss_position.longitude),
      timestamp: data.timestamp,
      name: 'ISS (ZARYA)',
      altKm: 408,
      velocityKms: 7.66,
    });
  } catch {
    return NextResponse.json({ error: 'ISS data unavailable' }, { status: 502 });
  }
}