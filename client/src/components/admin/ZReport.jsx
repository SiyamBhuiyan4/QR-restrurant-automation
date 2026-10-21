import React from 'react';
import { Printer } from 'lucide-react';
import '../../styles/zreport.css';

const VOID_STATUSES = ['cancelled', 'canceled', 'void', 'voided'];

const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;

function normalizeMethod(raw) {
  const v = String(raw || '').trim().toLowerCase();
  if (!v) return 'unrecorded';
  if (v.includes('card')) return 'card';
  if (v.includes('cash')) return 'cash';
  if (['mobile', 'bkash', 'nagad', 'rocket', 'wallet', 'upay'].some((k) => v.includes(k))) return 'mobile';
  return 'unrecorded';
}

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// Builds the Z-report summary from the existing orders array. Read-only: it never mutates orders.
export function buildZSummary(orders = [], now = new Date()) {
  const todays = (orders || []).filter((o) => {
    const t = new Date(o.created_at || o.createdAt || 0);
    return !Number.isNaN(t.getTime()) && isSameDay(t, now);
  });

  const summary = {
    date: now,
    orderCount: 0,
    revenue: 0,
    byMethod: { cash: 0, card: 0, mobile: 0, unrecorded: 0 },
    tax: 0,
    taxRecorded: false,
    service: 0,
    serviceRecorded: false,
    voidCount: 0,
    voidValue: 0,
    discountCount: 0,
    discountValue: 0,
    waiters: [],
    openTables: [],
    openValue: 0,
    tablesServed: 0
  };

  const waiterMap = new Map();
  const tableSet = new Set();
  const openMap = new Map();

  todays.forEach((o) => {
    const status = String(o.status || '').toLowerCase();
    const amount = parseFloat(o.total_amount ?? o.total ?? 0) || 0;
    const table = o.table_number ?? o.tableNumber ?? '?';

    if (VOID_STATUSES.includes(status)) {
      summary.voidCount += 1;
      summary.voidValue += amount;
      return;
    }

    summary.orderCount += 1;
    summary.revenue += amount;
    tableSet.add(String(table));

    const method = normalizeMethod(o.payment_method ?? o.paymentMethod ?? o.payment);
    summary.byMethod[method] += amount;

    const taxRaw = o.tax_amount ?? o.tax;
    if (taxRaw !== undefined && taxRaw !== null) {
      summary.taxRecorded = true;
      summary.tax += parseFloat(taxRaw) || 0;
    }
    const svcRaw = o.service_charge ?? o.serviceCharge ?? o.service;
    if (svcRaw !== undefined && svcRaw !== null) {
      summary.serviceRecorded = true;
      summary.service += parseFloat(svcRaw) || 0;
    }

    const discount = parseFloat(o.discount_amount ?? o.discount ?? 0) || 0;
    if (discount > 0) {
      summary.discountCount += 1;
      summary.discountValue += discount;
    }

    const waiterName = o.waiter_name || o.waiterName || o.served_by || o.waiter || 'Unassigned';
    const w = waiterMap.get(waiterName) || { name: waiterName, orders: 0, tables: new Set(), revenue: 0 };
    w.orders += 1;
    w.tables.add(String(table));
    w.revenue += amount;
    waiterMap.set(waiterName, w);

    // An order counts as paid when it is marked paid, has a paid time, or has a payment method recorded
    const isPaid = status === 'paid' || Boolean(o.paid_at || o.paidAt) || method !== 'unrecorded';
    if (!isPaid) {
      const t = openMap.get(String(table)) || { table, orders: 0, value: 0 };
      t.orders += 1;
      t.value += amount;
      openMap.set(String(table), t);
      summary.openValue += amount;
    }
  });

  summary.tablesServed = tableSet.size;
  summary.waiters = Array.from(waiterMap.values())
    .map((w) => ({ name: w.name, orders: w.orders, tables: w.tables.size, revenue: w.revenue }))
    .sort((a, b) => b.revenue - a.revenue);
  summary.openTables = Array.from(openMap.values()).sort((a, b) => Number(a.table) - Number(b.table));
  return summary;
}

export default function ZReport({ summary, restaurantName = 'SmartDine' }) {
  if (!summary) return null;
  const dateLabel = summary.date.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  });
  const avg = summary.orderCount > 0 ? summary.revenue / summary.orderCount : 0;

  const Row = ({ label, value, strong = false }) => (
    <div className={`zreport-row${strong ? ' zreport-strong' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );

  return (
    <div className="zreport-wrap">
      <div className="zreport-toolbar no-print-zreport">
        <span className="zreport-toolbar-title">Z-report: {dateLabel}</span>
        <button
          type="button"
          onClick={() => window.print()}
          className="zreport-print-btn"
        >
          <Printer className="w-4 h-4" />
          <span>Print receipt</span>
        </button>
      </div>

      <div className="zreport-print">
        <div className="zreport-center">
          <div className="zreport-title">{restaurantName}</div>
          <div className="zreport-title">Z-REPORT (DAY CLOSE)</div>
          <div>{dateLabel}</div>
          <div>Printed {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
        </div>

        <div className="zreport-divider" />
        <div className="zreport-section">SALES</div>
        <Row label="Orders" value={summary.orderCount} />
        <Row label="Tables served" value={summary.tablesServed} />
        <Row label="Average check" value={money(avg)} />
        <Row label="Gross revenue" value={money(summary.revenue)} strong />

        <div className="zreport-divider" />
        <div className="zreport-section">PAYMENTS</div>
        <Row label="Cash" value={money(summary.byMethod.cash)} />
        <Row label="Card" value={money(summary.byMethod.card)} />
        <Row label="Mobile" value={money(summary.byMethod.mobile)} />
        {summary.byMethod.unrecorded > 0 && (
          <Row label="Not recorded" value={money(summary.byMethod.unrecorded)} />
        )}

        <div className="zreport-divider" />
        <div className="zreport-section">TAX &amp; SERVICE</div>
        <Row label="Tax" value={summary.taxRecorded ? money(summary.tax) : 'n/a'} />
        <Row label="Service" value={summary.serviceRecorded ? money(summary.service) : 'n/a'} />

        <div className="zreport-divider" />
        <div className="zreport-section">EXCEPTIONS</div>
        <Row label="Voids" value={`${summary.voidCount} (${money(summary.voidValue)})`} />
        <Row label="Discounts" value={`${summary.discountCount} (${money(summary.discountValue)})`} />

        <div className="zreport-divider" />
        <div className="zreport-section">WAITERS</div>
        {summary.waiters.length === 0 && <div className="zreport-muted">No orders today</div>}
        {summary.waiters.map((w) => (
          <Row
            key={w.name}
            label={`${w.name} (${w.orders} orders / ${w.tables} tables)`}
            value={money(w.revenue)}
          />
        ))}

        <div className="zreport-divider" />
        <div className="zreport-section">OPEN TABLES (UNPAID)</div>
        {summary.openTables.length === 0 && <div className="zreport-muted">None</div>}
        {summary.openTables.map((t) => (
          <Row key={t.table} label={`Table ${t.table} (${t.orders} orders)`} value={money(t.value)} />
        ))}
        {summary.openTables.length > 0 && (
          <Row label="Open total" value={money(summary.openValue)} strong />
        )}

        <div className="zreport-divider" />
        <div className="zreport-center zreport-muted">End of Z-report</div>
      </div>
    </div>
  );
}
