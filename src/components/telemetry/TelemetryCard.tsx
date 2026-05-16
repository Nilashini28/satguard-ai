"use client";

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { SatelliteState } from '@/types/satellite';
import { detectTrendDirection } from '@/lib/forecastEngine';

interface TelemetryCardProps {
  label: string;
  value: number;
  unit: string;
  icon: React.ReactNode;
  satellite?: SatelliteState;
  metric: 'altitude' | 'velocity' | 'temperature' | 'battery' | 'signalStrength';
  status?: 'nominal' | 'warning' | 'critical';
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 80;
    const y = 24 - ((v - min) / range) * 20;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="80" height="24" className="opacity-60">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export default function TelemetryCard({ label, value, unit, icon, satellite, metric, status = 'nominal' }: TelemetryCardProps) {
  const historyData = useMemo(() => {
    if (!satellite?.history) return [];
    return satellite.history.slice(-10).map(h => {
      switch (metric) {
        case 'altitude': return h.altitude;
        case 'velocity': return h.velocity;
        case 'temperature': return h.temperature;
        case 'battery': return h.battery;
        case 'signalStrength': return h.signalStrength ?? -80;
      }
    });
  }, [satellite, metric]);

  const trend = useMemo(() => {
    if (historyData.length < 3) return 'stable';
    return detectTrendDirection(historyData);
  }, [historyData]);

  const getStatusColor = () => {
    switch (status) {
      case 'critical': return 'text-red-500';
      case 'warning': return 'text-amber-500';
      default: return 'text-primary';
    }
  };

  const getBorderColor = () => {
    switch (status) {
      case 'critical': return 'border-red-500/50';
      case 'warning': return 'border-amber-500/50';
      default: return 'border-border';
    }
  };

  const getSparklineColor = () => {
    switch (status) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#00ff88';
    }
  };

  const formatValue = () => {
    if (metric === 'signalStrength' && value === -999) return '--';
    if (metric === 'battery' || metric === 'altitude') return value.toFixed(metric === 'altitude' ? 1 : 0);
    if (metric === 'velocity') return value.toFixed(3);
    return value.toFixed(1);
  };

  return (
    <div className={`bg-card border ${getBorderColor()} rounded-xl p-4 relative overflow-hidden transition-all duration-300`}>
      <div className="absolute top-0 right-0 w-16 h-16 opacity-10">
        {icon}
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-400 text-sm">{label}</span>
        <div className="text-gray-500">
          {icon}
        </div>
      </div>

      <div className={`text-3xl font-bold font-mono ${getStatusColor()} transition-all duration-300`}>
        {formatValue()} <span className="text-lg text-gray-500">{unit}</span>
      </div>

      <div className="flex items-center justify-between mt-3">
        <Sparkline data={historyData} color={getSparklineColor()} />

        <div className="flex items-center gap-1">
          {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
          {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
          {trend === 'stable' && <Minus className="w-4 h-4 text-gray-500" />}
        </div>
      </div>
    </div>
  );
}