"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Activity, Eye, Globe, AlertCircle } from 'lucide-react';

import { useSatellites } from '@/hooks/useSatellites';
import { useLiveTelemetry } from '@/hooks/useLiveTelemetry';
import { useAnomalies } from '@/hooks/useAnomalies';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/layout/Hero';
import TelemetryGrid from '@/components/telemetry/TelemetryGrid';
import TelemetryChart from '@/components/visualization/TelemetryChart';
import AnomalyAlertFeed from '@/components/AnomalyAlertFeed';
import ChatBot from '@/components/ChatBot';
import ModelExplainability from '@/components/ModelExplainability';

import type { SatelliteTelemetry } from '@/hooks/useSatellites';
import type { LiveTelemetry } from '@/hooks/useLiveTelemetry';
import type { SatelliteState } from '@/types/satellite';

function toSatelliteState(sat: any): SatelliteState {
  return {
    noradId: sat.noradId?.toString() || '0',
    name: sat.name || 'Unknown',
    altitude: sat.altitude ?? 0,
    velocity: sat.velocity ?? 0,
    temperature: sat.temperature ?? 0,
    battery: sat.battery ?? 0,
    signalStrength: sat.signalStrength ?? null,
    lat: sat.latitude ?? 0,
    lng: sat.longitude ?? 0,
    eclipseStatus: sat.inEclipse ? 'eclipse' : 'sunlit',
    status: 'nominal',
    history: []
  };
}

function toSatelliteStateArray(sats: any[]): SatelliteState[] {
  return sats.map(toSatelliteState);
}

const EarthGlobe = dynamic(
  () => import('@/components/visualization/EarthGlobe').then(m => m.default),
  { ssr: false, loading: () => (
    <div className="bg-gray-950 rounded-xl border border-gray-800 h-64 md:h-80 flex items-center justify-center">
      <p className="text-gray-500 text-sm animate-pulse">Loading orbital view...</p>
    </div>
  )}
);

export default function Dashboard() {
  const { satellites: polledSatellites, spaceWeather, lastFetched, isLoading: pollingLoading } = useSatellites(15000);
  const { satellites: liveSatellites, connected, lastUpdate } = useLiveTelemetry();
  const { alerts } = useAnomalies(liveSatellites);

  const satellites = liveSatellites.length > 0 ? liveSatellites : polledSatellites.map(s => ({
    noradId: s.noradId,
    name: s.name,
    latitude: s.latitude,
    longitude: s.longitude,
    altitude: s.altitude,
    velocity: s.velocity,
    temperature: s.temperature,
    battery: s.battery,
    signalStrength: s.signalStrength,
    inEclipse: s.inEclipse,
    timestamp: s.timestamp
  }));

  const [selectedSatellite, setSelectedSatellite] = useState<SatelliteTelemetry | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'temperature' | 'battery' | 'signalStrength'>('temperature');

  useEffect(() => {
    if (satellites.length > 0 && !selectedSatellite) {
      setSelectedSatellite(satellites[0] as SatelliteTelemetry);
    }
  }, [satellites, selectedSatellite]);

  useEffect(() => {
    if (satellites.length > 0 && selectedSatellite) {
      const updated = satellites.find(s => (s as any).noradId === selectedSatellite.noradId);
      if (updated) {
        setSelectedSatellite(updated as SatelliteTelemetry);
      }
    }
  }, [satellites]);

  const handleSatelliteClick = (sat: any) => {
    setSelectedSatellite(sat as SatelliteTelemetry);
  };

  if (pollingLoading && satellites.length === 0) {
    return (
      <div className="min-h-screen bg-darker flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading satellite telemetry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-darker">
      <Header alertCount={alerts.length} />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Hero
          lastUpdated={lastUpdate || lastFetched}
          satelliteCount={satellites.length}
          connected={connected}
        />

        {spaceWeather?.geomagneticStorm?.active && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <span className="text-gray-300">
                Active {spaceWeather.geomagneticStorm.level} geomagnetic storm (Kp: {spaceWeather.geomagneticStorm.kpIndex})
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-1 space-y-4">
            <EarthGlobe satellites={toSatelliteStateArray(satellites)} onSatelliteClick={handleSatelliteClick} />

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Satellites</h3>
              </div>
              <div className="space-y-2">
                {satellites.map((sat: any) => (
                  <button
                    key={sat.noradId}
                    onClick={() => handleSatelliteClick(sat)}
                    className={`w-full text-left p-2 rounded-lg transition-colors ${
                      selectedSatellite?.noradId === sat.noradId
                        ? 'bg-primary/20 text-primary'
                        : 'bg-darker hover:bg-darker/80 text-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{sat.name}</span>
                      <span className="text-xs text-gray-500">{sat.altitude?.toFixed(0)} km</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {selectedSatellite && (
              <>
                <TelemetryGrid satellite={toSatelliteState(selectedSatellite)} />

                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-semibold">Telemetry History</h3>
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
                    satellite={toSatelliteState(selectedSatellite)}
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
              {alerts.length > 0 && (
                <span className="px-2 py-0.5 bg-red-500/20 text-red-500 text-xs rounded">
                  {alerts.length} active
                </span>
              )}
            </div>
            <AnomalyAlertFeed alerts={alerts} />
          </div>

          <ModelExplainability />
        </div>
      </main>

      <Footer />

      <ChatBot />
    </div>
  );
}