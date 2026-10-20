import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BellRing,
  Radio,
  Sparkles,
  Smartphone,
  Layers,
  Zap,
  Info,
  Maximize2,
  ExternalLink,
  Sliders,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  UserCheck
} from 'lucide-react';

// Subagent 2: View A (Waiter Login & Authentication Screen)
import DineSyncLoginScreen from './waiter/DineSyncLoginScreen';

// Subagent 3: View B Header & Assigned Tables Monitor
import DineSyncHeaderAndTables from './waiter/DineSyncHeaderAndTables';

// Subagent 4: View B Section 2 Header & Card 1 (Critical Customer Call)
import DineSyncCriticalTaskCard from './waiter/DineSyncCriticalTaskCard';

// Subagent 5: View B Card 2 (Admin Direct Chat) & Card 3 (Customization Call)
import DineSyncAdminAndCustomCards from './waiter/DineSyncAdminAndCustomCards';

// Subagent 6: View B Handheld Footer Navigation Bar
import DineSyncFooterNav from './waiter/DineSyncFooterNav';

// Subagent 8: Physical Vibration & Web Audio Synthesizer Engine
import vibrationHapticService, {
  vibrateCriticalCall,
  vibrateAdminMessage,
  vibrateTaskResolved,
  vibrateNavigationTap,
  playCustomerCallChime
} from '../services/vibrationHapticService';

/**
 * Modern Flagship Smartphone Device Chassis Frame Component
 * Implements physical titanium rails, CNC chamfer edges, hardware volume/power buttons,
 * dynamic island with dual camera/sensor lenses, speaker micro-slit, and 45-degree glass sheen.
 */
function ModernFlagshipPhoneFrame({
  children,
  ambientGlow = 'amber', // 'amber' | 'emerald' | 'blue'
  className = '',
  timeString = '9:41'
}) {
  const glowStyles = {
    amber: 'shadow-[0_30px_90px_-20px_rgba(0,0,0,0.95),0_0_60px_rgba(245,158,11,0.16)] ring-amber-500/20',
    emerald: 'shadow-[0_30px_90px_-20px_rgba(0,0,0,0.95),0_0_60px_rgba(16,185,129,0.16)] ring-emerald-500/20',
    blue: 'shadow-[0_30px_90px_-20px_rgba(0,0,0,0.95),0_0_60px_rgba(59,130,246,0.16)] ring-blue-500/20'
  };

  return (
    <div className={`relative w-full max-w-[395px] mx-auto select-none group ${className}`}>
      {/* Outer Titanium Chassis & Hardware Side Buttons */}
      <div
        className={`relative rounded-[50px] p-[10px] bg-gradient-to-b from-[#1E293B] via-[#0F172A] to-[#0A0D14] ring-1 ring-white/15 border border-white/[0.08] transition-all duration-300 ${
          glowStyles[ambientGlow] || glowStyles.amber
        }`}
      >
        {/* Physical Left Side Buttons: Volume Up & Down */}
        <div
          className="absolute -left-[5px] top-28 w-[4px] h-10 bg-gradient-to-r from-slate-600 to-slate-800 rounded-l-md border-l border-white/20 shadow-md"
          aria-hidden="true"
        />
        <div
          className="absolute -left-[5px] top-42 w-[4px] h-10 bg-gradient-to-r from-slate-600 to-slate-800 rounded-l-md border-l border-white/20 shadow-md"
          aria-hidden="true"
        />

        {/* Physical Right Side Button: Power / Lock Switch */}
        <div
          className="absolute -right-[5px] top-32 w-[4px] h-14 bg-gradient-to-l from-slate-600 to-slate-800 rounded-r-md border-r border-white/20 shadow-md"
          aria-hidden="true"
        />

        {/* Inner OLED Glass Bezel */}
        <div className="relative rounded-[42px] bg-[#080B10] border border-white/[0.05] overflow-hidden flex flex-col justify-between min-h-[670px] shadow-inner">
          {/* Top Hardware Bezel with Ear Speaker Micro-Slit */}
          <div className="pt-2 px-6 flex items-center justify-between text-slate-400 font-mono text-[11px] select-none bg-[#080B10] z-30">
            {/* Clock */}
            <span className="font-semibold tracking-tight text-slate-300 text-[12px]">
              {timeString}
            </span>

            {/* Dynamic Island Capsule */}
            <div className="h-5 px-3 bg-black rounded-full border border-white/[0.06] flex items-center gap-2 mx-auto shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-[#111827] ring-1 ring-[#1f2937] flex items-center justify-center">
                <span className="w-1 h-1 rounded-full bg-blue-500/40" />
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#1a2233]" />
            </div>

            {/* Signal & Battery Indicator */}
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="font-bold text-slate-400">5G</span>
              <div className="w-4.5 h-2.5 rounded-[3px] border border-slate-400 p-[1.5px] flex items-center">
                <div className="w-full h-full bg-emerald-400 rounded-2xs" />
              </div>
            </div>
          </div>

          {/* Screen Content Viewport */}
          <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
            {children}
          </div>

          {/* 45-Degree Diagonal Screen Glass Sheen */}
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.025] to-transparent z-20"
            aria-hidden="true"
          />

          {/* Gesture Home Indicator Bar */}
          <div className="pt-1 pb-2 flex justify-center items-center pointer-events-none z-30 bg-[#080B10]/80 backdrop-blur-xs">
            <div
              className="w-32 h-1 bg-white/25 rounded-full transition-all duration-200"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      {/* Desk Base Ambient Glow Drop Reflection */}
      <div
        className={`pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-10 rounded-full blur-2xl opacity-60 transition-opacity ${
          ambientGlow === 'amber'
            ? 'bg-amber-500/30'
            : ambientGlow === 'emerald'
            ? 'bg-emerald-500/30'
            : 'bg-blue-500/30'
        }`}
        aria-hidden="true"
      />
    </div>
  );
}

/**
 * DineSync Staff: 16:9 Widescreen Double-Mobile Layout & Handheld Blueprint
 *
 * Requirements:
 * 1. Two modern flagship smartphones displayed side-by-side on an obsidian minimalist desk (#080B10 to #131A26)
 *    with soft ambient neon backlighting.
 * 2. Left Smartphone renders VIEW A (Waiter Login & Authentication Screen) built by Subagent 2.
 * 3. Right Smartphone renders VIEW B (Active Personal Dashboard for Waiter "Alex M.") combining Subagents 3, 4, 5, 6.
 * 4. Top header has mode switcher: [ 📱 16:9 Double-Mobile Layout ] and [ 📲 Handheld Mobile View ], plus [ Test Vibration Pulse ].
 * 5. Ensure responsiveness: on wide screens it displays the dual 16:9 mockup; on narrow mobile screens it smoothly shows the single focused handheld screen.
 * 6. Zero syntax errors and robust Vite compilation.
 */
export default function DineSyncStaffBlueprint({ onSwitchToLegacy }) {
  // Mode: 'blueprint' (16:9 side-by-side double mobile) vs 'handheld' (single mobile)
  const [displayMode, setDisplayMode] = useState('blueprint');
  const [activeHandheldView, setActiveHandheldView] = useState('dashboard'); // 'login' | 'dashboard'

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState(null);

  // Authenticated Waiter State
  const [activeWaiter, setActiveWaiter] = useState(() => ({
    name: 'Alex M.',
    staffId: 'Staff #042',
    accountCode: 'WAIT-104',
    numericId: 42,
    initials: 'AM',
    role: 'Floor Specialist',
    shift: 'Live Dinner Shift (17:00 - 01:00)',
    tables: [1, 3, 4]
  }));

  // Table Status & Task States for View B
  const [table1Status, setTable1Status] = useState('pending'); // 'pending' | 'attending' | 'resolved'
  const [table3Status, setTable3Status] = useState('pending');
  const [activeTab, setActiveTab] = useState('tasks');
  const [vibrationPulseActive, setVibrationPulseActive] = useState(false);

  // Helper: Trigger Toast Notification
  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3600);
  }, []);

  // Handler: Top Header [ Test Vibration Pulse ]
  const handleTestVibrationPulse = () => {
    setVibrationPulseActive(true);
    vibrateCriticalCall();
    playCustomerCallChime(830.6, 1.2);
    showToast('Haptic Vibration Pulse Emitted: [300ms, 100ms, 300ms, 100ms, 400ms]');
    setTimeout(() => setVibrationPulseActive(false), 1400);
  };

  // Handler: Login Success from View A
  const handleLoginSuccess = (waiter) => {
    if (waiter) {
      setActiveWaiter(prev => ({
        ...prev,
        ...waiter,
        staffId: waiter.staffId || 'Staff #042'
      }));
    }
    vibrateTaskResolved();
    showToast(`Shift Verified! Welcome, ${waiter?.name || 'Alex M.'} (Active on Floor)`);
    if (displayMode === 'handheld') {
      setActiveHandheldView('dashboard');
    }
  };

  // Handler: Forgot Password in View A
  const handleForgotPassword = () => {
    vibrateNavigationTap();
    showToast('Password recovery token dispatched to Shift Manager desk.');
  };

  // Handler: Go to Table
  const handleGoToTable = (tableNum) => {
    vibrateNavigationTap();
    showToast(`Navigating to Table #${tableNum}... Notification acknowledged.`);
  };

  // Handler: Resolve Card 1
  const handleResolveCard1 = () => {
    vibrateTaskResolved();
    setTable1Status('resolved');
    showToast('Table 1 Call marked as Resolved! Admin notified.');
  };

  // Handler: Table Capsule click in Header
  const handleTableClick = (table) => {
    vibrateNavigationTap();
    showToast(`Table ${table.label}: ${table.assigned ? 'Active Assigned Station' : 'Unassigned'}`);
  };

  // Handler: Sign out shift from Footer Nav
  const handleSignOut = () => {
    vibrateAdminMessage();
    showToast('Signed Out from Shift. Switching to Authentication View...');
    setActiveHandheldView('login');
  };

  return (
    <div className="min-h-screen bg-[#080B10] text-slate-100 font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Telemetry & Blueprint Control Bar */}
      <header className="sticky top-0 z-40 bg-[#0C101A]/95 backdrop-blur-xl border-b border-white/[0.08] px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Brand & Telemetry Badge */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/25 font-black shrink-0">
              <BellRing className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-tight text-white">
                  DineSync Staff
                </h1>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  16:9 Widescreen Blueprint
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                High-Performance Restaurant Waiter Handheld Application
              </p>
            </div>
          </div>

          {/* Mode Switchers & Vibration Telemetry Controls */}
          <div className="flex items-center flex-wrap gap-2.5 w-full md:w-auto justify-end">
            {/* Test Vibration Pulse Button */}
            <button
              type="button"
              onClick={handleTestVibrationPulse}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                vibrationPulseActive
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-2 ring-amber-400/30 animate-pulse'
                  : 'bg-[#131A26] hover:bg-[#1A2333] border-white/[0.08] text-amber-300'
              }`}
              title="Test physical device vibration motor and chime"
            >
              <Radio className={`w-3.5 h-3.5 text-amber-400 ${vibrationPulseActive ? 'animate-ping' : 'animate-pulse'}`} />
              <span>Test Vibration Pulse</span>
            </button>

            {/* Display Mode Toggles: [ 📱 16:9 Double-Mobile Layout ] and [ 📲 Handheld Mobile View ] */}
            <div className="inline-flex rounded-xl bg-[#080B10] p-1 border border-white/[0.08] shadow-inner">
              <button
                type="button"
                onClick={() => {
                  vibrateNavigationTap();
                  setDisplayMode('blueprint');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  displayMode === 'blueprint'
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>📱 16:9 Double-Mobile Layout</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  vibrateNavigationTap();
                  setDisplayMode('handheld');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  displayMode === 'handheld'
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>📲 Handheld Mobile View</span>
              </button>
            </div>

            {/* Switch to Legacy Console */}
            {onSwitchToLegacy && (
              <button
                type="button"
                onClick={onSwitchToLegacy}
                className="text-xs text-slate-400 hover:text-slate-200 underline font-medium px-2 py-1"
              >
                Legacy Console
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Floating Animated Toast Banner */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-bounce transition-all">
          <div className="px-4 py-2 rounded-2xl bg-[#0F172A] border border-amber-500/40 text-amber-300 text-xs font-bold shadow-2xl shadow-amber-500/20 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Main Showcase Stage */}
      <main className="max-w-7xl mx-auto px-3 py-6 sm:px-6 sm:py-10">
        {displayMode === 'blueprint' ? (
          /* =========================================================================
             16:9 WIDESCREEN DOUBLE-MOBILE MOCKUP LAYOUT
             Two modern flagship smartphones side-by-side on obsidian minimalist desk
             (#080B10 to #131A26) with soft ambient neon backlighting
             ========================================================================= */
          <div className="relative rounded-[36px] lg:rounded-[44px] bg-gradient-to-b from-[#080B10] via-[#0D1420] to-[#131A26] border border-white/[0.08] p-4 sm:p-8 md:p-10 lg:p-12 shadow-[0_30px_100px_rgba(0,0,0,0.85)] overflow-hidden">
            {/* Obsidian Desk Architectural Grid Texture */}
            <div
              className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none"
              aria-hidden="true"
            />

            {/* Soft Ambient Neon Backlighting Blooms */}
            {/* Left Bloom: Warm Amber Glow */}
            <div
              className="pointer-events-none absolute -top-12 left-1/4 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-amber-500/[0.12] blur-[120px]"
              aria-hidden="true"
            />
            {/* Right Bloom: Emerald Glow */}
            <div
              className="pointer-events-none absolute -top-12 right-1/4 translate-x-1/2 w-[520px] h-[520px] rounded-full bg-emerald-500/[0.12] blur-[120px]"
              aria-hidden="true"
            />
            {/* Center Horizon Bloom: Subtle Deep Indigo */}
            <div
              className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[400px] rounded-full bg-blue-600/[0.05] blur-[140px]"
              aria-hidden="true"
            />
            {/* Desk Surface Edge Reflection Line */}
            <div
              className="pointer-events-none absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent"
              aria-hidden="true"
            />

            {/* Blueprint Section Header */}
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between pb-8 mb-8 border-b border-white/[0.08] gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    DineSync Staff — Handheld Widescreen Blueprint
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
                  Single-hand optimized mobile architecture for active floor operations &bull; 16:9 double-mobile mockup
                </p>
              </div>

              {/* View Pills Legend */}
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-500/30 border border-amber-500 flex items-center justify-center text-[9px] text-amber-400 font-bold">
                    A
                  </span>
                  <span>View A: Authentication</span>
                </div>
                <span className="text-slate-600">&bull;</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500/30 border border-emerald-500 flex items-center justify-center text-[9px] text-emerald-400 font-bold">
                    B
                  </span>
                  <span>View B: Active Duty (Alex M.)</span>
                </div>
              </div>
            </div>

            {/* The 2-Phone Side-by-Side Flagship Desk Showcase */}
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start justify-items-center">
              {/* =====================================================================
                  PHONE 1 (LEFT HALF): VIEW A - WAITER LOGIN & AUTHENTICATION SCREEN
                  Built by Subagent 2 (DineSyncLoginScreen)
                  ===================================================================== */}
              <div className="w-full max-w-[395px] flex flex-col items-center">
                <div className="text-center mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full shadow-xs">
                    VIEW A: Waiter Login &amp; Authentication
                  </span>
                </div>

                <ModernFlagshipPhoneFrame ambientGlow="amber" timeString="9:41">
                  {/* Embedded DineSyncLoginScreen */}
                  <div className="flex-1 flex flex-col justify-between overflow-y-auto">
                    <DineSyncLoginScreen
                      asDeviceFrame={false}
                      onLoginSuccess={handleLoginSuccess}
                      onForgotPassword={handleForgotPassword}
                      initialStaffId="Alex.M / 042"
                      initialPassword="dinesync2026"
                      className="bg-transparent"
                    />
                  </div>
                </ModernFlagshipPhoneFrame>
              </div>

              {/* =====================================================================
                  PHONE 2 (RIGHT HALF): VIEW B - ACTIVE PERSONAL DASHBOARD (ALEX M.)
                  Combining Subagents 3, 4, 5, 6:
                  - Topbar & Assigned Tables: DineSyncHeaderAndTables (Subagent 3)
                  - Live Task Feed & Critical Call: DineSyncCriticalTaskCard (Subagent 4)
                  - Admin Chat & Customization: DineSyncAdminAndCustomCards (Subagent 5)
                  - Footbar Navigation: DineSyncFooterNav (Subagent 6)
                  ===================================================================== */}
              <div className="w-full max-w-[395px] flex flex-col items-center">
                <div className="text-center mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full shadow-xs">
                    VIEW B: Active Personal Dashboard (Alex M.)
                  </span>
                </div>

                <ModernFlagshipPhoneFrame ambientGlow="emerald" timeString="9:41">
                  <div className="flex-1 flex flex-col justify-between overflow-hidden">
                    {/* 1. Subagent 3: Topbar & Assigned Tables Monitor */}
                    <DineSyncHeaderAndTables
                      waiter={activeWaiter}
                      isVibrating={vibrationPulseActive}
                      onVibrationTrigger={handleTestVibrationPulse}
                      onTableClick={handleTableClick}
                      className="bg-[#0C101A]/95 border-b border-white/[0.08]"
                    />

                    {/* 2. Scrollable Body: Subagent 4 (Card 1) + Subagent 5 (Cards 2 & 3) */}
                    <div className="flex-1 overflow-y-auto p-3 sm:p-3.5 space-y-3.5 max-h-[440px] scrollbar-thin scrollbar-thumb-slate-800">
                      {/* Subagent 4: Live Task Feed Header & Card 1 (CRITICAL CALL WAITER 🚨) */}
                      <DineSyncCriticalTaskCard
                        status={table1Status}
                        onStatusChange={setTable1Status}
                        onGoToTable={handleGoToTable}
                        onResolve={handleResolveCard1}
                        showHeader={true}
                      />

                      {/* Subagent 5: Card 2 (ADMIN Direct Chat) & Card 3 (CUSTOMIZATION Call) */}
                      <DineSyncAdminAndCustomCards
                        showLiveCounter={false}
                        onGoToTable={handleGoToTable}
                      />
                    </div>

                    {/* 3. Subagent 6: Handheld Footer Navigation Bar */}
                    <DineSyncFooterNav
                      activeTab={activeTab}
                      onTabChange={(tab) => {
                        vibrateNavigationTap();
                        setActiveTab(tab);
                      }}
                      onSignOut={handleSignOut}
                      badgeCount={table1Status === 'resolved' ? 2 : 3}
                      showHomeIndicator={false}
                      className="bg-[#0C101A]/95 border-t border-white/[0.08]"
                    />
                  </div>
                </ModernFlagshipPhoneFrame>
              </div>
            </div>
          </div>
        ) : (
          /* =========================================================================
             HANDHELD DEVICE VIEW (SINGLE MOBILE FRAME FOCUSED FOR ACTIVE SHIFT)
             Smoothly renders single smartphone frame with instant toggle
             ========================================================================= */
          <div className="flex flex-col items-center justify-center py-2 sm:py-4">
            {/* View Selector Tabs */}
            <div className="flex items-center gap-2 mb-6 bg-[#0C101A] p-1.5 rounded-2xl border border-white/[0.08]">
              <span className="text-xs text-slate-400 font-semibold px-2">Active View:</span>
              <button
                type="button"
                onClick={() => {
                  vibrateNavigationTap();
                  setActiveHandheldView('login');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeHandheldView === 'login'
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                    : 'bg-transparent text-slate-400 hover:text-white'
                }`}
              >
                <span>🔑 View A: Login</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  vibrateNavigationTap();
                  setActiveHandheldView('dashboard');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeHandheldView === 'dashboard'
                    ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-sm'
                    : 'bg-transparent text-slate-400 hover:text-white'
                }`}
              >
                <span>⚡ View B: Alex M. Duty</span>
              </button>
            </div>

            {/* Handheld Device Container */}
            <div className="w-full max-w-[405px]">
              {activeHandheldView === 'login' ? (
                <ModernFlagshipPhoneFrame ambientGlow="amber" timeString="9:41">
                  <div className="flex-1 flex flex-col justify-between overflow-y-auto">
                    <DineSyncLoginScreen
                      asDeviceFrame={false}
                      onLoginSuccess={handleLoginSuccess}
                      onForgotPassword={handleForgotPassword}
                      initialStaffId="Alex.M / 042"
                      initialPassword="dinesync2026"
                      className="bg-transparent"
                    />
                  </div>
                </ModernFlagshipPhoneFrame>
              ) : (
                <ModernFlagshipPhoneFrame ambientGlow="emerald" timeString="9:41">
                  <div className="flex-1 flex flex-col justify-between overflow-hidden">
                    {/* Subagent 3: Header & Tables */}
                    <DineSyncHeaderAndTables
                      waiter={activeWaiter}
                      isVibrating={vibrationPulseActive}
                      onVibrationTrigger={handleTestVibrationPulse}
                      onTableClick={handleTableClick}
                      className="bg-[#0C101A]/95 border-b border-white/[0.08]"
                    />

                    {/* Subagent 4 & 5: Scrollable task cards */}
                    <div className="flex-1 overflow-y-auto p-3 sm:p-3.5 space-y-3.5 max-h-[440px] scrollbar-thin scrollbar-thumb-slate-800">
                      <DineSyncCriticalTaskCard
                        status={table1Status}
                        onStatusChange={setTable1Status}
                        onGoToTable={handleGoToTable}
                        onResolve={handleResolveCard1}
                        showHeader={true}
                      />
                      <DineSyncAdminAndCustomCards
                        showLiveCounter={false}
                        onGoToTable={handleGoToTable}
                      />
                    </div>

                    {/* Subagent 6: Footer Nav */}
                    <DineSyncFooterNav
                      activeTab={activeTab}
                      onTabChange={(tab) => {
                        vibrateNavigationTap();
                        setActiveTab(tab);
                      }}
                      onSignOut={handleSignOut}
                      badgeCount={table1Status === 'resolved' ? 2 : 3}
                      showHomeIndicator={false}
                      className="bg-[#0C101A]/95 border-t border-white/[0.08]"
                    />
                  </div>
                </ModernFlagshipPhoneFrame>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
