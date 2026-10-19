import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Sparkles, 
  Mic, 
  UtensilsCrossed, 
  Layers,
  ArrowRight,
  FileText,
  ShieldCheck,
  AlertCircle,
  Plus,
  Minus
} from 'lucide-react';
import { resolveServerUrl } from '../context/SocketContext';
import { useRestaurant } from '../context/RestaurantContext';
import '../styles/admin.css';

const DEFAULT_CARD_TAGLINE = 'Scan to order from your phone & leave voice notes!';

export default function QRBatchGenerator({ 
  className = '', 
  tableCount: propTableCount, 
  tables: propTables 
}) {
  const restaurantCtx = useRestaurant ? useRestaurant() : null;

  // 1. Strictly determine venue assigned table count
  const venueTableCount = useMemo(() => {
    if (typeof propTableCount === 'number' && propTableCount > 0) return propTableCount;
    if (Array.isArray(propTables) && propTables.length > 0) return propTables.length;
    if (typeof restaurantCtx?.tableCount === 'number' && restaurantCtx.tableCount > 0) return restaurantCtx.tableCount;
    if (Array.isArray(restaurantCtx?.tables) && restaurantCtx.tables.length > 0) return restaurantCtx.tables.length;
    return 12;
  }, [propTableCount, propTables, restaurantCtx?.tableCount, restaurantCtx?.tables]);

  // Restaurant Branding
  const [restaurantName, setRestaurantName] = useState('SmartDine Bistro');

  // Mode: 'all' (All venue tables 1 to venueTableCount) | 'range' (Custom range from A to B)
  const [selectionMode, setSelectionMode] = useState('all');

  // Strict Table Range State: 1 to venueTableCount
  const [tableStart, setTableStart] = useState(1);
  const [tableEnd, setTableEnd] = useState(() => venueTableCount);

  // Keep tableEnd synced when venueTableCount changes
  useEffect(() => {
    if (selectionMode === 'all') {
      setTableStart(1);
      setTableEnd(venueTableCount);
    } else {
      setTableStart(prev => Math.max(1, Math.min(prev, venueTableCount)));
      setTableEnd(prev => Math.max(1, Math.min(prev, venueTableCount)));
    }
  }, [venueTableCount, selectionMode]);

  // Auto-resolved Server / Base URL
  const [baseUrl, setBaseUrl] = useState('');
  
  // Generation & Display States
  const [generatedCards, setGeneratedCards] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(null);
  const [copiedTable, setCopiedTable] = useState(null);
  const [layoutMode, setLayoutMode] = useState('grid-2'); // 'grid-2' (2 columns) | 'grid-3' (3 columns)

  // Auto-detect Server URL (no manual input clutter needed)
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

  // Compute active range based on mode
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

  // Multi-page PDF Generator using jsPDF
  const handleDownloadPdf = async (startNum, endNum, modeName = 'range') => {
    const start = Math.max(1, Math.min(startNum, venueTableCount));
    const end = Math.max(start, Math.min(endNum, venueTableCount));
    const totalTables = end - start + 1;
    const cleanBase = (baseUrl || 'http://localhost:3000').replace(/\/+$/, '');

    setIsGeneratingPdf(true);
    setPdfProgress({ current: 0, total: totalTables, mode: modeName });

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
        setPdfProgress({ current: i + 1, total: totalTables, mode: modeName });

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
      setPdfProgress(null);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      
      {/* =========================================================================
          SIMPLIFIED, FOCUSED CONFIGURATION PANEL (Hidden during print)
          ========================================================================= */}
      <div className="admin-enter no-print bg-[#111827] rounded-3xl border border-[#334155] p-5 sm:p-6 shadow-xl space-y-6 text-[#f8fafc]">
        
        {/* Top Header & Fast Action Strip */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#334155]">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-[#f8fafc] tracking-tight">
                    Table QR Code Generator
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Venue Scope: Tables 1 to {venueTableCount}</span>
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  Generate crisp, printable table tent cards and multi-page PDF documents for guest self-ordering.
                </p>
              </div>
            </div>
          </div>

          {/* 2 MAIN PDF DOWNLOAD OPTIONS & PRINT STICKERS */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* OPTION 1: Download All Tables PDF */}
            <button
              type="button"
              onClick={() => handleDownloadPdf(1, venueTableCount, 'all')}
              disabled={isGeneratingPdf}
              title={`Download full PDF containing Table 1 to ${venueTableCount}`}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-2 shadow-lg shadow-amber-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isGeneratingPdf && pdfProgress?.mode === 'all' ? (
                <RefreshCw className="w-4 h-4 text-white animate-spin" />
              ) : (
                <FileText className="w-4 h-4 text-white" />
              )}
              <span>
                {isGeneratingPdf && pdfProgress?.mode === 'all'
                  ? `Building PDF (${pdfProgress.current}/${pdfProgress.total})...`
                  : `Download All Tables PDF (1 - ${venueTableCount})`}
              </span>
            </button>

            {/* OPTION 2: Download Selected Range PDF */}
            <button
              type="button"
              onClick={() => handleDownloadPdf(tableStart, tableEnd, 'range')}
              disabled={isGeneratingPdf}
              title={`Download PDF for selected range (Table ${tableStart} to ${tableEnd})`}
              className="px-4 py-2.5 rounded-2xl border border-[#334155] bg-[#1e293b] hover:bg-[#334155] active:scale-95 text-[#f8fafc] text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isGeneratingPdf && pdfProgress?.mode === 'range' ? (
                <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-amber-400" />
              )}
              <span>
                {isGeneratingPdf && pdfProgress?.mode === 'range'
                  ? `Building PDF (${pdfProgress.current}/${pdfProgress.total})...`
                  : `Download Range PDF (${tableStart} - ${tableEnd})`}
              </span>
            </button>

            {/* Print QR Stickers via Browser */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={generatedCards.length === 0}
              className="px-3.5 py-2.5 rounded-2xl border border-[#334155] bg-[#0f172a] hover:bg-[#1e293b] active:scale-95 text-slate-300 hover:text-white text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
              title="Open standard browser print dialog"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span>Print Stickers</span>
            </button>
          </div>
        </div>

        {/* 2 SELECTION MODES: ALL TABLES VS SPECIFIC RANGE */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Select Output Scope:
            </span>

            {/* Mode Switcher */}
            <div className="inline-flex p-1 rounded-2xl bg-[#0b1120] border border-[#334155] self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setSelectionMode('all')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectionMode === 'all'
                    ? 'bg-amber-500 text-white shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Tables (1 – {venueTableCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectionMode('range')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectionMode === 'range'
                    ? 'bg-amber-500 text-white shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Custom Range (From – To)
              </button>
            </div>
          </div>

          {/* RANGE CONTROLS ROW (Strict logic: only 1 to assigned max table) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0f172a] border border-[#334155] grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            
            {/* Restaurant Name Input (Left 4 cols) */}
            <div className="md:col-span-4">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Restaurant Brand Name
              </label>
              <input
                type="text"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                placeholder="SmartDine Bistro"
                className="w-full bg-[#1e293b] text-[#f8fafc] border border-[#334155] rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            {/* Table Selection Controls (Middle 5 cols) */}
            <div className="md:col-span-5">
              {selectionMode === 'all' ? (
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#1e293b]/70 border border-[#334155]">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 font-black" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-[#f8fafc]">
                      All {venueTableCount} Assigned Tables Included
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Generating cards for Table 1 through Table {venueTableCount}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Specify Range (Strictly 1 to {venueTableCount})
                    </span>
                    <span className="text-[11px] text-amber-400 font-bold">
                      {effectiveRange.count} {effectiveRange.count === 1 ? 'Table' : 'Tables'} Selected
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Table Start Stepper */}
                    <div className="flex-1 flex items-center bg-[#1e293b] border border-[#334155] rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleStartChange(tableStart - 1)}
                        disabled={tableStart <= 1}
                        className="p-2 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer transition"
                        title="Decrement start table"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={venueTableCount}
                        value={tableStart}
                        onKeyDown={handleKeyDown}
                        onChange={(e) => handleStartChange(e.target.value)}
                        className="w-full bg-transparent text-center text-xs font-black text-[#f8fafc] focus:outline-none py-1.5"
                      />
                      <button
                        type="button"
                        onClick={() => handleStartChange(tableStart + 1)}
                        disabled={tableStart >= venueTableCount || tableStart >= tableEnd}
                        className="p-2 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer transition"
                        title="Increment start table"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="text-xs font-bold text-slate-500">to</span>

                    {/* Table End Stepper */}
                    <div className="flex-1 flex items-center bg-[#1e293b] border border-[#334155] rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleEndChange(tableEnd - 1)}
                        disabled={tableEnd <= tableStart}
                        className="p-2 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer transition"
                        title="Decrement end table"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min={tableStart}
                        max={venueTableCount}
                        value={tableEnd}
                        onKeyDown={handleKeyDown}
                        onChange={(e) => handleEndChange(e.target.value)}
                        className="w-full bg-transparent text-center text-xs font-black text-[#f8fafc] focus:outline-none py-1.5"
                      />
                      <button
                        type="button"
                        onClick={() => handleEndChange(tableEnd + 1)}
                        disabled={tableEnd >= venueTableCount}
                        className="p-2 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer transition"
                        title="Increment end table"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Chips Strictly within Assigned Tables */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setTableStart(1);
                        setTableEnd(Math.ceil(venueTableCount / 2));
                      }}
                      className="px-2 py-0.5 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-[10px] font-bold text-slate-300 border border-[#334155] transition cursor-pointer"
                    >
                      Tables 1 - {Math.ceil(venueTableCount / 2)}
                    </button>
                    {venueTableCount > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          setTableStart(Math.ceil(venueTableCount / 2) + 1);
                          setTableEnd(venueTableCount);
                        }}
                        className="px-2 py-0.5 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-[10px] font-bold text-slate-300 border border-[#334155] transition cursor-pointer"
                      >
                        Tables {Math.ceil(venueTableCount / 2) + 1} - {venueTableCount}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setTableStart(1);
                        setTableEnd(venueTableCount);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-[10px] font-bold text-amber-300 border border-[#334155] transition cursor-pointer"
                    >
                      All (1 - {venueTableCount})
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Layout Mode Selector (Right 3 cols) */}
            <div className="md:col-span-3">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Print Card Layout
              </label>
              <select
                value={layoutMode}
                onChange={(e) => setLayoutMode(e.target.value)}
                className="w-full bg-[#1e293b] text-[#f8fafc] border border-[#334155] rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="grid-2">2 Columns (Standard Table Tents)</option>
                <option value="grid-3">3 Columns (Compact Stickers)</option>
              </select>
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
            Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-[#1e293b] border border-[#334155] text-[11px] font-mono text-[#f8fafc]">Ctrl/Cmd + P</kbd> or click Print
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
                    <FileText className="w-3.5 h-3.5 text-white" />
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
