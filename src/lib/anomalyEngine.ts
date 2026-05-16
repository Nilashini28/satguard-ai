import type { TelemetrySnapshot, AnomalyAlert, AnomalySeverity, DetectionMethod } from '@/types/satellite';

interface StatisticalBaseline {
  mean: number;
  std: number;
}

function calculateStatistics(samples: number[]): StatisticalBaseline {
  if (samples.length === 0) return { mean: 0, std: 1 };

  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const variance = samples.reduce((sum, val) => sum + (val - mean) ** 2, 0) / samples.length;
  const std = Math.sqrt(variance) || 1;

  return { mean, std };
}

export function detectStatisticalAnomaly(
  currentValue: number,
  history: number[],
  threshold: number = 2.5
): { isAnomaly: boolean; confidence: number; baseline: number } {
  const window = history.slice(-20);
  if (window.length < 5) {
    return { isAnomaly: false, confidence: 0, baseline: currentValue };
  }

  const { mean, std } = calculateStatistics(window);
  const zscore = std > 0 ? Math.abs(currentValue - mean) / std : 0;

  const isAnomaly = zscore > threshold;
  const confidence = Math.min(100, Math.round((zscore / threshold) * 100));

  return { isAnomaly, confidence, baseline: mean };
}

const THRESHOLDS = {
  temperature: { high: 125, low: -100 },
  battery: { low: 15 },
  signal: { low: -118 },
  altitudeDrift: 3,
  velocityDeviation: 0.15
};

export function detectThresholdAnomaly(
  metric: string,
  value: number,
  baseline: number,
  previousValue?: number
): { isAnomaly: boolean; severity: AnomalySeverity; threshold: number } {
  switch (metric) {
    case 'temperature':
      if (value > THRESHOLDS.temperature.high) {
        return { isAnomaly: true, severity: 'HIGH', threshold: THRESHOLDS.temperature.high };
      }
      if (value < THRESHOLDS.temperature.low) {
        return { isAnomaly: true, severity: 'HIGH', threshold: THRESHOLDS.temperature.low };
      }
      break;

    case 'battery':
      if (value < THRESHOLDS.battery.low) {
        return { isAnomaly: true, severity: 'HIGH', threshold: THRESHOLDS.battery.low };
      }
      break;

    case 'signal':
      if (value < THRESHOLDS.signal.low && value !== null) {
        return { isAnomaly: true, severity: 'MEDIUM', threshold: THRESHOLDS.signal.low };
      }
      break;

    case 'altitude':
      if (previousValue !== undefined) {
        const drift = Math.abs(value - previousValue);
        if (drift > THRESHOLDS.altitudeDrift) {
          return { isAnomaly: true, severity: 'MEDIUM', threshold: THRESHOLDS.altitudeDrift };
        }
      }
      break;

    case 'velocity':
      if (previousValue !== undefined) {
        const deviation = Math.abs(value - previousValue);
        if (deviation > THRESHOLDS.velocityDeviation) {
          return { isAnomaly: true, severity: 'LOW', threshold: THRESHOLDS.velocityDeviation };
        }
      }
      break;
  }

  return { isAnomaly: false, severity: 'LOW', threshold: 0 };
}

export function analyzeTelemetryForAnomalies(
  satelliteName: string,
  currentSnapshot: TelemetrySnapshot,
  history: TelemetrySnapshot[]
): AnomalyAlert[] {
  const alerts: AnomalyAlert[] = [];
  const now = new Date();

  const altitudeHistory = history.map(h => h.altitude);
  const velocityHistory = history.map(h => h.velocity);
  const tempHistory = history.map(h => h.temperature);
  const batteryHistory = history.map(h => h.battery);
  const signalHistory = history.map(h => h.signalStrength ?? -80);

  const { isAnomaly: altAnomaly, confidence: altConf, baseline: altBaseline } = detectStatisticalAnomaly(
    currentSnapshot.altitude, altitudeHistory
  );

  if (altAnomaly) {
    alerts.push({
      id: `alt-${satelliteName}-${now.getTime()}`,
      satelliteName,
      metric: 'Altitude',
      currentValue: currentSnapshot.altitude,
      baselineValue: altBaseline,
      threshold: altBaseline + 2.5 * calculateStatistics(altitudeHistory).std,
      severity: altConf > 80 ? 'HIGH' : altConf > 60 ? 'MEDIUM' : 'LOW',
      confidence: altConf,
      detectionMethod: 'statistical',
      timestamp: now,
      narration: '',
      narrationLoading: true,
      acknowledged: false
    });
  }

  const { isAnomaly: velAnomaly, confidence: velConf, baseline: velBaseline } = detectStatisticalAnomaly(
    currentSnapshot.velocity, velocityHistory
  );

  if (velAnomaly) {
    alerts.push({
      id: `vel-${satelliteName}-${now.getTime()}`,
      satelliteName,
      metric: 'Velocity',
      currentValue: currentSnapshot.velocity,
      baselineValue: velBaseline,
      threshold: velBaseline + 2.5 * calculateStatistics(velocityHistory).std,
      severity: velConf > 80 ? 'HIGH' : velConf > 60 ? 'MEDIUM' : 'LOW',
      confidence: velConf,
      detectionMethod: 'statistical',
      timestamp: now,
      narration: '',
      narrationLoading: true,
      acknowledged: false
    });
  }

  const { isAnomaly: tempAnomaly, confidence: tempConf, baseline: tempBaseline } = detectStatisticalAnomaly(
    currentSnapshot.temperature, tempHistory
  );

  if (tempAnomaly) {
    alerts.push({
      id: `temp-${satelliteName}-${now.getTime()}`,
      satelliteName,
      metric: 'Temperature',
      currentValue: currentSnapshot.temperature,
      baselineValue: tempBaseline,
      threshold: tempBaseline + 2.5 * calculateStatistics(tempHistory).std,
      severity: tempConf > 80 ? 'HIGH' : tempConf > 60 ? 'MEDIUM' : 'LOW',
      confidence: tempConf,
      detectionMethod: 'statistical',
      timestamp: now,
      narration: '',
      narrationLoading: true,
      acknowledged: false
    });
  }

  const thresholdTemp = detectThresholdAnomaly('temperature', currentSnapshot.temperature, currentSnapshot.temperature);
  if (thresholdTemp.isAnomaly && !tempAnomaly) {
    alerts.push({
      id: `temp-thresh-${satelliteName}-${now.getTime()}`,
      satelliteName,
      metric: 'Temperature',
      currentValue: currentSnapshot.temperature,
      baselineValue: tempHistory[tempHistory.length - 1] ?? currentSnapshot.temperature,
      threshold: thresholdTemp.threshold,
      severity: thresholdTemp.severity,
      confidence: 100,
      detectionMethod: 'threshold',
      timestamp: now,
      narration: '',
      narrationLoading: true,
      acknowledged: false
    });
  }

  const thresholdBattery = detectThresholdAnomaly('battery', currentSnapshot.battery, currentSnapshot.battery);
  if (thresholdBattery.isAnomaly) {
    const existingBatteryAlert = alerts.find(a => a.metric === 'Battery');
    if (!existingBatteryAlert) {
      alerts.push({
        id: `batt-thresh-${satelliteName}-${now.getTime()}`,
        satelliteName,
        metric: 'Battery',
        currentValue: currentSnapshot.battery,
        baselineValue: batteryHistory[batteryHistory.length - 1] ?? 80,
        threshold: thresholdBattery.threshold,
        severity: thresholdBattery.severity,
        confidence: 100,
        detectionMethod: 'threshold',
        timestamp: now,
        narration: '',
        narrationLoading: true,
        acknowledged: false
      });
    }
  }

  if (currentSnapshot.signalStrength !== null) {
    const thresholdSignal = detectThresholdAnomaly('signal', currentSnapshot.signalStrength, currentSnapshot.signalStrength);
    if (thresholdSignal.isAnomaly) {
      alerts.push({
        id: `sig-thresh-${satelliteName}-${now.getTime()}`,
        satelliteName,
        metric: 'Signal Strength',
        currentValue: currentSnapshot.signalStrength,
        baselineValue: signalHistory[signalHistory.length - 1] ?? -80,
        threshold: thresholdSignal.threshold,
        severity: thresholdSignal.severity,
        confidence: 100,
        detectionMethod: 'threshold',
        timestamp: now,
        narration: '',
        narrationLoading: true,
        acknowledged: false
      });
    }
  }

  return alerts;
}

export function determineSatelliteStatus(alerts: AnomalyAlert[]): 'nominal' | 'warning' | 'critical' {
  const hasHigh = alerts.some(a => a.severity === 'HIGH' && !a.acknowledged);
  const hasMedium = alerts.some(a => a.severity === 'MEDIUM' && !a.acknowledged);

  if (hasHigh) return 'critical';
  if (hasMedium) return 'warning';
  return 'nominal';
}