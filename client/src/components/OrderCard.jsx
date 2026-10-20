import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  ChefHat, 
  CheckCircle2, 
  AlertTriangle, 
  Mic, 
  Check, 
  Sparkles, 
  ArrowRight,
  Flame,
  Volume2
} from 'lucide-react';
import AudioPlayer from './AudioPlayer.jsx';
import '../styles/staff.css';

/**
 * OrderCard Component - Bistro Modern KDS Ticket Architecture
 * 
 * - Surface: Horizontal gradient (#0E1424 to #161F33), 16px radius, backdrop blur, 1px solid rgba(255,255,255,0.06)
 * - Left Accent Strip: 3px vertical border with orange-to-red glowing gradient (#F59E0B to #EF4444)
 * - Header: Bold editorial serif Table Title, capsule [ 🪑 Dine In ] badge, muted metadata
 * - Stopwatch & Timer: Single glowing orange stopwatch icon, gradient amber-red overdue text, compact status pill
 * - Items List: Borderless vertical stack, left-aligned, 32x32px emerald circle badge x1, bold dish title, muted category
 * - Footer: Bottom-right aligned button with warm amber-to-orange gradient and chef-hat icon
 */
export default function OrderCard({
  order,
  onStatusChange,
  isUpdating = false,
  className = ''
}) {
  // Extract order fields with resilient fallbacks
  const orderId = order?.id || order?._id || order?.order_id || 'N/A';
  const displayOrderNum = order?.order_number || (typeof orderId === 'string' ? orderId.slice(-4).toUpperCase() : orderId);
  const tableNumber = order?.table_no ?? order?.tableNumber ?? order?.table ?? (order?.order_type === 'takeaway' ? 'Takeaway' : '1');
  const orderType = order?.order_type || order?.type || 'dine_in';
  const items = order?.items || order?.dishes || order?.order_items || [];
  const voiceNoteUrl = order?.voice_note_url || order?.voiceNoteUrl || order?.voice_url || order?.audio_url;
  const generalNote = order?.notes || order?.note || order?.special_instructions;
  const status = (order?.status || 'pending').toLowerCase();

  // Local state for checking off individual items on the line
  const [checkedItemIds, setCheckedItemIds] = useState(new Set());

  // Toggle item check-off
  const toggleItemCheck = (index) => {
    setCheckedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Elapsed Live Timer Calculation
  const createdAtTime = useMemo(() => {
    if (order?.created_at) return new Date(order.created_at).getTime();
    if (order?.createdAt) return new Date(order.createdAt).getTime();
    if (order?.timestamp) return new Date(order.timestamp).getTime();
    return Date.now();
  }, [order?.created_at, order?.createdAt, order?.timestamp]);

  const [elapsedMinutes, setElapsedMinutes] = useState(() => {
    if (typeof order?.timeElapsedMinutes === 'number') return order.timeElapsedMinutes;
    const diffMs = Math.max(0, Date.now() - createdAtTime);
    return Math.floor(diffMs / 60000);
  });

  useEffect(() => {
    const updateElapsed = () => {
      if (typeof order?.timeElapsedMinutes === 'number' && !order?.created_at && !order?.createdAt && !order?.timestamp) {
        setElapsedMinutes(order.timeElapsedMinutes);
        return;
      }
      const diffMs = Math.max(0, Date.now() - createdAtTime);
      const totalSec = Math.floor(diffMs / 1000);
      setElapsedMinutes(Math.floor(totalSec / 60));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 3000);
    return () => clearInterval(interval);
  }, [createdAtTime, order?.timeElapsedMinutes, order?.created_at, order?.createdAt, order?.timestamp]);

  // Formatted placed time (e.g. 03:06 PM)
  const placedTimeFormatted = useMemo(() => {
    if (order?.placedTime) return order.placedTime;
    if (order?.timePlaced) return order.timePlaced;
    try {
      return new Date(createdAtTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '03:06 PM';
    }
  }, [order?.placedTime, order?.timePlaced, createdAtTime]);

  // Determine next status and button text
  const getNextStatusAction = () => {
    if (status === 'pending' || status === 'received' || status === 'new' || status === 'placed') {
      return {
        nextStatus: 'preparing',
        label: 'Start Preparing →',
      };
    }
    if (status === 'preparing' || status === 'cooking' || status === 'in_kitchen' || status === 'in-progress') {
      return {
        nextStatus: 'ready',
        label: 'Ready for Pickup →',
      };
    }
    if (status === 'ready') {
      return {
        nextStatus: 'served',
        label: 'Confirm Served ✓',
      };
    }
    return null;
  };

  const action = getNextStatusAction();

  const handleActionClick = () => {
    if (!action || !onStatusChange || isUpdating) return;
    onStatusChange(orderId, action.nextStatus);
  };

  const isOverdue = elapsedMinutes >= 10 && status !== 'served' && status !== 'completed';

  return (
    <div
      className={`relative flex flex-col min-w-0 max-w-full rounded-[16px] backdrop-blur-md border border-white/[0.06] transition-all duration-200 overflow-hidden shadow-xl hover:border-white/10 ${className}`}
      style={{
        background: 'linear-gradient(to right, #0E1424, #161F33)',
        fontFamily: "'Inter', sans-serif"
      }}
      data-order-id={orderId}
      data-order-status={status}
    >
      {/* 1. Left Accent Strip: 3px vertical border with orange-to-red glowing gradient */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#F59E0B] to-[#EF4444] shadow-[0_0_10px_rgba(245,158,11,0.6)] z-10" />

      {/* 2. Card Header Row (with subtle bottom border border-white/5) */}
      <div className="p-4 sm:p-5 border-b border-white/[0.05] flex flex-wrap items-center justify-between gap-3 bg-white/[0.01]">
        {/* Left: Large white serif "TABLE 1" + outlined capsule badge [ 🪑 Dine In ] + muted order metadata (#KBBK • 03:06 PM) */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <span
            className="text-xl sm:text-2xl font-bold text-white tracking-wide uppercase"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            TABLE {tableNumber}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold text-slate-300 border border-white/10 bg-white/[0.03]">
            <span>🪑</span>
            <span>{orderType === 'takeaway' ? 'Takeaway' : 'Dine In'}</span>
          </span>
          <span className="text-xs text-slate-400 font-mono tracking-wide">
            #{displayOrderNum} • {placedTimeFormatted}
          </span>
        </div>

        {/* Right: Single glowing orange stopwatch icon + gradient amber-red text Overdue (1285 min) + compact PENDING pill + small vertical orange-red indicator bar on far right edge */}
        <div className="flex items-center gap-2 sm:gap-2.5 ml-auto">
          <Clock className="w-4 h-4 text-[#F59E0B] drop-shadow-[0_0_6px_rgba(245,158,11,0.7)] shrink-0" />
          <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent font-bold font-mono text-xs whitespace-nowrap">
            {isOverdue ? `Overdue (${elapsedMinutes} min)` : `${elapsedMinutes} min`}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap">
            {status === 'preparing' || status === 'cooking' || status === 'in_kitchen'
              ? 'COOKING'
              : status === 'ready'
              ? 'READY'
              : status === 'completed' || status === 'served'
              ? 'SERVED'
              : 'PENDING'}
          </span>
          <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#F59E0B] to-[#EF4444] shadow-[0_0_6px_rgba(245,158,11,0.5)] shrink-0" />
        </div>
      </div>

      {/* General Order Instruction (if any) */}
      {generalNote && (
        <div className="mx-5 mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold uppercase tracking-wider text-[10px] text-amber-300 block">Chef Instruction:</span>
            <span className="font-medium text-amber-100">{generalNote}</span>
          </div>
        </div>
      )}

      {/* 3. Order Items List (Borderless vertical stack, gap-4, left-aligned) */}
      <div className="p-5 flex-1 flex flex-col gap-4 overflow-y-auto max-h-[380px]">
        {items.length === 0 ? (
          <div className="text-slate-500 italic text-sm py-4 text-center">
            No items in this ticket.
          </div>
        ) : (
          items.map((item, idx) => {
            const isChecked = checkedItemIds.has(idx);
            const itemName = item?.name || item?.dish_name || item?.title || 'Unknown Item';
            const quantity = item?.quantity || item?.qty || 1;
            const itemNotes = item?.notes || item?.note || item?.special_instructions || item?.customization;
            const itemCategory = item?.category || item?.categoryName || item?.type || (
              Array.isArray(item?.options) ? item.options.join(', ') : item?.options
            );

            return (
              <div
                key={idx}
                onClick={() => toggleItemCheck(idx)}
                className="flex items-start gap-3.5 group select-none cursor-pointer"
              >
                {/* Left Badge: 32x32px circle with thin emerald border (#10B981), dark translucent green fill (bg-emerald-500/10), and centered x1 text */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-colors ${
                    isChecked
                      ? 'border-slate-700 bg-slate-800 text-slate-400'
                      : 'border-[#10B981]/50 bg-emerald-500/10 text-emerald-400 shadow-sm shadow-emerald-500/10'
                  }`}
                >
                  <span className="text-xs font-bold font-mono">
                    {isChecked ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : `x${quantity}`}
                  </span>
                </div>

                {/* Right Text: Bold white dish title with smaller muted gray subtitle/category line directly underneath */}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm sm:text-base font-semibold text-white tracking-tight leading-snug group-hover:text-amber-200 transition-colors ${isChecked ? 'line-through text-slate-400' : ''}`}>
                    {itemName}
                  </div>
                  <div className="text-xs text-slate-400 font-normal mt-0.5">
                    {itemCategory || 'Chef Special'}
                  </div>
                  {itemNotes && (
                    <div className="mt-1 text-xs text-amber-300/90 font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span>Note: {itemNotes}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Voice Note (if present) */}
      {voiceNoteUrl && (
        <div className="px-5 pb-3">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300">
                <Mic className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                Customer Voice Instruction
              </span>
              <span className="text-[10px] text-amber-300 font-mono font-semibold bg-amber-500/20 px-2 py-0.5 rounded">
                Audio Note
              </span>
            </div>
            <AudioPlayer src={voiceNoteUrl} />
          </div>
        </div>
      )}

      {/* 4. Card Footer Action: Bottom-right aligned button with warm amber-to-orange gradient and chef-hat icon */}
      <div className="p-4 sm:p-5 border-t border-white/[0.05] flex items-center justify-between gap-3 bg-white/[0.01]">
        {action ? (
          <button
            type="button"
            onClick={handleActionClick}
            disabled={isUpdating}
            className="ml-auto inline-flex items-center gap-2 rounded-lg px-5 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 active:scale-95 transition-all text-[#0A0F1D] font-extrabold text-xs sm:text-sm tracking-wide shadow-lg shadow-orange-500/20 cursor-pointer disabled:opacity-50"
          >
            {isUpdating ? (
              <div className="flex items-center gap-2 text-[#0A0F1D] font-bold">
                <div className="w-4 h-4 border-2 border-[#0A0F1D] border-t-transparent rounded-full animate-spin" />
                <span>Updating...</span>
              </div>
            ) : (
              <>
                <ChefHat className="w-4 h-4 text-[#0A0F1D] shrink-0" />
                <span>{action.label}</span>
              </>
            )}
          </button>
        ) : (
          <div className="ml-auto flex items-center gap-3 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              Order Completed
            </span>
            {onStatusChange && (
              <button
                type="button"
                onClick={() => onStatusChange(orderId, 'ready')}
                className="underline hover:text-white cursor-pointer transition text-xs"
              >
                Reopen Ticket
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
