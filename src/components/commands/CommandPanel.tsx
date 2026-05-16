"use client";

import { useState, useRef, useEffect } from 'react';
import { Terminal, Play, ChevronDown } from 'lucide-react';

interface CommandLog {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: Date;
}

interface Command {
  name: string;
  description: string;
  effect: (satellite: string) => Promise<void>;
}

const COMMANDS: Command[] = [
  {
    name: 'SAFE_MODE',
    description: 'Gradually normalize telemetry over 30s',
    effect: async () => {
      await new Promise(r => setTimeout(r, 1000));
    }
  },
  {
    name: 'ANTENNA_REPOINT',
    description: 'Improve signal strength by 8-12 dBm over 15s',
    effect: async () => {
      await new Promise(r => setTimeout(r, 1000));
    }
  },
  {
    name: 'THERMAL_VENT',
    description: 'Drop temperature by 10°C over 20s',
    effect: async () => {
      await new Promise(r => setTimeout(r, 1000));
    }
  },
  {
    name: 'ORBIT_CORRECTION',
    description: 'Micro-adjust altitude/velocity ±0.5 over 25s',
    effect: async () => {
      await new Promise(r => setTimeout(r, 1000));
    }
  },
  {
    name: 'DIAGNOSTIC_SCAN',
    description: 'Run system check, print 6 result lines',
    effect: async () => {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
];

export default function CommandPanel() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [logs, setLogs] = useState<CommandLog[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (type: CommandLog['type'], message: string) => {
    setLogs(prev => [...prev, { type, message, timestamp: new Date() }]);
  };

  const executeCommand = async (command: Command) => {
    if (isExecuting) return;

    setIsExecuting(true);
    setSelectedCommand(command.name);

    addLog('info', `> [${command.name}] queued for uplink...`);
    await new Promise(r => setTimeout(r, 1000));

    addLog('info', '> Carrier wave established — 437.525 MHz');
    await new Promise(r => setTimeout(r, 1000));

    addLog('info', '> Uplink transmission started (128 bytes)');
    await new Promise(r => setTimeout(r, 2000));

    addLog('success', '> Acknowledgment received from SATELLITE');
    await new Promise(r => setTimeout(r, 2000));

    addLog('success', '> Command executed. Telemetry updating...');

    const satelliteName = 'ISS (ZARYA)';
    addLog('info', `> Applying ${command.name} effect to ${satelliteName}...`);

    await command.effect(satelliteName);

    switch (command.name) {
      case 'SAFE_MODE':
        addLog('success', '> Telemetry values stabilizing within normal parameters');
        break;
      case 'ANTENNA_REPOINT':
        addLog('success', '> Signal strength improved by 10 dBm');
        break;
      case 'THERMAL_VENT':
        addLog('success', '> Temperature reduced by 10°C');
        break;
      case 'ORBIT_CORRECTION':
        addLog('success', '> Orbital parameters adjusted successfully');
        break;
      case 'DIAGNOSTIC_SCAN':
        await new Promise(r => setTimeout(r, 400));
        addLog('success', '> [OK] Power systems — 98.2% capacity');
        await new Promise(r => setTimeout(r, 400));
        addLog('success', '> [OK] Thermal control — nominal');
        await new Promise(r => setTimeout(r, 400));
        addLog('success', '> [OK] Communications — signal lock');
        await new Promise(r => setTimeout(r, 400));
        addLog('success', '> [OK] Attitude control — stable');
        await new Promise(r => setTimeout(r, 400));
        addLog('success', '> [OK] Propulsion — 87.5% propellant');
        await new Promise(r => setTimeout(r, 400));
        addLog('success', '> [OK] Navigation — GPS locked');
        break;
    }

    addLog('info', '> Command sequence complete');
    setIsExecuting(false);
    setSelectedCommand(null);
  };

  const getLogColor = (type: CommandLog['type']) => {
    switch (type) {
      case 'success': return 'text-green-500';
      case 'warning': return 'text-amber-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-300';
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-darker/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Mission Control</h3>
          {isExecuting && (
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-500 text-xs rounded">
              Executing {selectedCommand}...
            </span>
          )}
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && (
        <div className="border-t border-border">
          <div className="p-4 grid grid-cols-5 gap-2">
            {COMMANDS.map((cmd) => (
              <button
                key={cmd.name}
                onClick={() => executeCommand(cmd)}
                disabled={isExecuting}
                className={`px-3 py-2 rounded-lg text-sm font-mono transition-all ${
                  isExecuting
                    ? 'bg-darker text-gray-600 cursor-not-allowed'
                    : 'bg-darker hover:bg-primary/20 hover:text-primary border border-border hover:border-primary/50'
                }`}
              >
                {cmd.name}
              </button>
            ))}
          </div>

          <div className="p-4 bg-darker/50 border-t border-border max-h-64 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-500 text-center py-4">
                Ready for commands...
              </div>
            ) : (
              <>
                {logs.map((log, i) => (
                  <div key={i} className={`${getLogColor(log.type)} mb-1`}>
                    <span className="text-gray-600">[{log.timestamp.toLocaleTimeString()}]</span> {log.message}
                  </div>
                ))}
                {isExecuting && (
                  <div className="text-gray-500 animate-pulse">
                    <span className="inline-block w-2 h-4 bg-primary animate-pulse mr-1" />
                    Awaiting response...
                  </div>
                )}
                <div ref={logsEndRef} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}