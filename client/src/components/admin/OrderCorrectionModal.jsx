import React, { useState, useEffect } from 'react';
import { Ban, Percent, ShieldCheck, X, Send } from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';

export const VOID_REASONS = [
  'Customer changed mind',
  'Wrong item ordered',
  'Kitchen error',
  'Item unavailable',
  'Quality complaint',
  'Other'
];

export const DISCOUNT_REASONS = [
  'Loyalty guest',
  'Service recovery',
  'Manager comp',
  'Promotion',
  'Other'
];

/**
 * Computes the bill for an order after voids and discounts.
 * Falls back to the stored subtotal / tax / total when no correction applies.
 * Tax is 10% of the net subtotal, matching the existing receipt.
 */
export function computeOrderBill(order = {}, correction = {}) {
  const items = Array.isArray(order.items) ? order.items : [];
  const voided = new Set(correction.voidedItems || []);
  const discount = correction.discount || null;

  const originalSubtotal = Number(order.subtotal) || 0;
  const originalTotal = Number(order.total ?? order.total_amount) || 0;
  const originalTax = Number(order.tax) || (originalTotal ? originalTotal * 0.1 : 0);

  if (!voided.size && !discount) {
    return {
      subtotal: originalSubtotal || originalTotal * 0.9,
      voidedAmount: 0,
      discountAmount: 0,
      tax: originalTax,
      total: originalTotal,
      hasCorrections: false
    };
  }

  const fullSubtotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
  const kept = items.reduce((sum, item, idx) => (
    voided.has(idx) ? sum : sum + (Number(item.price) || 0) * (Number(item.quantity) || 1)
  ), 0);
  const voidedAmount = fullSubtotal - kept;

  let discountAmount = 0;
  if (discount) {
    discountAmount = discount.type === 'percent'
      ? kept * (discount.value / 100)
      : Math.min(kept, discount.value);
  }
  const net = Math.max(0, kept - discountAmount);
  const tax = net * 0.1;

  return {
    subtotal: kept,
    voidedAmount,
    discountAmount,
    tax,
    total: net + tax,
    hasCorrections: true
  };
}

const fieldClass = 'w-full px-3 py-2 rounded-lg text-sm outline-none';
const fieldStyle = {
  background: 'var(--adm-surface-2)',
  border: '1px solid var(--adm-border)',
  color: 'var(--adm-text)'
};
const labelStyle = { color: 'var(--adm-text-muted)', fontSize: '0.75rem', fontWeight: 600 };

/**
 * OrderCorrectionModal
 *
 * Void items / whole order, or apply a discount on an order or table bill.
 * mode 'admin': actions apply immediately after the admin master PIN.
 * mode 'waiter': only void requests are allowed; the admin approves them later.
 */
export default function OrderCorrectionModal({
  isOpen = false,
  onClose = () => {},
  order = null,
  mode = 'admin',
  initialTab = 'void',
  actor = null
}) {
  const {
    getOrderCorrection,
    voidOrderItems,
    requestOrderVoid,
    applyOrderDiscount,
    clearOrderDiscount
  } = useRestaurant();

  const [tab, setTab] = useState(initialTab);
  const [selected, setSelected] = useState([]);
  const [wholeOrder, setWholeOrder] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [discountType, setDiscountType] = useState('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const isAdmin = mode === 'admin';
  const orderId = order?.id;
  const label = order ? `Order #${String(order.orderNumber || order.id).slice(-4)}` : '';
  const correction = order ? getOrderCorrection(orderId) : { voidedItems: [], discount: null };
  const items = order?.items || [];
  const alreadyVoided = new Set(correction.voidedItems);

  useEffect(() => {
    if (isOpen) {
      setTab(isAdmin ? initialTab : 'void');
      setSelected([]);
      setWholeOrder(false);
      setReason('');
      setNote('');
      setDiscountValue('');
      setDiscountReason('');
      setPin('');
      setError('');
      setDone('');
    }
  }, [isOpen, initialTab, isAdmin]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  const toggleItem = (idx) => {
    setSelected(prev => (prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]));
  };

  const voidTargets = () => {
    if (wholeOrder) {
      return items.map((_, i) => i).filter(i => !alreadyVoided.has(i));
    }
    return selected.filter(i => !alreadyVoided.has(i));
  };

  const submitVoid = () => {
    setError('');
    if (!reason) return setError('Choose a reason for the void.');
    if (reason === 'Other' && !note.trim()) return setError('Describe the reason in the note.');
    const indexes = voidTargets();
    if (!indexes.length) return setError('Select an item or the whole order.');

    const base = {
      orderId,
      orderLabel: label,
      tableNumber: order.tableNumber,
      items,
      itemIndexes: wholeOrder ? 'all' : indexes,
      reason,
      note: note.trim(),
      actor: actor || undefined
    };

    if (isAdmin) {
      const result = voidOrderItems({ ...base, pin });
      if (!result.success) return setError(result.error);
      setDone('Void applied and logged.');
      setPin('');
      setTimeout(onClose, 500);
      return undefined;
    }

    const result = requestOrderVoid({
      ...base,
      actor: actor || { actorType: 'employee', actorName: 'Waiter' }
    });
    if (!result.success) return setError(result.error);
    setDone('Void request sent to admin for approval.');
    setTimeout(onClose, 700);
    return undefined;
  };

  const submitDiscount = () => {
    setError('');
    const result = applyOrderDiscount({
      orderId,
      orderLabel: label,
      tableNumber: order.tableNumber,
      discountType,
      value: discountValue,
      reason: discountReason,
      note: note.trim(),
      pin
    });
    if (!result.success) return setError(result.error);
    setDone('Discount applied and logged.');
    setPin('');
    setTimeout(onClose, 500);
    return undefined;
  };

  const removeDiscount = () => {
    setError('');
    const result = clearOrderDiscount({ orderId, orderLabel: label, pin });
    if (!result.success) return setError(result.error);
    setDone('Discount removed and logged.');
    setPin('');
    setTimeout(onClose, 500);
    return undefined;
  };

  const pinField = (
    <div>
      <label style={labelStyle} htmlFor="order-corr-pin">Admin master PIN</label>
      <input
        id="order-corr-pin"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        className={fieldClass}
        style={fieldStyle}
        placeholder="Enter admin PIN"
      />
    </div>
  );

  const reasonSelect = (options, value, setValue) => (
    <div>
      <label style={labelStyle} htmlFor="order-corr-reason">Reason</label>
      <select
        id="order-corr-reason"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={fieldClass}
        style={fieldStyle}
      >
        <option value="">Select a reason</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );

  const tabButton = (id, text, Icon) => (
    <button
      type="button"
      onClick={() => { setTab(id); setError(''); }}
      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer transition"
      style={{
        background: tab === id ? 'var(--adm-primary)' : 'var(--adm-surface-2)',
        color: tab === id ? 'var(--adm-primary-fg)' : 'var(--adm-text-muted)',
        border: '1px solid var(--adm-border)'
      }}
    >
      <Icon size={14} /> {text}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Order correction"
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)', color: 'var(--adm-text)' }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--adm-border)' }}>
          <div>
            <h3 className="text-base font-bold">{isAdmin ? 'Order correction' : 'Request void'}</h3>
            <p className="text-xs" style={{ color: 'var(--adm-text-muted)' }}>
              {label} &middot; Table {order.tableNumber ?? '-'}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg cursor-pointer" style={{ color: 'var(--adm-text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pt-4 flex flex-col gap-3 overflow-y-auto">
          {isAdmin && (
            <div className="flex gap-2">
              {tabButton('void', 'Void', Ban)}
              {tabButton('discount', 'Discount', Percent)}
            </div>
          )}

          {tab === 'void' && (
            <>
              <div className="flex flex-col gap-1.5">
                <span style={labelStyle}>Items</span>
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                  <input type="checkbox" checked={wholeOrder} onChange={(e) => setWholeOrder(e.target.checked)} />
                  Void whole order
                </label>
                {items.map((item, idx) => {
                  const voided = alreadyVoided.has(idx);
                  return (
                    <label key={idx} className="flex items-center gap-2 text-sm cursor-pointer" style={{ opacity: voided ? 0.5 : 1 }}>
                      <input
                        type="checkbox"
                        disabled={voided || wholeOrder}
                        checked={voided || wholeOrder || selected.includes(idx)}
                        onChange={() => toggleItem(idx)}
                      />
                      <span className={voided ? 'line-through' : ''}>
                        {item.quantity}x {item.name}
                      </span>
                      {voided && <span className="text-xs" style={{ color: 'var(--adm-danger)' }}>voided</span>}
                    </label>
                  );
                })}
              </div>

              {reasonSelect(VOID_REASONS, reason, setReason)}
              <div>
                <label style={labelStyle} htmlFor="order-corr-note">
                  {reason === 'Other' ? 'Details (required)' : 'Note (optional)'}
                </label>
                <textarea
                  id="order-corr-note"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className={fieldClass}
                  style={fieldStyle}
                  placeholder="Add context for the audit log"
                />
              </div>
            </>
          )}

          {tab === 'discount' && isAdmin && (
            <>
              <div className="flex gap-2">
                {['percent', 'fixed'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setDiscountType(type)}
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer"
                    style={{
                      background: discountType === type ? 'var(--adm-primary)' : 'var(--adm-surface-2)',
                      color: discountType === type ? 'var(--adm-primary-fg)' : 'var(--adm-text-muted)',
                      border: '1px solid var(--adm-border)'
                    }}
                  >
                    {type === 'percent' ? 'Percentage (%)' : 'Fixed amount (৳)'}
                  </button>
                ))}
              </div>
              <div>
                <label style={labelStyle} htmlFor="order-corr-discount">
                  {discountType === 'percent' ? 'Percent off (0-100)' : 'Amount off (৳)'}
                </label>
                <input
                  id="order-corr-discount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className={fieldClass}
                  style={fieldStyle}
                />
              </div>
              {reasonSelect(DISCOUNT_REASONS, discountReason, setDiscountReason)}
              {correction.discount && (
                <p className="text-xs" style={{ color: 'var(--adm-warning)' }}>
                  Current discount: {correction.discount.type === 'percent' ? `${correction.discount.value}%` : `৳${correction.discount.value}`} ({correction.discount.reason})
                </p>
              )}
            </>
          )}

          {isAdmin && pinField}
          {!isAdmin && (
            <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--adm-text-muted)' }}>
              <ShieldCheck size={14} /> The admin approves this request with the master PIN.
            </p>
          )}

          {error && (
            <p role="alert" className="text-xs font-semibold" style={{ color: 'var(--adm-danger)' }}>{error}</p>
          )}
          {done && (
            <p className="text-xs font-semibold" style={{ color: 'var(--adm-success)' }}>{done}</p>
          )}
        </div>

        <div className="px-5 py-4 mt-3 flex flex-wrap gap-2 justify-end" style={{ borderTop: '1px solid var(--adm-border)' }}>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer"
            style={{ background: 'var(--adm-surface-2)', color: 'var(--adm-text)', border: '1px solid var(--adm-border)' }}>
            Cancel
          </button>
          {tab === 'discount' && isAdmin && correction.discount && (
            <button type="button" onClick={removeDiscount} className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer"
              style={{ background: 'var(--adm-surface-2)', color: 'var(--adm-warning)', border: '1px solid var(--adm-border)' }}>
              Remove discount
            </button>
          )}
          <button
            type="button"
            onClick={tab === 'discount' && isAdmin ? submitDiscount : submitVoid}
            className="px-4 py-2 rounded-lg text-sm font-bold cursor-pointer flex items-center gap-1.5"
            style={{ background: 'var(--adm-primary)', color: 'var(--adm-primary-fg)' }}
          >
            {isAdmin ? <ShieldCheck size={14} /> : <Send size={14} />}
            {tab === 'discount' && isAdmin ? 'Apply discount' : (isAdmin ? 'Apply void' : 'Send request')}
          </button>
        </div>
      </div>
    </div>
  );
}
