import React, { useState } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';

function formatRequestTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

/**
 * VoidRequestsPanel
 *
 * Lists waiter void requests still waiting for admin action.
 * Approve requires the admin master PIN (applies the void); reject needs no PIN.
 */
export default function VoidRequestsPanel({ className = '' }) {
  const { getPendingVoidRequests, approveVoidRequest, rejectVoidRequest } = useRestaurant();
  const pending = getPendingVoidRequests();
  const [pins, setPins] = useState({});
  const [errors, setErrors] = useState({});
  const [checkingId, setCheckingId] = useState(null);

  const setPinFor = (id, value) => setPins(prev => ({ ...prev, [id]: value }));

  const handleApprove = async (req) => {
    setCheckingId(req.id);
    const result = await approveVoidRequest(req.id, pins[req.id]);
    setCheckingId(null);
    if (!result.success) {
      setErrors(prev => ({ ...prev, [req.id]: result.error }));
      return;
    }
    setErrors(prev => ({ ...prev, [req.id]: '' }));
    setPinFor(req.id, '');
  };

  const handleReject = (req) => {
    const result = rejectVoidRequest(req.id);
    if (!result.success) setErrors(prev => ({ ...prev, [req.id]: result.error }));
  };

  return (
    <section
      className={`rounded-2xl p-4 flex flex-col gap-3 ${className}`}
      style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
      aria-label="Pending void requests"
    >
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <AlertTriangle size={16} style={{ color: 'var(--adm-warning)' }} />
          Pending void requests
        </h3>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: pending.length ? 'var(--adm-warning)' : 'var(--adm-surface-2)', color: pending.length ? '#111' : 'var(--adm-text-muted)' }}
        >
          {pending.length}
        </span>
      </header>

      {pending.length === 0 && (
        <p className="text-xs" style={{ color: 'var(--adm-text-muted)' }}>No void requests waiting for approval.</p>
      )}

      {pending.map(req => (
        <article
          key={req.id}
          className="rounded-xl p-3 flex flex-col gap-2"
          style={{ background: 'var(--adm-surface-2)', border: '1px solid var(--adm-border)' }}
        >
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <span className="font-semibold">
              {req.orderLabel} &middot; Table {req.tableNumber ?? '-'}
            </span>
            <span className="text-xs" style={{ color: 'var(--adm-text-muted)' }}>{formatRequestTime(req.requestedAt)}</span>
          </div>
          <p className="text-xs" style={{ color: 'var(--adm-text-muted)' }}>
            {req.wholeOrder ? 'Whole order' : (req.itemNames?.join(', ') || 'Selected items')} &middot; {req.reason}
            {req.note ? ` - ${req.note}` : ''}
          </p>
          <p className="text-xs" style={{ color: 'var(--adm-text-muted)' }}>Requested by {req.requestedBy}</p>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              aria-label={`Admin PIN to approve void for ${req.orderLabel}`}
              placeholder="Admin PIN"
              value={pins[req.id] || ''}
              onChange={(e) => setPinFor(req.id, e.target.value)}
              className="w-28 px-2.5 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
            />
            <button
              type="button"
              onClick={() => handleApprove(req)}
              disabled={checkingId === req.id}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
              style={{ background: 'var(--adm-success)', color: 'var(--adm-primary-fg)', opacity: checkingId === req.id ? 0.6 : 1 }}
            >
              <Check size={13} /> {checkingId === req.id ? 'Checking PIN...' : 'Approve'}
            </button>
            <button
              type="button"
              onClick={() => handleReject(req)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
              style={{ background: 'var(--adm-surface)', color: 'var(--adm-danger)', border: '1px solid var(--adm-border)' }}
            >
              <X size={13} /> Reject
            </button>
          </div>
          {errors[req.id] && (
            <p role="alert" className="text-xs font-semibold" style={{ color: 'var(--adm-danger)' }}>{errors[req.id]}</p>
          )}
        </article>
      ))}
    </section>
  );
}
