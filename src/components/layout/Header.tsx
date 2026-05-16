"use client";

import { useState, useEffect } from 'react';
import { Satellite, Moon, Sun, Settings, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  alertCount: number;
}

export default function Header({ alertCount }: HeaderProps) {
  const [isDark, setIsDark] = useState(true);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }

    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
  };

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Satellite className="w-7 h-7 text-primary" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold tracking-wider text-primary">SATGUARD</h1>
              <p className="text-xs text-gray-500">AI Telemetry System</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-400 font-mono">
              <span className="text-primary">{currentTime}</span>
            </div>

            {alertCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-full">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-red-500 font-semibold text-sm">{alertCount}</span>
              </div>
            )}

            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-darker rounded-lg transition-colors"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="w-5 h-5 text-gray-400" /> : <Moon className="w-5 h-5 text-gray-400" />}
            </button>

            <button
              className="p-2 hover:bg-darker rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}