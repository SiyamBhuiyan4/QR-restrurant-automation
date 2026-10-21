/** "just now", "12m ago", "4h ago", "3d ago" */
export function timeAgo(ts, now = Date.now()) {
  const t = Number(ts);
  if (!Number.isFinite(t) || t <= 0) return '';
  const mins = Math.floor(Math.max(0, now - t) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Short two-tone beep for incoming alerts (Web Audio, no files). Silently does nothing if blocked. */
export function playAlertBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [0, 0.25, 0.5].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = i % 2 ? 660 : 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.22);
    });
    setTimeout(() => { try { ctx.close(); } catch (_) { /* closed */ } }, 1200);
  } catch (_) { /* audio blocked */ }
}

/** Readable text from a Convex error */
export function errorText(err) {
  const raw = err?.data || err?.message || 'Something went wrong';
  return String(raw).replace(/^.*ConvexError:\s*/s, '').replace(/\s+at .*$/s, '');
}

export const STATUS_STYLE = {
  pending: { label: 'Pending', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  preparing: { label: 'Cooking', cls: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
  ready: { label: 'Ready', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  served: { label: 'Served', cls: 'bg-slate-800 text-slate-400 border-slate-700' }
};
