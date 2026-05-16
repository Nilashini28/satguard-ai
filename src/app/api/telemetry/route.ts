import { NextResponse } from "next/server";

export async function GET() {
  const telemetry = {
    satellites: [
      { id: "SG-001", altitude: 412.5, velocity: 7.65, temperature: -12.3, battery: 94, signal: 92 },
      { id: "SG-002", altitude: 22500, velocity: 3.87, temperature: -28.1, battery: 78, signal: 88 },
      { id: "SG-003", altitude: 35786, velocity: 3.07, temperature: -45.2, battery: 65, signal: 71 },
      { id: "SG-004", altitude: 520.3, velocity: 7.58, temperature: -8.7, battery: 91, signal: 95 },
    ],
    anomalies: [
      { id: "1", type: "Thermal", severity: "high", message: "Temperature anomaly in solar panel", timestamp: new Date().toISOString() },
      { id: "2", type: "Signal", severity: "medium", message: "S-band degradation detected", timestamp: new Date().toISOString() },
    ],
    lastUpdate: new Date().toISOString(),
  };

  return NextResponse.json(telemetry);
}