import React, { useState } from 'react';
import {
  Smartphone,
  Tablet,
  Monitor,
  RotateCcw,
  ExternalLink,
  Sparkles,
  Info,
  CheckCircle2
} from 'lucide-react';

/**
 * CustomerSimulatorModule Component
 * 
 * Embedded live diner preview environment allowing the Admin to inspect
 * and test the digital menu, order flow, and realistic river background
 * on various device viewports across all 12 tables.
 */
export default function CustomerSimulatorModule({ className = '' }) {
  const [selectedTable, setSelectedTable] = useState(1);
  const [deviceMode, setDeviceMode] = useState('mobile'); // 'mobile' | 'tablet' | 'desktop'
  const [key, setKey] = useState(0);

  const getContainerWidth = () => {
    switch (deviceMode) {
      case 'mobile':
        return 'max-w-[400px] h-[780px]';
      case 'tablet':
        return 'max-w-[768px] h-[860px]';
      case 'desktop':
      default:
        return 'w-full h-[860px]';
    }
  };

  const reloadFrame = () => {
    setKey(prev => prev + 1);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. CONTROLS HEADER */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Info */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>Customer Digital Menu Simulator</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Live Preview
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Test dishes, order cart, customer call button &amp; river background live from the diner's view.
            </p>
          </div>
        </div>

        {/* Center: Table Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Active Table:</span>
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(Number(e.target.value))}
            className="px-3 py-1.5 rounded-xl text-xs font-black border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
              <option key={num} value={num}>Table #{num}</option>
            ))}
          </select>
        </div>

        {/* Right: Device Viewport Switcher & External Link */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setDeviceMode('mobile')}
              className={`p-1.5 rounded-lg transition ${
                deviceMode === 'mobile'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
              }`}
              title="Mobile View (iPhone)"
            >
              <Smartphone className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setDeviceMode('tablet')}
              className={`p-1.5 rounded-lg transition ${
                deviceMode === 'tablet'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
              }`}
              title="Tablet View (iPad)"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setDeviceMode('desktop')}
              className={`p-1.5 rounded-lg transition ${
                deviceMode === 'desktop'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
              }`}
              title="Full Width Responsive"
            >
              <Monitor className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={reloadFrame}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Reload simulator"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <a
            href={`/?table=${selectedTable}`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
            title="Open in standalone tab"
          >
            <span>Pop Out</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* 2. DEVICE FRAME CANVAS */}
      <div className="flex justify-center p-4 bg-slate-200/50 dark:bg-slate-950/70 rounded-3xl border border-slate-200/80 dark:border-slate-800">
        <div className={`w-full ${getContainerWidth()} transition-all duration-300 relative rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 dark:border-slate-700 bg-black`}>
          {/* Top Device Speaker Notch */}
          {deviceMode !== 'desktop' && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-full z-20 flex items-center justify-center pointer-events-none">
              <div className="w-3 h-3 rounded-full bg-slate-950 mr-2" />
              <div className="w-10 h-1 bg-slate-800 rounded-full" />
            </div>
          )}

          {/* Embedded Customer Menu Frame */}
          <iframe
            key={key}
            src={`/?table=${selectedTable}`}
            title={`Customer Menu Simulator Table ${selectedTable}`}
            className="w-full h-full border-none bg-black"
          />
        </div>
      </div>
    </div>
  );
}
