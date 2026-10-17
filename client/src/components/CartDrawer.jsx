import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Receipt,
  Volume2,
  Play,
  Pause,
  RotateCcw,
  Check
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
 * Compact inline audio player for dish-level voice instructions
 */
function ItemAudioPlayer({ url, onRemove }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = (e) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (!duration && audioRef.current.duration) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatSec = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 border border-amber-200/80 text-neutral-800 transition-all">
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />
      <button
        type="button"
        onClick={togglePlay}
        className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-95 text-white flex items-center justify-center shrink-0 transition shadow-2xs cursor-pointer"
        title={isPlaying ? 'Pause' : 'Play dish voice note'}
      >
        {isPlaying ? (
          <Pause className="w-3.5 h-3.5 fill-current" />
        ) : (
          <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-[11px] font-semibold text-amber-950 leading-none mb-1">
          <span className="flex items-center gap-1 font-bold">
            <Volume2 className="w-3 h-3 text-amber-600" />
            Chef Voice Note
          </span>
          <span className="font-mono text-neutral-500 text-[10px]">
            {formatSec(currentTime)} / {formatSec(duration)}
          </span>
        </div>
        <div className="w-full h-1.5 bg-amber-200/90 rounded-full overflow-hidden">
          <div 
            className="h-full bg-amber-500 transition-all duration-100" 
            style={{ width: `${progress}%` }} 
          />
        </div>
      </div>

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="p-1 rounded-md text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
          title="Remove voice note"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

/**
 * CartDrawer Component
 * 
 * Mobile-first slide-over drawer showing:
 * - Selected dishes with clean typography and quantity steppers (+ / - / delete)
 * - Individual dish customization notes with quick tags & accordion editor
 * - In-line audio playback for dish-level voice notes
 * - Table-wide general instructions & embedded VoiceRecorder
 * - Clean bill breakdown (Subtotal, Tax, Total)
 * - Quick table selector & validation
 * - Instant "Confirm & Send Order" with offline-first feedback
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

  // Resolve Cart Items with voice note support
  const rawCartItems = propCartItems !== undefined ? propCartItems : (cartCtx?.cartItems ?? []);
  const items = useMemo(() => {
    if (Array.isArray(rawCartItems)) {
      return rawCartItems.map((entry) => ({
        item: entry.item || entry,
        quantity: Number(entry.quantity) || 1,
        itemNote: entry.note || entry.itemNote || '',
        voiceNoteUrl: entry.voiceNoteUrl || entry.voiceUrl || entry.item?.voiceNoteUrl || null
      }));
    }
    if (typeof rawCartItems === 'object' && rawCartItems !== null) {
      return Object.values(rawCartItems).map((entry) => ({
        item: entry.item || entry,
        quantity: Number(entry.quantity) || 1,
        itemNote: entry.note || entry.itemNote || '',
        voiceNoteUrl: entry.voiceNoteUrl || entry.voiceUrl || entry.item?.voiceNoteUrl || null
      }));
    }
    return [];
  }, [rawCartItems]);

  // Resolve Table Number
  const currentTable = propTableNumber !== undefined ? propTableNumber : (cartCtx?.tableNumber || '');
  const [tableInput, setTableInput] = useState(currentTable || '');
  const [tableError, setTableError] = useState(false);

  // Synchronize table input if prop/context changes
  useEffect(() => {
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
          note: ci.itemNote || '',
          voiceNoteUrl: ci.voiceNoteUrl || null
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

      // Forward to Telegram Channel
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
          if (convexRes?.orderNumber) {
            orderPayload.orderNumber = convexRes.orderNumber;
            orderPayload.orderId = convexRes.orderNumber;
          }
          if (convexRes?.orderId) {
            orderPayload._id = convexRes.orderId;
          }
        } catch (convexErr) {
          console.warn('[CartDrawer] Convex order submit failed, falling back:', convexErr);
        }
      }

      if (!result) {
        if (networkCtx?.submitOrder) {
          result = await networkCtx.submitOrder(orderPayload);
        } else {
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

  // Mount flag so the panel slides in after it is first painted
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    if (!isOpen) {
      setEntered(false);
      return;
    }
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
    >
      {/* Backdrop overlay */}
      <div
        onClick={handleClose}
        className={`fixed inset-0 bg-neutral-950/65 backdrop-blur-xs transition-opacity duration-300 ease-out ${entered ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Mobile: bottom sheet. Desktop: right-side panel. */}
      <div className="fixed inset-x-0 bottom-0 h-[92dvh] sm:inset-x-auto sm:inset-y-0 sm:h-auto sm:right-0 max-w-full flex sm:pl-10">
        <div
          className={`w-screen max-w-md h-full bg-[#121215]/95 backdrop-blur-xl text-stone-100 shadow-2xl shadow-black/60 flex flex-col border-t sm:border-t-0 sm:border-l border-zinc-800 rounded-t-3xl sm:rounded-t-none sm:rounded-l-3xl overflow-hidden transform transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${entered ? 'translate-y-0 sm:translate-x-0' : 'translate-y-full sm:translate-y-0 sm:translate-x-full'} ${className}`}
        >
          
          {/* ========================================================
              STATE A: ORDER CONFIRMATION / CELEBRATION FEEDBACK
             ======================================================== */}
          {orderConfirmation ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
              <div className="relative mb-5">
                <div
                  className={`w-20 h-20 rounded-3xl flex items-center justify-center text-white shadow-xl ${
                    orderConfirmation.isOfflineQueued
                      ? 'flame-gradient-btn shadow-[#FF5A26]/30'
                      : 'bg-emerald-600 shadow-emerald-600/30'
                  }`}
                >
                  {orderConfirmation.isOfflineQueued ? (
                    <Clock className="w-10 h-10 animate-pulse" />
                  ) : (
                    <CheckCircle2 className="w-10 h-10 animate-bounce" />
                  )}
                </div>
                <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#161619] border border-zinc-700 flex items-center justify-center shadow-md">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF5A26]" />
                </div>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {orderConfirmation.isOfflineQueued ? 'Order Saved Offline!' : 'Order Sent to Kitchen!'}
              </h3>

              <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 max-w-xs font-medium leading-relaxed">
                {orderConfirmation.isOfflineQueued
                  ? `Table ${orderConfirmation.tableNumber} order is safely cached and will automatically push to the kitchen display the moment Wi-Fi reconnects.`
                  : `Your order has been printed on the kitchen display. The chefs are preparing your meal now!`}
              </p>

              {/* Order Receipt Box */}
              <div className="w-full bg-[#18181d] border border-zinc-800 rounded-2xl p-4 my-5 text-left text-xs space-y-2.5 shadow-xl">
                <div className="flex justify-between items-center pb-2.5 border-b border-zinc-800 font-bold text-white">
                  <span className="flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-[#FF5A26]" />
                    Order #{orderConfirmation.orderId}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FF5A26]/15 border border-[#FF5A26]/30 text-[#FF7A45] text-[11px] font-bold">
                    Table {orderConfirmation.tableNumber}
                  </span>
                </div>

                <div className="space-y-1.5 py-1 max-h-40 overflow-y-auto">
                  {orderConfirmation.items.map((i, idx) => (
                    <div key={idx} className="flex justify-between text-zinc-300 font-medium">
                      <span className="truncate pr-2">
                        {i.quantity}x {i.name}
                      </span>
                      <span className="font-bold text-white shrink-0">
                        ${(i.price * i.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-zinc-800 flex justify-between font-black text-sm text-white">
                  <span>Total Amount</span>
                  <span className="text-[#FF5A26] font-black text-base">
                    ${orderConfirmation.total.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setOrderConfirmation(null);
                  handleClose();
                }}
                className="w-full py-3.5 px-4 rounded-xl flame-gradient-btn text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-[#FF5A26]/30 cursor-pointer active:scale-95"
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
              <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-[#161619]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#FF5A26]/15 text-[#FF7A45] flex items-center justify-center font-bold border border-[#FF5A26]/30 shadow-xs">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 id="cart-drawer-title" className="font-extrabold text-white text-base sm:text-lg leading-tight flex items-center gap-2 tracking-tight">
                      Your Order
                      {totalItemCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#FF5A26]/20 text-[#FF7A45] border border-[#FF5A26]/40">
                          {totalItemCount}
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-zinc-400 font-medium mt-0.5">
                      {currentTable ? `Table ${currentTable}` : 'Select table below'} &bull; Dine-In Experience
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-9 h-9 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 active:scale-95 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer"
                  aria-label="Close cart drawer"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Scrollable Content Container */}
              <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/80 scrollbar-thin scrollbar-thumb-zinc-700">
                
                {/* 1. Empty Cart State */}
                {items.length === 0 ? (
                  <div className="py-20 px-6 text-center flex flex-col items-center justify-center">
                    <div className="w-20 h-20 rounded-3xl bg-[#FF5A26]/10 text-[#FF7A45] flex items-center justify-center mb-4 border border-[#FF5A26]/20 shadow-xs">
                      <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
                    </div>
                    <h3 className="font-extrabold text-white text-lg mb-1 tracking-tight">
                      Your cart is empty
                    </h3>
                    <p className="text-xs text-zinc-400 max-w-xs mb-6 leading-relaxed">
                      Explore our delicious appetizers, chef specials, beverages, and desserts to add items to your table order.
                    </p>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-6 py-3 rounded-xl flame-gradient-btn text-white font-bold text-xs sm:text-sm transition shadow-lg shadow-[#FF5A26]/30 cursor-pointer active:scale-95"
                    >
                      Browse Menu
                    </button>
                  </div>
                ) : (
                  <>
                    {/* 2. Selected Dishes List */}
                    <div className="p-4 sm:p-5 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                          Selected Dishes ({items.length})
                        </span>
                        {cartCtx?.clearCart && (
                          <button
                            type="button"
                            onClick={() => cartCtx.clearCart()}
                            className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer transition active:scale-95"
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
                          const voiceUrl = cartItem.voiceNoteUrl || null;
                          const isNoteOpen = expandedNotes[dishId] || Boolean(note);

                          return (
                            <div
                              key={dishId}
                              className="bg-[#18181d] border border-zinc-800/90 rounded-2xl p-3.5 transition-all hover:border-zinc-700 shadow-md"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-white text-sm leading-snug truncate">
                                    {dishName}
                                  </h4>
                                  <p className="text-xs text-zinc-400 font-semibold mt-0.5">
                                    ${dishPrice.toFixed(2)} each
                                  </p>
                                </div>

                                {/* Stepper + Item Price */}
                                <div className="flex items-center gap-2.5 shrink-0">
                                  <span className="font-extrabold text-sm text-white">
                                    ${itemTotal}
                                  </span>

                                  <div className="inline-flex items-center bg-zinc-900 rounded-xl p-0.5 border border-zinc-700/80 shadow-2xs">
                                    <button
                                      type="button"
                                      onClick={() => handleQuantityDelta(dishId, -1)}
                                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-zinc-800 text-zinc-300 transition active:scale-90 cursor-pointer"
                                      title={quantity === 1 ? 'Remove item' : 'Decrease quantity'}
                                      aria-label="Decrease quantity"
                                    >
                                      {quantity === 1 ? (
                                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                      ) : (
                                        <Minus className="w-3.5 h-3.5" />
                                      )}
                                    </button>

                                    <span className="w-7 text-center text-xs font-black text-white">
                                      {quantity}
                                    </span>

                                    <button
                                      type="button"
                                      onClick={() => handleQuantityDelta(dishId, 1)}
                                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-zinc-800 text-zinc-300 transition active:scale-90 cursor-pointer"
                                      title="Increase quantity"
                                      aria-label="Increase quantity"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Dish-Level Voice Note Player */}
                              {voiceUrl && (
                                <div className="mt-2.5">
                                  <ItemAudioPlayer url={voiceUrl} />
                                </div>
                              )}

                              {/* Individual Dish Customization Accordion */}
                              <div className="mt-2.5 pt-2 border-t border-zinc-800/80">
                                {!isNoteOpen ? (
                                  <button
                                    type="button"
                                    onClick={() => toggleNoteExpand(dishId)}
                                    className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-[#FF7A45] font-medium transition cursor-pointer"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5 text-[#FF5A26]" />
                                    <span>Add note for chef (e.g. &ldquo;less spicy&rdquo;)</span>
                                  </button>
                                ) : (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[11px] font-bold text-zinc-400 flex items-center gap-1">
                                        <MessageSquare className="w-3 h-3 text-[#FF5A26]" />
                                        <span>Cooking instructions:</span>
                                      </label>
                                      {!note && (
                                        <button
                                          type="button"
                                          onClick={() => toggleNoteExpand(dishId)}
                                          className="text-[10px] text-zinc-500 hover:text-zinc-300 font-semibold cursor-pointer"
                                        >
                                          Collapse
                                        </button>
                                      )}
                                    </div>

                                    {/* Quick Preset Tags */}
                                    <div className="flex flex-wrap gap-1 text-[11px]">
                                      {['Less spicy', 'Extra sauce', 'No onions', 'Crispy', 'Gluten conscious'].map((preset) => (
                                        <button
                                          key={preset}
                                          type="button"
                                          onClick={() => {
                                            const separator = note.trim() ? ', ' : '';
                                            if (!note.includes(preset)) {
                                              handleItemNoteChange(dishId, `${note}${separator}${preset}`);
                                            }
                                          }}
                                          className="px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-[#FF5A26]/50 hover:text-[#FF7A45] transition active:scale-95 cursor-pointer"
                                        >
                                          + {preset}
                                        </button>
                                      ))}
                                    </div>

                                    <input
                                      type="text"
                                      value={note}
                                      onChange={(e) => handleItemNoteChange(dishId, e.target.value)}
                                      placeholder="e.g. Extra sauce, no onions, well-done"
                                      className="w-full px-3 py-1.5 text-xs bg-zinc-900 rounded-xl border border-zinc-700/80 focus:outline-none focus:ring-1.5 focus:ring-[#FF5A26] focus:border-[#FF5A26] placeholder:text-zinc-500 text-white transition"
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
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                        General Special Requests for Table
                      </label>
                      <textarea
                        rows={2}
                        value={generalNote}
                        onChange={(e) => setGeneralNote(e.target.value)}
                        placeholder="Any general requests? (e.g. bring appetizers together, extra napkins, allergic to nuts...)"
                        className="w-full p-3 text-xs bg-zinc-900 rounded-2xl border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#FF5A26] focus:border-[#FF5A26] placeholder:text-zinc-500 text-white resize-none transition"
                      />
                    </div>

                    {/* 4. Table-wide Voice Customization Section */}
                    <div className="p-4 sm:p-5">
                      <VoiceRecorder theme="dark" />
                    </div>

                    {/* 5. Table Number Selector / Validator */}
                    <div className="p-4 sm:p-5 bg-[#18181d] border-t border-zinc-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                          <span>Table Assignment:</span>
                          <span className="text-rose-500 font-black">*</span>
                        </label>
                        {tableInput && (
                          <span className="text-xs font-bold text-[#FF7A45] bg-[#FF5A26]/15 px-2.5 py-0.5 rounded-full border border-[#FF5A26]/30">
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
                          className={`flex-1 px-3.5 py-2 text-xs sm:text-sm bg-zinc-900 rounded-xl border font-bold transition ${
                            tableError
                              ? 'border-rose-500 ring-2 ring-rose-500/30 text-rose-200'
                              : 'border-zinc-700/80 focus:ring-1 focus:ring-[#FF5A26] focus:border-[#FF5A26] text-white placeholder-zinc-500'
                          }`}
                        />

                        {/* Quick 1-6 picker chips */}
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5, 6].map((num) => (
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
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl text-xs font-black transition active:scale-95 cursor-pointer ${
                                String(tableInput) === String(num)
                                  ? 'flame-gradient-btn text-white shadow-xs'
                                  : 'bg-zinc-900 text-zinc-300 border border-zinc-750 hover:bg-zinc-800'
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>

                      {tableError && (
                        <p className="text-xs text-rose-400 font-semibold flex items-center gap-1 mt-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Please enter or pick your table number before submitting your order!
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Drawer Footer: Bill Breakdown & Submit Button */}
              {items.length > 0 && (
                <div className="p-4 sm:p-5 bg-[#161619] border-t border-zinc-800 shrink-0 space-y-3 shadow-xl">
                  
                  {/* Bill Breakdown */}
                  <div className="space-y-1.5 text-xs text-zinc-400 font-medium">
                    <div className="flex justify-between">
                      <span>Items Subtotal</span>
                      <span className="font-semibold text-zinc-200">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="flex items-center gap-1">
                        Estimated Tax (5%)
                        <span className="text-[10px] text-zinc-500">(Local rate)</span>
                      </span>
                      <span className="font-semibold text-zinc-200">${tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base font-black text-white pt-2 border-t border-zinc-800">
                      <span>Total Amount</span>
                      <span className="text-[#FF5A26] font-black text-xl sm:text-2xl">
                        ${grandTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Confirm & Send Order Button */}
                  <button
                    type="button"
                    onClick={handleConfirmOrder}
                    disabled={isSubmitting || items.length === 0}
                    className={`w-full py-4 px-5 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg transition-all active:scale-98 cursor-pointer ${
                      isSubmitting
                        ? 'bg-[#FF5A26]/80 text-white cursor-wait'
                        : 'flame-gradient-btn shadow-[#FF5A26]/30'
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
                        <ArrowRight className="w-4 h-4 stroke-[3]" />
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-center text-zinc-500 font-medium">
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
