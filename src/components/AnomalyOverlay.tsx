"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Shield, Activity, Zap, Satellite } from "lucide-react";
import { AnomalyData } from "@/hooks/useSatelliteTracking";

interface AnomalyOverlayProps {
  anomalyData: AnomalyData | null;
}

export default function AnomalyOverlay({ anomalyData }: AnomalyOverlayProps) {
  if (!anomalyData) return null;

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40"
    >
      <div className="bg-card/95 backdrop-blur-md border border-border rounded-xl p-4 flex items-center gap-6 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Satellite className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="text-xs text-gray-500">Total Satellites</div>
            <div className="text-xl font-bold text-white">{anomalyData.totalSatellites}</div>
          </div>
        </div>

        <div className="w-px h-10 bg-border" />

        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${anomalyData.anomaliesDetected > 0 ? "bg-orange-500/10" : "bg-green-500/10"}`}>
            <AlertTriangle className={`w-5 h-5 ${anomalyData.anomaliesDetected > 0 ? "text-orange-500" : "text-green-500"}`} />
          </div>
          <div>
            <div className="text-xs text-gray-500">Anomalies</div>
            <div className={`text-xl font-bold ${anomalyData.anomaliesDetected > 0 ? "text-orange-500" : "text-green-500"}`}>
              {anomalyData.anomaliesDetected}
            </div>
          </div>
        </div>

        <div className="w-px h-10 bg-border" />

        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${anomalyData.criticalAlerts > 0 ? "bg-red-500/10 animate-pulse" : "bg-green-500/10"}`}>
            <Zap className={`w-5 h-5 ${anomalyData.criticalAlerts > 0 ? "text-red-500" : "text-green-500"}`} />
          </div>
          <div>
            <div className="text-xs text-gray-500">Critical</div>
            <div className={`text-xl font-bold ${anomalyData.criticalAlerts > 0 ? "text-red-500" : "text-green-500"}`}>
              {anomalyData.criticalAlerts}
            </div>
          </div>
        </div>

        <div className="w-px h-10 bg-border" />

        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Shield className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <div className="text-xs text-gray-500">AI Model</div>
            <div className="text-sm font-semibold text-blue-500">{anomalyData.modelStatus}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Activity className="w-4 h-4 text-primary animate-pulse" />
          <span>Live Updates</span>
        </div>
      </div>
    </motion.div>
  );
}