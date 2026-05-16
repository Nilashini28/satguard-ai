"use client";

import { AlertTriangle, Check } from 'lucide-react';
import type { AnomalyAlert } from '@/hooks/useAnomalies';

interface AnomalyAlertFeedProps {
  alerts: AnomalyAlert[];
}

function timeAgo(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function AnomalyAlertFeed({ alerts }: AnomalyAlertFeedProps) {
  const getSeverityColor = (severity: string | undefined) => {
    switch (severity) {
      case 'CRITICAL': return { bg: '#ff2020', border: 'border-red-600/50' };
      case 'HIGH': return { bg: '#ff6b00', border: 'border-orange-500/50' };
      case 'MEDIUM': return { bg: '#f5c518', border: 'border-yellow-500/50' };
      case 'LOW': return { bg: '#4caf50', border: 'border-green-500/50' };
      default: return { bg: '#6b7280', border: 'border-gray-500/50' };
    }
  };

  if (alerts.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-500/20 flex items-center justify-center">
          <Check className="w-6 h-6 text-green-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-100">No anomalies detected</h3>
        <p className="text-sm text-gray-400 mt-1">All systems nominal</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {alerts.map((alert) => {
        const colors = getSeverityColor(alert.severity);

        return (
          <div
            key={alert.id}
            className={`bg-card border ${colors.border} rounded-xl overflow-hidden transition-all duration-300`}
          >
            <div className="h-1" style={{ backgroundColor: colors.bg }} />

            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-semibold text-white"
                    style={{ backgroundColor: colors.bg }}
                  >
                    {alert.severity || 'UNKNOWN'}
                  </span>
                  <span className="text-sm font-semibold text-gray-100">{alert.satellite}</span>
                </div>
                <span className="text-xs text-gray-500">{timeAgo(alert.timestamp)}</span>
              </div>

              {alert.description && (
                <div className="text-sm text-gray-300 mb-2">
                  {alert.description}
                </div>
              )}

              {alert.category && (
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-gray-400">
                    Category: {alert.category}
                  </span>
                  <span className="text-sm text-gray-500">
                    Confidence: {Math.round((alert.confidence || 0) * 100)}%
                  </span>
                </div>
              )}

              {alert.affectedFeatures && alert.affectedFeatures.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {alert.affectedFeatures.map((feature, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-darker rounded text-xs text-gray-400 font-mono"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              )}

              {alert.recommendedAction && (
                <div className="text-xs text-gray-500 bg-darker rounded p-2 mt-2">
                  <span className="text-gray-400">Recommended: </span>
                  {alert.recommendedAction}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}