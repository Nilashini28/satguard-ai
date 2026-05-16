import { NextResponse } from 'next/server';
import { getSatellitePosition, calculateDerivedValues, TRACKED_SATELLITES } from '@/lib/n2yo';

export const dynamic = 'force-dynamic';
import { getSolarFlux, getGeomagneticStormData, getRadiationBeltData } from '@/lib/nasa';

const ISS_API = 'https://api.wheretheiss.at/v1/satellites/25544';

interface SatelliteTelemetry {
  noradId: number;
  name: string;
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  temperature: number;
  battery: number;
  signalStrength: number;
  inEclipse: boolean;
  azimuth: number;
  elevation: number;
  timestamp: string;
}

interface SpaceWeatherData {
  solarFlux: number | null;
  fluxTimestamp: string | null;
  fluxSource: string | null;
  geomagneticStorm: {
    level: string;
    kpIndex: number;
    active: boolean;
  } | null;
  radiationBelt: {
    eventType: string;
    severity: string;
  } | null;
}

async function fetchISSPosition(): Promise<{ latitude: number; longitude: number; altitude: number; velocity: number } | null> {
  try {
    const response = await fetch(ISS_API, { next: { revalidate: 10 } });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      latitude: data.latitude,
      longitude: data.longitude,
      altitude: data.altitude,
      velocity: data.velocity / 3600 // Convert from km/h to km/s
    };
  } catch (error) {
    console.error('ISS API error:', error);
    return null;
  }
}

function determineEclipse(altitude: number, latitude: number, longitude: number, timestamp: Date): boolean {
  const hour = timestamp.getUTCHours();
  const latAbs = Math.abs(latitude);
  const inNightSide = (hour >= 12 && longitude > 90) || (hour < 12 && longitude < -90);
  return inNightSide && latAbs > 30;
}

export async function GET() {
  try {
    const issData = await fetchISSPosition();
    const solarFluxData = await getSolarFlux();
    const geomagneticData = await getGeomagneticStormData();
    const radiationData = await getRadiationBeltData();

    const satelliteResults: SatelliteTelemetry[] = [];

    const results = await Promise.allSettled(
      TRACKED_SATELLITES.map(async (sat) => {
        const position = await getSatellitePosition(sat.noradId);
        return { sat, position };
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.position) {
        const { sat, position } = result.value;
        const timestamp = new Date(position.timestamp);

        const inEclipse = sat.noradId === 25544 && issData
          ? determineEclipse(position.altitude, position.latitude, position.longitude, timestamp)
          : position.longitude > 90 || position.longitude < -90;

        const derived = calculateDerivedValues(
          position.altitude,
          inEclipse,
          position.elevation
        );

        satelliteResults.push({
          noradId: sat.noradId,
          name: sat.name,
          latitude: position.latitude,
          longitude: position.longitude,
          altitude: position.altitude,
          velocity: derived.velocity,
          temperature: derived.temperature,
          battery: derived.battery,
          signalStrength: derived.signalStrength,
          inEclipse,
          azimuth: position.azimuth,
          elevation: position.elevation,
          timestamp: position.timestamp
        });
      } else if (result.status === 'fulfilled' && !result.value.position) {
        const { sat } = result.value;
        if (sat.noradId === 25544 && issData) {
          const timestamp = new Date();
          const inEclipse = determineEclipse(issData.altitude, issData.latitude, issData.longitude, timestamp);
          const derived = calculateDerivedValues(issData.altitude, inEclipse, 45);

          satelliteResults.push({
            noradId: sat.noradId,
            name: sat.name,
            latitude: issData.latitude,
            longitude: issData.longitude,
            altitude: issData.altitude,
            velocity: issData.velocity,
            temperature: derived.temperature,
            battery: derived.battery,
            signalStrength: derived.signalStrength,
            inEclipse,
            azimuth: 0,
            elevation: 45,
            timestamp: timestamp.toISOString()
          });
        }
      }
    }

    const spaceWeather: SpaceWeatherData = {
      solarFlux: solarFluxData?.flux ?? null,
      fluxTimestamp: solarFluxData?.timestamp ?? null,
      fluxSource: solarFluxData?.source ?? null,
      geomagneticStorm: geomagneticData ? {
        level: geomagneticData.stormLevel,
        kpIndex: geomagneticData.kpIndex,
        active: geomagneticData.active
      } : null,
      radiationBelt: radiationData ? {
        eventType: radiationData.eventType,
        severity: radiationData.severity
      } : null
    };

    return NextResponse.json({
      satellites: satelliteResults,
      spaceWeather,
      fetchedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in /api/satellites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch satellite data', satellites: [] },
      { status: 500 }
    );
  }
}