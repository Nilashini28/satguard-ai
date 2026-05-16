"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  Satellite,
  AlertTriangle,
  Activity,
  Zap,
  Thermometer,
  Gauge,
  Shield,
  Signal,
  Clock,
  TrendingUp,
  Eye,
} from "lucide-react";

interface TelemetryData {
  time: string;
  altitude: number;
  velocity: number;
  temperature: number;
  battery: number;
  signal: number;
}

interface Anomaly {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  timestamp: string;
}

interface SatelliteStatus {
  name: string;
  status: "operational" | "warning" | "critical";
  orbit: string;
  uptime: string;
}

const generateTelemetry = (): TelemetryData[] => {
  const data: TelemetryData[] = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 3600000);
    data.push({
      time: time.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }),
      altitude: 400 + Math.sin(i * 0.3) * 20 + Math.random() * 5,
      velocity: 7.6 + Math.cos(i * 0.2) * 0.2 + Math.random() * 0.1,
      temperature: -15 + Math.sin(i * 0.4) * 8 + Math.random() * 3,
      battery: Math.min(100, 85 + Math.random() * 15 - (23 - i) * 0.3),
      signal: 85 + Math.random() * 15,
    });
  }
  return data;
};

const anomalies: Anomaly[] = [
  { id: "1", type: "Thermal", severity: "high", message: "Temperature anomaly detected in solar panel array", timestamp: "2 min ago" },
  { id: "2", type: "Signal", severity: "medium", message: "Signal degradation detected in S-band transmitter", timestamp: "15 min ago" },
  { id: "3", type: "Orbit", severity: "low", message: "Minor orbital drift detected", timestamp: "1 hr ago" },
];

const satellites: SatelliteStatus[] = [
  { name: "SG-001", status: "operational", orbit: "LEO", uptime: "99.9%" },
  { name: "SG-002", status: "operational", orbit: "MEO", uptime: "99.7%" },
  { name: "SG-003", status: "warning", orbit: "GEO", uptime: "98.2%" },
  { name: "SG-004", status: "operational", orbit: "LEO", uptime: "99.8%" },
];

export default function Dashboard() {
  const [telemetry, setTelemetry] = useState<TelemetryData[]>([]);
  const [currentData, setCurrentData] = useState<TelemetryData | null>(null);
  const [activeAlerts, setActiveAlerts] = useState(3);
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  const allAnomalies: Anomaly[] = [
    { id: "1", type: "Thermal", severity: "high", message: "Temperature anomaly detected in solar panel array", timestamp: "2 min ago" },
    { id: "2", type: "Signal", severity: "medium", message: "Signal degradation detected in S-band transmitter", timestamp: "15 min ago" },
    { id: "3", type: "Orbit", severity: "low", message: "Minor orbital drift detected", timestamp: "1 hr ago" },
    { id: "4", type: "Power", severity: "critical", message: "Power output drop in primary bus - possible solar panel degradation", timestamp: "3 hr ago" },
    { id: "5", type: "Thermal", severity: "medium", message: "Thermal gradient exceeds threshold in battery compartment", timestamp: "5 hr ago" },
    { id: "6", type: "Comm", severity: "low", message: "Slight increase in packet error rate", timestamp: "6 hr ago" },
    { id: "7", type: "Attitude", severity: "medium", message: "Minor deviation from nominal attitude - within limits", timestamp: "8 hr ago" },
    { id: "8", type: "Radiation", severity: "high", message: "Elevated radiation detected in South Atlantic Anomaly region", timestamp: "12 hr ago" },
  ];

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }));
  }, []);

  useEffect(() => {
    const data = generateTelemetry();
    setTelemetry(data);
    setCurrentData(data[data.length - 1]);
    const interval = setInterval(() => {
      const newData = generateTelemetry();
      setTelemetry(newData);
      setCurrentData(newData[newData.length - 1]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "text-red-500";
      case "high": return "text-orange-500";
      case "medium": return "text-yellow-500";
      default: return "text-blue-500";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "operational": return "text-primary";
      case "warning": return "text-yellow-500";
      case "critical": return "text-red-500";
      default: return "text-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-darker text-gray-100">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Satellite className="w-8 h-8 text-primary" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse-glow" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-wider text-primary">SATGUARD AI</h1>
                <p className="text-xs text-gray-500">Satellite Telemetry & Anomaly Detection</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-secondary" />
                <span className="text-gray-400">Last Update:</span>
                <span className="text-primary font-mono">{mounted ? currentTime : "--:--"}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-full">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-red-500 font-semibold">{activeAlerts} Active</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 glow relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full blur-2xl" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm">Altitude</span>
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div className="text-3xl font-bold text-primary font-mono">
              {currentData?.altitude.toFixed(1) || "---"} <span className="text-lg text-gray-500">km</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">Stable orbit</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 glow-blue relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-secondary/5 rounded-full blur-2xl" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm">Velocity</span>
              <Gauge className="w-5 h-5 text-secondary" />
            </div>
            <div className="text-3xl font-bold text-secondary font-mono">
              {currentData?.velocity.toFixed(2) || "---"} <span className="text-lg text-gray-500">km/s</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">Orbital velocity</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 glow-pink relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-accent/5 rounded-full blur-2xl" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm">Temperature</span>
              <Thermometer className="w-5 h-5 text-accent" />
            </div>
            <div className="text-3xl font-bold text-accent font-mono">
              {currentData?.temperature.toFixed(1) || "---"} <span className="text-lg text-gray-500">°C</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">Within normal range</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/5 rounded-full blur-2xl" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm">Battery</span>
              <Zap className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-green-500 font-mono">
              {currentData?.battery.toFixed(0) || "---"} <span className="text-lg text-gray-500">%</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">Solar charging</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Telemetry Overview</h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Signal className="w-4 h-4" />
                Live Data
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={telemetry}>
                  <defs>
                    <linearGradient id="colorAltitude" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff00aa" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ff00aa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                  <XAxis dataKey="time" stroke="#666" fontSize={11} />
                  <YAxis stroke="#666" fontSize={11} />
                  <Tooltip
                    contentStyle={{ background: "#12121a", border: "1px solid #1e1e2e", borderRadius: "8px" }}
                    labelStyle={{ color: "#00ff88" }}
                  />
                  <Area type="monotone" dataKey="altitude" stroke="#00ff88" fillOpacity={1} fill="url(#colorAltitude)" strokeWidth={2} />
                  <Area type="monotone" dataKey="temperature" stroke="#ff00aa" fillOpacity={1} fill="url(#colorTemp)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-6">
              <Eye className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold">AI Anomaly Alerts</h2>
            </div>
            <div className="space-y-4">
              {anomalies.map((anomaly) => (
                <div key={anomaly.id} className="p-4 bg-darker rounded-lg border border-border hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-semibold ${getSeverityColor(anomaly.severity)}`}>
                      {anomaly.severity.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">{anomaly.timestamp}</span>
                  </div>
                  <p className="text-sm text-gray-300 mb-2">{anomaly.message}</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded">{anomaly.type}</span>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowAllAlerts(true)} className="w-full mt-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-semibold">
              View All Alerts →
            </button>

            {showAllAlerts && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowAllAlerts(false)}>
                <div className="bg-card border border-border rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold">All AI Anomaly Alerts</h2>
                    <button onClick={() => setShowAllAlerts(false)} className="text-gray-400 hover:text-white">✕</button>
                  </div>
                  <div className="space-y-4">
                    {allAnomalies.map((anomaly) => (
                      <div key={anomaly.id} className="p-4 bg-darker rounded-lg border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`font-semibold ${getSeverityColor(anomaly.severity)}`}>
                            {anomaly.severity.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500">{anomaly.timestamp}</span>
                        </div>
                        <p className="text-sm text-gray-300 mb-2">{anomaly.message}</p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded">{anomaly.type}</span>
                          <button className="px-2 py-0.5 bg-green-500/10 text-green-500 rounded hover:bg-green-500/20">Acknowledge</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-6">
              <Signal className="w-5 h-5 text-secondary" />
              <h2 className="text-lg font-semibold">Signal Strength</h2>
            </div>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={telemetry}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                  <XAxis dataKey="time" stroke="#666" fontSize={11} />
                  <YAxis stroke="#666" fontSize={11} domain={[70, 100]} />
                  <Tooltip
                    contentStyle={{ background: "#12121a", border: "1px solid #1e1e2e", borderRadius: "8px" }}
                  />
                  <Line type="monotone" dataKey="signal" stroke="#00ccff" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-5 h-5 text-green-500" />
              <h2 className="text-lg font-semibold">Satellite Fleet Status</h2>
            </div>
            <div className="space-y-3">
              {satellites.map((sat) => (
                <div key={sat.name} className="flex items-center justify-between p-3 bg-darker rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${sat.status === "operational" ? "bg-primary" : sat.status === "warning" ? "bg-yellow-500" : "bg-red-500"}`} />
                    <div>
                      <span className="font-semibold">{sat.name}</span>
                      <span className="text-xs text-gray-500 ml-2">{sat.orbit}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-mono ${getStatusColor(sat.status)}`}>{sat.uptime}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-yellow-500" />
              <h2 className="text-lg font-semibold">Battery & Velocity Correlation</h2>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={telemetry}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
                <XAxis dataKey="time" stroke="#666" fontSize={11} />
                <YAxis yAxisId="left" stroke="#666" fontSize={11} />
                <YAxis yAxisId="right" orientation="right" stroke="#666" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: "#12121a", border: "1px solid #1e1e2e", borderRadius: "8px" }}
                />
                <Line yAxisId="left" type="monotone" dataKey="battery" stroke="#00ff88" strokeWidth={2} dot={false} name="Battery %" />
                <Line yAxisId="right" type="monotone" dataKey="velocity" stroke="#00ccff" strokeWidth={2} dot={false} name="Velocity km/s" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>

      <footer className="border-t border-border mt-8 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>SATGUARD AI © 2026 — Real-time Satellite Monitoring System</p>
        </div>
      </footer>
    </div>
  );
}