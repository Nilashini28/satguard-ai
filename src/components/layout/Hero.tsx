"use client";

import { Satellite, Clock, Sparkles } from 'lucide-react';

interface HeroProps {
  lastUpdated: Date | null;
  satelliteCount: number;
}

export default function Hero({ lastUpdated, satelliteCount }: HeroProps) {
  const getTimeSinceUpdate = () => {
    if (!lastUpdated) return '--';
    const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-wider text-primary">SATGUARD AI</h1>
          <p className="text-gray-400 mt-1">Real-time satellite telemetry monitoring with AI anomaly detection</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-gray-300">{satelliteCount} satellites tracked</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-gray-300">Live TLE · CelesTrak</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-gray-300">AI-powered · Claude</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
        <Clock className="w-4 h-4" />
        <span>Telemetry updated {getTimeSinceUpdate()}</span>
      </div>
    </div>
  );
}