import React, { useEffect, useMemo, useState } from 'react';
import { Lock, Save, Printer, X } from 'lucide-react';
import ZReport, { buildZSummary } from './ZReport';

export const CASH_CLOSINGS_KEY = 'smartdine_cash_closings_v1';

const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;

function readClosings() {
  try {
    const raw = localStorage.getItem(CASH_CLOSINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function writeClosings(list) {
  try {
    localStorage.setItem(CASH_CLOSINGS_KEY, JSON.stringify(list));
  } catch (_) {}
}

const dayKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const mutedStyle = { color: 'var(--adm-text-muted)' };
const inputStyle = {
  background: 'var(--adm-surface-2)',
  border: '1px solid var(--adm-border)',
  color: 'var(--adm-text)'
};
const subtleBorder = { border: '1px solid var(--adm-border)' };

function Stat({ label, children }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={mutedStyle}>
        {label}
      </p>
      <div className="mt-0.5 text-sm font-bold tabular-nums text-[var(--adm-text)]">{children}</div>
    </div>
  );
}

export default function DayClose({ orders = [] }) {
  const now = useMemo(() => new Date(), []);
  const today = dayKey(now);
  const summary = useMemo(() => buildZSummary(orders, now), [orders, now]);

  const [openingFloat, setOpeningFloat] = useState('');
  const [counted, setCounted] = useState('');
  const [closings, setClosings] = useState(readClosings);
  const [notice, setNotice] = useState(null);
  const [isZOpen, setIsZOpen] = useState(false);

  useEffect(() => {
    if (!isZOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setIsZOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isZOpen]);

  const floatNum = parseFloat(openingFloat) || 0;
  const expectedCash = floatNum + summary.byMethod.cash;
  const countedNum = parseFloat(counted);
  const hasCount = counted !== '' && !Number.isNaN(countedNum);
  const difference = hasCount ? countedNum - expectedCash : null;

  const todaysRecord = closings.find((c) => c.dateKey === today) || null;

  const saveClosing = () => {
    if (!hasCount) {
      setNotice({ type: 'error', text: 'Enter the counted cash first.' });
      return;
    }
    const record = {
      dateKey: today,
      savedAt: Date.now(),
      openingFloat: floatNum,
      cashSales: summary.byMethod.cash,
      expected: expectedCash,
      counted: countedNum,
      difference: countedNum - expectedCash,
      revenue: summary.revenue,
      orderCount: summary.orderCount
    };
    // One record per day: saving again replaces today's entry
    const next = [record, ...closings.filter((c) => c.dateKey !== today)];
    writeClosings(next);
    setClosings(next);
    setNotice({ type: 'ok', text: `Day closed. Difference ${money(record.difference)}.` });
  };

  const diffColour =
    difference === null
      ? 'var(--adm-text-muted)'
      : Math.abs(difference) < 0.005
        ? 'var(--adm-success)'
        : difference < 0
          ? 'var(--adm-danger)'
          : 'var(--adm-warning)';

  return (
    <section className="adm-card space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="adm-section-title">Close day</h2>
          <p className="adm-section-sub">Today's sales, payments and cash drawer count</p>
        </div>
        <div className="flex items-center gap-2">
          {todaysRecord && <span className="adm-badge adm-badge--success">Closed today</span>}
          <button type="button" className="adm-btn adm-btn--primary" onClick={() => setIsZOpen(true)}>
            <Printer className="w-4 h-4" />
            <span>View / print Z-report</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3 rounded-xl p-3" style={{ background: 'var(--adm-surface-2)', ...subtleBorder }}>
        <Stat label="Orders">{summary.orderCount}</Stat>
        <Stat label="Revenue">{money(summary.revenue)}</Stat>
        <Stat label="Payments">
          <span className="block text-xs font-semibold" style={mutedStyle}>
            Cash {money(summary.byMethod.cash)} · Card {money(summary.byMethod.card)} · Mobile {money(summary.byMethod.mobile)}
          </span>
        </Stat>
        <Stat label="Open tables">{summary.openTables.length}</Stat>
      </div>

      {isZOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4"
          style={{ background: 'color-mix(in srgb, var(--adm-bg) 75%, transparent)' }}
          onClick={() => setIsZOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Z-report and cash drawer count"
            className="adm-card w-full max-w-xl my-8 p-0 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--adm-border)' }}>
              <h3 className="adm-section-title">Z-report and cash count</h3>
              <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setIsZOpen(false)} aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-5">
              <ZReport summary={summary} />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl p-4 space-y-3" style={subtleBorder}>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Lock className="w-4 h-4" style={{ color: 'var(--adm-primary)' }} />
                    Cash drawer count
                  </h3>

                  <label className="block text-xs font-semibold" style={mutedStyle}>
                    Opening float
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={openingFloat}
                      onChange={(e) => setOpeningFloat(e.target.value)}
                      placeholder="0.00"
                      className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
                      style={inputStyle}
                    />
                  </label>

                  <label className="block text-xs font-semibold" style={mutedStyle}>
                    Counted cash at close
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={counted}
                      onChange={(e) => setCounted(e.target.value)}
                      placeholder="0.00"
                      className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
                      style={inputStyle}
                    />
                  </label>

                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                    <dt style={mutedStyle}>Cash sales</dt>
                    <dd className="text-right tabular-nums">{money(summary.byMethod.cash)}</dd>
                    <dt style={mutedStyle}>Expected in drawer</dt>
                    <dd className="text-right tabular-nums font-bold">{money(expectedCash)}</dd>
                    <dt style={mutedStyle}>Counted</dt>
                    <dd className="text-right tabular-nums">{hasCount ? money(countedNum) : '--'}</dd>
                    <dt style={mutedStyle}>Difference</dt>
                    <dd className="text-right tabular-nums font-black" style={{ color: diffColour }}>
                      {difference === null
                        ? '--'
                        : `${difference > 0 ? '+' : ''}${money(difference)}`}
                    </dd>
                  </dl>

                  <button
                    type="button"
                    onClick={saveClosing}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold"
                    style={{ background: 'var(--adm-primary)', color: 'var(--adm-primary-fg)' }}
                  >
                    <Save className="w-4 h-4" />
                    {todaysRecord ? 'Update today\'s closing' : 'Save day closing'}
                  </button>

                  {notice && (
                    <p
                      className="text-xs font-semibold"
                      style={{ color: notice.type === 'ok' ? 'var(--adm-success)' : 'var(--adm-danger)' }}
                    >
                      {notice.text}
                    </p>
                  )}
                </div>

                <div className="rounded-xl p-4 space-y-2" style={subtleBorder}>
                  <h3 className="text-sm font-bold">Past closings</h3>
                  {closings.length === 0 && <p className="text-xs" style={mutedStyle}>No day closings saved yet.</p>}
                  <ul className="space-y-2 max-h-72 overflow-y-auto">
                    {closings.map((c) => (
                      <li
                        key={c.dateKey}
                        className="rounded-lg px-3 py-2 text-xs"
                        style={{ background: 'var(--adm-surface-2)' }}
                      >
                        <div className="flex justify-between font-bold">
                          <span>{c.dateKey}</span>
                          <span style={{ color: Math.abs(c.difference) < 0.005 ? 'var(--adm-success)' : c.difference < 0 ? 'var(--adm-danger)' : 'var(--adm-warning)' }}>
                            {c.difference > 0 ? '+' : ''}{money(c.difference)}
                          </span>
                        </div>
                        <div className="flex justify-between tabular-nums" style={mutedStyle}>
                          <span>Expected {money(c.expected)}</span>
                          <span>Counted {money(c.counted)}</span>
                        </div>
                        <div className="flex justify-between tabular-nums" style={mutedStyle}>
                          <span>{c.orderCount} orders</span>
                          <span>Revenue {money(c.revenue)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
