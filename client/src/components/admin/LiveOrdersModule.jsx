import React, { useState, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import OrderCorrectionModal, { computeOrderBill } from './OrderCorrectionModal';
import VoidRequestsPanel from './VoidRequestsPanel';
import {
  Ban,
  ShoppingBag,
  Clock,
  Flame,
  ConciergeBell,
  CheckCircle2,
  ArrowRight,
  Volume2,
  X,
  Check,
  Receipt,
  Printer,
  Search,
  SlidersHorizontal,
  User
} from 'lucide-react';
import AudioPlayer from '../AudioPlayer';
import BillPreviewModal from './BillReceipt';
import '../../styles/admin-tables.css';
import '../../styles/admin-floor.css';
import { KITCHEN_STAGE } from '../../data/adminMockData';

/**
 * Robust Currency Formatter for Bangladesh Taka (৳) and international fallback.
 * Renders prominent values like ৳1,250, ৳57.20 cleanly.
 */
export function formatOrderCurrency(amount) {
  if (amount === undefined || amount === null || amount === '') return '৳0';
  if (typeof amount === 'string') {
    if (amount.startsWith('৳')) return amount;
    if (amount.startsWith('$')) return `৳${amount.slice(1)}`;
    const parsed = parseFloat(amount.replace(/[^0-9.-]+/g, ''));
    if (!isNaN(parsed)) {
      return `৳${parsed.toLocaleString('en-US', {
        minimumFractionDigits: parsed % 1 !== 0 ? 2 : 0,
        maximumFractionDigits: 2
      })}`;
    }
    return amount;
  }
  if (typeof amount === 'number') {
    return `৳${amount.toLocaleString('en-US', {
      minimumFractionDigits: amount % 1 !== 0 ? 2 : 0,
      maximumFractionDigits: 2
    })}`;
  }
  return '৳0';
}

/** Ordered kitchen pipeline shown as a step track on every ticket. */
const PIPELINE_STEPS = [
  { num: 1, short: 'Placed', label: 'Step 1: Just placed' },
  { num: 2, short: 'Cooking', label: 'Step 2: Cooking in kitchen' },
  { num: 3, short: 'Ready', label: 'Step 3: Ready for pickup' },
  { num: 4, short: 'Served', label: 'Step 4: Served to guests' }
];

/**
 * Stage configuration. One tone per stage:
 * Shared meaning across floor screens: amber = order in progress, blue = ready for pickup,
 * green = served / free, grey = neutral.
 */
const STAGE_CONFIG = {
  [KITCHEN_STAGE.PLACED]: {
    step: 1,
    label: 'Placed',
    tone: 'warning',
    nextStage: KITCHEN_STAGE.PREPARING,
    nextLabel: 'Send to kitchen',
    nextIcon: ArrowRight
  },
  [KITCHEN_STAGE.PREPARING]: {
    step: 2,
    label: 'Cooking',
    tone: 'warning',
    nextStage: KITCHEN_STAGE.READY_PICKUP,
    nextLabel: 'Mark ready',
    nextIcon: ConciergeBell
  },
  [KITCHEN_STAGE.READY_PICKUP]: {
    step: 3,
    label: 'Ready',
    tone: 'info',
    nextStage: KITCHEN_STAGE.SERVED,
    nextLabel: 'Confirm served',
    nextIcon: Check
  },
  [KITCHEN_STAGE.SERVED]: {
    step: 4,
    label: 'Served',
    tone: 'success',
    nextStage: null,
    nextLabel: null,
    nextIcon: null
  }
};

/**
 * Calculates elapsed minutes from timestamp or order property.
 */
function getElapsedMinutes(order) {
  if (typeof order.timeElapsedMinutes === 'number') {
    return order.timeElapsedMinutes;
  }
  const dateStr = order.created_at || order.createdAt || order.timestamp;
  if (dateStr) {
    const orderTime = new Date(dateStr).getTime();
    if (!isNaN(orderTime)) {
      return Math.max(0, Math.floor((Date.now() - orderTime) / 60000));
    }
  }
  return 4;
}

/**
 * Formats elapsed minutes into human friendly time string.
 */
function formatElapsed(mins) {
  if (mins <= 0) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hrs}h ${remainingMins}m ago`;
}

/**
 * LiveOrdersModule Component
 *
 * Kitchen-to-table order queue. Each ticket shows its stage progression
 * (placed, cooking, ready, served) and the single action that moves it forward.
 */
export default function LiveOrdersModule({
  orders = [],
  onAdvanceStage = () => {},
  className = ''
}) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('urgency'); // 'urgency' | 'newest' | 'table' | 'bill'
  const [activeReceiptModal, setActiveReceiptModal] = useState(null);
  const [billTarget, setBillTarget] = useState(null); // { tableNumber } while the table bill preview is open
  const [correctionTarget, setCorrectionTarget] = useState(null); // { order, tab }
  const { getOrderCorrection } = useRestaurant();

  // Synchronize counts across pipeline stages
  const counts = useMemo(() => {
    return {
      all: orders.length,
      placed: orders.filter(o => o.kitchenFlowStage === KITCHEN_STAGE.PLACED).length,
      preparing: orders.filter(o => o.kitchenFlowStage === KITCHEN_STAGE.PREPARING).length,
      ready: orders.filter(o => o.kitchenFlowStage === KITCHEN_STAGE.READY_PICKUP).length,
      served: orders.filter(o => o.kitchenFlowStage === KITCHEN_STAGE.SERVED).length
    };
  }, [orders]);

  // Total active non-served tickets
  const totalActiveNonServed = useMemo(() => {
    return counts.placed + counts.preparing + counts.ready;
  }, [counts]);

  // Filter and sort tickets
  const filteredOrders = useMemo(() => {
    let result = orders.filter(order => {
      if (statusFilter !== 'all' && order.kitchenFlowStage !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNum = String(order.orderNumber || order.id || '').toLowerCase().includes(q);
        const matchesTable = String(order.tableNumber || '').includes(q);
        const matchesCustomer = String(order.customerName || '').toLowerCase().includes(q);
        const matchesItems = Array.isArray(order.items) && order.items.some(i => (i.name || '').toLowerCase().includes(q));
        if (!matchesNum && !matchesTable && !matchesCustomer && !matchesItems) return false;
      }
      return true;
    });

    // Apply sorting
    result.sort((a, b) => {
      const elapsedA = getElapsedMinutes(a);
      const elapsedB = getElapsedMinutes(b);

      if (sortBy === 'urgency') {
        // Longest waiting first (higher elapsed time first)
        return elapsedB - elapsedA;
      }
      if (sortBy === 'newest') {
        // Freshest tickets first
        return elapsedA - elapsedB;
      }
      if (sortBy === 'table') {
        return Number(a.tableNumber || 0) - Number(b.tableNumber || 0);
      }
      if (sortBy === 'bill') {
        const billA = Number(a.total || a.total_amount || 0);
        const billB = Number(b.total || b.total_amount || 0);
        return billB - billA;
      }
      return 0;
    });

    return result;
  }, [orders, statusFilter, searchQuery, sortBy]);

  // Helper to extract voice note url
  const getVoiceUrl = (order) => {
    return order.voiceNoteUrl || order.voice_note_url || order.voice_url || order.audio_url || (typeof order.voiceNote === 'string' ? order.voiceNote : null);
  };

  const filterTabs = [
    { id: 'all', label: 'All', count: counts.all },
    { id: KITCHEN_STAGE.PLACED, label: 'Placed', count: counts.placed, tone: 'warning' },
    { id: KITCHEN_STAGE.PREPARING, label: 'Cooking', count: counts.preparing, tone: 'warning' },
    { id: KITCHEN_STAGE.READY_PICKUP, label: 'Ready', count: counts.ready, tone: 'info' },
    { id: KITCHEN_STAGE.SERVED, label: 'Served', count: counts.served, tone: 'success' }
  ];

  return (
    <div className={`flr-root ${className}`}>
      {/* 0. Waiter void requests awaiting admin approval */}
      <VoidRequestsPanel className="mb-4" />

      {/* 1. KPI summary */}
      <div className="flr-kpis">
        <div className="flr-kpi" data-tone="info">
          <div className="flr-kpi__label">Active tickets</div>
          <div className="flr-kpi__value">{totalActiveNonServed}</div>
          <div className="flr-kpi__hint">{orders.length} total on the feed</div>
        </div>
        <div className="flr-kpi" data-tone="info">
          <div className="flr-kpi__label">Cooking now</div>
          <div className="flr-kpi__value">{counts.preparing}</div>
          <div className="flr-kpi__hint">In the kitchen</div>
        </div>
        <div className="flr-kpi" data-tone="info">
          <div className="flr-kpi__label">Ready for pickup</div>
          <div className="flr-kpi__value">{counts.ready}</div>
          <div className="flr-kpi__hint">Waiting for a server</div>
        </div>
        <div className="flr-kpi" data-tone="success">
          <div className="flr-kpi__label">Served</div>
          <div className="flr-kpi__value">{counts.served}</div>
          <div className="flr-kpi__hint">Delivered to guests</div>
        </div>
      </div>

      {/* 2. Filter, search and sort */}
      <div className="flr-panel">
        <div className="flr-toolbar">
          <div className="flr-tabs" role="group" aria-label="Filter by stage">
            {filterTabs.map(tab => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-tone={tab.tone || 'neutral'}
                  aria-pressed={isActive}
                  onClick={() => setStatusFilter(tab.id)}
                  className="flr-tab"
                >
                  {tab.tone && <span className="flr-dot" />}
                  <span>{tab.label}</span>
                  <span className="flr-tab__count">{tab.count}</span>
                </button>
              );
            })}
          </div>

          <div className="flr-toolbar__right">
            <div className="flr-search">
              <Search className="flr-search__icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search table, customer, order"
                className="flr-input"
                aria-label="Search orders"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="flr-btn flr-btn--ghost flr-btn--icon"
                  style={{ position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)', minHeight: '2rem', width: '2rem' }}
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <label className="flr-select" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <SlidersHorizontal className="w-3.5 h-3.5" style={{ color: 'var(--adm-text-muted)' }} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                title="Sort order tickets"
                aria-label="Sort tickets"
                style={{ background: 'transparent', border: 0, color: 'inherit', font: 'inherit', outline: 'none' }}
              >
                <option value="urgency">Longest waiting first</option>
                <option value="newest">Newest first</option>
                <option value="table">Table number</option>
                <option value="bill">Highest bill first</option>
              </select>
            </label>
          </div>
        </div>

        {(searchQuery.trim() || statusFilter !== 'all') && (
          <div className="flr-muted" style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--adm-border)', display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <span>
              Showing <strong style={{ color: 'var(--adm-text)' }}>{filteredOrders.length}</strong> {filteredOrders.length === 1 ? 'ticket' : 'tickets'}
            </span>
            <button
              type="button"
              className="flr-btn flr-btn--ghost"
              style={{ minHeight: '2rem', padding: '0.2rem 0.5rem', color: 'var(--adm-primary)' }}
              onClick={() => {
                setStatusFilter('all');
                setSearchQuery('');
              }}
            >
              Reset filters
            </button>
          </div>
        )}
      </div>

      {/* 3. Order queue */}
      {filteredOrders.length === 0 ? (
        <div className="flr-empty">
          <ShoppingBag className="w-8 h-8" style={{ opacity: 0.6 }} />
          <h3 className="flr-empty__title">No orders found</h3>
          <p className="flr-muted" style={{ maxWidth: '24rem', margin: 0 }}>
            Nothing matches the filter &quot;{statusFilter}&quot;{searchQuery ? ` and search "${searchQuery}"` : ''}.
          </p>
          <button
            type="button"
            className="flr-btn flr-btn--primary"
            onClick={() => {
              setStatusFilter('all');
              setSearchQuery('');
            }}
          >
            Show all active orders
          </button>
        </div>
      ) : (
        <div className="flr-orders">
          {filteredOrders.map(order => {
            const stageConfig = STAGE_CONFIG[order.kitchenFlowStage] || STAGE_CONFIG[KITCHEN_STAGE.PLACED];
            const elapsed = getElapsedMinutes(order);
            const voiceUrl = getVoiceUrl(order);
            const NextIcon = stageConfig.nextIcon;
            const isServed = order.kitchenFlowStage === KITCHEN_STAGE.SERVED;

            // Wait-time warning only applies to tickets not yet served
            const isUrgentCritical = elapsed >= 20 && !isServed;
            const isUrgentModerate = elapsed >= 10 && elapsed < 20 && !isServed;
            const waitTone = isUrgentCritical ? 'danger' : isUrgentModerate ? 'warning' : 'neutral';

            return (
              <article key={order.id} className="flr-ticket" data-tone={stageConfig.tone}>
                <div className="flr-ticket__head">
                  <div style={{ minWidth: 0 }}>
                    <h4 className="flr-ticket__title">Table {order.tableNumber}</h4>
                    <div className="flr-ticket__sub">
                      <User className="w-3.5 h-3.5" style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
                      {order.customerName || 'Guest'} &middot; {order.orderNumber || order.id}
                    </div>
                  </div>
                  <div className="flr-tone-chip" data-tone={waitTone} title={`Placed ${elapsed} minutes ago`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatElapsed(elapsed)}</span>
                  </div>
                </div>

                {/* Stage progression: placed -> cooking -> ready -> served */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span className="flr-tone-chip" data-tone={stageConfig.tone}>
                      <span className="flr-dot flr-dot--pulse" />
                      {stageConfig.label}
                    </span>
                    <span className="flr-muted">Step {stageConfig.step} of 4</span>
                  </div>
                  <ol className="flr-track" aria-label={`Stage ${stageConfig.step} of 4`}>
                    {PIPELINE_STEPS.map(step => {
                      const isCompleted = step.num < stageConfig.step;
                      const isCurrent = step.num === stageConfig.step;
                      const cls = `flr-track__step${isCompleted ? ' is-done' : ''}${isCurrent ? ' is-current' : ''}`;
                      return (
                        <li key={step.num} title={step.label} className={cls} data-tone={stageConfig.tone}>
                          <span className="flr-track__bar" />
                          <span className="flr-track__label">{step.short}</span>
                        </li>
                      );
                    })}
                  </ol>
                </div>

                {/* Items */}
                <div className="flr-items">
                  <div className="flr-muted" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                    <span>Items</span>
                    <span>Price</span>
                  </div>
                  <div className="flr-items__list">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flr-item">
                        <div className="flr-item__row">
                          <div className="flr-item__name">
                            <span className="flr-qty">{item.quantity}x</span>
                            <span>{item.name}</span>
                          </div>
                          <span className="flr-item__price">
                            {formatOrderCurrency(item.price * item.quantity)}
                          </span>
                        </div>
                        {item.notes && (
                          <div className="flr-note">
                            <span>&quot;{item.notes}&quot;</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Voice note */}
                {voiceUrl && (
                  <div className="flr-voice">
                    <div className="flr-voice__label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Volume2 className="w-4 h-4" />
                      <span>Customer voice note</span>
                    </div>
                    <AudioPlayer url={voiceUrl} title={`Table #${order.tableNumber} Memo`} />
                  </div>
                )}

                {/* Footer: total and actions */}
                <div className="flr-ticket__foot">
                  <div>
                    <div className="flr-total__label">Total</div>
                    <div className="flr-total__value">
                      {formatOrderCurrency(computeOrderBill(order, getOrderCorrection(order.id)).total || order.total || order.total_amount || 0)}
                    </div>
                  </div>

                  <div className="flr-ticket__actions">
                    <button
                      type="button"
                      onClick={() => setCorrectionTarget({ order, tab: 'void' })}
                      className="flr-btn flr-btn--icon"
                      title="Void items or apply a discount"
                      aria-label="Void or discount"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveReceiptModal(order)}
                      className="flr-btn flr-btn--icon"
                      title="View kitchen ticket and print"
                      aria-label="View kitchen ticket"
                    >
                      <Receipt className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillTarget({ tableNumber: order.tableNumber })}
                      className="flr-btn flr-btn--icon"
                      title="Print table bill"
                      aria-label="Print table bill"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    {stageConfig.nextStage ? (
                      <button
                        type="button"
                        onClick={() => onAdvanceStage(order.id, stageConfig.nextStage)}
                        className="flr-btn flr-btn--primary"
                      >
                        <span>{stageConfig.nextLabel}</span>
                        {NextIcon && <NextIcon className="w-4 h-4" />}
                      </button>
                    ) : (
                      <span className="flr-tone-chip" data-tone="success">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Completed</span>
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* 3b. Void / discount dialog (admin PIN) */}
      <OrderCorrectionModal
        isOpen={Boolean(correctionTarget)}
        order={correctionTarget?.order || null}
        initialTab={correctionTarget?.tab || 'void'}
        mode="admin"
        onClose={() => setCorrectionTarget(null)}
      />

      {/* 4a. Table bill preview (print only; settling happens on the Live Tables board) */}
      {billTarget && (
        <BillPreviewModal
          open
          tableNumber={billTarget.tableNumber}
          orders={orders.filter(o => o.tableNumber === billTarget.tableNumber && !o.completed)}
          onClose={() => setBillTarget(null)}
        />
      )}

      {/* 4. Kitchen ticket / receipt dialog */}
      {activeReceiptModal && (
        <div className="flr-backdrop" onClick={() => setActiveReceiptModal(null)}>
          <div
            className="flr-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Kitchen ticket"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveReceiptModal(null)}
              className="flr-btn flr-btn--ghost flr-btn--icon flr-modal__close"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div style={{ textAlign: 'center', paddingBottom: '0.9rem', borderBottom: '1px dashed var(--adm-border)' }}>
              <h3 className="flr-title" style={{ fontSize: '1.05rem' }}>Kitchen ticket</h3>
              <p className="flr-muted" style={{ margin: '0.25rem 0 0' }}>
                Table {activeReceiptModal.tableNumber} &middot; {activeReceiptModal.orderNumber || activeReceiptModal.id}
              </p>
              <p className="flr-muted" style={{ margin: '0.15rem 0 0' }}>
                Guest: {activeReceiptModal.customerName || 'Guest'}
              </p>
            </div>

            <div style={{ padding: '0.9rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '15rem', overflowY: 'auto' }}>
              {activeReceiptModal.items?.map((item, idx) => {
                const isVoided = getOrderCorrection(activeReceiptModal.id).voidedItems.includes(idx);
                return (
                  <div key={idx} className="flr-receipt-line" style={isVoided ? { opacity: 0.5, textDecoration: 'line-through' } : undefined}>
                    <span>
                      <span className="flr-qty" style={{ marginRight: 8 }}>{item.quantity}x</span>
                      {item.name}
                      {isVoided && <span style={{ marginLeft: 6, fontSize: '0.7rem', textDecoration: 'none' }}>(voided)</span>}
                    </span>
                    <span style={{ fontWeight: 600 }}>{formatOrderCurrency(item.price * item.quantity)}</span>
                  </div>
                );
              })}
            </div>

            {(() => {
              const bill = computeOrderBill(activeReceiptModal, getOrderCorrection(activeReceiptModal.id));
              const discount = getOrderCorrection(activeReceiptModal.id).discount;
              return (
                <div className="flr-receipt-sum">
                  <div className="flr-receipt-line">
                    <span>Subtotal</span>
                    <span>{formatOrderCurrency(bill.subtotal || (activeReceiptModal.total ? activeReceiptModal.total * 0.9 : 0))}</span>
                  </div>
                  {bill.voidedAmount > 0 && (
                    <div className="flr-receipt-line">
                      <span>Voided items</span>
                      <span>-{formatOrderCurrency(bill.voidedAmount)}</span>
                    </div>
                  )}
                  {bill.discountAmount > 0 && (
                    <div className="flr-receipt-line">
                      <span>Discount {discount.type === 'percent' ? `(${discount.value}%)` : ''} &middot; {discount.reason}</span>
                      <span>-{formatOrderCurrency(bill.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flr-receipt-line">
                    <span>VAT / tax (10%)</span>
                    <span>{formatOrderCurrency(bill.tax || (activeReceiptModal.total ? activeReceiptModal.total * 0.1 : 0))}</span>
                  </div>
                  <div className="flr-receipt-line flr-receipt-line--total">
                    <span>Grand total</span>
                    <span>{formatOrderCurrency(bill.total || activeReceiptModal.total || activeReceiptModal.total_amount || 0)}</span>
                  </div>
                </div>
              );
            })()}

            <div style={{ marginTop: '1.1rem', display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') window.print();
                }}
                className="flr-btn flr-btn--primary"
                style={{ flex: 1 }}
              >
                <Printer className="w-4 h-4" />
                <span>Print ticket</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveReceiptModal(null)}
                className="flr-btn"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
