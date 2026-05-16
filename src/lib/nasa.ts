const NASA_DONKI_BASE = 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/donki';

interface SolarFlareEvent {
  flareID: string;
  beginTime: string;
  peakTime: string;
  endTime: string;
  classType: string;
  sourceLocation: string;
}

interface GeomagneticStormEvent {
  gstID: string;
  startTime: string;
  peakTime: string;
  endTime: string;
  gmtSummary: string;
}

interface SEPEvent {
  sepID: string;
  eventTime: string;
  spacecraftName: string;
  protonFluxThreshold: string;
}

function mapFlareClassToF10_7(flareClass: string): number {
  const classLetter = flareClass.charAt(0).toUpperCase();
  const classNumber = parseFloat(flareClass.substring(1)) || 1;

  const baseFlux: Record<string, number> = {
    'A': 70,
    'B': 100,
    'C': 150,
    'M': 200,
    'X': 280
  };

  const base = baseFlux[classLetter] || 150;
  const scale = classNumber * (classLetter === 'X' ? 20 : 10);
  return Math.min(280, base + scale);
}

export async function getSolarFlux(): Promise<{
  flux: number;
  timestamp: string;
  source: string;
} | null> {
  const apiKey = process.env.NASA_API_KEY;
  if (!apiKey) {
    console.error('NASA_API_KEY not configured');
    return null;
  }

  try {
    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const response = await fetch(
      `${NASA_DONKI_BASE}/FLR?startDate=${startDate}&endDate=${endDate}&level=ALL`,
      {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Apikey ${apiKey}`
        }
      }
    );

    if (!response.ok) {
      console.error(`NASA FLR API error: ${response.status}`);
      return null;
    }

    const data: SolarFlareEvent[] = await response.json();

    if (data.length > 0) {
      const latestFlare = data[data.length - 1];
      const flux = mapFlareClassToF10_7(latestFlare.classType);

      return {
        flux,
        timestamp: latestFlare.peakTime || new Date().toISOString(),
        source: `NASA DONKI - ${latestFlare.classType} flare`
      };
    }

    return {
      flux: 150,
      timestamp: new Date().toISOString(),
      source: 'NASA DONKI - Default (no recent flares)'
    };
  } catch (error) {
    console.error('Failed to fetch solar flux:', error);
    return {
      flux: 150,
      timestamp: new Date().toISOString(),
      source: 'NASA DONKI - Fallback (API error)'
    };
  }
}

export async function getGeomagneticStormData(): Promise<{
  stormLevel: string;
  kpIndex: number;
  timestamp: string;
  active: boolean;
} | null> {
  const apiKey = process.env.NASA_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const response = await fetch(
      `${NASA_DONKI_BASE}/GST?startDate=${startDate}&endDate=${endDate}`,
      {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Apikey ${apiKey}`
        }
      }
    );

    if (!response.ok) {
      console.error(`NASA GST API error: ${response.status}`);
      return null;
    }

    const data: GeomagneticStormEvent[] = await response.json();

    if (data.length > 0) {
      const latest = data[data.length - 1];
      const levelMatch = latest.gmtSummary.match(/G(\d)/);
      const level = levelMatch ? parseInt(levelMatch[1]) : 0;

      return {
        stormLevel: level >= 5 ? 'Severe' : level >= 4 ? 'Moderate' : 'Minor',
        kpIndex: level * 2,
        timestamp: latest.peakTime || new Date().toISOString(),
        active: true
      };
    }

    return {
      stormLevel: 'Quiet',
      kpIndex: 1,
      timestamp: new Date().toISOString(),
      active: false
    };
  } catch (error) {
    console.error('Failed to fetch geomagnetic storm data:', error);
    return null;
  }
}

export async function getRadiationBeltData(): Promise<{
  eventType: string;
  severity: string;
  timestamp: string;
  description: string;
} | null> {
  const apiKey = process.env.NASA_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const response = await fetch(
      `${NASA_DONKI_BASE}/SEP?startDate=${startDate}&endDate=${endDate}`,
      {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Apikey ${apiKey}`
        }
      }
    );

    if (!response.ok) {
      console.error(`NASA SEP API error: ${response.status}`);
      return null;
    }

    const data: SEPEvent[] = await response.json();

    if (data.length > 0) {
      const latest = data[data.length - 1];
      const threshold = parseFloat(latest.protonFluxThreshold) || 10;

      return {
        eventType: 'Solar Energetic Particle',
        severity: threshold > 100 ? 'Severe' : threshold > 10 ? 'Moderate' : 'Minor',
        timestamp: latest.eventTime,
        description: `${latest.spacecraftName} detected ${latest.protonFluxThreshold} proton flux`
      };
    }

    return {
      eventType: 'None',
      severity: 'Normal',
      timestamp: new Date().toISOString(),
      description: 'No SEP events in the past 7 days'
    };
  } catch (error) {
    console.error('Failed to fetch SEP data:', error);
    return null;
  }
}