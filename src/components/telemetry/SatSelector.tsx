'use client'
import { SatelliteState } from '@/types/satellite'

const statusDot = {
  nominal: 'bg-green-500',
  warning: 'bg-amber-500 animate-pulse',
  critical: 'bg-red-500 animate-ping',
}

export function SatSelector({ satellites, active, onSelect }: {
  satellites: SatelliteState[]
  active: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {satellites.map(s => (
        <button key={s.noradId} onClick={() => onSelect(s.noradId)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
            active === s.noradId
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-gray-900 text-gray-300 border-gray-700 hover:border-gray-500'
          }`}>
          <span className={`w-2 h-2 rounded-full ${active === s.noradId ? 'bg-white' : statusDot[s.status]}`} />
          <span className="hidden sm:inline">{s.name}</span>
          <span className="sm:hidden">{s.name.split(' ')[0]}</span>
        </button>
      ))}
    </div>
  )
}