import React, { useState } from 'react';
import {
  Smartphone,
  Tablet,
  Monitor,
  RotateCcw,
  ExternalLink,
  Sparkles,
  Info,
  CheckCircle2,
  Zap,
  Send,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import { REALISTIC_CUSTOMER_ISSUES } from './CustomerReportsModule';
import { useRestaurant } from '../../context/RestaurantContext';

/**
 * CustomerSimulatorModule Component
 * 
 * Embedded live diner preview environment allowing the Admin to inspect
 * and test the digital menu, order flow, two-way staff dispatch messaging,
 * and realistic restaurant issues across all tables.
 */
export default function CustomerSimulatorModule({ className = '' }) {
  const [selectedTable, setSelectedTable] = useState(1);
  const [deviceMode, setDeviceMode] = useState('mobile'); // 'mobile' | 'tablet' | 'desktop'
  const [key, setKey] = useState(0);
  const [testMessageText, setTestMessageText] = useState('We are on our way to your table right now!');
  const [feedback, setFeedback] = useState(null);

  let restaurant = null;
  try {
    restaurant = useRestaurant();
  } catch (_) {}

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

  // Simulate a realistic customer dining issue for currently previewed table
  const handleSimulateIssue = (issueId) => {
    const issue = REALISTIC_CUSTOMER_ISSUES.find(i => i.id === issueId) || REALISTIC_CUSTOMER_ISSUES[0];
    const now = Date.now();
    const assignedStaff = restaurant?.getAssignedEmployeeForTable?.(selectedTable);

    const customizedNote = issue.note.replace(/Table #\d+/, `Table #${selectedTable}`);
    const newReport = {
      id: `rep-${now}-${Math.random().toString(36).substr(2, 4)}`,
      table: selectedTable,
      customerName: issue.customerName || `Guest (Table #${selectedTable})`,
      note: customizedNote,
      severity: issue.severity,
      status: 'new',
      createdAt: now,
      staffId: assignedStaff?.id || 'emp-1',
      dispatch: {
        staffId: assignedStaff?.id || 'emp-1',
        note: `Auto-routed to ${assignedStaff?.name || 'Floor Staff'}`
      },
      resolvedAt: null,
      resolutionTime: null,
      resolutionNote: null,
      messages: []
    };

    // 1. Save report to localStorage
    try {
      ['smartdine_customer_reports_v4', 'smartdine_customer_reports_v3'].forEach(k => {
        const raw = localStorage.getItem(k);
        const list = raw ? JSON.parse(raw) : [];
        if (Array.isArray(list)) {
          localStorage.setItem(k, JSON.stringify([newReport, ...list]));
        }
      });
      window.dispatchEvent(new CustomEvent('smartdine:report_updated', { detail: { reports: [newReport] } }));
    } catch (_) {}

    // 2. Register assistance call in RestaurantContext
    if (restaurant?.registerAssistanceCall) {
      restaurant.registerAssistanceCall({
        id: `call-${now}`,
        tableNumber: selectedTable,
        table_number: selectedTable,
        table: selectedTable,
        reason: `${issue.shortLabel}: ${customizedNote}`,
        type: issue.id,
        customMessage: customizedNote,
        timestamp: now
      });
    }

    // 3. Broadcast across tabs
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('smartdine_restaurant_state');
        bc.postMessage({
          type: 'NEW_CUSTOMER_REPORT',
          data: newReport,
          timestamp: now
        });
        bc.close();
      }
    } catch (_) {}

    setFeedback(`✓ Simulated ${issue.title} on Table #${selectedTable}`);
    setTimeout(() => setFeedback(null), 4000);
  };

  // Dispatch text message to customer sitting at currently previewed table
  const handleSendTestStaffMessage = (customMsgText) => {
    const text = (customMsgText || testMessageText).trim();
    if (!text) return;

    const now = Date.now();
    const assignedStaff = restaurant?.getAssignedEmployeeForTable?.(selectedTable);
    const tableMsgPayload = {
      id: `msg-${now}-${Math.random().toString(36).substr(2, 4)}`,
      table: selectedTable,
      text,
      from: assignedStaff ? `Staff (${assignedStaff.name})` : 'Floor Management',
      staffName: assignedStaff?.name || 'Floor Management',
      staffId: assignedStaff?.id || 'emp-1',
      sentAt: now,
      reportId: null,
      unread: true
    };

    try {
      localStorage.setItem(`smartdine_table_msg_${selectedTable}`, JSON.stringify(tableMsgPayload));
      const histKey = `smartdine_table_msgs_${selectedTable}`;
      const rawHist = localStorage.getItem(histKey);
      const histList = rawHist ? JSON.parse(rawHist) : [];
      if (Array.isArray(histList)) {
        histList.push(tableMsgPayload);
        localStorage.setItem(histKey, JSON.stringify(histList.slice(-20)));
      }
    } catch (_) {}

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('smartdine_restaurant_state');
        bc.postMessage({
          type: 'CUSTOMER_MESSAGE',
          data: tableMsgPayload,
          timestamp: now
        });
        bc.close();
      }
    } catch (_) {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('smartdine:table_message', { detail: tableMsgPayload }));
    }

    setFeedback(`✓ Staff message sent to Table #${selectedTable}`);
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. CONTROLS HEADER */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Info */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
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
              Test dishes, order cart, customer call button live from the diner's view.
            </p>
          </div>
        </div>

        {/* Center: Table Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Active Table:</span>
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(Number(e.target.value))}
            className="px-3 py-1.5 rounded-xl text-xs font-black border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
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
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
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
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
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
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
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
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
            title="Open in standalone tab"
          >
            <span>Pop Out</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* 2. REALISTIC TESTING & TWO-WAY DISPATCH SIMULATOR TOOLBAR */}
      <div className="bg-[#111726]/90 border border-slate-800 rounded-2xl p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-slate-100 backdrop-blur-md">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-black text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-xl">
            <Zap className="w-3.5 h-3.5 animate-pulse" />
            <span>Simulate Customer Request (Table #{selectedTable}):</span>
          </div>
          {REALISTIC_CUSTOMER_ISSUES.map((issue) => (
            <button
              key={issue.id}
              type="button"
              onClick={() => handleSimulateIssue(issue.id)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#0b0f19] hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/40 text-slate-200 hover:text-white transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-xs"
              title={`Simulate ${issue.title} for Table #${selectedTable}`}
            >
              <span>{issue.icon}</span>
              <span>{issue.shortLabel}</span>
            </button>
          ))}
        </div>

        {/* Text Customer Test Dispatcher */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={testMessageText}
            onChange={(e) => setTestMessageText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendTestStaffMessage()}
            placeholder={`Message Table #${selectedTable} diner...`}
            className="w-56 px-3 py-1.5 text-xs rounded-xl bg-[#0b0f19] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
          <button
            type="button"
            onClick={() => handleSendTestStaffMessage()}
            className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0 shadow-xs"
            title={`Send real-time staff message to Table #${selectedTable}`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Text Diner</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* 3. DEVICE FRAME CANVAS */}
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
