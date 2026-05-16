"use client";

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  Line
} from 'recharts';
import type { SatelliteState, ForecastPoint } from '@/types/satellite';

interface TelemetryChartProps {
  satellite: SatelliteState | null;
  forecast?: ForecastPoint[];
  metric: 'temperature' | 'battery' | 'signalStrength' | 'altitude' | 'velocity';
  showForecast?: boolean;
}

export default function TelemetryChart({ satellite, forecast, metric, showForecast = true }: TelemetryChartProps) {
  const chartData = useMemo(() => {
    if (!satellite?.history) return [];

    return satellite.history.map((h, i) => {
      const base: Record<string, number | string> = {
        time: new Date(h.timestamp).toLocaleTimeString('en-US', { hour12: false, minute: '2-digit', second: '2-digit' }),
        index: i
      };

      switch (metric) {
        case 'temperature':
          base.value = h.temperature;
          break;
        case 'battery':
          base.value = h.battery;
          break;
        case 'signalStrength':
          base.value = h.signalStrength ?? -80;
          break;
        case 'altitude':
          base.value = h.altitude;
          break;
        case 'velocity':
          base.value = h.velocity;
          break;
      }

      return base;
    });
  }, [satellite, metric]);

  const forecastData = useMemo(() => {
    if (!forecast || forecast.length === 0) return [];
    return forecast.map((f, i) => ({
      time: new Date(f.timestamp).toLocaleTimeString('en-US', { hour12: false, minute: '2-digit', second: '2-digit' }),
      value: f.value,
      lower: f.lower,
      upper: f.upper,
      isAnomaly: f.isAnomaly
    }));
  }, [forecast]);

  const combinedData = useMemo(() => {
    const lastIndex = (chartData[chartData.length - 1]?.index as number) ?? 0;
    return [...chartData, ...forecastData.map((f, i) => ({
      ...f,
      index: lastIndex + i + 1,
      isForecast: true
    }))];
  }, [chartData, forecastData]);

  const getMetricConfig = () => {
    switch (metric) {
      case 'temperature':
        return {
          color: '#ff00aa',
          label: 'Temperature (°C)',
          domain: [-100, 150] as [number, number],
          unit: '°C'
        };
      case 'battery':
        return {
          color: '#00ff88',
          label: 'Battery (%)',
          domain: [0, 100] as [number, number],
          unit: '%'
        };
      case 'signalStrength':
        return {
          color: '#00ccff',
          label: 'Signal (dBm)',
          domain: [-120, -60] as [number, number],
          unit: 'dBm'
        };
      case 'altitude':
        return {
          color: '#00ff88',
          label: 'Altitude (km)',
          domain: [350, 450] as [number, number],
          unit: 'km'
        };
      case 'velocity':
        return {
          color: '#00ccff',
          label: 'Velocity (km/s)',
          domain: [7, 8] as [number, number],
          unit: 'km/s'
        };
    }
  };

  const config = getMetricConfig();

  const hasAnomalyForecast = forecast?.some(f => f.isAnomaly);

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={combinedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={config.color} stopOpacity={0} />
            </linearGradient>
            {hasAnomalyForecast && (
              <linearGradient id="forecast-uncertainty" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ff4444" stopOpacity={0.05} />
              </linearGradient>
            )}
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />

          <XAxis
            dataKey="time"
            stroke="#666"
            fontSize={10}
            interval="preserveStartEnd"
          />

          <YAxis
            stroke="#666"
            fontSize={10}
            domain={config.domain}
            tickFormatter={(v) => `${v}${config.unit}`}
          />

          <Tooltip
            contentStyle={{
              background: '#12121a',
              border: '1px solid #1e1e2e',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            labelStyle={{ color: config.color }}
            formatter={(value: number) => [`${value.toFixed(1)} ${config.unit}`, metric]}
          />

          <Area
            type="monotone"
            dataKey="value"
            stroke={config.color}
            fill={`url(#gradient-${metric})`}
            strokeWidth={2}
            dot={false}
          />

          {showForecast && forecastData.length > 0 && (
            <>
              <Area
                type="monotone"
                dataKey="upper"
                stroke="transparent"
                fill="url(#forecast-uncertainty)"
                strokeWidth={0}
                dot={false}
              />

              <Line
                type="monotone"
                dataKey="value"
                data={forecastData}
                stroke={config.color}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />

              {forecastData.filter(f => f.isAnomaly).map((point, i) => (
                <ReferenceLine
                  key={i}
                  y={point.value}
                  stroke="#ff4444"
                  strokeDasharray="3 3"
                  label={{
                    value: 'PREDICTED',
                    position: 'right',
                    fill: '#ff4444',
                    fontSize: 10
                  }}
                />
              ))}
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}