import { NextRequest } from 'next/server';
import { getSatellitePosition, calculateDerivedValues, TRACKED_SATELLITES } from '@/lib/n2yo';

export const dynamic = 'force-dynamic';

const ISS_API = 'https://api.wheretheiss.at/v1/satellites/25544';

async function fetchISSPosition(): Promise<{ latitude: number; longitude: number; altitude: number; velocity: number } | null> {
  try {
    const response = await fetch(ISS_API, { cache: 'no-store' });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      latitude: data.latitude,
      longitude: data.longitude,
      altitude: data.altitude,
      velocity: data.velocity
    };
  } catch {
    return null;
  }
}

function determineEclipse(latitude: number, longitude: number, timestamp: Date): boolean {
  const hour = timestamp.getUTCHours();
  const latAbs = Math.abs(latitude);
  const inNightSide = (hour >= 12 && longitude > 90) || (hour < 12 && longitude < -90);
  return inNightSide && latAbs > 30;
}

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: object) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const startTime = Date.now();
      const maxDuration = 5 * 60 * 1000;

      const sendUpdates = async () => {
        if (Date.now() - startTime > maxDuration) {
          sendEvent('end', { message: 'Stream timeout' });
          controller.close();
          return;
        }

        try {
          const issData = await fetchISSPosition();

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
                ? determineEclipse(issData.latitude, issData.longitude, timestamp)
                : position.longitude > 90 || position.longitude < -90;

              const derived = calculateDerivedValues(
                position.altitude,
                inEclipse,
                position.elevation
              );

              sendEvent('telemetry', {
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
                timestamp: position.timestamp
              });
            } else if (result.status === 'fulfilled' && !result.value.position) {
              const { sat } = result.value;
              if (sat.noradId === 25544 && issData) {
                const timestamp = new Date();
                const inEclipse = determineEclipse(issData.latitude, issData.longitude, timestamp);
                const derived = calculateDerivedValues(issData.altitude, inEclipse, 45);

                sendEvent('telemetry', {
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
                  timestamp: timestamp.toISOString()
                });
              }
            }
          }

          sendEvent('heartbeat', { timestamp: new Date().toISOString() });
        } catch (error) {
          console.error('Telemetry stream error:', error);
          sendEvent('error', { message: 'Failed to fetch telemetry' });
        }
      };

      await sendUpdates();

      const interval = setInterval(async () => {
        await sendUpdates();
      }, 15000);

      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        sendEvent('end', { message: 'Client disconnected' });
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}