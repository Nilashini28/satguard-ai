'use client'
import { useState, useRef, useEffect } from 'react'
import { CommandLog, SatelliteState } from '@/types/satellite'

const CMDS = {
  SAFE_MODE:       { desc: 'Engage safe mode — suspend non-essential systems',   effect: 'Safe mode active. Power reduced 40%. Non-critical systems suspended.' },
  ANTENNA_REPOINT: { desc: 'Repoint antenna array toward Chennai ground station', effect: 'Antenna repointed to Chennai GS (13.08°N, 80.27°E). Signal confirmed.' },
  THERMAL_VENT:    { desc: 'Open thermal vents to dissipate excess heat',         effect: 'Thermal vents open. Temperature normalizing over next 20 seconds.' },
  ORBIT_CORRECTION:{ desc: 'Execute micro-burn for orbital correction',            effect: 'Delta-V burn complete (0.3 m/s). New orbit parameters nominal.' },
  DIAGNOSTIC_SCAN: { desc: 'Run full system diagnostic across all subsystems',    effect: null },
}

const DIAG = [
  '→ Power subsystem .............. ✓ OK',
  '→ Attitude control ............. ✓ OK',
  '→ Thermal regulation ........... ✓ OK',
  '→ Communications (S-band) ...... ✓ OK',
  '→ Onboard computer ............. ✓ OK',
  '→ Payload instruments .......... ✓ OK',
  '✓ Diagnostic complete. All systems nominal.',
]

function logEntry(text: string, type: CommandLog['type']): CommandLog {
  return { id: Math.random().toString(36).slice(2), text, type, timestamp: Date.now() }
}

export function Terminal({ satellite }: { satellite: SatelliteState }) {
  const [logs, setLogs] = useState<CommandLog[]>([
    logEntry('SATGUARD Mission Control Terminal v2.1', 'system'),
    logEntry(`Ground station: Chennai (13.08°N, 80.27°E)`, 'system'),
    logEntry('Ready. Select a command to uplink.', 'info'),
  ])
  const [busy, setBusy] = useState(false)
  const [active, setActive] = useState<string | null>(null)
  const bottom = useRef<HTMLDivElement>(null)

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }) }, [logs])

  function addLog(text: string, type: CommandLog['type'], delay: number) {
    return new Promise<void>(res => setTimeout(() => {
      setLogs(p => [...p.slice(-99), logEntry(text, type)]); res()
    }, delay))
  }

  async function run(key: string) {
    if (busy) return
    setBusy(true); setActive(key)
    const cmd = CMDS[key as keyof typeof CMDS]
    await addLog(`> ${key} queued for uplink to ${satellite.name}...`, 'info', 0)
    await addLog('> Carrier wave locked — 437.525 MHz', 'info', 1000)
    await addLog('> Transmission started (128 bytes)', 'info', 2000)
    await addLog(`> ACK received from ${satellite.name}`, 'success', 4000)
    await addLog('> Command executed. Telemetry updating...', 'success', 6000)
    if (key === 'DIAGNOSTIC_SCAN') {
      DIAG.forEach((line, i) => addLog(line, i === DIAG.length - 1 ? 'success' : 'info', 7000 + i * 450))
      setTimeout(() => { setBusy(false); setActive(null) }, 7000 + DIAG.length * 450 + 500)
    } else {
      await addLog(`> ${cmd.effect}`, 'success', 8000)
      setTimeout(() => { setBusy(false); setActive(null) }, 8500)
    }
  }

  const logColor = { system: 'text-gray-600', info: 'text-amber-400', success: 'text-green-400', error: 'text-red-400' }

  return (
    <div className="bg-gray-950 rounded-xl border border-gray-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800">
        <span className="text-green-400 text-xs font-mono font-semibold">⌨ Mission Control — {satellite.name}</span>
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 opacity-70" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 opacity-70" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 opacity-70" />
        </div>
      </div>
      <div className="h-36 overflow-y-auto p-3 font-mono text-xs space-y-0.5 bg-gray-950">
        {logs.map(l => (
          <div key={l.id} className={logColor[l.type]}>
            <span className="text-gray-700 mr-2">
              {new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            {l.text}
          </div>
        ))}
        {busy && <div className="text-green-400 animate-pulse">█</div>}
        <div ref={bottom} />
      </div>
      <div className="border-t border-gray-800 p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {Object.entries(CMDS).map(([key, cmd]) => (
          <button key={key} onClick={() => run(key)} disabled={busy}
            className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${
              active === key
                ? 'border-green-500 bg-green-950 text-green-400'
                : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}>
            <div className="font-mono font-semibold text-green-500 text-xs mb-0.5">{key}</div>
            <div className="text-gray-500 text-xs leading-snug">{cmd.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}