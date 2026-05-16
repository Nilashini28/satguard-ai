"use client";

import { Satellite, Gauge, Thermometer, Zap, Signal } from 'lucide-react';
import type { SatelliteState } from '@/types/satellite';
import TelemetryCard from './TelemetryCard';

interface TelemetryGridProps {
  satellite: SatelliteState;
}

export default function TelemetryGrid({ satellite }: TelemetryGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <TelemetryCard
        label="Altitude"
        value={satellite.altitude}
        unit="km"
        icon={<Satellite className="w-5 h-5" />}
        satellite={satellite}
        metric="altitude"
        status={satellite.status}
      />

      <TelemetryCard
        label="Velocity"
        value={satellite.velocity}
        unit="km/s"
        icon={<Gauge className="w-5 h-5" />}
        satellite={satellite}
        metric="velocity"
        status={satellite.status}
      />

      <TelemetryCard
        label="Temperature"
        value={satellite.temperature}
        unit="°C"
        icon={<Thermometer className="w-5 h-5" />}
        satellite={satellite}
        metric="temperature"
        status={satellite.status}
      />

      <TelemetryCard
        label="Battery"
        value={satellite.battery}
        unit="%"
        icon={<Zap className="w-5 h-5" />}
        satellite={satellite}
        metric="battery"
        status={satellite.status}
      />

      <TelemetryCard
        label="Signal"
        value={satellite.signalStrength ?? -999}
        unit="dBm"
        icon={<Signal className="w-5 h-5" />}
        satellite={satellite}
        metric="signalStrength"
        status={satellite.signalStrength === null ? 'critical' : satellite.status}
      />
    </div>
  );
}