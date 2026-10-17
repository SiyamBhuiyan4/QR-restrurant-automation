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

/**
 * OrderCard Component
 * 
 * High-contrast Kitchen Order Ticket (KOT) designed for kitchen monitors and tablets.
 * 
 * Features:
 * - Table Badge: Large, high-contrast, easily visible from across the kitchen
 * - Order Number & Time placed
 * - Elapsed live timer: Live ticking, color-shifts (normal -> yellow after 10m -> red after 20m)
 * - Dish list: Bold quantity badges, dish names, highlighted custom text notes
 * - Voice Note: Embedded AudioPlayer with prominent customer voice instruction badge
 * - Status transition buttons:
 *    - pending -> "👨‍🍳 Start Preparing"
 *    - preparing -> "✅ Ready for Pickup"
 *    - ready -> "🚀 Mark Served"
 * - Individual line-item check-off for line cooks
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
  const tableNumber = order?.table_no ?? order?.tableNumber ?? order?.table ?? (order?.order_type === 'takeaway' ? 'TAKEAWAY' : 'COUNTER');
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

  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const updateElapsed = () => {
      const diffMs = Math.max(0, Date.now() - createdAtTime);
      const totalSec = Math.floor(diffMs / 1000);
      setElapsedMinutes(Math.floor(totalSec / 60));
      setElapsedSeconds(totalSec % 60);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 2000); // Ticks every 2s for live feedback
    return () => clearInterval(interval);
  }, [createdAtTime]);

  // Formatted placed time (e.g. 12:45 PM)
  const placedTimeFormatted = useMemo(() => {
    try {
      return new Date(createdAtTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }, [createdAtTime]);

  // Timer urgency status: <10m = normal, 10-20m = yellow (warning), >=20m = red (critical)
  const isUrgentYellow = elapsedMinutes >= 10 && elapsedMinutes < 20 && status !== 'served' && status !== 'completed';
  const isUrgentRed = elapsedMinutes >= 20 && status !== 'served' && status !== 'completed';

  // Dynamic card border color based on urgency and status
  const getCardBorderClasses = () => {
    if (status === 'served' || status === 'completed') {
      return 'border-slate-800 opacity-75';
    }
    if (isUrgentRed) {
      return 'border-rose-600 ring-2 ring-rose-500/50 shadow-xl shadow-rose-950/40 animate-pulse';
    }
    if (isUrgentYellow) {
      return 'border-amber-500 ring-1 ring-amber-400/40 shadow-lg shadow-amber-950/30';
    }
    if (status === 'ready') {
      return 'border-emerald-500 ring-1 ring-emerald-500/40 shadow-lg shadow-emerald-950/30';
    }
    if (status === 'preparing' || status === 'cooking' || status === 'in_kitchen') {
      return 'border-sky-500 shadow-md shadow-sky-950/30';
    }
    return 'border-slate-700/80 hover:border-slate-600';
  };

  // Determine next status and button text
  const getNextStatusAction = () => {
    if (status === 'pending' || status === 'received' || status === 'new') {
      return {
        nextStatus: 'preparing',
        label: '👨‍🍳 Start Preparing',
        colorClass: 'bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-slate-950 ring-2 ring-sky-400/40'
      };
    }
    if (status === 'preparing' || status === 'cooking' || status === 'in_kitchen' || status === 'in-progress') {
      return {
        nextStatus: 'ready',
        label: '✅ Ready for Pickup',
        colorClass: 'bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 ring-2 ring-emerald-400/40 font-black'
      };
    }
    if (status === 'ready') {
      return {
        nextStatus: 'served',
        label: '🚀 Mark Served',
        colorClass: 'flame-gradient-btn text-white ring-2 ring-[#FF7A45]/40 font-black'
      };
    }
    return null;
  };

  const action = getNextStatusAction();

  const handleActionClick = () => {
    if (!action || !onStatusChange || isUpdating) return;
    onStatusChange(orderId, action.nextStatus);
  };

  return (
    <div
      className={`flex flex-col bg-slate-900 text-slate-100 rounded-2xl border-2 transition-all duration-200 overflow-hidden ${getCardBorderClasses()} ${className}`}
      data-order-id={orderId}
      data-order-status={status}
    >
      {/* CARD HEADER */}
      <div className="p-4 bg-slate-850 border-b border-slate-800 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Large High-Contrast Table Badge */}
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black tracking-wider text-base sm:text-lg flex items-center gap-1.5 shadow-md">
              <span>TABLE</span>
              <span className="text-xl sm:text-2xl font-black">{tableNumber}</span>
            </div>

            {/* Order Type Tag */}
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
              {orderType.replace('_', ' ')}
            </span>
          </div>

          {/* Order # and Placed Time */}
          <div className="text-right">
            <div className="text-lg font-black font-mono tracking-tight text-white">
              #{displayOrderNum}
            </div>
            {placedTimeFormatted && (
              <div className="text-[11px] font-mono text-slate-400">
                {placedTimeFormatted}
              </div>
            )}
          </div>
        </div>

        {/* Elapsed Live Timer & Status Pill */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
          {/* Live Timer with Urgency Color Transitions */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold tracking-tight border transition-colors ${
              isUrgentRed
                ? 'bg-rose-950 text-rose-200 border-rose-500 animate-pulse'
                : isUrgentYellow
                ? 'bg-amber-950 text-amber-300 border-amber-500'
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60'
            }`}
            title={`Order placed ${elapsedMinutes} minutes ago`}
          >
            <Clock className={`w-3.5 h-3.5 ${isUrgentRed ? 'text-rose-400 animate-spin' : ''}`} />
            <span>
              ⏱️ {elapsedMinutes} min ago
            </span>
            {isUrgentRed && (
              <span className="ml-1 text-[10px] uppercase font-black tracking-wider bg-rose-600 text-white px-1.5 py-0.2 rounded">
                OVERDUE
              </span>
            )}
          </div>

          {/* Status Badge */}
          <div className="text-xs font-bold uppercase tracking-wide">
            {status === 'pending' && (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Pending
              </span>
            )}
            {(status === 'preparing' || status === 'cooking' || status === 'in_kitchen') && (
              <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/40 inline-flex items-center gap-1">
                <Flame className="w-3 h-3 text-sky-400 animate-bounce" />
                Cooking
              </span>
            )}
            {status === 'ready' && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Ready
              </span>
            )}
            {(status === 'served' || status === 'completed') && (
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                Served ✓
              </span>
            )}
          </div>
        </div>
      </div>

      {/* GENERAL ORDER NOTE / ALLERGY ALERT */}
      {generalNote && (
        <div className="mx-3 mt-3 p-2.5 rounded-xl bg-amber-500/15 border-2 border-amber-500/50 flex items-start gap-2 text-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-extrabold uppercase tracking-wide block text-amber-300">
              Order Instruction:
            </span>
            <span className="font-semibold text-amber-100">{generalNote}</span>
          </div>
        </div>
      )}

      {/* DISH LIST */}
      <div className="p-4 flex-1 flex flex-col gap-3 overflow-y-auto max-h-[360px]">
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
            const itemOptions = item?.options || item?.variant || item?.extras;

            return (
              <div
                key={idx}
                onClick={() => toggleItemCheck(idx)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                  isChecked
                    ? 'bg-slate-950/60 border-slate-800 opacity-40 line-through'
                    : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {/* Quantity Badge */}
                  <div
                    className={`shrink-0 px-2.5 py-1 rounded-lg font-black text-base flex items-center justify-center min-w-[36px] shadow-sm ${
                      isChecked
                        ? 'bg-slate-700 text-slate-400'
                        : 'bg-emerald-500 text-slate-950'
                    }`}
                  >
                    x{quantity}
                  </div>

                  {/* Dish Name & Variations */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-base sm:text-lg font-bold text-white tracking-tight leading-snug ${isChecked ? 'line-through text-slate-400' : ''}`}>
                        {itemName}
                      </span>
                      {isChecked && (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                    </div>

                    {/* Options / Variants */}
                    {itemOptions && (
                      <div className="text-xs text-slate-400 font-medium mt-0.5">
                        {Array.isArray(itemOptions) ? itemOptions.join(', ') : String(itemOptions)}
                      </div>
                    )}

                    {/* Highlighted Custom Text Notes */}
                    {itemNotes && (
                      <div className="mt-1.5 p-2 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-200 text-xs font-bold flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span className="leading-tight">⚠️ Note: {itemNotes}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* VOICE NOTE SECTION */}
      {voiceNoteUrl && (
        <div className="px-4 pb-3">
          <div className="p-3 rounded-xl bg-[#FF5A26]/10 border border-[#FF5A26]/30 shadow-inner">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#FF7A45]">
                <Mic className="w-4 h-4 text-[#FF5A26] animate-pulse" />
                🎙️ Customer Voice Instruction
              </span>
              <span className="text-[10px] text-[#FF7A45] font-mono font-semibold bg-[#FF5A26]/20 px-2 py-0.5 rounded">
                Audio Note
              </span>
            </div>
            <AudioPlayer src={voiceNoteUrl} />
          </div>
        </div>
      )}

      {/* CARD FOOTER: STATUS TRANSITION BUTTON */}
      <div className="p-3 bg-slate-850 border-t border-slate-800">
        {action ? (
          <button
            type="button"
            onClick={handleActionClick}
            disabled={isUpdating}
            className={`w-full py-3 px-4 rounded-xl font-black text-sm sm:text-base tracking-wide flex items-center justify-center gap-2 transition-all transform active:scale-98 cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${action.colorClass}`}
          >
            {isUpdating ? (
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Updating Order...</span>
              </div>
            ) : (
              <>
                <span>{action.label}</span>
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </>
            )}
          </button>
        ) : (
          <div className="flex items-center justify-between text-xs text-slate-400 py-1">
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              Order Completed
            </span>
            {onStatusChange && (
              <button
                type="button"
                onClick={() => onStatusChange(orderId, 'ready')}
                className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
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
