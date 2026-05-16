const N2YO_BASE_URL = 'https://api.n2yo.com/rest/v1';

interface N2YOPosition {
  satid: number;
  satname: string;
  transactions楼层: number;
  info: {
    timestamp: number;
    ra: number;
    dec: number;
    azimuth: number;
    elevation: number;
    lat: number;
    lng: number;
    alt: number;
  };
}

interface N2YOTLEResponse {
  info: {
    satid: number;
    satname: string;
    transactions楼层: number;
  };
  tle: string[];
}

interface SatellitePosition {
  noradId: number;
  name: string;
  latitude: number;
  longitude: number;
  altitude: number;
  azimuth: number;
  elevation: number;
  timestamp: string;
}

interface TLEData {
  noradId: number;
  name: string;
  line1: string;
  line2: string;
  epoch: string;
}

const GM = 398600.4418;

function deriveVelocityFromAltitude(altitudeKm: number): number {
  const r = 6371 + altitudeKm;
  return Math.sqrt(GM / r);
}

function deriveSatelliteTemperature(altitudeKm: number, inEclipse: boolean): number {
  const baseTemp = inEclipse ? -120 : 90;
  const altitudeVariance = ((altitudeKm - 400) / 100) * 10;
  return baseTemp + altitudeVariance;
}

function deriveBatteryLevel(sunlightMinutes: number, orbitPeriodMinutes: number): number {
  const chargingRatio = Math.min(sunlightMinutes / orbitPeriodMinutes, 1);
  const baseCharge = 50;
  const maxCharge = 98;
  const minCharge = 20;
  return Math.min(maxCharge, Math.max(minCharge, baseCharge + chargingRatio * (maxCharge - baseCharge)));
}

function deriveSignalStrength(elevation: number): number {
  if (elevation < 5) return -120;
  if (elevation > 30) return -80;
  return -120 + ((elevation - 5) / 25) * 40;
}

export async function getSatellitePosition(noradId: number): Promise<SatellitePosition | null> {
  const apiKey = process.env.N2YO_API_KEY;
  if (!apiKey) {
    console.error('N2YO_API_KEY not configured');
    return null;
  }

  try {
    const response = await fetch(
      `${N2YO_BASE_URL}/satellite/positions/${noradId}/41.9028/12.4964/0/1`,
      {
        headers: { 'x-api-key': apiKey }
      }
    );

    if (!response.ok) {
      console.error(`N2YO API error: ${response.status}`);
      return null;
    }

    const data: N2YOPosition = await response.json();

    return {
      noradId: data.satid,
      name: data.satname,
      latitude: data.info.lat,
      longitude: data.info.lng,
      altitude: data.info.alt,
      azimuth: data.info.azimuth,
      elevation: data.info.elevation,
      timestamp: new Date(data.info.timestamp * 1000).toISOString()
    };
  } catch (error) {
    console.error(`Failed to fetch position for ${noradId}:`, error);
    return null;
  }
}

export async function getSatelliteTLE(noradId: number): Promise<TLEData | null> {
  const apiKey = process.env.N2YO_API_KEY;
  if (!apiKey) {
    console.error('N2YO_API_KEY not configured');
    return null;
  }

  try {
    const response = await fetch(
      `${N2YO_BASE_URL}/satellite/tle/${noradId}`,
      {
        headers: { 'x-api-key': apiKey }
      }
    );

    if (!response.ok) {
      console.error(`N2YO TLE API error: ${response.status}`);
      return null;
    }

    const data: N2YOTLEResponse = await response.json();

    if (!data.tle || data.tle.length < 2) {
      return null;
    }

    const line1 = data.tle[0];
    const epochMatch = line1.match(/(\d{2})(\d{3})\.(\d+)/);
    let epoch = '';
    if (epochMatch) {
      const year = parseInt(epochMatch[1]) < 50 ? `20${epochMatch[1]}` : `19${epochMatch[1]}`;
      const dayOfYear = parseInt(epochMatch[2]);
      epoch = `${year}-${String(Math.floor(dayOfYear / 30.437)).padStart(2, '0')}-${String(dayOfYear % 30).padStart(2, '0')}`;
    }

    return {
      noradId: data.info.satid,
      name: data.info.satname,
      line1: data.tle[0],
      line2: data.tle[1],
      epoch
    };
  } catch (error) {
    console.error(`Failed to fetch TLE for ${noradId}:`, error);
    return null;
  }
}

export function calculateDerivedValues(
  altitude: number,
  inEclipse: boolean,
  elevation: number,
  sunlitMinutes: number = 45
): {
  velocity: number;
  temperature: number;
  battery: number;
  signalStrength: number;
} {
  const velocity = deriveVelocityFromAltitude(altitude);
  const temperature = deriveSatelliteTemperature(altitude, inEclipse);
  const orbitPeriodMinutes = 92;
  const battery = deriveBatteryLevel(sunlitMinutes, orbitPeriodMinutes);
  const signalStrength = deriveSignalStrength(elevation);

  return { velocity, temperature, battery, signalStrength };
}

export const TRACKED_SATELLITES = [
  { noradId: 25544, name: 'ISS' },
  { noradId: 20580, name: 'Hubble Space Telescope' },
  { noradId: 43013, name: 'NOAA-20' },
  { noradId: 46984, name: 'Sentinel-6A Michael Freilich' },
  { noradId: 49044, name: 'Starlink-2551' }
];