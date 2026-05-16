"use client";

import React from "react";
import { motion } from "framer-motion";
import { Satellite, MapPin, Gauge, Thermometer, Zap, Activity, Clock } from "lucide-react";
import { TrackedSatellite } from "@/hooks/useSatelliteTracking";

interface TelemetryPanelProps {
  satellite: TrackedSatellite | null;
  onClose: () => void;
}

export default function TelemetryPanel({ satellite, onClose }: TelemetryPanelProps) {
  if (!satellite) return null;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-500 border-red-500";
      case "high":
        return "text-orange-500 border-orange-500";
      case "medium":
        return "text-yellow-500 border-yellow-500";
      default:
        return "text-green-500 border-green-500";
    }
  };

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      className="fixed right-0 top-0 h-full w-96 bg-card/95 backdrop-blur-md border-l border-border p-6 overflow-y-auto z-50"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-primary flex items-center gap-2">
          <Satellite className="w-5 h-5" />
          Telemetry
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        {/* Satellite Name */}
        <div className="bg-darker rounded-lg p-4 border border-border">
          <div className="text-xs text-gray-500 mb-1">Satellite Name</div>
          <div className="text-lg font-semibold text-white truncate">
            {satellite.name}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className={`px-2 py-0.5 rounded text-xs border ${getSeverityColor(satellite.severity)}`}>
              {satellite.orbit}
            </span>
            {satellite.isAnomaly && (
              <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-500 border border-red-500 animate-pulse">
                ANOMALY
              </span>
            )}
          </div>
        </div>

        {/* Position Data */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-darker rounded-lg p-3 border border-border">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <MapPin className="w-3 h-3" />
              Latitude
            </div>
            <div className="text-lg font-mono text-secondary">
              {(satellite.latitude * 180 / Math.PI).toFixed(4)}°
            </div>
          </div>

          <div className="bg-darker rounded-lg p-3 border border-border">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <MapPin className="w-3 h-3" />
              Longitude
            </div>
            <div className="text-lg font-mono text-secondary">
              {(satellite.longitude * 180 / Math.PI).toFixed(4)}°
            </div>
          </div>
        </div>

        {/* Altitude & Velocity */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-darker rounded-lg p-3 border border-border">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <Gauge className="w-3 h-3" />
              Altitude
            </div>
            <div className="text-lg font-mono text-primary">
              {satellite.altitude.toFixed(1)} km
            </div>
          </div>

          <div className="bg-darker rounded-lg p-3 border border-border">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <Zap className="w-3 h-3" />
              Velocity
            </div>
            <div className="text-lg font-mono text-green-500">
              {(satellite.velocity / 1000).toFixed(2)} km/s
            </div>
          </div>
        </div>

        {/* Orbital Parameters */}
        <div className="bg-darker rounded-lg p-4 border border-border">
          <div className="text-xs text-gray-500 mb-3 flex items-center gap-2">
            <Activity className="w-3 h-3" />
            Orbital Parameters
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Inclination:</span>
              <span className="ml-2 font-mono text-white">{satellite.inclination?.toFixed(2)}°</span>
            </div>
            <div>
              <span className="text-gray-500">Eccentricity:</span>
              <span className="ml-2 font-mono text-white">{satellite.eccentricity?.toFixed(4)}</span>
            </div>
            <div>
              <span className="text-gray-500">Period:</span>
              <span className="ml-2 font-mono text-white">{satellite.period?.toFixed(2)} min</span>
            </div>
          </div>
        </div>

        {/* Anomaly Score */}
        {satellite.isAnomaly && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-red-500/10 rounded-lg p-4 border border-red-500/50"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-red-500 font-semibold">Anomaly Detected</span>
              <span className={`text-lg font-bold ${satellite.severity === 'critical' ? 'text-red-500' : 'text-orange-500'}`}>
                {satellite.anomalyScore.toFixed(2)}
              </span>
            </div>
            <div className="w-full bg-red-500/20 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(satellite.anomalyScore * 20, 100)}%` }}
                className={`h-full rounded-full ${
                  satellite.severity === "critical" ? "bg-red-500" : "bg-orange-500"
                }`}
              />
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Severity: {satellite.severity.toUpperCase()}
            </div>
          </motion.div>
        )}

        {/* Timestamp */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          Last Updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </motion.div>
  );
}