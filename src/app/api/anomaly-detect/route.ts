import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { telemetry } = body;

    if (!telemetry) {
      return NextResponse.json({ error: 'telemetry object required' }, { status: 400 });
    }

    // Try to call ML service first
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    try {
      const mlRes = await fetch(`${mlServiceUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telemetry }),
        signal: AbortSignal.timeout(5000),
      });

      if (mlRes.ok) {
        const result = await mlRes.json();
        return NextResponse.json(result);
      }
    } catch (mlError) {
      console.log('ML service not available, using fallback detection');
    }

    // Fallback: simple threshold-based anomaly detection
    const { altitude_km, velocity_kms, kp, solar_wind_bz } = telemetry;

    let prediction = 'normal';
    let confidence = 0.95;
    let severity = 'LOW';
    let is_anomaly = false;

    // Simple rule-based anomaly detection
    if (altitude_km && altitude_km < 200) {
      prediction = 'reentry_warning';
      is_anomaly = true;
      severity = 'HIGH';
      confidence = 0.89;
    } else if (kp && kp >= 5 && altitude_km && altitude_km < 800) {
      prediction = 'thermal_anomaly';
      is_anomaly = true;
      severity = kp >= 7 ? 'HIGH' : 'MEDIUM';
      confidence = 0.82;
    } else if (solar_wind_bz && solar_wind_bz < -10) {
      prediction = 'signal_degradation';
      is_anomaly = true;
      severity = 'MEDIUM';
      confidence = 0.75;
    }

    return NextResponse.json({
      prediction,
      confidence,
      severity,
      is_anomaly,
      probabilities: {
        normal: is_anomaly ? 1 - confidence : confidence,
        anomaly: is_anomaly ? confidence : 1 - confidence,
      },
    });
  } catch (err) {
    console.error('Anomaly detect error:', err);
    return NextResponse.json({ error: 'Inference error' }, { status: 500 });
  }
}