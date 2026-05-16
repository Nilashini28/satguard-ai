import type { ForecastPoint, TelemetrySnapshot } from '@/types/satellite';

interface RegressionResult {
  slope: number;
  intercept: number;
}

export function linearRegression(values: number[]): RegressionResult {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0 };

  const xs = values.map((_, i) => i);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((sum, x, i) => sum + x * values[i], 0);
  const sumX2 = xs.reduce((sum, x) => sum + x * x, 0);

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

export function calculateStandardError(values: number[], result: RegressionResult): number {
  if (values.length < 2) return 0;

  const predictions = values.map((_, i) => result.slope * i + result.intercept);
  const squaredErrors = values.map((v, i) => (v - predictions[i]) ** 2);
  const sumSquaredErrors = squaredErrors.reduce((a, b) => a + b, 0);

  return Math.sqrt(sumSquaredErrors / (values.length - 2));
}

interface DangerThresholds {
  temperatureHigh: number;
  temperatureLow: number;
  batteryLow: number;
  signalLow: number;
}

const DEFAULT_THRESHOLDS: DangerThresholds = {
  temperatureHigh: 120,
  temperatureLow: -95,
  batteryLow: 20,
  signalLow: -115
};

export function generateForecast(
  history: TelemetrySnapshot[],
  metric: 'temperature' | 'battery' | 'signalStrength' | 'altitude' | 'velocity',
  numPoints: number = 18,
  thresholds: DangerThresholds = DEFAULT_THRESHOLDS
): ForecastPoint[] {
  if (history.length < 5) {
    return [];
  }

  const values = history.map(h => {
    switch (metric) {
      case 'temperature': return h.temperature;
      case 'battery': return h.battery;
      case 'signalStrength': return h.signalStrength ?? -80;
      case 'altitude': return h.altitude;
      case 'velocity': return h.velocity;
    }
  });

  const regression = linearRegression(values);
  const standardError = calculateStandardError(values, regression);

  const now = new Date();
  const forecasts: ForecastPoint[] = [];

  for (let i = 1; i <= numPoints; i++) {
    const timestamp = new Date(now.getTime() + i * 10000);
    const predictedValue = regression.slope * (values.length + i - 1) + regression.intercept;
    const uncertainty = standardError * Math.sqrt(1 + 1 / values.length + ((values.length + i - 1 - values.length / 2) ** 2) / (values.length ** 3 / 12));

    let isAnomaly = false;

    switch (metric) {
      case 'temperature':
        isAnomaly = predictedValue > thresholds.temperatureHigh || predictedValue < thresholds.temperatureLow;
        break;
      case 'battery':
        isAnomaly = predictedValue < thresholds.batteryLow;
        break;
      case 'signalStrength':
        isAnomaly = predictedValue < thresholds.signalLow;
        break;
    }

    forecasts.push({
      timestamp,
      value: Math.round(predictedValue * 100) / 100,
      lower: Math.round((predictedValue - uncertainty) * 100) / 100,
      upper: Math.round((predictedValue + uncertainty) * 100) / 100,
      isAnomaly
    });
  }

  return forecasts;
}

export function detectTrendDirection(values: number[]): 'up' | 'down' | 'stable' {
  if (values.length < 3) return 'stable';

  const recent = values.slice(-3);
  const regression = linearRegression(recent);

  const avgValue = recent.reduce((a, b) => a + b, 0) / recent.length;
  const threshold = Math.abs(avgValue * 0.02);

  if (Math.abs(regression.slope) < threshold) return 'stable';
  return regression.slope > 0 ? 'up' : 'down';
}