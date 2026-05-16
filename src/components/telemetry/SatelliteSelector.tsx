"use client";

import { useState } from 'react';
import { ChevronDown, Satellite } from 'lucide-react';
import type { SatelliteState } from '@/types/satellite';

interface SatelliteSelectorProps {
  satellites: SatelliteState[];
  selectedSatellite: SatelliteState | null;
  onSelect: (satellite: SatelliteState) => void;
}

export default function SatelliteSelector({ satellites, selectedSatellite, onSelect }: SatelliteSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-500';
      case 'warning': return 'bg-amber-500';
      default: return 'bg-green-500';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors w-full"
      >
        <Satellite className="w-5 h-5 text-primary" />
        <div className="flex-1 text-left">
          <div className="font-semibold text-gray-100">
            {selectedSatellite?.name || 'Select Satellite'}
          </div>
          <div className="text-xs text-gray-500">
            {selectedSatellite ? `${selectedSatellite.altitude.toFixed(1)} km · ${selectedSatellite.status}` : 'No selection'}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
          {satellites.map((sat) => (
            <button
              key={sat.noradId}
              onClick={() => {
                onSelect(sat);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-darker transition-colors text-left ${
                selectedSatellite?.noradId === sat.noradId ? 'bg-darker' : ''
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${getStatusIndicator(sat.status)}`} />
              <div className="flex-1">
                <div className="font-semibold text-gray-100">{sat.name}</div>
                <div className="text-xs text-gray-500">
                  {sat.lat.toFixed(2)}°, {sat.lng.toFixed(2)}° · {sat.status}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}