import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import { 
  Printer, 
  QrCode, 
  Download, 
  Copy, 
  Check, 
  RefreshCw, 
  ExternalLink, 
  UtensilsCrossed, 
  Mic, 
  ChevronDown
} from 'lucide-react';
import { resolveServerUrl } from '../context/SocketContext';
import { useRestaurant } from '../context/RestaurantContext';
import '../styles/admin.css';
import '../styles/qr-generator.css';

const DEFAULT_CARD_TAGLINE = 'Scan to order from your phone & leave voice notes!';

export default function QRBatchGenerator({ 
  className = '', 
  tableCount: propTableCount, 
  tables: propTables 
}) {
  const restaurantCtx = useRestaurant ? useRestaurant() : null;
  const [storageTick, setStorageTick] = useState(0);

  // Cross-tab / external storage synchronization listener
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'smartdine_restaurant_tables' || e.key === 'smartdine_table_count') {
        setStorageTick(prev => prev + 1);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Determine venue assigned table count (strictly locked to exact floor capacity & max table number)
  const venueTableCount = useMemo(() => {
    // 1. Gather all live table objects
    const tablesList = (Array.isArray(propTables) && propTables.length > 0)
      ? propTables
      : (Array.isArray(restaurantCtx?.tables) && restaurantCtx.tables.length > 0)
      ? restaurantCtx.tables
      : (() => {
          if (typeof localStorage !== 'undefined') {
            try {
              const saved = localStorage.getItem('smartdine_restaurant_tables');
              if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
              }
            } catch (_) {}
          }
          return [];
        })();

    const maxTableFromList = tablesList.reduce((max, t) => Math.max(max, t.tableNumber || 0), 0);
    const countFromList = tablesList.length;

    // 2. Gather explicit count declarations
    let localSavedCount = 0;
    if (typeof localStorage !== 'undefined') {
      try {
        const savedCount = localStorage.getItem('smartdine_table_count');
        if (savedCount) localSavedCount = parseInt(savedCount, 10) || 0;
      } catch (_) {}
    }

    const explicitPropCount = typeof propTableCount === 'number' && propTableCount > 0 ? propTableCount : 0;
    const explicitCtxCount = typeof restaurantCtx?.tableCount === 'number' && restaurantCtx.tableCount > 0 ? restaurantCtx.tableCount : 0;

    // 3. True floor maximum across all live sources
    const maxCalculated = Math.max(
      maxTableFromList,
      countFromList,
      explicitPropCount,
      explicitCtxCount,
      localSavedCount
    );

    return maxCalculated > 0 ? maxCalculated : 12;
  }, [propTableCount, propTables, restaurantCtx?.tableCount, restaurantCtx?.tables, storageTick]);

  // Brand Name
  const [restaurantName, setRestaurantName] = useState('SmartDine Bistro');

  // Mode: 'all' (All venue tables 1 to venueTableCount) | 'range' (Custom range from A to B)
  const [selectionMode, setSelectionMode] = useState('all');

  // Strict Table Range State: 1 to venueTableCount
  const [tableStart, setTableStart] = useState(1);
  const [tableEnd, setTableEnd] = useState(() => venueTableCount);

  // Sync tableEnd when venueTableCount changes
  const prevVenueCountRef = useRef(venueTableCount);
  useEffect(() => {
    const prevCount = prevVenueCountRef.current;
    prevVenueCountRef.current = venueTableCount;

    if (selectionMode === 'all') {
      setTableStart(1);
      setTableEnd(venueTableCount);
    } else {
      setTableStart(prev => Math.max(1, Math.min(prev, venueTableCount)));
      setTableEnd(prev => {
        // If the user's range was already tracking the max (e.g. at 12), automatically expand to the new max (e.g. 13)
        if (prev >= prevCount) return venueTableCount;
        return Math.max(1, Math.min(prev, venueTableCount));
      });
    }
  }, [venueTableCount, selectionMode]);

  // Auto-resolved Server / Base URL
  const [baseUrl, setBaseUrl] = useState('');
  
  // Generation & Display States
  const [generatedCards, setGeneratedCards] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copiedTable, setCopiedTable] = useState(null);
  const [layoutMode, setLayoutMode] = useState('grid-2'); // 'grid-2' (2 columns) | 'grid-3' (3 columns)

  // Auto-detect Server URL silently in the background
  useEffect(() => {
    let defaultUrl = '';
    if (typeof window !== 'undefined') {
      const { protocol, hostname, port } = window.location;
      if (port === '5173') {
        defaultUrl = `${protocol}//${hostname}:3000`;
      } else {
        defaultUrl = window.location.origin;
      }
    }

    const fetchLanIp = async () => {
      try {
        const serverUrl = resolveServerUrl();
        const res = await fetch(`${serverUrl}/api/network`);
        if (res.ok) {
          const data = await res.json();
          if (data?.ip || data?.lanUrl) {
            const serverLan = data.lanUrl || `https://${data.ip}:${data.port || 3000}`;
            setBaseUrl(serverLan);
            return;
          }
        }
      } catch (_) {}
      setBaseUrl(defaultUrl || 'http://localhost:3000');
    };

    fetchLanIp();
  }, []);

  // Compute active range
  const effectiveRange = useMemo(() => {
    if (selectionMode === 'all') {
      return { start: 1, end: venueTableCount, count: venueTableCount };
    }
    const start = Math.max(1, Math.min(tableStart, venueTableCount));
    const end = Math.max(start, Math.min(tableEnd, venueTableCount));
    return { start, end, count: end - start + 1 };
  }, [selectionMode, tableStart, tableEnd, venueTableCount]);

  // Strict Input Handlers with Clamping
  const handleStartChange = (val) => {
    const raw = parseInt(val, 10);
    if (isNaN(raw)) {
      setTableStart(1);
      return;
    }
    const clamped = Math.max(1, Math.min(venueTableCount, raw));
    setTableStart(clamped);
    if (clamped > tableEnd) {
      setTableEnd(clamped);
    }
  };

  const handleEndChange = (val) => {
    const raw = parseInt(val, 10);
    if (isNaN(raw)) {
      setTableEnd(tableStart);
      return;
    }
    const clamped = Math.max(tableStart, Math.min(venueTableCount, raw));
    setTableEnd(clamped);
  };

  // Block non-digit keys on numeric inputs
  const handleKeyDown = (e) => {
    if (['e', 'E', '+', '-', '.'].includes(e.key)) {
      e.preventDefault();
    }
  };

  // Generate QR Codes
  const generateQRCodes = useCallback(async () => {
    if (!baseUrl) return;

    setIsGenerating(true);
    const { start, end } = effectiveRange;
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const cards = [];

    for (let tableNum = start; tableNum <= end; tableNum++) {
      const tableUrl = `${cleanBase}/?table=${tableNum}`;

      try {
        const qrDataUrl = await QRCode.toDataURL(tableUrl, {
          width: 360,
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
  }, [baseUrl, effectiveRange]);

  useEffect(() => {
    if (baseUrl) {
      generateQRCodes();
    }
  }, [baseUrl, generateQRCodes]);

  // Window Print
  const handlePrint = () => {
    window.print();
  };

  // Copy table URL
  const handleCopyUrl = (tableNum, url) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
      setCopiedTable(tableNum);
      setTimeout(() => setCopiedTable(null), 2500);
    }
  };

  // Download Single QR PNG
  const handleDownloadSinglePng = (tableNum, qrDataUrl) => {
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `table-${tableNum}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download every generated QR as a separate PNG (staggered to avoid browser download blocking)
  const handleDownloadAllPngs = async () => {
    const cards = generatedCards.filter((c) => c.qrDataUrl);
    for (let i = 0; i < cards.length; i++) {
      handleDownloadSinglePng(cards[i].tableNum, cards[i].qrDataUrl);
      if (i < cards.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
  };

  // Multi-page PDF Generator using jsPDF
  const handleDownloadPdf = async (startNum, endNum, modeName = 'range') => {
    const start = Math.max(1, Math.min(startNum, venueTableCount));
    const end = Math.max(start, Math.min(endNum, venueTableCount));
    const totalTables = end - start + 1;
    const cleanBase = (baseUrl || 'http://localhost:3000').replace(/\/+$/, '');

    setIsGeneratingPdf(true);

    try {
      // Portrait A4 (210mm x 297mm)
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const cardMap = new Map();
      generatedCards.forEach((c) => cardMap.set(c.tableNum, c));

      for (let i = 0; i < totalTables; i++) {
        const currentTable = start + i;

        if (i > 0) {
          doc.addPage();
        }

        let qrDataUrl = cardMap.get(currentTable)?.qrDataUrl;
        const tableUrl = `${cleanBase}/?table=${currentTable}`;

        if (!qrDataUrl) {
          qrDataUrl = await QRCode.toDataURL(tableUrl, {
            width: 600,
            margin: 1.5,
            color: {
              dark: '#0f172a',
              light: '#ffffff',
            },
            errorCorrectionLevel: 'H',
          });
        }

        // --- PAGE DESIGN (A4 Table Tent Card) ---
        // 1. Dotted Fold / Cut line
        doc.setDrawColor(203, 213, 225); // slate-300
        doc.setLineWidth(0.4);
        doc.setLineDashPattern([2, 2], 0);
        doc.roundedRect(14, 16, 182, 265, 4, 4, 'S');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text('-- TABLE TENT CUT / STAND GUIDE (A4 FORMAT) --', 105, 13, { align: 'center' });
        doc.text('-- CUT OR FOLD ALONG DOTTED PERIMETER --', 105, 286, { align: 'center' });

        doc.setLineDashPattern([], 0);

        // 2. Main Card Container
        doc.setDrawColor(15, 23, 42); // slate-900
        doc.setLineWidth(1.2);
        doc.roundedRect(18, 22, 174, 253, 5, 5, 'S');

        // 3. Header Banner
        doc.setFillColor(15, 23, 42);
        doc.roundedRect(18, 22, 174, 26, 5, 5, 'F');
        doc.rect(18, 42, 174, 6, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text((restaurantName || 'SmartDine Bistro').toUpperCase(), 105, 36, { align: 'center' });

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(245, 158, 11); // Amber
        doc.text('SMART CONTACTLESS DINE-IN ORDERING', 105, 44, { align: 'center' });

        // 4. Table Badge & Heading
        doc.setFillColor(245, 158, 11);
        doc.roundedRect(72, 54, 66, 9, 3, 3, 'F');
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('DINE-IN ORDERING', 105, 60, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(36);
        doc.setTextColor(15, 23, 42);
        doc.text(`TABLE ${currentTable}`, 105, 78, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text('No app required  •  Instant kitchen dispatch', 105, 86, { align: 'center' });

        // 5. QR Code Frame & High-Res Image
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.6);
        doc.roundedRect(55, 93, 100, 100, 4, 4, 'S');
        doc.addImage(qrDataUrl, 'PNG', 59, 97, 92, 92);

        // 6. Scan Instructions & Tagline
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(15, 23, 42);
        doc.text(DEFAULT_CARD_TAGLINE, 105, 206, { align: 'center', maxWidth: 155 });

        // Features Bar
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(28, 215, 154, 11, 3, 3, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        doc.text('Voice Notes Supported   •   Live Kitchen Sync   •   Call Waiter', 105, 222.5, { align: 'center' });

        // 7. Direct URL Footnote
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(30, 238, 180, 238);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text('Direct browser address / Wi-Fi ordering:', 105, 245, { align: 'center' });

        doc.setFont('courier', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        doc.text(tableUrl, 105, 252, { align: 'center', maxWidth: 160 });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text('Powered by SmartDine Local-First Restaurant Automation System', 105, 266, { align: 'center' });
      }

      const fileName = modeName === 'all'
        ? `smartdine-all-tables-1-${venueTableCount}.pdf`
        : `smartdine-tables-${start}-to-${end}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert(`Error generating PDF: ${err.message || 'Unknown error'}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Dynamic Primary Button Click Handler
  const handleDynamicDownloadPdf = () => {
    if (selectionMode === 'all') {
      handleDownloadPdf(1, venueTableCount, 'all');
    } else {
      handleDownloadPdf(tableStart, tableEnd, 'range');
    }
  };

  return (
    <div className={`qr-generator space-y-6 ${className}`}>
      
      {/* =========================================================================
          MINIMAL, SINGLE-CARD DARK MODE CONFIGURATION PANEL (Hidden during print)
          Matches exact design: #0F141C background, #18202C surface, #F59E0B accent
          ========================================================================= */}
      <div 
        className="admin-enter no-print rounded-3xl border border-[#222F3E] p-5 sm:p-6 shadow-2xl space-y-5 text-[#f8fafc]"
        style={{ backgroundColor: '#0F141C' }}
      >
        
        {/* ROW 1: HEADER ROW */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#1E293B]">
          
          {/* Left: QR Icon + Title (No subtitle, no scope badge) */}
          <div className="flex items-center gap-3">
            <div 
              className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg shrink-0"
              style={{ 
                backgroundColor: '#F59E0B',
                boxShadow: '0 8px 20px -4px rgba(245, 158, 11, 0.35)'
              }}
            >
              <QrCode className="w-6 h-6 text-[#0F141C]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Table QR Code Generator
            </h2>
          </div>

          {/* Right: Secondary button "Print Stickers" (outline) & Dynamic Primary button "Download PDF" (solid orange) */}
          <div className="flex items-center gap-3 self-start sm:self-auto">
            
            {/* Secondary Button: Print Stickers */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={generatedCards.length === 0}
              className="px-4 py-2.5 rounded-2xl border border-[#2A384C] hover:bg-[#18202C] active:scale-95 text-slate-200 text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-2 shadow-xs"
              style={{ backgroundColor: '#18202C' }}
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span>Print Stickers</span>
            </button>

            {/* Secondary: Download every QR as a PNG file */}
            <button
              type="button"
              onClick={handleDownloadAllPngs}
              disabled={isGeneratingPdf || generatedCards.length === 0}
              className="px-5 py-2.5 rounded-2xl active:scale-95 text-[#f8fafc] text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-2 border border-[#2A384C] hover:border-[#F59E0B] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#18202C' }}
            >
              <Download className="w-4 h-4 text-slate-400" />
              <span>Download PNGs</span>
            </button>

            {/* Dynamic Primary Button: Download PDF (Solid orange) */}
            <button
              type="button"
              onClick={handleDynamicDownloadPdf}
              disabled={isGeneratingPdf || generatedCards.length === 0}
              className="px-5 py-2.5 rounded-2xl active:scale-95 text-[#0F141C] text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-2 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: '#F59E0B',
                boxShadow: '0 8px 24px -4px rgba(245, 158, 11, 0.4)'
              }}
            >
              {isGeneratingPdf ? (
                <RefreshCw className="w-4 h-4 text-[#0F141C] animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-[#0F141C]" />
              )}
              <span>{isGeneratingPdf ? 'Building PDF...' : 'Download PDF'}</span>
            </button>

          </div>
        </div>

        {/* ROW 2: CONTROLS ROW (3-column grid) */}
        <div className="pt-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 items-start">
            
            {/* Column 1: Restaurant Brand Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Restaurant Brand Name
              </label>
              <input
                type="text"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                placeholder="SmartDine Bistro"
                className="w-full text-[#f8fafc] border border-[#2A384C] rounded-2xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#F59E0B] transition placeholder-slate-500"
                style={{ backgroundColor: '#18202C' }}
              />
            </div>

            {/* Column 2: Table Scope Toggle (All vs Custom Range) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Table Scope
              </label>

              {/* Segmented Toggle */}
              <div 
                className="inline-flex w-full p-1 rounded-2xl border border-[#2A384C]"
                style={{ backgroundColor: '#18202C' }}
              >
                <button
                  type="button"
                  onClick={() => setSelectionMode('all')}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                    selectionMode === 'all'
                      ? 'text-white font-black shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  style={selectionMode === 'all' ? {
                    backgroundColor: '#0F141C',
                    border: '1px solid rgba(245, 158, 11, 0.6)',
                    boxShadow: '0 0 12px -2px rgba(245, 158, 11, 0.25)'
                  } : {}}
                >
                  All Tables (1–{venueTableCount})
                </button>

                <button
                  type="button"
                  onClick={() => setSelectionMode('range')}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                    selectionMode === 'range'
                      ? 'text-white font-black shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  style={selectionMode === 'range' ? {
                    backgroundColor: '#0F141C',
                    border: '1px solid rgba(245, 158, 11, 0.6)',
                    boxShadow: '0 0 12px -2px rgba(245, 158, 11, 0.25)'
                  } : {}}
                >
                  Custom Range
                </button>
              </div>

              {/* Compact inline From / To inputs (Only shown when Custom Range is active, no status confirmation box) */}
              {selectionMode === 'range' && (
                <div className="flex items-center gap-2 mt-2.5 pt-0.5 animate-fadeIn">
                  <span className="text-[11px] font-bold text-slate-400">From</span>
                  <input
                    type="number"
                    min="1"
                    max={venueTableCount}
                    value={tableStart}
                    onKeyDown={handleKeyDown}
                    onChange={(e) => handleStartChange(e.target.value)}
                    className="w-16 text-center text-xs font-bold text-[#f8fafc] border border-[#2A384C] rounded-xl py-1.5 focus:outline-none focus:border-[#F59E0B]"
                    style={{ backgroundColor: '#18202C' }}
                  />
                  <span className="text-[11px] font-bold text-slate-400">to</span>
                  <input
                    type="number"
                    min={tableStart}
                    max={venueTableCount}
                    value={tableEnd}
                    onKeyDown={handleKeyDown}
                    onChange={(e) => handleEndChange(e.target.value)}
                    className="w-16 text-center text-xs font-bold text-[#f8fafc] border border-[#2A384C] rounded-xl py-1.5 focus:outline-none focus:border-[#F59E0B]"
                    style={{ backgroundColor: '#18202C' }}
                  />
                  <span className="text-[11px] text-slate-500 font-medium">
                    (1 to {venueTableCount})
                  </span>
                </div>
              )}
              <p className="mt-2.5 text-[11px] text-slate-400 font-medium">
                {generatedCards.length} sticker{generatedCards.length === 1 ? '' : 's'} ready &bull; prints on A4
              </p>
            </div>

            {/* Column 3: Print Layout */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Print Card Layout
              </label>
              <div className="relative">
                <select
                  value={layoutMode}
                  onChange={(e) => setLayoutMode(e.target.value)}
                  className="w-full appearance-none text-[#f8fafc] border border-[#2A384C] rounded-2xl px-4 py-2.5 pr-9 text-xs font-semibold focus:outline-none focus:border-[#F59E0B] cursor-pointer"
                  style={{ backgroundColor: '#18202C' }}
                >
                  <option value="grid-2">2 Columns (Standard Table Tents)</option>
                  <option value="grid-3">3 Columns (Compact Stickers)</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* =========================================================================
          PRINTABLE & PREVIEW GRID
          ========================================================================= */}
      <div>
        
        {/* On-Screen Preview Bar (Hidden during print) */}
        <div className="no-print flex items-center justify-between pb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Live Preview &bull; {generatedCards.length} Cards (Table {effectiveRange.start} to {effectiveRange.end})
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-[#18202C] border border-[#2A384C] text-[11px] font-mono text-[#f8fafc]">Ctrl/Cmd + P</kbd> or click Print
          </span>
        </div>

        {/* Printable Grid Container */}
        <div
          data-layout={layoutMode}
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
                className="qr-sticker-card bg-white text-slate-900 rounded-3xl border-2 border-neutral-900/90 p-6 text-center shadow-lg flex flex-col items-center justify-between relative transition-all hover:shadow-xl break-inside-avoid"
              >
                {/* Card Top Brand & Badge */}
                <div className="w-full flex items-center justify-between border-b-2 border-neutral-900 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-neutral-900 text-amber-400 flex items-center justify-center font-bold">
                      <UtensilsCrossed className="w-4 h-4" />
                    </div>
                    <span className="font-black text-neutral-900 text-sm tracking-tight text-left leading-tight">
                      {restaurantName || 'SmartDine'}
                    </span>
                  </div>

                  {/* Table Badge */}
                  <div className="px-3 py-1 rounded-xl bg-neutral-900 text-white font-black text-xs tracking-wider uppercase">
                    Table {card.tableNum}
                  </div>
                </div>

                {/* Table Title Heading */}
                <div className="qr-table-title text-2xl sm:text-3xl font-black text-neutral-900 uppercase tracking-tight mb-2">
                  TABLE {card.tableNum}
                </div>

                {/* QR Code Container */}
                <div className="p-3 bg-white rounded-2xl border-2 border-neutral-200 shadow-sm my-1">
                  <img
                    src={card.qrDataUrl}
                    alt={`QR Code for Table ${card.tableNum}`}
                    className="w-44 h-44 sm:w-48 sm:h-48 object-contain mx-auto"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>

                {/* Instructions / Voice Note Tagline */}
                <div className="qr-instructions mt-3 max-w-xs">
                  <p className="text-xs sm:text-sm font-bold text-neutral-800 leading-snug">
                    {DEFAULT_CARD_TAGLINE}
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 text-[11px] font-bold border border-neutral-200">
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
                    className="px-2.5 py-1 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-300 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                    title="Copy table direct URL"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-neutral-500" />}
                    <span>{isCopied ? 'Copied' : 'Copy URL'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadPdf(card.tableNum, card.tableNum, `single-${card.tableNum}`)}
                    className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-sm"
                    title="Download A4 PDF tent card for this table"
                  >
                    <Download className="w-3.5 h-3.5 text-white" />
                    <span>PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadSinglePng(card.tableNum, card.qrDataUrl)}
                    className="px-2.5 py-1 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-300 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                    title="Download PNG for this table"
                  >
                    <Download className="w-3.5 h-3.5 text-neutral-500" />
                    <span>PNG</span>
                  </button>

                  <a
                    href={card.tableUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2 py-1 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900 border border-neutral-300 text-xs transition flex items-center justify-center"
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
