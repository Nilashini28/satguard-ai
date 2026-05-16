"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { SatelliteState, AnomalyAlert } from '@/types/satellite';
import { analyzeTelemetryForAnomalies, determineSatelliteStatus } from '@/lib/anomalyEngine';
import { streamAnomalyNarration } from '@/lib/claudeClient';

export function useAnomalyDetection(satellites: SatelliteState[]) {
  const [allAlerts, setAllAlerts] = useState<AnomalyAlert[]>([]);
  const [alertNarrationMap, setAlertNarrationMap] = useState<Map<string, { text: string; loading: boolean }>>(new Map());

  const generateNarration = useCallback(async (alert: AnomalyAlert) => {
    setAlertNarrationMap(prev => new Map(prev).set(alert.id, { text: '', loading: true }));

    let narration = '';
    await streamAnomalyNarration(alert, (chunk) => {
      narration += chunk;
      setAlertNarrationMap(prev => {
        const newMap = new Map(prev);
        newMap.set(alert.id, { text: narration, loading: false });
        return newMap;
      });
    });
  }, []);

  const alertsWithNarration = useMemo(() => {
    return allAlerts.map(alert => {
      const narrationData = alertNarrationMap.get(alert.id);
      return {
        ...alert,
        narration: narrationData?.text ?? alert.narration,
        narrationLoading: narrationData?.loading ?? alert.narrationLoading
      };
    });
  }, [allAlerts, alertNarrationMap]);

  useEffect(() => {
    const newAlerts: AnomalyAlert[] = [];
    const alertKeySet = new Set(allAlerts.map(a => `${a.satelliteName}-${a.metric}`));

    for (const sat of satellites) {
      if (!sat.history || sat.history.length < 5) continue;

      const currentSnapshot = sat.history[sat.history.length - 1];
      const previousSnapshots = sat.history.slice(-20);

      const alerts = analyzeTelemetryForAnomalies(sat.name, currentSnapshot, previousSnapshots);

      for (const alert of alerts) {
        const key = `${alert.satelliteName}-${alert.metric}`;
        if (!alertKeySet.has(key)) {
          newAlerts.push(alert);
          alertKeySet.add(key);
        }
      }
    }

    if (newAlerts.length > 0) {
      setAllAlerts(prev => [...newAlerts, ...prev]);

      newAlerts.forEach(alert => {
        generateNarration(alert);
      });
    }
  }, [satellites]);

  const acknowledgeAlert = useCallback((alertId: string) => {
    setAllAlerts(prev =>
      prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a)
    );
  }, []);

  const activeAlerts = alertsWithNarration.filter(a => !a.acknowledged);

  const satelliteStatuses = useMemo(() => {
    const statuses: Record<string, 'nominal' | 'warning' | 'critical'> = {};
    for (const sat of satellites) {
      const satAlerts = activeAlerts.filter(a => a.satelliteName === sat.name);
      statuses[sat.noradId] = determineSatelliteStatus(satAlerts);
    }
    return statuses;
  }, [satellites, activeAlerts]);

  return {
    alerts: activeAlerts,
    allAlerts: alertsWithNarration,
    acknowledgeAlert,
    alertCount: activeAlerts.length,
    satelliteStatuses
  };
}