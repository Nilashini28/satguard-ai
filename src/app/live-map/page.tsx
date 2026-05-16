"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Satellite, RefreshCw, Layers } from "lucide-react";
import SatelliteMap from "@/components/SatelliteMap";
import TelemetryPanel from "@/components/TelemetryPanel";
import AnomalyOverlay from "@/components/AnomalyOverlay";
import { useSatelliteTracking } from "@/hooks/useSatelliteTracking";

export default function LiveMapPage() {
  const {
    satellites,
    anomalyData,
    isLoading,
    error,
    selectedSatellite,
    selectSatellite,
    refreshData,
  } = useSatelliteTracking();

  return (
    <div className="min-h-screen bg-darker text-gray-100">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-full mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-gray-400 hover:text-primary transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Link>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Satellite className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-bold text-primary">SATGUARD AI</h1>
                <span className="text-gray-500">/</span>
                <span className="text-lg font-semibold">Live Satellite Tracking</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={refreshData}
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                <span className="text-sm">Refresh</span>
              </button>

              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-lg">
                <Layers className="w-4 h-4 text-primary" />
                <span className="text-primary text-sm font-semibold">{satellites.length} Satellites</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* AI Threat Monitor Widget */}
      <AnomalyOverlay anomalyData={anomalyData} />

      {/* Main Content */}
      <main className="h-[calc(100vh-60px)] relative">
        {/* Error Message */}
        {error && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-20 bg-red-500/10 border border-red-500/50 rounded-lg p-4">
            <span className="text-red-500">{error}</span>
          </div>
        )}

        {/* Map */}
        <div className="h-full">
          <SatelliteMap
            satellites={satellites}
            selectedSatellite={selectedSatellite}
            onSelectSatellite={selectSatellite}
            isLoading={isLoading}
          />
        </div>

        {/* Telemetry Side Panel */}
        {selectedSatellite && (
          <TelemetryPanel
            satellite={selectedSatellite}
            onClose={() => selectSatellite(null)}
          />
        )}
      </main>
    </div>
  );
}