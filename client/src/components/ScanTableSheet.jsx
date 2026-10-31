import React, { useEffect } from 'react';
import { QrCode, X, Eye, MessageCircle, Check } from 'lucide-react';

/**
 * "Order from your table" sheet for guests who are only browsing (no table QR scanned).
 * Explains how to unlock ordering and what browsing already includes.
 */
export default function ScanTableSheet({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Order from your table"
    >
      <div
        className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-gradient-to-b from-[#0f2a1f] to-[#07130e] border border-white/10 shadow-2xl p-5 sm:p-6 animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/10 text-slate-300 flex items-center justify-center cursor-pointer active:scale-95 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-[#04120c] flex items-center justify-center shadow-[0_10px_24px_-8px_rgba(16,185,129,0.7)]">
          <QrCode className="w-7 h-7" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-[#f5efe0] tracking-tight">Order from your table</h2>
        <p className="mt-1 text-sm text-slate-300 leading-relaxed">
          Ordering opens when you scan the QR code on your table. Until then you can browse everything.
        </p>

        <ol className="mt-5 space-y-3">
          {[
            'Open your phone camera',
            'Point it at the QR code on your table',
            'Tap the link: your table is set and ordering unlocks'
          ].map((text, i) => (
            <li key={text} className="flex items-center gap-3 text-sm text-slate-200">
              <span className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              {text}
            </li>
          ))}
        </ol>

        <div className="mt-5 rounded-2xl bg-white/[0.04] border border-white/10 p-3.5">
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">While browsing you can</p>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-200">
            <li className="flex items-center gap-2"><Eye className="w-4 h-4 text-emerald-300" /> See every dish, photo and video</li>
            <li className="flex items-center gap-2"><MessageCircle className="w-4 h-4 text-emerald-300" /> Watch Reels and comment on them</li>
            <li className="flex items-center gap-2 text-slate-400"><Check className="w-4 h-4 text-slate-500" /> Ordering and dish reviews need a table</li>
          </ul>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full h-12 rounded-2xl bg-white/[0.07] hover:bg-white/10 text-slate-100 text-sm font-semibold cursor-pointer active:scale-[0.98] transition-all"
        >
          Keep browsing
        </button>
      </div>
    </div>
  );
}
