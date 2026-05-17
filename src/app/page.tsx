'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import dynamic from 'next/dynamic';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, Globe, AlertTriangle, Sun, Radio, Satellite, Clock, Cpu } from 'lucide-react';
import { AnomalyAlert, SpaceWeather } from '@/types/satellite';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const GlobeComponent = dynamic(
  () => import('@/components/visualization/Globe').then(m => m.Globe),
  { ssr: false, loading: () => <div className="glow-card h-64 flex items-center justify-center text-[#64748b]">Loading orbital view...</div> }
);

interface SatelliteData {
  id: number;
  name: string;
  lat: number;
  lng: number;
  altKm: number;
  velocityKms: number;
}

interface ISSPosition {
  lat: number;
  lng: number;
  altKm: number;
  velocityKms: number;
  name: string;
}

function KpGauge({ value }: { value: number }) {
  const color = value >= 7 ? '#ef4444' : value >= 5 ? '#f59e0b' : value >= 3 ? '#eab308' : '#10b981';
  return (
    <div className="relative w-20 h-20">
      <svg viewBox="0 0 100 100" className="transform -rotate-90">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="8" />
        <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${(value / 9) * 251.2} 251.2`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-display font-bold" style={{ color }}>{value}</span>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, unit, trend, color = '#00f5ff' }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  unit?: string;
  trend?: string;
  color?: string;
}) {
  return (
    <div className="glow-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-xs text-[#64748b] uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-display font-bold" style={{ color }}>{value}</span>
        {unit && <span className="text-sm text-[#64748b]">{unit}</span>}
        {trend && <span className="text-xs text-[#10b981]">{trend}</span>}
      </div>
    </div>
  );
}

function AlertCard({ alert }: { alert: { id: string; satellite: string; metric: string; severity: string; time: string; value: number } }) {
  const severityColors = {
    HIGH: '#ef4444',
    MEDIUM: '#f59e0b',
    LOW: '#00f5ff',
  };
  const color = severityColors[alert.severity as keyof typeof severityColors] || '#00f5ff';

  return (
    <div className="glow-card p-3 border-l-4" style={{ borderColor: color }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: color + '20', color }}>{alert.severity}</span>
        <span className="text-xs text-[#64748b]">{alert.time}</span>
      </div>
      <div className="text-sm font-medium">{alert.satellite}</div>
      <div className="text-xs text-[#64748b]">{alert.metric}: {alert.value}</div>
    </div>
  );
}

export default function Dashboard() {
  const [time, setTime] = useState(new Date());
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const { data: satData, error: satError } = useSWR('/api/satellites', fetcher, { refreshInterval: 30000 });
  const { data: weatherData, error: weatherError } = useSWR<SpaceWeather>('/api/space-weather', fetcher, { refreshInterval: 300000 });
  const { data: issData, error: issError } = useSWR('/api/iss', fetcher, { refreshInterval: 10000 });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const satellites: SatelliteData[] = satData?.satellites || [];
  const spaceWeather: SpaceWeather | undefined = weatherData;
  const iss: ISSPosition | undefined = issData;

  const status = spaceWeather?.riskLevel || 'QUIET';
  const statusColor = status === 'SEVERE' ? '#ef4444' : status === 'MODERATE' ? '#f59e0b' : '#10b981';

  const handleChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, { role: 'user', content: userMsg }],
          satelliteContext: satellites[0] ? { name: satellites[0].name, alt: satellites[0].altKm } : null,
          spaceWeather: spaceWeather ? { kpIndex: spaceWeather.kpIndex, riskLevel: spaceWeather.riskLevel } : null,
        }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.message || 'Error getting response' }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Connection error' }]);
    }
    setChatLoading(false);
  };

  // Generate mock alerts based on space weather
  const alerts = spaceWeather && spaceWeather.kpIndex >= 3 ? [
    { id: '1', satellite: 'ISS (ZARYA)', metric: 'Thermal', severity: spaceWeather.kpIndex >= 5 ? 'HIGH' : 'MEDIUM', time: new Date().toLocaleTimeString(), value: spaceWeather.kpIndex },
    { id: '2', satellite: 'NOAA 19', metric: 'Signal', severity: 'LOW', time: new Date().toLocaleTimeString(), value: -95 },
  ] : [];

  return (
    <div className="min-h-screen bg-[#020817]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a1628]/80 backdrop-blur border-b border-[#00f5ff]/20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-display font-bold text-[#00f5ff] glow-text">SATGUARD AI</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00f5ff] pulse-dot" />
              <span className="text-xs text-[#64748b]">LIVE</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-2xl font-mono text-[#00f5ff]">
                {time.toLocaleTimeString('en-US', { hour12: false })}
              </div>
              <div className="text-xs text-[#64748b]">
                {time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded border" style={{ borderColor: statusColor }}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
              <span className="text-sm font-bold" style={{ color: statusColor }}>{status}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Top Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            icon={Satellite}
            label="Active Satellites"
            value={satellites.length || '---'}
            color="#00f5ff"
          />
          <div className="glow-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4" style={{ color: statusColor }} />
              <span className="text-xs text-[#64748b] uppercase">Kp Index</span>
            </div>
            <KpGauge value={spaceWeather?.kpIndex || 0} />
          </div>
          <MetricCard
            icon={Globe}
            label="ISS Altitude"
            value={iss?.altKm.toFixed(0) || '---'}
            unit="km"
            color="#f59e0b"
          />
          <MetricCard
            icon={Sun}
            label="Solar Flare"
            value={spaceWeather?.flareClass || '---'}
            color={spaceWeather?.flareClass === 'X' ? '#ef4444' : spaceWeather?.flareClass === 'M' ? '#f59e0b' : '#10b981'}
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Globe */}
          <div className="lg:col-span-2 space-y-4">
            <div className="glow-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-display font-bold text-[#00f5ff]">ORBITAL VIEW</h2>
                <span className="text-xs text-[#64748b]">{satellites.length} satellites tracked</span>
              </div>
              <GlobeComponent satellites={satellites.map(s => ({
                noradId: s.id.toString(),
                name: s.name,
                altitude: s.altKm,
                velocity: s.velocityKms,
                temperature: 0,
                battery: 0,
                signalStrength: null,
                lat: s.lat,
                lng: s.lng,
                eclipseStatus: 'sunlit' as const,
                status: 'nominal' as const,
                history: [],
                dataSource: 'live' as const,
              }))} />
            </div>

            {/* Kp Index Chart */}
            {spaceWeather?.kpHistory && (
              <div className="glow-card p-4">
                <h3 className="text-sm font-display font-bold text-[#00f5ff] mb-4">Kp INDEX HISTORY</h3>
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={spaceWeather.kpHistory.slice(-24)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} />
                    <YAxis domain={[0, 9]} tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#0d1f3c', border: '1px solid #00f5ff', borderRadius: 4 }} />
                    <Area type="monotone" dataKey="kp" stroke="#00f5ff" fill="#00f5ff" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Right Column - Alerts */}
          <div className="space-y-4">
            <div className="glow-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-display font-bold text-[#00f5ff]">ANOMALY ALERTS</h2>
                {alerts.length > 0 && (
                  <span className="text-xs bg-red-900/30 text-red-400 px-2 py-0.5 rounded">{alerts.length} active</span>
                )}
              </div>

              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">✅</div>
                  <div className="text-sm text-[#64748b]">All systems nominal</div>
                  <div className="text-xs text-[#64748b] mt-1">No anomalies detected</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map(alert => <AlertCard key={alert.id} alert={alert} />)}
                </div>
              )}
            </div>

            {/* Space Weather Details */}
            <div className="glow-card p-4">
              <h3 className="text-sm font-display font-bold text-[#00f5ff] mb-3">SPACE WEATHER</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Solar Wind Bz</span>
                  <span className="font-mono">{spaceWeather?.solarWindBz?.toFixed(1) || '---'} nT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Solar Wind Speed</span>
                  <span className="font-mono">{spaceWeather?.solarWindSpeed?.toFixed(0) || '---'} km/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">X-Ray Flux</span>
                  <span className="font-mono">{spaceWeather?.xrayFlux?.toExponential(2) || '---'} W/m²</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Source</span>
                  <span className="text-[#00f5ff]">{spaceWeather?.source || '---'}</span>
                </div>
              </div>
            </div>

            {/* ISS Position */}
            <div className="glow-card p-4">
              <h3 className="text-sm font-display font-bold text-[#f59e0b] mb-3">ISS REAL-TIME</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Latitude</span>
                  <span className="font-mono">{iss?.lat?.toFixed(4) || '---'}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Longitude</span>
                  <span className="font-mono">{iss?.lng?.toFixed(4) || '---'}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Velocity</span>
                  <span className="font-mono">{iss?.velocityKms?.toFixed(2) || '---'} km/s</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Chat Button */}
      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-[#00f5ff] text-[#020817] px-4 py-2.5 rounded-full shadow-lg hover:shadow-[#00f5ff]/50 transition-all font-bold"
      >
        <Radio className="w-4 h-4" />
        Ask SATGUARD AI
      </button>

      {/* Chat Panel */}
      {chatOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-96 bg-[#0d1f3c] border border-[#00f5ff]/30 rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-[#00f5ff]/10 px-4 py-3 flex justify-between items-center">
            <div>
              <p className="font-display font-bold text-[#00f5ff]">SATGUARD AI</p>
              <p className="text-xs text-[#64748b]">Llama 3.3 · Space domain</p>
            </div>
            <button onClick={() => setChatOpen(false)} className="text-[#64748b] hover:text-white text-xl">×</button>
          </div>

          <div className="h-64 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 && (
              <div className="text-center text-[#64748b] text-sm">
                <p>Ask about satellites, space weather, or anomalies.</p>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                msg.role === 'user' ? 'bg-[#00f5ff] text-[#020817] ml-auto' : 'bg-[#1e293b] text-gray-100'
              }`}>
                {msg.content}
              </div>
            ))}
            {chatLoading && <div className="text-[#64748b] text-sm">Thinking...</div>}
          </div>

          <div className="border-t border-[#1e293b] p-3 flex gap-2">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleChat()}
              placeholder="Ask a question..."
              className="flex-1 bg-[#1e293b] text-white rounded-lg px-3 py-2 text-sm outline-none border border-[#1e293b] focus:border-[#00f5ff]"
            />
            <button
              onClick={handleChat}
              disabled={chatLoading || !chatInput.trim()}
              className="bg-[#00f5ff] text-[#020817] rounded-lg px-3 py-2 text-sm font-bold disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}