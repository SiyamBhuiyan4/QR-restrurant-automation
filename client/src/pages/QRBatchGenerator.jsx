import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { 
  Printer, 
  QrCode, 
  Download, 
  Copy, 
  Check, 
  RefreshCw, 
  Sliders, 
  ExternalLink, 
  Sparkles, 
  Mic, 
  UtensilsCrossed, 
  Globe, 
  Layers,
  ArrowRight
} from 'lucide-react';
import { resolveServerUrl } from '../context/SocketContext';
import '../styles/admin.css';

export default function QRBatchGenerator({ className = '' }) {
  // Config inputs
  const [restaurantName, setRestaurantName] = useState('SmartDine Bistro');
  const [tagline, setTagline] = useState('Scan to order from your phone & leave voice notes!');
  const [tableStart, setTableStart] = useState(1);
  const [tableEnd, setTableEnd] = useState(12);
  const [baseUrl, setBaseUrl] = useState('');
  const [detectedLanIp, setDetectedLanIp] = useState('');
  
  // Display & Generation states
  const [generatedCards, setGeneratedCards] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedTable, setCopiedTable] = useState(null);
  const [layoutMode, setLayoutMode] = useState('grid-2'); // 'grid-2' (2 columns) or 'grid-3' (3 columns)

  // Auto-detect LAN IP and initial Base URL
  useEffect(() => {
    let defaultUrl = '';
    if (typeof window !== 'undefined') {
      const { protocol, hostname, port } = window.location;
      // If dev server on 5173, suggest 3000
      if (port === '5173') {
        defaultUrl = `${protocol}//${hostname}:3000`;
      } else {
        defaultUrl = window.location.origin;
      }
    }

    // Attempt to query server for LAN IP
    const fetchLanIp = async () => {
      try {
        const serverUrl = resolveServerUrl();
        const res = await fetch(`${serverUrl}/api/network`);
        if (res.ok) {
          const data = await res.json();
          if (data?.ip || data?.lanUrl) {
            const serverLan = data.lanUrl || `https://${data.ip}:${data.port || 3000}`;
            setDetectedLanIp(serverLan);
            setBaseUrl(serverLan);
            return;
          }
        }
      } catch (err) {
        // Fallback to detected browser origin
      }
      setBaseUrl(defaultUrl || 'http://localhost:3000');
    };

    fetchLanIp();
  }, []);

  // Generate QR Codes for the specified range
  const generateQRCodes = useCallback(async () => {
    if (!baseUrl) return;

    setIsGenerating(true);
    const start = Math.max(1, parseInt(tableStart, 10) || 1);
    const end = Math.max(start, parseInt(tableEnd, 10) || start);
    const cleanBase = baseUrl.replace(/\/+$/, '');

    const cards = [];

    for (let tableNum = start; tableNum <= end; tableNum++) {
      const tableUrl = `${cleanBase}/?table=${tableNum}`;

      try {
        // Generate high-resolution Data URL for the QR code
        const qrDataUrl = await QRCode.toDataURL(tableUrl, {
          width: 320,
          margin: 1.5,
          color: {
            dark: '#111827',
            light: '#ffffff'
          },
          errorCorrectionLevel: 'H'
        });

        cards.push({
          tableNum,
          tableUrl,
          qrDataUrl
        });
      } catch (err) {
        console.error(`Failed to generate QR for Table ${tableNum}:`, err);
      }
    }

    setGeneratedCards(cards);
    setIsGenerating(false);
  }, [baseUrl, tableStart, tableEnd]);

  // Regenerate when table range or baseUrl changes
  useEffect(() => {
    if (baseUrl) {
      generateQRCodes();
    }
  }, [baseUrl, tableStart, tableEnd, generateQRCodes]);

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // Copy URL to clipboard
  const handleCopyUrl = (tableNum, url) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
      setCopiedTable(tableNum);
      setTimeout(() => setCopiedTable(null), 2500);
    }
  };

  // Download individual QR Image
  const handleDownloadSingle = (tableNum, qrDataUrl) => {
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `table-${tableNum}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download all QRs
  const handleDownloadAll = () => {
    generatedCards.forEach((card, idx) => {
      setTimeout(() => {
        handleDownloadSingle(card.tableNum, card.qrDataUrl);
      }, idx * 150);
    });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      
      {/* Configuration & Controls Card (Hidden during print) */}
      <div className="admin-enter no-print bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-neutral-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                <QrCode className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                Table QR Code Generator
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">
              Generate crisp, printable table tent cards with auto-detected table URLs for offline-first ordering.
            </p>
          </div>

          {/* Print & Download Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadAll}
              disabled={generatedCards.length === 0}
              className="px-3.5 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 active:scale-95 text-neutral-700 text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Download className="w-4 h-4 text-neutral-500" />
              <span>Download PNGs</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={generatedCards.length === 0}
              className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:scale-95 text-white text-xs sm:text-sm font-semibold transition shadow-md shadow-neutral-900/15 cursor-pointer flex items-center gap-2"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Print QR Stickers</span>
            </button>
          </div>
        </div>

        {/* Input Parameters Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Restaurant Name */}
          <div>
            <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1.5">
              Restaurant Name
            </label>
            <input
              type="text"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="e.g. SmartDine Express"
              className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
            />
          </div>

          {/* Table Start */}
          <div>
            <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1.5">
              Table Start
            </label>
            <input
              type="number"
              min="1"
              value={tableStart}
              onChange={(e) => setTableStart(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
            />
          </div>

          {/* Table End */}
          <div>
            <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1.5">
              Table End
            </label>
            <input
              type="number"
              min={tableStart}
              value={tableEnd}
              onChange={(e) => setTableEnd(Math.max(tableStart, parseInt(e.target.value, 10) || tableStart))}
              className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
            />
          </div>

          {/* Layout Mode Selector */}
          <div>
            <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1.5">
              Print Sheet Layout
            </label>
            <select
              value={layoutMode}
              onChange={(e) => setLayoutMode(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
            >
              <option value="grid-2">2 Columns (Standard Table Tents)</option>
              <option value="grid-3">3 Columns (Compact Stickers)</option>
            </select>
          </div>

        </div>

        {/* Base URL & Tagline Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
          
          {/* Base URL Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-amber-500" />
                Base Server URL (LAN IP)
              </label>
              {detectedLanIp && (
                <button
                  type="button"
                  onClick={() => setBaseUrl(detectedLanIp)}
                  className="text-[11px] text-amber-600 hover:text-amber-800 font-medium underline"
                >
                  Use Auto-Detected LAN IP
                </button>
              )}
            </div>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://192.168.1.100:3000"
              className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm border border-neutral-200 font-mono text-neutral-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
            />
            <p className="text-[11px] text-neutral-400 mt-1">
              Ensure this URL matches the local Wi-Fi IP so diners connecting on the same network reach the ordering page.
            </p>
          </div>

          {/* Custom Tagline */}
          <div>
            <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1.5">
              Card Tagline / Instructions
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Scan to order from your phone & leave voice notes!"
              className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
            />
            <p className="text-[11px] text-neutral-400 mt-1">
              Appears directly below each QR code instructing guests how to order and record voice notes.
            </p>
          </div>

        </div>

        {/* Quick Range Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-neutral-100">
          <span className="text-xs font-semibold text-neutral-500 mr-1">Quick Presets:</span>
          {[
            { label: 'Tables 1 - 6', start: 1, end: 6 },
            { label: 'Tables 1 - 12', start: 1, end: 12 },
            { label: 'Tables 1 - 20', start: 1, end: 20 },
            { label: 'Tables 10 - 25', start: 10, end: 25 },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setTableStart(preset.start);
                setTableEnd(preset.end);
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 transition cursor-pointer"
            >
              {preset.label}
            </button>
          ))}

          <button
            type="button"
            onClick={generateQRCodes}
            disabled={isGenerating}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>Regenerate ({generatedCards.length} Tables)</span>
          </button>
        </div>

      </div>

      {/* =========================================================================
          PRINTABLE & PREVIEW GRID
          Uses `.qr-print-sheet` from index.css for clean @media print rendering
          ========================================================================= */}
      <div>
        
        {/* On-Screen Preview Bar (Hidden during print) */}
        <div className="no-print flex items-center justify-between pb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Live Preview &bull; {generatedCards.length} Printable Cards
            </span>
          </div>
          <span className="text-xs text-neutral-400">
            Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-neutral-100 border text-[11px] font-mono">Ctrl/Cmd + P</kbd> or click Print
          </span>
        </div>

        {/* Printable Grid Container */}
        <div
          className={`qr-print-sheet grid gap-6 ${
            layoutMode === 'grid-3'
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1 sm:grid-cols-2'
          }`}
        >
          {generatedCards.map((card) => {
            const isCopied = copiedTable === card.tableNum;

            return (
              <div
                key={card.tableNum}
                className="qr-sticker-card bg-white rounded-2xl border-2 border-neutral-900/90 p-6 text-center shadow-xs flex flex-col items-center justify-between relative transition-all hover:shadow-md break-inside-avoid"
              >
                {/* Card Top Brand & Badge */}
                <div className="w-full flex items-center justify-between border-b-2 border-neutral-900 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-neutral-900 text-amber-400 flex items-center justify-center font-bold">
                      <UtensilsCrossed className="w-4 h-4" />
                    </div>
                    <span className="font-extrabold text-neutral-900 text-sm tracking-tight text-left leading-tight">
                      {restaurantName || 'SmartDine'}
                    </span>
                  </div>

                  {/* Table Badge */}
                  <div className="px-3 py-1 rounded-lg bg-neutral-900 text-white font-extrabold text-xs tracking-wider uppercase">
                    Table {card.tableNum}
                  </div>
                </div>

                {/* Table Title Heading (for print optimization) */}
                <div className="qr-table-title text-xl sm:text-2xl font-black text-neutral-900 uppercase tracking-tight mb-2">
                  TABLE {card.tableNum}
                </div>

                {/* QR Code Container */}
                <div className="p-3 bg-white rounded-xl border border-neutral-200/60 shadow-2xs my-1">
                  <img
                    src={card.qrDataUrl}
                    alt={`QR Code for Table ${card.tableNum}`}
                    className="w-44 h-44 sm:w-48 sm:h-48 object-contain mx-auto"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>

                {/* Instructions / Voice Note Tagline */}
                <div className="qr-instructions mt-3 max-w-xs">
                  <p className="text-xs sm:text-sm font-semibold text-neutral-800 leading-snug">
                    {tagline}
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 text-[11px] font-medium border border-neutral-200/60">
                    <Mic className="w-3.5 h-3.5 text-amber-600" />
                    <span>Instant Voice Notes Supported</span>
                  </div>
                </div>

                {/* Direct Link Footnote */}
                <div className="mt-4 pt-3 border-t border-neutral-200 w-full text-[11px] text-neutral-500 font-mono truncate">
                  {card.tableUrl}
                </div>

                {/* Interactive Controls Bar on Card (Hidden in print) */}
                <div className="no-print mt-3 pt-3 border-t border-neutral-100 w-full flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(card.tableNum, card.tableUrl)}
                    className="px-2.5 py-1 rounded-lg bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border border-neutral-200 text-xs font-medium transition cursor-pointer flex items-center gap-1"
                    title="Copy table direct URL"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-neutral-400" />}
                    <span>{isCopied ? 'Copied' : 'Copy URL'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadSingle(card.tableNum, card.qrDataUrl)}
                    className="px-2.5 py-1 rounded-lg bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border border-neutral-200 text-xs font-medium transition cursor-pointer flex items-center gap-1"
                    title="Download PNG for this table"
                  >
                    <Download className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Download</span>
                  </button>

                  <a
                    href={card.tableUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2 py-1 rounded-lg bg-neutral-50 hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 border border-neutral-200 text-xs transition flex items-center justify-center"
                    title="Open table customer menu in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
