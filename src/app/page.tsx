"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Activity, Eye } from 'lucide-react';

import { useTelemetry } from '@/hooks/useTelemetry';
import { useAnomalyDetection } from '@/hooks/useAnomalyDetection';
import { useForecast } from '@/hooks/useForecast';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/layout/Hero';
import SatelliteSelector from '@/components/telemetry/SatelliteSelector';
import TelemetryGrid from '@/components/telemetry/TelemetryGrid';
import TelemetryChart from '@/components/visualization/TelemetryChart';
import AnomalyAlerts from '@/components/ai/AnomalyAlerts';
import SatelliteAssistant from '@/components/ai/SatelliteAssistant';
import CommandPanel from '@/components/commands/CommandPanel';

import type { SatelliteState, AnomalyAlert } from '@/types/satellite';

const EarthGlobe = dynamic(
  () => import('@/components/visualization/EarthGlobe').then(m => m.default),
  { ssr: false, loading: () => (
    <div className="bg-gray-950 rounded-xl border border-gray-800 h-64 md:h-80 flex items-center justify-center">
      <p className="text-gray-500 text-sm animate-pulse">Loading orbital view...</p>
    </div>
  )}
);

export default function Dashboard() {
  const { satellites, loading, error, lastUpdated } = useTelemetry();
  const { alerts, acknowledgeAlert, alertCount } = useAnomalyDetection(satellites);
  const [selectedSatellite, setSelectedSatellite] = useState<SatelliteState | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'temperature' | 'battery' | 'signalStrength'>('temperature');
  const [investigateMessage, setInvestigateMessage] = useState<string>('');

  const { temperatureForecast, batteryForecast, signalForecast, hasPredictedAnomaly, timeToAnomaly } = useForecast(selectedSatellite);

  useEffect(() => {
    if (satellites.length > 0 && !selectedSatellite) {
      setSelectedSatellite(satellites[0]);
    }
  }, [satellites, selectedSatellite]);

  useEffect(() => {
    if (satellites.length > 0 && selectedSatellite) {
      const updated = satellites.find(s => s.noradId === selectedSatellite.noradId);
      if (updated) {
        setSelectedSatellite(updated);
      }
    }
  }, [satellites]);

  const handleInvestigate = (alert: AnomalyAlert) => {
    setInvestigateMessage(`Investigate anomaly: ${alert.severity} severity ${alert.metric} on ${alert.satelliteName}. Current value: ${alert.currentValue.toFixed(2)}, baseline: ${alert.baselineValue.toFixed(2)}.`);
  };

  const handleSatelliteClick = (sat: SatelliteState) => {
    setSelectedSatellite(sat);
  };

  const getForecastForMetric = () => {
    switch (selectedMetric) {
      case 'temperature': return temperatureForecast;
      case 'battery': return batteryForecast;
      case 'signalStrength': return signalForecast;
      default: return [];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-darker flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading satellite telemetry...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-darker flex items-center justify-center">
        <div className="text-center p-8 bg-card border border-red-500/30 rounded-xl">
          <p className="text-red-500 text-lg mb-2">Error loading telemetry</p>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-darker">
      <Header alertCount={alertCount} />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Hero lastUpdated={lastUpdated} satelliteCount={satellites.length} />

        {hasPredictedAnomaly && timeToAnomaly !== null && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">PREDICTED ANOMALY</span>
              <span className="text-gray-300">Anomaly predicted in {timeToAnomaly} minutes</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-1 space-y-4">
            <EarthGlobe satellites={satellites} onSatelliteClick={handleSatelliteClick} />
            <SatelliteSelector
              satellites={satellites}
              selectedSatellite={selectedSatellite}
              onSelect={setSelectedSatellite}
            />
          </div>

          <div className="lg:col-span-2 space-y-6">
            {selectedSatellite && (
              <>
                <TelemetryGrid satellite={selectedSatellite} />

                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-semibold">Telemetry History & Forecast</h3>
                    </div>
                    <div className="flex gap-2">
                      {(['temperature', 'battery', 'signalStrength'] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setSelectedMetric(m)}
                          className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                            selectedMetric === m
                              ? 'bg-primary text-black'
                              : 'bg-darker text-gray-400 hover:text-gray-200'
                          }`}
                        >
                          {m === 'signalStrength' ? 'Signal' : m.charAt(0).toUpperCase() + m.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <TelemetryChart
                    satellite={selectedSatellite}
                    forecast={getForecastForMetric()}
                    metric={selectedMetric}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-accent" />
              <h3 className="text-lg font-semibold">AI Anomaly Alerts</h3>
              {alertCount > 0 && (
                <span className="px-2 py-0.5 bg-red-500/20 text-red-500 text-xs rounded">
                  {alertCount} active
                </span>
              )}
            </div>
            <AnomalyAlerts
              alerts={alerts}
              onAcknowledge={acknowledgeAlert}
              onInvestigate={handleInvestigate}
            />
          </div>

          <CommandPanel />
        </div>
      </main>

      <Footer />

      <SatelliteAssistant
        satellites={satellites}
        alerts={alerts}
        initialMessage={investigateMessage || undefined}
      />
    </div>
  );
}