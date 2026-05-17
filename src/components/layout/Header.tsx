'use client'
import { DataSource } from '@/types/satellite'

interface HeaderProps {
  lastUpdated: Date | null
  activeAlertCount: number
  satelliteCount: number
  dataSource: DataSource
  darkMode: boolean
  onToggleDark: () => void
}

export function Header({ lastUpdated, activeAlertCount, satelliteCount, dataSource, darkMode, onToggleDark }: HeaderProps) {
  const secondsAgo = lastUpdated ? Math.round((Date.now() - lastUpdated.getTime()) / 1000) : null
  const sourceColor = dataSource === 'live' ? 'text-green-500' : dataSource === 'cached' ? 'text-amber-500' : 'text-gray-400'
  const sourceLabel = dataSource === 'live' ? '● Live TLE' : dataSource === 'cached' ? '⚠ Cached TLE' : '○ Connecting...'

  return (
    <div className="bg-gray-950 border-b border-gray-800 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-blue-400 font-bold text-lg tracking-tight">🛰 SATGUARD AI</span>
          <span className={`text-xs font-mono ${sourceColor}`}>{sourceLabel}</span>
          {activeAlertCount > 0 && (
            <span className="text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded-full animate-pulse">
              {activeAlertCount} alert{activeAlertCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>{satelliteCount} satellites</span>
          {secondsAgo !== null && (
            <span className="text-gray-500">
              Updated {secondsAgo < 5 ? 'just now' : `${secondsAgo}s ago`}
            </span>
          )}
          <button
            onClick={onToggleDark}
            className="px-2.5 py-1 rounded border border-gray-700 hover:border-gray-500 transition-colors"
          >
            {darkMode ? '☀' : '🌙'}
          </button>
        </div>
      </div>
    </div>
  )
}