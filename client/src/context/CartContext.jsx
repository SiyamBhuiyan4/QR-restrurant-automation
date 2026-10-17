import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const CartContext = createContext(null);

const CART_STORAGE_KEY = 'smartdine_cart';
const TABLE_STORAGE_KEY = 'smartdine_table';
const NOTE_STORAGE_KEY = 'smartdine_general_note';

/**
 * CartProvider component
 * Manages shopping cart state, dish customizations, table number, voice notes,
 * and drawer open/closed state. Persists cart items and table number across refreshes.
 */
export function CartProvider({ children }) {
  // 1. Cart Items state (persisted in localStorage)
  const [cartItems, setCartItems] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (err) {
      console.warn('[CartContext] Failed to parse cart from localStorage:', err);
    }
    return [];
  });

  // 2. Table Number state (auto-detects from URL param ?table=X or localStorage)
  const [tableNumber, setTableNumberState] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      const params = new URLSearchParams(window.location.search);
      const queryTable = params.get('table');
      if (queryTable) {
        localStorage.setItem(TABLE_STORAGE_KEY, queryTable);
        return queryTable;
      }
      return localStorage.getItem(TABLE_STORAGE_KEY) || '';
    } catch (_) {
      return '';
    }
  });

  // 3. General Notes & Voice Customization state
  const [generalNote, setGeneralNoteState] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      return localStorage.getItem(NOTE_STORAGE_KEY) || '';
    } catch (_) {
      return '';
    }
  });

  const [voiceBlob, setVoiceBlob] = useState(null);
  const [voiceUrl, setVoiceUrl] = useState(null);

  // 4. Cart Drawer visibility state
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Sync cart items to localStorage on state change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (err) {
      console.error('[CartContext] Failed to persist cart to localStorage:', err);
    }
  }, [cartItems]);

  // Sync general note to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (generalNote) {
        localStorage.setItem(NOTE_STORAGE_KEY, generalNote);
      } else {
        localStorage.removeItem(NOTE_STORAGE_KEY);
      }
    } catch (_) {}
  }, [generalNote]);

  // Actions
  const addToCart = useCallback((item, quantity = 1, note = '') => {
    if (!item) return;
    const addQty = Math.max(1, Number(quantity) || 1);
    const dishNote = typeof note === 'string' ? note.trim() : '';

    setCartItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (ci) => String(ci.item?.id) === String(item.id)
      );

      if (existingIndex >= 0) {
        const nextItems = [...prevItems];
        const existing = nextItems[existingIndex];
        nextItems[existingIndex] = {
          ...existing,
          quantity: existing.quantity + addQty,
          itemNote: dishNote ? dishNote : existing.itemNote
        };
        return nextItems;
      }

      return [
        ...prevItems,
        {
          item,
          quantity: addQty,
          itemNote: dishNote
        }
      ];
    });
  }, []);

  const removeFromCart = useCallback((itemId) => {
    setCartItems((prevItems) =>
      prevItems.filter((ci) => String(ci.item?.id) !== String(itemId))
    );
  }, []);

  const updateQuantity = useCallback((itemId, delta) => {
    setCartItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (ci) => String(ci.item?.id) === String(itemId)
      );
      if (existingIndex === -1) return prevItems;

      const current = prevItems[existingIndex];
      const newQuantity = current.quantity + delta;

      if (newQuantity <= 0) {
        return prevItems.filter((ci) => String(ci.item?.id) !== String(itemId));
      }

      const nextItems = [...prevItems];
      nextItems[existingIndex] = {
        ...current,
        quantity: newQuantity
      };
      return nextItems;
    });
  }, []);

  const updateItemNote = useCallback((itemId, note) => {
    const cleanNote = typeof note === 'string' ? note : '';
    setCartItems((prevItems) =>
      prevItems.map((ci) => {
        if (String(ci.item?.id) === String(itemId)) {
          return { ...ci, itemNote: cleanNote };
        }
        return ci;
      })
    );
  }, []);

  const setTableNumber = useCallback((num) => {
    const val = num !== undefined && num !== null ? String(num).trim() : '';
    setTableNumberState(val);
    try {
      if (val) {
        localStorage.setItem(TABLE_STORAGE_KEY, val);
      } else {
        localStorage.removeItem(TABLE_STORAGE_KEY);
      }
    } catch (_) {}
  }, []);

  const setGeneralNote = useCallback((note) => {
    setGeneralNoteState(typeof note === 'string' ? note : '');
  }, []);

  const setVoiceNote = useCallback((blob, url) => {
    // If an existing object URL was present and differs, revoke it
    if (voiceUrl && voiceUrl.startsWith('blob:') && voiceUrl !== url) {
      try {
        URL.revokeObjectURL(voiceUrl);
      } catch (_) {}
    }
    setVoiceBlob(blob);
    setVoiceUrl(url);
  }, [voiceUrl]);

  const clearVoiceNote = useCallback(() => {
    if (voiceUrl && voiceUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(voiceUrl);
      } catch (_) {}
    }
    setVoiceBlob(null);
    setVoiceUrl(null);
  }, [voiceUrl]);

  const clearCart = useCallback(() => {
    setCartItems([]);
    setGeneralNoteState('');
    clearVoiceNote();
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
      localStorage.removeItem(NOTE_STORAGE_KEY);
    } catch (_) {}
  }, [clearVoiceNote]);

  const getCartTotal = useCallback(() => {
    return cartItems.reduce((total, ci) => {
      const price = Number(ci.item?.price) || 0;
      const qty = Number(ci.quantity) || 1;
      return total + price * qty;
    }, 0);
  }, [cartItems]);

  const getItemCount = useCallback(() => {
    return cartItems.reduce((count, ci) => count + (Number(ci.quantity) || 0), 0);
  }, [cartItems]);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);
  const toggleCart = useCallback(() => setIsCartOpen((prev) => !prev), []);

  const value = useMemo(
    () => ({
      cartItems,
      tableNumber,
      generalNote,
      voiceBlob,
      voiceUrl,
      isCartOpen,
      setIsCartOpen,
      openCart,
      closeCart,
      toggleCart,
      addToCart,
      removeFromCart,
      updateQuantity,
      updateItemNote,
      setTableNumber,
      setGeneralNote,
      setVoiceNote,
      clearVoiceNote,
      clearCart,
      getCartTotal,
      getItemCount
    }),
    [
      cartItems,
      tableNumber,
      generalNote,
      voiceBlob,
      voiceUrl,
      isCartOpen,
      openCart,
      closeCart,
      toggleCart,
      addToCart,
      removeFromCart,
      updateQuantity,
      updateItemNote,
      setTableNumber,
      setGeneralNote,
      setVoiceNote,
      clearVoiceNote,
      clearCart,
      getCartTotal,
      getItemCount
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/**
 * useCart Hook
 * Safe consumer hook for CartContext
 */
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

export default CartContext;
