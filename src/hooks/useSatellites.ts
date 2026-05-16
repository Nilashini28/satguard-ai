import useSWR from 'swr';

export interface SatelliteTelemetry {
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

export interface SpaceWeather {
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

interface SatellitesResponse {
  satellites: SatelliteTelemetry[];
  spaceWeather: SpaceWeather;
  fetchedAt: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useSatellites(refreshInterval = 15000) {
  const { data, error, isLoading, mutate } = useSWR<SatellitesResponse>(
    '/api/satellites',
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: false,
      shouldRetryOnError: false
    }
  );

  return {
    satellites: data?.satellites ?? [],
    spaceWeather: data?.spaceWeather,
    lastFetched: data?.fetchedAt ? new Date(data.fetchedAt) : null,
    isLoading,
    error,
    refresh: mutate
  };
}