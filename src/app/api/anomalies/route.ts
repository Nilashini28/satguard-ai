import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface TelemetryInput {
  noradId: number;
  name: string;
  altitude: number;
  velocity: number;
  temperature: number;
  battery: number;
  signalStrength: number;
  inEclipse: boolean;
  solarFlux?: number;
  orbitalInclination?: number;
  eccentricity?: number;
}

export async function POST(req: NextRequest) {
  try {
    const telemetry: TelemetryInput = await req.json();

    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';

    const features = {
      altitude_km: telemetry.altitude,
      velocity_kms: telemetry.velocity,
      temperature_c: telemetry.temperature,
      battery_pct: telemetry.battery,
      solar_flux: telemetry.solarFlux ?? 150,
      signal_snr_db: telemetry.signalStrength,
      orbital_inclination: telemetry.orbitalInclination ?? 51.6,
      eccentricity: telemetry.eccentricity ?? 0.0001,
      in_eclipse: telemetry.inEclipse ? 1 : 0
    };

    try {
      const response = await fetch(`${mlServiceUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telemetry: features, satellite_name: telemetry.name })
      });

      if (!response.ok) {
        throw new Error(`ML service error: ${response.status}`);
      }

      const result = await response.json();
      return NextResponse.json(result);
    } catch (mlError) {
      console.error('ML service unavailable:', mlError);
      return NextResponse.json(
        { error: 'ML service unavailable', is_anomaly: false },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Anomaly detection error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}