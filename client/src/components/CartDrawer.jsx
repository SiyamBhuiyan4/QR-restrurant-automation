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
import { uploadVoiceBlob } from '../utils/voiceUpload.js';
import { sendOrderToTelegramChannel, sendVoiceNoteToTelegram } from '../services/telegramClient';

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
    <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-[#0f172a]/80 border border-emerald-500/30 text-slate-100 transition-colors duration-200">
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
        className="w-11 h-11 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-95 text-slate-950 flex items-center justify-center shrink-0 transition-transform duration-150 shadow-sm cursor-pointer motion-reduce:transform-none"
        title={isPlaying ? 'Pause' : 'Play dish voice note'}
      >
        {isPlaying ? (
          <Pause className="w-3.5 h-3.5 fill-current" />
        ) : (
          <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-100 leading-none mb-1">
          <span className="flex items-center gap-1 font-bold">
            <Volume2 className="w-3 h-3 text-emerald-400" />
            Chef Voice Note
          </span>
          <span className="font-mono text-emerald-200/60 text-[10px]">
            {formatSec(currentTime)} / {formatSec(duration)}
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-400 transition-all duration-100" 
            style={{ width: `${progress}%` }} 
          />
        </div>
      </div>

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="w-11 h-11 -mr-1 rounded-xl flex items-center justify-center text-[#f5efe0]/65 hover:text-[#e8795f] hover:bg-[#c8442b]/15 transition-colors cursor-pointer"
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

  // Convex file-storage upload URL mutation (voice notes are uploaded as blobs)
  let generateUploadUrl = null;
  try {
    generateUploadUrl = useMutation(api.orders.generateUploadUrl);
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
      const orderNumber = `SD-${Date.now().toString().slice(-4)}`;
      const voiceBlob = cartCtx?.voiceBlob || null;

      // 1. Assemble full order payload
      const orderPayload = {
        _id: `sd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        orderId: orderNumber,
        orderNumber: orderNumber,
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
        voiceBlob: voiceBlob,
        voiceNote: voiceBlob ? null : (cartCtx?.voiceUrl || null),
        status: 'pending',
        createdAt: new Date().toISOString(),
        timestamp: Date.now()
      };

      // 2. Send entire order to Telegram Channel
      try {
        await sendOrderToTelegramChannel(orderPayload);
      } catch (tgErr) {
        console.warn('[CartDrawer] Telegram send order warning:', tgErr);
      }

      // 3. If customer recorded a voice note (voiceBlob), upload directly to Telegram Channel
      if (voiceBlob) {
        try {
          const voiceRes = await sendVoiceNoteToTelegram(voiceBlob, {
            tableNumber: finalTable,
            orderNumber: orderPayload.orderNumber
          });
          if (voiceRes?.cdnUrl) {
            orderPayload.voiceUrl = voiceRes.cdnUrl;
            orderPayload.voiceNoteUrl = voiceRes.cdnUrl;
          }
        } catch (voiceErr) {
          console.warn('[CartDrawer] Telegram voice upload warning:', voiceErr);
        }
      }

      // 4. Store the order locally:
      // a) Add to smartdine_kds_orders in localStorage so KitchenDisplay instantly gets the ticket
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const existingKds = JSON.parse(localStorage.getItem('smartdine_kds_orders') || '[]');
          const storageItem = {
            ...orderPayload,
            voiceBlob: undefined // Raw blobs cannot be JSON-serialized
          };
          const updatedKds = [
            storageItem,
            ...existingKds.filter((o) => (o.orderId || o.orderNumber) !== (orderPayload.orderId || orderPayload.orderNumber))
          ];
          localStorage.setItem('smartdine_kds_orders', JSON.stringify(updatedKds));
        }
      } catch (storageErr) {
        console.warn('[CartDrawer] LocalStorage KDS write warning:', storageErr);
      }

      // b) Dispatch window event for instant ticket rendering in KitchenDisplay (same tab)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('smartdine:new-order', { detail: orderPayload }));
      }

      // c) Post via BroadcastChannel for multi-tab sync
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const bcKds = new BroadcastChannel('smartdine_kds');
          bcKds.postMessage({
            type: 'smartdine:new-order',
            order: orderPayload,
            detail: orderPayload,
            timestamp: Date.now()
          });
          bcKds.close();
        } catch (_) {}

        try {
          const bcState = new BroadcastChannel('smartdine_restaurant_state');
          bcState.postMessage({
            type: 'NEW_ORDER',
            order: orderPayload,
            data: orderPayload,
            timestamp: Date.now()
          });
          bcState.close();
        } catch (_) {}
      }

      // 5. Non-blocking Convex background sync (removes blocking reliance on Convex)
      if (createConvexOrder) {
        (async () => {
          try {
            let voiceStorageId;
            if (voiceBlob && generateUploadUrl) {
              try {
                voiceStorageId = await uploadVoiceBlob(voiceBlob, generateUploadUrl);
              } catch (uErr) {
                console.warn('[CartDrawer] Convex voice upload skipped:', uErr);
              }
            }
            await createConvexOrder({
              tableNumber: Number(finalTable) || 1,
              items: orderPayload.items.map((i) => ({
                name: i.name,
                price: Number(i.price) || 0,
                quantity: Number(i.quantity) || 1,
                note: i.note || undefined
              })),
              totalAmount: parseFloat(grandTotal.toFixed(2)),
              generalNote: generalNote.trim() || undefined,
              voiceStorageId
            });
          } catch (convexErr) {
            console.warn('[CartDrawer] Convex sync skipped (order saved via Telegram + local persistence):', convexErr);
          }
        })();
      }

      // Optional IndexedDB queue fallback for offline sync
      try {
        if (networkCtx?.submitOrder) {
          networkCtx.submitOrder(orderPayload).catch(() => {});
        } else {
          idbEnqueueOrder(orderPayload).catch(() => {});
        }
      } catch (_) {}

      const result = { success: true, offline: !navigator.onLine, orderId: orderPayload.orderId };

      // 6. Notify parent callback if provided
      if (propOnOrderSuccess) {
        propOnOrderSuccess(orderPayload, result);
      }

      // 7. Set confirmation animation state & clear cart
      setOrderConfirmation({
        ...orderPayload,
        isOfflineQueued: !navigator.onLine
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

  // Keep the panel mounted long enough for the slide-out transition to play
  const [mounted, setMounted] = useState(isOpen);
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      return;
    }
    const id = setTimeout(() => setMounted(false), 380);
    return () => clearTimeout(id);
  }, [isOpen]);

  if (!isOpen && !mounted) return null;

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
        className={`fixed inset-0 bg-[#06140e]/80 backdrop-blur-sm transition-opacity duration-300 ease-out motion-reduce:transition-none ${entered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Mobile: bottom sheet. Desktop: right-side panel. */}
      <div
        className={`fixed inset-x-0 bottom-20 h-[calc(92dvh-5rem)] sm:inset-x-auto sm:inset-y-0 sm:bottom-0 sm:h-auto sm:right-0 max-w-full flex sm:pl-10 ${entered ? '' : 'pointer-events-none'}`}
      >
        <div
          className={`w-screen max-w-md h-full bg-[#0b0f19]/95 backdrop-blur-xl text-slate-100 shadow-2xl shadow-black/70 flex flex-col border-t sm:border-t-0 sm:border-l border-emerald-500/25 sm:border-emerald-500/25 rounded-t-[28px] sm:rounded-t-none sm:rounded-l-3xl overflow-hidden transform transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none will-change-transform ${entered ? 'translate-y-0 sm:translate-x-0' : 'translate-y-full sm:translate-y-0 sm:translate-x-full'} ${className}`}
        >
          
          {/* ========================================================
              STATE A: ORDER CONFIRMATION / CELEBRATION FEEDBACK
             ======================================================== */}
          {orderConfirmation ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fadeIn motion-reduce:animate-none">
              <div className="relative mb-5">
                <div
                  className={`w-20 h-20 rounded-3xl flex items-center justify-center text-white shadow-xl ${
                    orderConfirmation.isOfflineQueued
                      ? 'bg-amber-400 text-slate-950 shadow-amber-400/30'
                      : 'bg-emerald-600 shadow-emerald-900/40 text-white'
                  }`}
                >
                  {orderConfirmation.isOfflineQueued ? (
                    <Clock className="w-10 h-10 animate-pulse motion-reduce:animate-none" />
                  ) : (
                    <CheckCircle2 className="w-10 h-10 animate-bounce motion-reduce:animate-none" />
                  )}
                </div>
                <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#0b0f19]/80 border border-amber-400/30 flex items-center justify-center shadow-md">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                </div>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {orderConfirmation.isOfflineQueued ? 'Order Saved Offline!' : 'Order Sent to Kitchen!'}
              </h3>

              <p className="text-xs sm:text-sm text-stone-300 mt-1.5 max-w-xs font-medium leading-relaxed">
                {orderConfirmation.isOfflineQueued
                  ? `Table ${orderConfirmation.tableNumber} order is safely cached and will automatically push to the kitchen display the moment Wi-Fi reconnects.`
                  : `Your order has been printed on the kitchen display. The chefs are preparing your meal now!`}
              </p>

              {/* Order Receipt Box */}
              <div className="w-full bg-[#0f172a]/70 border border-emerald-500/25 rounded-2xl p-4 my-5 text-left text-xs space-y-2.5 shadow-xl">
                <div className="flex justify-between items-center pb-2.5 border-b border-emerald-500/20 font-bold text-white">
                  <span className="flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-emerald-400" />
                    Order #{orderConfirmation.orderId}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
                    Table {orderConfirmation.tableNumber}
                  </span>
                </div>

                <div className="space-y-1.5 py-1 max-h-40 overflow-y-auto">
                  {orderConfirmation.items.map((i, idx) => (
                    <div key={idx} className="flex justify-between text-[#f5efe0]/85 font-medium">
                      <span className="truncate pr-2">
                        {i.quantity}x {i.name}
                      </span>
                      <span className="font-bold text-[#f5efe0] shrink-0">
                        ${(i.price * i.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-[#d4af37]/25 flex justify-between font-black text-sm text-[#f5efe0]">
                  <span>Total Amount</span>
                  <span className="text-[#d4af37] font-black text-base">
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
                className="w-full min-h-[48px] py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-sm shadow-lg shadow-emerald-900/40 cursor-pointer transition-transform duration-150 active:scale-[0.98] motion-reduce:transform-none"
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
              <div className="p-4 sm:p-5 border-b border-emerald-500/20 flex items-center justify-between shrink-0 bg-[#0b0f19]/90">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center font-bold border border-emerald-500/30 shadow-xs">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 id="cart-drawer-title" className="font-extrabold text-white text-base sm:text-lg leading-tight flex items-center gap-2 tracking-tight">
                      Your Order
                      {totalItemCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          {totalItemCount}
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-stone-400 font-medium mt-0.5">
                      {currentTable ? `Table ${currentTable}` : 'Select table below'} &bull; Dine-In Experience
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-11 h-11 rounded-2xl bg-[#0f172a] hover:bg-slate-800 active:scale-95 flex items-center justify-center text-slate-300 hover:text-white transition-[transform,background-color,color] duration-150 cursor-pointer motion-reduce:transform-none shrink-0 border border-slate-700"
                  aria-label="Close cart drawer"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Scrollable Content Container */}
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain divide-y divide-emerald-500/15">
                
                {/* 1. Empty Cart State */}
                {items.length === 0 ? (
                  <div className="py-20 px-6 text-center flex flex-col items-center justify-center">
                    <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 text-emerald-300 flex items-center justify-center mb-4 border border-emerald-500/20 shadow-xs">
                      <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
                    </div>
                    <h3 className="font-extrabold text-white text-lg mb-1 tracking-tight">
                      Your cart is empty
                    </h3>
                    <p className="text-xs text-stone-400 max-w-xs mb-6 leading-relaxed">
                      Explore our delicious appetizers, chef specials, beverages, and desserts to add items to your table order.
                    </p>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="min-h-[48px] px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-sm shadow-lg shadow-emerald-900/40 cursor-pointer transition-transform duration-150 active:scale-[0.98] motion-reduce:transform-none"
                    >
                      Browse Menu
                    </button>
                  </div>
                ) : (
                  <>
                    {/* 2. Selected Dishes List */}
                    <div className="p-4 sm:p-5 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#f5efe0]/65">
                          Selected Dishes ({items.length})
                        </span>
                        {cartCtx?.clearCart && (
                          <button
                            type="button"
                            onClick={() => cartCtx.clearCart()}
                            className="min-h-11 px-2 -mr-2 inline-flex items-center text-xs text-[#e8795f] hover:text-[#f0a48f] font-semibold cursor-pointer transition-transform duration-150 active:scale-95 motion-reduce:transform-none"
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
                              className="bg-[#0f172a]/80 border border-emerald-500/20 rounded-2xl p-4 transition-colors duration-200 hover:border-emerald-500/40 shadow-md shadow-black/30"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0 pt-1">
                                  <h4 className="font-bold text-white text-sm leading-snug truncate">
                                    {dishName}
                                  </h4>
                                  <p className="text-xs text-[#d4af37] font-semibold mt-1">
                                    ${dishPrice.toFixed(2)} each
                                  </p>
                                </div>

                                {/* Item Total + Stepper */}
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                  <span className="font-extrabold text-sm text-[#f0d27a] tabular-nums">
                                    ${itemTotal}
                                  </span>

                                  <div className="inline-flex items-center bg-[#0b0f19] rounded-2xl p-0.5 border border-slate-700 shadow-sm">
                                    <button
                                      type="button"
                                      onClick={() => handleQuantityDelta(dishId, -1)}
                                      className="w-11 h-11 rounded-xl flex items-center justify-center hover:bg-slate-800 text-slate-100 transition-transform duration-150 active:scale-90 cursor-pointer motion-reduce:transform-none"
                                      title={quantity === 1 ? 'Remove item' : 'Decrease quantity'}
                                      aria-label="Decrease quantity"
                                    >
                                      {quantity === 1 ? (
                                        <Trash2 className="w-3.5 h-3.5 text-[#e8795f]" />
                                      ) : (
                                        <Minus className="w-3.5 h-3.5" />
                                      )}
                                    </button>

                                    <span className="w-8 text-center text-sm font-black text-white tabular-nums">
                                      {quantity}
                                    </span>

                                    <button
                                      type="button"
                                      onClick={() => handleQuantityDelta(dishId, 1)}
                                      className="w-11 h-11 rounded-xl flex items-center justify-center hover:bg-slate-800 text-slate-100 transition-transform duration-150 active:scale-90 cursor-pointer motion-reduce:transform-none"
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
                              <div className="mt-2.5 pt-2 border-t border-slate-800">
                                {!isNoteOpen ? (
                                  <button
                                    type="button"
                                    onClick={() => toggleNoteExpand(dishId)}
                                    className="min-h-11 -ml-1 px-1 inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-amber-400 font-medium transition-colors cursor-pointer"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Add note for chef (e.g. &ldquo;less spicy&rdquo;)</span>
                                  </button>
                                ) : (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[11px] font-bold text-stone-300 flex items-center gap-1">
                                        <MessageSquare className="w-3 h-3 text-amber-400" />
                                        <span>Cooking instructions:</span>
                                      </label>
                                      {!note && (
                                        <button
                                          type="button"
                                          onClick={() => toggleNoteExpand(dishId)}
                                          className="min-h-11 px-2 -mr-2 inline-flex items-center text-xs text-stone-400 hover:text-white font-semibold cursor-pointer"
                                        >
                                          Collapse
                                        </button>
                                      )}
                                    </div>

                                    {/* Quick Preset Tags */}
                                    <div className="flex flex-wrap gap-1.5 text-xs">
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
                                          className="min-h-11 px-3 rounded-xl bg-[#0b0f19] border border-slate-700 text-slate-200 hover:border-emerald-500/40 hover:text-emerald-300 transition-[transform,border-color,color] duration-150 active:scale-95 cursor-pointer motion-reduce:transform-none"
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
                                      className="w-full min-h-11 px-3.5 py-2 text-base sm:text-xs bg-[#0b0f19] rounded-xl border border-slate-700 focus:outline-none focus:ring-[1.5px] focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-stone-500 text-slate-100 transition"
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
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#f5efe0]/65">
                        General Special Requests for Table
                      </label>
                      <textarea
                        rows={2}
                        value={generalNote}
                        onChange={(e) => setGeneralNote(e.target.value)}
                        placeholder="Any general requests? (e.g. bring appetizers together, extra napkins, allergic to nuts...)"
                        className="w-full p-3.5 text-base sm:text-xs bg-[#0b0f19] rounded-2xl border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-stone-500 text-slate-100 resize-none transition"
                      />
                    </div>

                    {/* 4. Table-wide Voice Customization Section */}
                    <div className="p-4 sm:p-5">
                      <VoiceRecorder theme="dark" />
                    </div>

                    {/* 5. Table Number Selector / Validator */}
                    <div className="p-4 sm:p-5 bg-[#0b0f19]/80 border-t border-emerald-500/20 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                          <span>Table Assignment:</span>
                          <span className="text-[#e8795f] font-black">*</span>
                        </label>
                        {tableInput && (
                          <span className="text-xs font-bold text-amber-300 bg-amber-400/15 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                            Table {tableInput}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2.5">
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
                          className={`w-full min-h-11 px-3.5 py-2.5 text-base sm:text-sm bg-[#0b0f19] rounded-xl border font-bold transition ${
                            tableError
                              ? 'border-[#c8442b] ring-2 ring-[#c8442b]/40 text-white'
                              : 'border-slate-700 focus:ring-1 focus:ring-amber-400 focus:border-amber-400 text-white placeholder-stone-500'
                          }`}
                        />

                        {/* Quick 1-6 picker chips */}
                        <div className="grid grid-cols-6 gap-1.5">
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
                              className={`min-h-11 w-full rounded-xl text-sm font-black transition-[transform,background-color] duration-150 active:scale-95 cursor-pointer motion-reduce:transform-none ${
                                String(tableInput) === String(num)
                                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30'
                                  : 'bg-[#0f172a] text-slate-100 border border-slate-700 hover:bg-slate-800'
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>

                      {tableError && (
                        <p className="text-xs text-[#e8795f] font-semibold flex items-center gap-1 mt-1">
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
                <div className="relative z-10 shrink-0 px-4 sm:px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-5 bg-[#0b0f19]/95 backdrop-blur-md border-t border-emerald-500/25 space-y-3.5 shadow-[0_-12px_30px_-12px_rgba(0,0,0,0.7)]">

                  {/* Bill Breakdown */}
                  <div className="space-y-2 text-xs text-stone-300 font-medium">
                    <div className="flex justify-between">
                      <span>Items Subtotal</span>
                      <span className="font-semibold text-white">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="flex items-center gap-1">
                        Estimated Tax (5%)
                        <span className="text-[10px] text-stone-400">(Local rate)</span>
                      </span>
                      <span className="font-semibold text-white">${tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base font-black text-white pt-2 border-t border-slate-800">
                      <span>Total Amount</span>
                      <span className="text-amber-400 font-black text-xl sm:text-2xl">
                        ${grandTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Confirm & Send Order Button */}
                  <button
                    type="button"
                    onClick={handleConfirmOrder}
                    disabled={isSubmitting || items.length === 0}
                    className={`w-full min-h-[52px] py-4 px-5 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg transition-[transform,box-shadow] duration-150 active:scale-[0.98] cursor-pointer motion-reduce:transform-none ${
                      isSubmitting
                        ? 'bg-emerald-600/70 text-white cursor-wait'
                        : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-emerald-950/60 hover:shadow-emerald-900/70'
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

                  <p className="text-[11px] text-center text-[#f5efe0]/50 font-medium">
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
