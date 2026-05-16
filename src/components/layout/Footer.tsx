"use client";

import { Github, Globe } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-border mt-8 py-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <p className="text-gray-500 text-sm">
              SATGUARD AI © {new Date().getFullYear()} — Real-time Satellite Monitoring System
            </p>
            <p className="text-gray-600 text-xs mt-1">
              Data: CelesTrak TLE · AI: Claude Haiku · Built with Next.js + Three.js
            </p>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="#"
              className="flex items-center gap-1 text-gray-500 hover:text-primary transition-colors text-sm"
            >
              <Globe className="w-4 h-4" />
              <span>Demo</span>
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-gray-500 hover:text-primary transition-colors text-sm"
            >
              <Github className="w-4 h-4" />
              <span>Source</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}