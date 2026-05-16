"use client";

import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Check, ChevronRight, Loader2 } from 'lucide-react';
import type { AnomalyAlert } from '@/types/satellite';

interface AnomalyAlertsProps {
  alerts: AnomalyAlert[];
  onAcknowledge: (alertId: string) => void;
  onInvestigate: (alert: AnomalyAlert) => void;
}

function TypewriterText({ text, loading }: { text: string; loading: boolean }) {
  const [displayed, setDisplayed] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (loading) {
      setDisplayed('');
      return;
    }

    if (displayed.length < text.length) {
      intervalRef.current = setInterval(() => {
        setDisplayed(text.slice(0, displayed.length + 1));
      }, 18);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [text, loading, displayed.length]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Generating AI analysis...</span>
      </div>
    );
  }

  return <span className="text-gray-300">{displayed}</span>;
}

export default function AnomalyAlerts({ alerts, onAcknowledge, onInvestigate }: AnomalyAlertsProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'bg-red-500';
      case 'MEDIUM': return 'bg-amber-500';
      case 'LOW': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getBorderColor = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'border-red-500/30';
      case 'MEDIUM': return 'border-amber-500/30';
      case 'LOW': return 'border-blue-500/30';
      default: return 'border-gray-500/30';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  if (alerts.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-500/20 flex items-center justify-center">
          <Check className="w-6 h-6 text-green-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-100">All Systems Nominal</h3>
        <p className="text-sm text-gray-400 mt-1">No active anomalies detected</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`bg-card border ${getBorderColor(alert.severity)} rounded-xl overflow-hidden transition-all duration-300`}
        >
          <div className={`h-1 ${getSeverityColor(alert.severity)}`} />

          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getSeverityColor(alert.severity)} text-white`}>
                  {alert.severity}
                </span>
                <span className="text-sm font-semibold text-gray-100">{alert.satelliteName}</span>
              </div>
              <span className="text-xs text-gray-500">{formatTime(alert.timestamp)}</span>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-gray-300">{alert.metric}</span>
              <span className="text-sm text-gray-500">
                {alert.currentValue.toFixed(2)} vs baseline {alert.baselineValue.toFixed(2)}
              </span>
            </div>

            <div className="bg-darker rounded-lg p-3 mb-3">
              <TypewriterText text={alert.narration} loading={alert.narrationLoading} />
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
              <span>
                Detection: {alert.detectionMethod} · {alert.confidence}% confidence
              </span>
              {alert.threshold > 0 && (
                <span>Threshold: {alert.threshold.toFixed(2)}</span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onAcknowledge(alert.id)}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 transition-colors text-sm"
              >
                <Check className="w-4 h-4" />
                Acknowledge
              </button>
              <button
                onClick={() => onInvestigate(alert)}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm"
              >
                Investigate
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}