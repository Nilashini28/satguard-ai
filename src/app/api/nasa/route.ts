import { NextResponse } from 'next/server';
import { getSolarFlux, getGeomagneticStormData, getRadiationBeltData } from '@/lib/nasa';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [solarFlux, geomagneticStorm, radiationBelt] = await Promise.all([
      getSolarFlux(),
      getGeomagneticStormData(),
      getRadiationBeltData()
    ]);

    return NextResponse.json({
      solarFlux: solarFlux ? {
        value: solarFlux.flux,
        timestamp: solarFlux.timestamp,
        source: solarFlux.source
      } : null,
      geomagneticStorm: geomagneticStorm ? {
        level: geomagneticStorm.stormLevel,
        kpIndex: geomagneticStorm.kpIndex,
        active: geomagneticStorm.active,
        timestamp: geomagneticStorm.timestamp
      } : null,
      radiationBelt: radiationBelt ? {
        eventType: radiationBelt.eventType,
        severity: radiationBelt.severity,
        timestamp: radiationBelt.timestamp,
        description: radiationBelt.description
      } : null,
      fetchedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching NASA data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NASA data' },
      { status: 500 }
    );
  }
}