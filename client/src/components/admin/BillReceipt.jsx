import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { createSettlementInConvex } from '../../utils/convexServices';
import { convex } from '../../convexClient.js';
import { api } from '../../convexApi';
import { mapConvexOrders } from '../../utils/convexOrders.js';
import { sendSettlementToTelegramChannel } from '../../services/telegramClient.js';
import '../../styles/receipt.css';

/**
 * Bill / receipt helpers and modals shared by the admin floor, orders and waiter views.
 *
 * - Settings (restaurant name, tax %, service %, footer) live in localStorage.
 * - Settling a table records the payment method in a local settlement ledger and
 *   best-effort marks the Convex orders as `completed` through api.orders.updateOrderStatus
 *   (Convex has no paid/payment field on orders).
 */

export const BILL_SETTINGS_KEY = 'smartdine_bill_settings';
export const BILL_SETTLEMENTS_KEY = 'smartdine_bill_settlements';
export const CURRENCY_SYMBOL = '$';

export const DEFAULT_BILL_SETTINGS = {
  restaurantName: 'SmartDine Restaurant',
  taxPercent: 5,
  servicePercent: 10,
  footerText: 'Thank you for dining with us! Please visit again.'
};

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'card', label: 'Card' },
  { id: 'mobile', label: 'Mobile' }
];

// ---------------------------------------------------------------------------
// localStorage helpers (every access is wrapped; storage can be blocked)
// ---------------------------------------------------------------------------

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {}
}

export function loadBillSettings() {
  const saved = readJson(BILL_SETTINGS_KEY, {});
  return { ...DEFAULT_BILL_SETTINGS, ...(saved && typeof saved === 'object' ? saved : {}) };
}

export function saveBillSettings(settings) {
  writeJson(BILL_SETTINGS_KEY, settings);
}

// ---------------------------------------------------------------------------
// Order normalisation and bill maths
// ---------------------------------------------------------------------------

/**
 * Accepts both the admin mock order shape (orderNumber, tableNumber, items[].quantity)
 * and the server row shape (order_number, table_number, total_amount, items[].name/qty).
 */
export function normalizeOrder(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  const lines = items.map((it) => ({
    name: it.name || it.item_name || 'Menu item',
    qty: Math.max(1, Number(it.quantity ?? it.qty) || 1),
    price: Number(it.price) || 0
  }));
  const rawId = String(order.id ?? '');
  const serverId = rawId && !rawId.startsWith('ord_') ? rawId : null;
  return {
    id: String(order.id),
    serverId,
    orderNumber: order.orderNumber || order.order_number || `#${order.id}`,
    tableNumber: Number(order.tableNumber ?? order.table_number),
    timestamp: order.timestamp || order.created_at || new Date().toISOString(),
    completed: Boolean(order.completed) || order.status === 'completed',
    lines
  };
}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Builds the bill for one table's orders.
 * Service is charged on the subtotal, tax on (subtotal - discount + service).
 */
export function buildBill({ tableNumber, orders, settings, discount = 0, billNumber }) {
  const normalized = orders.map(normalizeOrder);
  const lines = normalized.flatMap((o) => o.lines.map((l) => ({ ...l, lineTotal: round2(l.qty * l.price) })));
  const subtotal = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));
  const servicePct = Math.max(0, Number(settings.servicePercent) || 0);
  const taxPct = Math.max(0, Number(settings.taxPercent) || 0);
  const service = round2((subtotal * servicePct) / 100);
  const safeDiscount = Math.min(Math.max(0, Number(discount) || 0), subtotal + service);
  const taxable = round2(subtotal + service - safeDiscount);
  const tax = round2((taxable * taxPct) / 100);
  const total = round2(taxable + tax);
  return {
    tableNumber,
    billNumber,
    createdAt: new Date().toISOString(),
    orderNumbers: normalized.map((o) => o.orderNumber),
    orderIds: normalized.map((o) => o.id),
    lines,
    subtotal,
    servicePct,
    service,
    taxPct,
    tax,
    discount: round2(safeDiscount),
    total,
    settings
  };
}

export function makeBillNumber(tableNumber) {
  return `B${String(tableNumber).padStart(2, '0')}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

export function formatMoney(amount) {
  return `${CURRENCY_SYMBOL}${(Number(amount) || 0).toFixed(2)}`;
}

/**
 * Records the settlement and marks the table's orders paid/completed.
 * The settlement is posted to the server (shared across devices); the local ledger stays as fallback.
 */
export async function settleTableOrders({ bill, paymentMethod, orders }) {
  const record = {
    billNumber: bill.billNumber,
    tableNumber: bill.tableNumber,
    orderIds: bill.orderIds,
    total: bill.total,
    paymentMethod,
    paidAt: new Date().toISOString()
  };
  const ledger = readJson(BILL_SETTLEMENTS_KEY, []);
  writeJson(BILL_SETTLEMENTS_KEY, [record, ...(Array.isArray(ledger) ? ledger : [])].slice(0, 200));

  // Send settlement summary directly to Telegram Channel
  try {
    sendSettlementToTelegramChannel({
      ...record,
      subtotal: bill.subtotal,
      service: bill.service,
      tax: bill.tax,
      discount: bill.discount,
      lines: bill.lines
    }).catch((tgErr) => console.warn('[Telegram Settlement Error]:', tgErr));
  } catch (tgErr) {
    console.warn('[Telegram Settlement Error]:', tgErr);
  }

  try {
    await createSettlementInConvex(record);
  } catch (_) { /* offline: local ledger already holds the record */ }

  // Best-effort: mark the Convex orders completed (orders without a Convex id are skipped)
  const serverOrders = orders.map(normalizeOrder).filter((o) => o.serverId);
  await Promise.allSettled(
    serverOrders.map((o) => convex.mutation(api.orders.updateOrderStatus, { orderId: o.serverId, status: 'completed' }))
  );
  return record;
}

// ---------------------------------------------------------------------------
// Receipt (printable)
// ---------------------------------------------------------------------------

export function BillReceipt({ bill, paymentMethod = 'cash' }) {
  const { settings } = bill;
  const when = new Date(bill.createdAt);
  const paymentLabel = PAYMENT_METHODS.find((p) => p.id === paymentMethod)?.label || 'Cash';

  return (
    <div id="bill-print-area" className="bill-receipt">
      <div className="bill-receipt-head">
        <div className="bill-receipt-name">{settings.restaurantName}</div>
        <div className="bill-receipt-sub">Table {bill.tableNumber}</div>
        <div className="bill-receipt-sub">
          {when.toLocaleDateString()} &middot; {when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="bill-receipt-sub">Bill No. {bill.billNumber}</div>
        <div className="bill-receipt-sub">Orders: {bill.orderNumbers.join(', ')}</div>
      </div>

      <table className="bill-receipt-items">
        <thead>
          <tr>
            <th className="bill-col-qty">Qty</th>
            <th>Item</th>
            <th className="bill-col-num">Price</th>
            <th className="bill-col-num">Total</th>
          </tr>
        </thead>
        <tbody>
          {bill.lines.map((l, i) => (
            <tr key={`${l.name}-${i}`}>
              <td className="bill-col-qty">{l.qty}</td>
              <td>{l.name}</td>
              <td className="bill-col-num">{formatMoney(l.price)}</td>
              <td className="bill-col-num">{formatMoney(l.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="bill-receipt-totals">
        <div className="bill-receipt-row">
          <span>Subtotal</span>
          <span>{formatMoney(bill.subtotal)}</span>
        </div>
        <div className="bill-receipt-row">
          <span>Service ({bill.servicePct}%)</span>
          <span>{formatMoney(bill.service)}</span>
        </div>
        <div className="bill-receipt-row">
          <span>Tax / VAT ({bill.taxPct}%)</span>
          <span>{formatMoney(bill.tax)}</span>
        </div>
        {bill.discount > 0 && (
          <div className="bill-receipt-row">
            <span>Discount</span>
            <span>-{formatMoney(bill.discount)}</span>
          </div>
        )}
        <div className="bill-receipt-row bill-receipt-grand">
          <span>Grand total</span>
          <span>{formatMoney(bill.total)}</span>
        </div>
        <div className="bill-receipt-row">
          <span>Paid by</span>
          <span>{paymentLabel}</span>
        </div>
      </div>

      <div className="bill-receipt-foot">{settings.footerText}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal shell (portalled to body so it escapes the header's backdrop/transform contexts)
// ---------------------------------------------------------------------------

function ModalShell({ title, onClose, children, footer }) {
  const [theme] = useState(() => {
    try {
      return document.querySelector('.admin-shell')?.getAttribute('data-theme') || 'dark';
    } catch (_) {
      return 'dark';
    }
  });

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="admin-shell bill-overlay" data-theme={theme} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bill-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="bill-modal-head">
          <h3 className="bill-modal-title">{title}</h3>
          <button type="button" className="bill-icon-btn" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="bill-modal-body">{children}</div>
        {footer && <div className="bill-modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

/**
 * Bill preview: shows the receipt, lets staff pick payment method and discount,
 * prints it, and optionally settles the table.
 */
export default function BillPreviewModal({ open, tableNumber, orders = [], onClose, onSettle = null }) {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discountInput, setDiscountInput] = useState('0');
  const [settled, setSettled] = useState(false);
  const [billNumber] = useState(() => makeBillNumber(tableNumber));
  const [settings] = useState(() => loadBillSettings());

  const bill = useMemo(
    () => buildBill({ tableNumber, orders, settings, discount: discountInput, billNumber }),
    [tableNumber, orders, settings, discountInput, billNumber]
  );

  if (!open) return null;

  const hasItems = bill.lines.length > 0;

  const handleSettle = async () => {
    if (!hasItems || !onSettle) return;
    await onSettle(bill, paymentMethod);
    setSettled(true);
  };

  return (
    <ModalShell
      title={`Bill preview · Table ${tableNumber}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="bill-btn" onClick={onClose}>Close</button>
          <button type="button" className="bill-btn" onClick={() => window.print()} disabled={!hasItems}>
            <Printer className="w-3.5 h-3.5" />
            <span>Print bill</span>
          </button>
          {onSettle && (
            <button type="button" className="bill-btn bill-btn--primary" onClick={handleSettle} disabled={!hasItems || settled}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{settled ? 'Settled' : 'Settle & close table'}</span>
            </button>
          )}
        </>
      }
    >
      {!hasItems ? (
        <p className="bill-empty">No open orders for this table.</p>
      ) : (
        <>
          <div className="bill-controls">
            <div className="bill-field">
              <span className="bill-label">Payment method</span>
              <div className="bill-seg" role="radiogroup" aria-label="Payment method">
                {PAYMENT_METHODS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={paymentMethod === p.id}
                    className={`bill-seg-btn${paymentMethod === p.id ? ' is-active' : ''}`}
                    onClick={() => setPaymentMethod(p.id)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="bill-field">
              <span className="bill-label">Discount ({CURRENCY_SYMBOL})</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="bill-input"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
              />
            </label>
          </div>
          <div className="bill-preview-scroll">
            <BillReceipt bill={bill} paymentMethod={paymentMethod} />
          </div>
        </>
      )}
    </ModalShell>
  );
}

/**
 * Settings block: restaurant name, tax %, service %, receipt footer. Persisted in localStorage.
 */
export function BillSettingsModal({ open, onClose }) {
  const [form, setForm] = useState(() => loadBillSettings());
  const [savedNote, setSavedNote] = useState(false);

  if (!open) return null;

  const update = (key, value) => {
    setSavedNote(false);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const next = {
      restaurantName: String(form.restaurantName || '').trim() || DEFAULT_BILL_SETTINGS.restaurantName,
      taxPercent: Math.min(100, Math.max(0, Number(form.taxPercent) || 0)),
      servicePercent: Math.min(100, Math.max(0, Number(form.servicePercent) || 0)),
      footerText: String(form.footerText || '').trim()
    };
    saveBillSettings(next);
    setForm(next);
    setSavedNote(true);
  };

  return (
    <ModalShell
      title="Receipt settings"
      onClose={onClose}
      footer={
        <>
          {savedNote && <span className="bill-saved-note">Saved</span>}
          <button type="button" className="bill-btn" onClick={onClose}>Close</button>
          <button type="button" className="bill-btn bill-btn--primary" onClick={handleSave}>Save settings</button>
        </>
      }
    >
      <div className="bill-settings-grid">
        <label className="bill-field bill-field--wide">
          <span className="bill-label">Restaurant name</span>
          <input className="bill-input" value={form.restaurantName} onChange={(e) => update('restaurantName', e.target.value)} />
        </label>
        <label className="bill-field">
          <span className="bill-label">Tax / VAT (%)</span>
          <input type="number" min="0" max="100" step="0.1" className="bill-input" value={form.taxPercent} onChange={(e) => update('taxPercent', e.target.value)} />
        </label>
        <label className="bill-field">
          <span className="bill-label">Service charge (%)</span>
          <input type="number" min="0" max="100" step="0.1" className="bill-input" value={form.servicePercent} onChange={(e) => update('servicePercent', e.target.value)} />
        </label>
        <label className="bill-field bill-field--wide">
          <span className="bill-label">Receipt footer text</span>
          <textarea rows={2} className="bill-input" value={form.footerText} onChange={(e) => update('footerText', e.target.value)} />
        </label>
      </div>
    </ModalShell>
  );
}

/**
 * Print-bill lookup for the waiter console: loads a table's open server orders and opens the preview.
 */
export function TableBillLookup() {
  const [tableInput, setTableInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null); // { tableNumber, orders }

  const openBill = async () => {
    const tableNumber = Number(tableInput);
    if (!Number.isInteger(tableNumber) || tableNumber < 1) {
      setError('Enter a valid table number');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const rows = await convex.query(api.orders.getOrders, { tableNumber });
      const open = mapConvexOrders(rows)
        .filter(o => !['completed', 'cancelled'].includes(String(o.status || '').toLowerCase()));
      if (open.length === 0) {
        setError(`No open orders for table ${tableNumber}`);
      } else {
        setPreview({ tableNumber, orders: open });
      }
    } catch (_) {
      setError('Could not load orders from the server');
    } finally {
      setBusy(false);
    }
  };

  const handleSettle = async (bill, paymentMethod) => {
    await settleTableOrders({ bill, paymentMethod, orders: preview.orders });
    setPreview(null);
  };

  return (
    <div className="bill-lookup">
      <div className="bill-lookup-head">
        <Printer className="w-4 h-4" />
        <span>Table bill</span>
      </div>
      <div className="bill-lookup-row">
        <input
          type="number"
          min="1"
          className="bill-input"
          placeholder="Table no."
          aria-label="Table number for bill"
          value={tableInput}
          onChange={(e) => setTableInput(e.target.value)}
        />
        <button type="button" className="bill-btn bill-btn--primary" onClick={openBill} disabled={busy || !tableInput}>
          <span>{busy ? 'Loading...' : 'Print bill'}</span>
        </button>
      </div>
      {error && <p className="bill-lookup-error">{error}</p>}
      {preview && (
        <BillPreviewModal
          open
          tableNumber={preview.tableNumber}
          orders={preview.orders}
          onClose={() => setPreview(null)}
          onSettle={handleSettle}
        />
      )}
    </div>
  );
}
