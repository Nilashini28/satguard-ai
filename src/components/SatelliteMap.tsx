"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { TrackedSatellite } from "@/hooks/useSatelliteTracking";

interface SatelliteMapProps {
  satellites: TrackedSatellite[];
  selectedSatellite: TrackedSatellite | null;
  onSelectSatellite: (satellite: TrackedSatellite | null) => void;
  isLoading: boolean;
}

export default function SatelliteMap({
  satellites,
  selectedSatellite,
  onSelectSatellite,
  isLoading,
}: SatelliteMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const animationRef = useRef<number>();

  // Convert lat/long to canvas coordinates
  const latLongToCanvas = (lat: number, lon: number, width: number, height: number) => {
    const x = ((lon + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;
    return { x, y };
  };

  useEffect(() => {
    const handleResize = () => {
      const container = document.getElementById("map-container");
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: container.clientHeight,
        });
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#050508";
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Draw grid
    ctx.strokeStyle = "#1e1e2e";
    ctx.lineWidth = 0.5;

    // Latitude lines
    for (let lat = -80; lat <= 80; lat += 20) {
      const y = ((90 - lat) / 180) * dimensions.height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(dimensions.width, y);
      ctx.stroke();
    }

    // Longitude lines
    for (let lon = -150; lon <= 150; lon += 30) {
      const x = ((lon + 180) / 360) * dimensions.width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, dimensions.height);
      ctx.stroke();
    }

    // Draw equator
    ctx.strokeStyle = "#00ff88";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    const equatorY = dimensions.height / 2;
    ctx.beginPath();
    ctx.moveTo(0, equatorY);
    ctx.lineTo(dimensions.width, equatorY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw world map outline (simplified)
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1;

    // Simplified continents
    const continents = [
      // North America
      [[-125, 50], [-65, 50], [-65, 25], [-100, 25], [-125, 35]],
      // South America
      [[-80, 10], [-35, 0], [-35, -55], [-70, -55], [-80, 10]],
      // Europe
      [[-10, 70], [40, 70], [40, 35], [10, 35], [-10, 45]],
      // Africa
      [[-20, 35], [50, 35], [50, -35], [20, -35], [-20, 5]],
      // Asia
      [[40, 70], [145, 70], [145, 10], [100, 10], [60, 25], [40, 35]],
      // Australia
      [[115, -10], [150, -10], [150, -45], [115, -45]],
    ];

    continents.forEach((continent) => {
      ctx.beginPath();
      continent.forEach((point, i) => {
        const { x, y } = latLongToCanvas(point[1], point[0], dimensions.width, dimensions.height);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();
    });

    // Draw satellites
    satellites.forEach((sat) => {
      const lat = sat.latitude * 180 / Math.PI;
      const lon = sat.longitude * 180 / Math.PI;
      const { x, y } = latLongToCanvas(lat, lon, dimensions.width, dimensions.height);

      // Determine color based on anomaly status
      const isSelected = selectedSatellite?.id === sat.id;
      let color = "#00ff88"; // Normal - green
      let glowColor = "rgba(0, 255, 136, 0.5)";

      if (sat.isAnomaly) {
        if (sat.severity === "critical") {
          color = "#ef4444"; // Critical - red
          glowColor = "rgba(239, 68, 68, 0.8)";
        } else if (sat.severity === "high") {
          color = "#f97316"; // High - orange
          glowColor = "rgba(249, 115, 22, 0.6)";
        } else {
          color = "#eab308"; // Medium - yellow
          glowColor = "rgba(234, 179, 8, 0.6)";
        }
      }

      // Draw glow
      const radius = isSelected ? 12 : 8;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2);
      gradient.addColorStop(0, glowColor);
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
      ctx.fill();

      // Draw satellite dot
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Draw selection ring
      if (isSelected) {
        ctx.strokeStyle = "#00ccff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw label for selected or close satellites
      if (isSelected || satellites.filter(s => {
        const sLat = s.latitude * 180 / Math.PI;
        const sLon = s.longitude * 180 / Math.PI;
        return Math.abs(sLat - lat) < 15 && Math.abs(sLon - lon) < 15;
      }).length < 5) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "10px JetBrains Mono";
        const label = sat.name.length > 15 ? sat.name.substring(0, 15) + "..." : sat.name;
        ctx.fillText(label, x + 12, y + 4);
      }
    });

    // Handle click events
    canvas.onclick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Find clicked satellite
      for (const sat of satellites) {
        const lat = sat.latitude * 180 / Math.PI;
        const lon = sat.longitude * 180 / Math.PI;
        const { x, y } = latLongToCanvas(lat, lon, dimensions.width, dimensions.height);
        const distance = Math.sqrt((clickX - x) ** 2 + (clickY - y) ** 2);

        if (distance < 15) {
          onSelectSatellite(sat);
          return;
        }
      }

      // Click on empty space - deselect
      onSelectSatellite(null);
    };

  }, [satellites, selectedSatellite, dimensions, onSelectSatellite]);

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-primary font-mono">Loading satellite data...</span>
          </div>
        </div>
      )}

      <div id="map-container" className="w-full h-full">
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-full cursor-crosshair"
        />
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3">
        <div className="text-xs text-gray-500 mb-2">Satellite Status</div>
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-gray-400">Normal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-gray-400">Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-gray-400">High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-gray-400">Critical</span>
          </div>
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 right-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 text-xs text-gray-500">
        <div>Click on satellite for details</div>
      </div>
    </div>
  );
}