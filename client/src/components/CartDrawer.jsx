import React, { useState, useMemo, useRef } from 'react';
import {
  ShoppingBag,
  X,
  Trash2,
  Plus,
  Minus,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Receipt
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useNetwork } from '../context/NetworkContext';
import { useMutation } from 'convex/react';
import { api } from '../convexApi';
import { enqueueOrder as idbEnqueueOrder } from '../db/indexedDb.js';
import VoiceRecorder from './VoiceRecorder';
import { sendOrderToTelegramChannel } from '../services/telegramClient';

const TAX_RATE = 0.05; // 5% Estimated Tax

/**
 * CartDrawer Component
 * 
 * Full mobile-first slide-over drawer showing:
 * - Selected dishes with quantity steppers (+ / - / delete)
 * - Individual dish customization notes (e.g., "Less spicy", "No onions")
 * - General Instructions / Special Requests for the kitchen
 * - Embedded VoiceRecorder for customer audio notes
 * - Bill breakdown (Subtotal, Tax, Total)
 * - Table number validation and quick-selector
 * - "Confirm & Send Order" button with offline-first NetworkContext integration
 * - Smooth order confirmation feedback animation
 */
export default function CartDrawer({
  isOpen: propIsOpen,
  onClose: propOnClose,
  cartItems: propCartItems,
  tableNumber: propTableNumber,
  onUpdateQuantity: propOnUpdateQuantity,
  onRemoveItem: propOnRemoveItem,
  onUpdateNote: propOnUpdateNote,
  onOrderSuccess: propOnOrderSuccess,
  className = ''
}) {
  // Try consuming CartContext (if wrapped in CartProvider)
  let cartCtx = null;
  try {
    cartCtx = useCart();
  } catch (_) {
    cartCtx = null;
  }

  // Try consuming NetworkContext (if wrapped in NetworkProvider)
  let networkCtx = null;
  try {
    networkCtx = useNetwork();
  } catch (_) {
    networkCtx = null;
  }

  // Convex Cloud order mutation
  let createConvexOrder = null;
  try {
    createConvexOrder = useMutation(api.orders.createOrder);
  } catch (_) {}

  // Resolve Drawer Open/Close state
  const isOpen = propIsOpen !== undefined ? propIsOpen : (cartCtx?.isCartOpen ?? false);
  const handleClose = () => {
    if (propOnClose) propOnClose();
    if (cartCtx?.closeCart) cartCtx.closeCart();
  };

  // Resolve Cart Items
  const rawCartItems = propCartItems !== undefined ? propCartItems : (cartCtx?.cartItems ?? []);
  // Normalize items to array of { item, quantity, itemNote }
  const items = useMemo(() => {
    if (Array.isArray(rawCartItems)) {
      return rawCartItems;
    }
    if (typeof rawCartItems === 'object' && rawCartItems !== null) {
      return Object.values(rawCartItems).map((entry) => ({
        item: entry.item || entry,
        quantity: entry.quantity || 1,
        itemNote: entry.note || entry.itemNote || ''
      }));
    }
    return [];
  }, [rawCartItems]);

  // Resolve Table Number
  const currentTable = propTableNumber !== undefined ? propTableNumber : (cartCtx?.tableNumber || '');
  const [tableInput, setTableInput] = useState(currentTable || '');
  const [tableError, setTableError] = useState(false);

  // Synchronize table input if prop/context changes
  React.useEffect(() => {
    if (currentTable) {
      setTableInput(currentTable);
    }
  }, [currentTable]);

  // General note state
  const generalNote = cartCtx?.generalNote || '';
  const setGeneralNote = cartCtx?.setGeneralNote || (() => {});

  // State for order submission feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderConfirmation, setOrderConfirmation] = useState(null);
  const [expandedNotes, setExpandedNotes] = useState({});

  // Toggle item note input expansion
  const toggleNoteExpand = (itemId) => {
    setExpandedNotes((prev) => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, ci) => {
      const price = Number(ci.item?.price) || 0;
      const qty = Number(ci.quantity) || 1;
      return sum + price * qty;
    }, 0);
  }, [items]);

  const tax = subtotal * TAX_RATE;
  const grandTotal = subtotal + tax;
  const totalItemCount = useMemo(() => {
    return items.reduce((count, ci) => count + (Number(ci.quantity) || 0), 0);
  }, [items]);

  // Stepper handlers
  const handleQuantityDelta = (itemId, delta) => {
    if (propOnUpdateQuantity) {
      const target = items.find((i) => String(i.item?.id) === String(itemId));
      const currentQty = target?.quantity || 1;
      propOnUpdateQuantity(itemId, currentQty + delta);
    } else if (cartCtx?.updateQuantity) {
      cartCtx.updateQuantity(itemId, delta);
    }
  };

  const handleRemoveItem = (itemId) => {
    if (propOnRemoveItem) {
      propOnRemoveItem(itemId);
    } else if (cartCtx?.removeFromCart) {
      cartCtx.removeFromCart(itemId);
    }
  };

  const handleItemNoteChange = (itemId, noteText) => {
    if (propOnUpdateNote) {
      propOnUpdateNote(itemId, noteText);
    } else if (cartCtx?.updateItemNote) {
      cartCtx.updateItemNote(itemId, noteText);
    }
  };

  // Order submission
  const handleConfirmOrder = async () => {
    // 1. Table Number Validation
    const finalTable = String(tableInput || currentTable || '').trim();
    if (!finalTable) {
      setTableError(true);
      return;
    }
    setTableError(false);

    // Save table number to context & storage
    if (cartCtx?.setTableNumber) {
      cartCtx.setTableNumber(finalTable);
    }

    if (items.length === 0) return;

    setIsSubmitting(true);

    try {
      // 2. Convert voiceBlob to base64 if present
      let base64Voice = null;
      if (cartCtx?.voiceBlob) {
        try {
          base64Voice = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(cartCtx.voiceBlob);
          });
        } catch (_) {}
      }

      // 3. Assemble full order payload
      const orderPayload = {
        orderId: `SD-${Date.now().toString().slice(-4)}`,
        tableNumber: finalTable,
        table_number: finalTable,
        items: items.map((ci) => ({
          id: ci.item?.id,
          name: ci.item?.name || ci.item?.title || 'Dish',
          price: Number(ci.item?.price) || 0,
          quantity: Number(ci.quantity) || 1,
          note: ci.itemNote || ''
        })),
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        total: parseFloat(grandTotal.toFixed(2)),
        totalAmount: parseFloat(grandTotal.toFixed(2)),
        generalNote: generalNote.trim(),
        voiceBlob: cartCtx?.voiceBlob || null,
        voiceNote: base64Voice || cartCtx?.voiceUrl || null,
        status: 'pending',
        createdAt: new Date().toISOString(),
        timestamp: Date.now()
      };

      // Forward to Telegram Channel database / notifications feed
      sendOrderToTelegramChannel(orderPayload).catch((e) => {
        console.warn('[Telegram Channel send error]:', e);
      });

      // 4. Send via Convex Cloud, NetworkContext or offline IndexedDB fallback
      let result = null;
      if (createConvexOrder) {
        try {
          const convexRes = await createConvexOrder({
            tableNumber: Number(finalTable) || 1,
            items: orderPayload.items.map((i) => ({
              name: i.name,
              price: Number(i.price) || 0,
              quantity: Number(i.quantity) || 1,
              note: i.note || undefined
            })),
            totalAmount: parseFloat(grandTotal.toFixed(2)),
            generalNote: generalNote.trim() || undefined,
            voiceNoteUrl: base64Voice || undefined
          });
          result = { success: true, offline: false, data: convexRes };
        } catch (convexErr) {
          console.warn('[CartDrawer] Convex order submit failed, falling back:', convexErr);
        }
      }

      if (!result) {
        if (networkCtx?.submitOrder) {
          result = await networkCtx.submitOrder(orderPayload);
        } else {
          // Direct attempt or fallback to IndexedDB
          const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
          if (isOnline) {
            try {
              const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderPayload)
              });
              if (res.ok) {
                const data = await res.json().catch(() => ({}));
                result = { success: true, offline: false, data };
              } else {
                throw new Error(`Server returned status ${res.status}`);
              }
            } catch (netErr) {
              console.warn('[CartDrawer] Network submit failed, saving to IndexedDB:', netErr);
              const queued = await idbEnqueueOrder(orderPayload);
              result = { success: true, offline: true, localId: queued.localId };
            }
          } else {
            const queued = await idbEnqueueOrder(orderPayload);
            result = { success: true, offline: true, localId: queued.localId };
          }
        }
      }

      // 5. Notify parent callback if provided
      if (propOnOrderSuccess) {
        propOnOrderSuccess(orderPayload, result);
      }

      // 6. Set confirmation animation state & clear cart
      setOrderConfirmation({
        ...orderPayload,
        isOfflineQueued: Boolean(result?.offline)
      });

      if (cartCtx?.clearCart) {
        cartCtx.clearCart();
      }
    } catch (err) {
      console.error('[CartDrawer] Order submission error:', err);
      alert('Could not submit order. Please notify staff.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
    >
      {/* Backdrop overlay */}
      <div
        onClick={handleClose}
        className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs transition-opacity animate-fadeIn"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div
          className={`w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-neutral-200/80 transform transition-all ease-in-out duration-300 animate-slideLeft ${className}`}
        >
          
          {/* ========================================================
              STATE A: ORDER CONFIRMATION / CELEBRATION FEEDBACK
             ======================================================== */}
          {orderConfirmation ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-scaleUp">
              <div className="relative mb-5">
                <div
                  className={`w-20 h-20 rounded-3xl flex items-center justify-center text-white shadow-xl ${
                    orderConfirmation.isOfflineQueued
                      ? 'bg-amber-500 shadow-amber-500/30'
                      : 'bg-emerald-600 shadow-emerald-600/30'
                  }`}
                >
                  {orderConfirmation.isOfflineQueued ? (
                    <Clock className="w-10 h-10 animate-pulse" />
                  ) : (
                    <CheckCircle2 className="w-10 h-10 animate-bounce" />
                  )}
                </div>
                <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-md">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                </div>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
                {orderConfirmation.isOfflineQueued ? 'Order Saved Offline!' : 'Order Sent to Kitchen!'}
              </h3>

              <p className="text-xs sm:text-sm text-neutral-500 mt-1.5 max-w-xs font-medium">
                {orderConfirmation.isOfflineQueued
                  ? `Table ${orderConfirmation.tableNumber} order is safely cached on your phone and will automatically push to the kitchen the moment Wi-Fi reconnects.`
                  : `Your order has been printed on the kitchen display. The chefs are getting ready!`}
              </p>

              {/* Order Receipt Box */}
              <div className="w-full bg-neutral-50 border border-neutral-200/80 rounded-2xl p-4 my-5 text-left text-xs space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-neutral-200 font-bold text-neutral-800">
                  <span className="flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-amber-600" />
                    Order #{orderConfirmation.orderId}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-neutral-200/80 text-neutral-700 text-[11px]">
                    Table {orderConfirmation.tableNumber}
                  </span>
                </div>

                <div className="space-y-1.5 py-1 max-h-36 overflow-y-auto">
                  {orderConfirmation.items.map((i, idx) => (
                    <div key={idx} className="flex justify-between text-neutral-600 font-medium">
                      <span className="truncate pr-2">
                        {i.quantity}x {i.name}
                      </span>
                      <span className="font-semibold text-neutral-900 shrink-0">
                        ${(i.price * i.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-neutral-200 flex justify-between font-black text-sm text-neutral-900">
                  <span>Total Amount</span>
                  <span className="text-amber-600">${orderConfirmation.total.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setOrderConfirmation(null);
                  handleClose();
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:scale-98 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-neutral-900/20 cursor-pointer"
              >
                Back to Menu &bull; Order More
              </button>
            </div>
          ) : (
            /* ========================================================
                STATE B: ACTIVE ORDER DRAWER
               ======================================================== */
            <>
              {/* Drawer Header */}
              <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between shrink-0 bg-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 id="cart-drawer-title" className="font-extrabold text-neutral-900 text-base sm:text-lg leading-tight flex items-center gap-2">
                      Your Order
                      {totalItemCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                          {totalItemCount}
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-neutral-500 font-medium">
                      {currentTable ? `Table ${currentTable}` : 'Choose table below'} &bull; Touch &amp; Customization
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-9 h-9 rounded-xl bg-neutral-100 hover:bg-neutral-200 active:scale-95 flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition cursor-pointer"
                  aria-label="Close cart drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content Container */}
              <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
                
                {/* 1. Empty Cart State */}
                {items.length === 0 ? (
                  <div className="py-16 px-6 text-center flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-3xl bg-neutral-100 text-neutral-400 flex items-center justify-center mb-3">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-neutral-900 text-base mb-1">Your cart is empty</h3>
                    <p className="text-xs text-neutral-500 max-w-xs mb-5">
                      Explore our delicious appetizers, steaks, burgers, drinks, and desserts to add items to your table order.
                    </p>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs sm:text-sm transition active:scale-95 cursor-pointer shadow-xs"
                    >
                      Browse Menu
                    </button>
                  </div>
                ) : (
                  <>
                    {/* 2. Selected Dishes List */}
                    <div className="p-4 sm:p-5 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                          Selected Dishes ({items.length})
                        </span>
                        {cartCtx?.clearCart && (
                          <button
                            type="button"
                            onClick={() => cartCtx.clearCart()}
                            className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                          >
                            Clear All
                          </button>
                        )}
                      </div>

                      <div className="space-y-3">
                        {items.map((cartItem) => {
                          const dish = cartItem.item || {};
                          const dishId = dish.id;
                          const dishName = dish.name || dish.title || 'Selected Dish';
                          const dishPrice = Number(dish.price) || 0;
                          const quantity = Number(cartItem.quantity) || 1;
                          const itemTotal = (dishPrice * quantity).toFixed(2);
                          const note = cartItem.itemNote || '';
                          const isNoteOpen = expandedNotes[dishId] || Boolean(note);

                          return (
                            <div
                              key={dishId}
                              className="bg-neutral-50/80 border border-neutral-200/70 rounded-2xl p-3 sm:p-3.5 transition-all hover:border-neutral-300"
                            >
                              <div className="flex items-start justify-between gap-2.5">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-neutral-900 text-sm leading-snug truncate">
                                    {dishName}
                                  </h4>
                                  <p className="text-xs text-neutral-500 font-semibold mt-0.5">
                                    ${dishPrice.toFixed(2)} each
                                  </p>
                                </div>

                                {/* Stepper + Item Price */}
                                <div className="flex items-center gap-2.5 shrink-0">
                                  <span className="font-extrabold text-sm text-neutral-900">
                                    ${itemTotal}
                                  </span>

                                  <div className="inline-flex items-center bg-white rounded-xl p-0.5 border border-neutral-200/90 shadow-2xs">
                                    <button
                                      type="button"
                                      onClick={() => handleQuantityDelta(dishId, -1)}
                                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-neutral-100 text-neutral-700 transition active:scale-90 cursor-pointer"
                                      title={quantity === 1 ? 'Remove item' : 'Decrease quantity'}
                                      aria-label="Decrease quantity"
                                    >
                                      {quantity === 1 ? (
                                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                      ) : (
                                        <Minus className="w-3.5 h-3.5" />
                                      )}
                                    </button>

                                    <span className="w-7 text-center text-xs font-bold text-neutral-900">
                                      {quantity}
                                    </span>

                                    <button
                                      type="button"
                                      onClick={() => handleQuantityDelta(dishId, 1)}
                                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-neutral-100 text-neutral-700 transition active:scale-90 cursor-pointer"
                                      title="Increase quantity"
                                      aria-label="Increase quantity"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Individual Dish Customization Accordion */}
                              <div className="mt-2.5 pt-2 border-t border-neutral-200/50">
                                {!isNoteOpen ? (
                                  <button
                                    type="button"
                                    onClick={() => toggleNoteExpand(dishId)}
                                    className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-amber-600 font-medium transition cursor-pointer"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5 text-neutral-400" />
                                    <span>Add note for this dish (e.g. &ldquo;less spicy&rdquo;)</span>
                                  </button>
                                ) : (
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[11px] font-semibold text-neutral-600 flex items-center gap-1">
                                        <MessageSquare className="w-3 h-3 text-amber-500" />
                                        Customization note:
                                      </label>
                                      {!note && (
                                        <button
                                          type="button"
                                          onClick={() => toggleNoteExpand(dishId)}
                                          className="text-[10px] text-neutral-400 hover:text-neutral-600 font-medium cursor-pointer"
                                        >
                                          Collapse
                                        </button>
                                      )}
                                    </div>
                                    <input
                                      type="text"
                                      value={note}
                                      onChange={(e) => handleItemNoteChange(dishId, e.target.value)}
                                      placeholder="e.g. Extra sauce, no onions, well-done"
                                      className="w-full px-2.5 py-1.5 text-xs bg-white rounded-xl border border-neutral-200 focus:outline-none focus:ring-1.5 focus:ring-amber-500 focus:border-amber-500 placeholder:text-neutral-400 transition"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. General Special Instructions Section */}
                    <div className="p-4 sm:p-5 space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                        General Special Requests
                      </label>
                      <textarea
                        rows={2}
                        value={generalNote}
                        onChange={(e) => setGeneralNote(e.target.value)}
                        placeholder="Any table requests? (e.g., serve starters first, extra napkins, allergic to peanuts...)"
                        className="w-full p-3 text-xs bg-neutral-50 rounded-2xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 placeholder:text-neutral-400 resize-none transition"
                      />
                    </div>

                    {/* 4. Voice Customization Section */}
                    <div className="p-4 sm:p-5">
                      <VoiceRecorder />
                    </div>

                    {/* 5. Table Number Selector / Validator */}
                    <div className="p-4 sm:p-5 bg-neutral-50/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                          <span>Table Assignment:</span>
                          <span className="text-rose-500">*</span>
                        </label>
                        {tableInput && (
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            Table {tableInput}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={tableInput}
                          onChange={(e) => {
                            setTableInput(e.target.value);
                            if (tableError) setTableError(false);
                            if (cartCtx?.setTableNumber) {
                              cartCtx.setTableNumber(e.target.value);
                            }
                          }}
                          placeholder="Enter Table # (e.g. 4, Bar 2)"
                          className={`flex-1 px-3 py-2 text-xs sm:text-sm bg-white rounded-xl border font-semibold ${
                            tableError
                              ? 'border-rose-400 ring-2 ring-rose-200'
                              : 'border-neutral-200 focus:ring-2 focus:ring-amber-500'
                          }`}
                        />

                        {/* Quick 1-6 picker chips */}
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => {
                                setTableInput(String(num));
                                if (tableError) setTableError(false);
                                if (cartCtx?.setTableNumber) {
                                  cartCtx.setTableNumber(String(num));
                                }
                              }}
                              className={`w-7 h-7 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer ${
                                String(tableInput) === String(num)
                                  ? 'bg-amber-500 text-white shadow-xs'
                                  : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>

                      {tableError && (
                        <p className="text-xs text-rose-600 font-semibold flex items-center gap-1 mt-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Please enter your table number before submitting your order!
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Drawer Footer: Bill Breakdown & Submit Button */}
              {items.length > 0 && (
                <div className="p-4 sm:p-5 bg-white border-t border-neutral-100 shrink-0 space-y-3 shadow-lg">
                  
                  {/* Bill Breakdown */}
                  <div className="space-y-1.5 text-xs text-neutral-600 font-medium">
                    <div className="flex justify-between">
                      <span>Items Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="flex items-center gap-1">
                        Estimated Tax (5%)
                        <span className="text-[10px] text-neutral-400">(Local rate)</span>
                      </span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base font-black text-neutral-900 pt-2 border-t border-neutral-100">
                      <span>Total Amount</span>
                      <span className="text-amber-600 font-extrabold text-lg">
                        ${grandTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Confirm & Send Order Button */}
                  <button
                    type="button"
                    onClick={handleConfirmOrder}
                    disabled={isSubmitting || items.length === 0}
                    className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg transition-all active:scale-98 cursor-pointer ${
                      isSubmitting
                        ? 'bg-amber-400 text-white cursor-wait'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-orange-500/25'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending Order to Kitchen...</span>
                      </>
                    ) : (
                      <>
                        <span>Confirm &amp; Send Order</span>
                        <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                      </>
                    )}
                  </button>

                  <p className="text-[10px] text-center text-neutral-400 font-medium">
                    ⚡ Offline-First Active &bull; Instant Kitchen Display Push
                  </p>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
