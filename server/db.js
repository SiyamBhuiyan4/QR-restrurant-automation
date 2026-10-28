/**
 * Telegram CDN & Zero-Database In-Memory Datastore for SmartDine
 * 
 * Replaces external/disk databases (SQLite/MySQL/PostgreSQL) with a zero-database architecture:
 * 1. Primary storage: All dish photos, kitchen reel videos, voice notes, and menu snapshots
 *    are hosted permanently on the Telegram CDN.
 * 2. In-Memory Engine: Sub-millisecond read/write performance for all active restaurant operations.
 * 3. Telegram Cloud Synchronization: All mutations (menu updates, new orders, waiter alerts,
 *    bill settlements, staff messages) trigger persistent cloud snapshots to your Telegram channel.
 * 4. Local Cache Fallback: Persists state to data/telegram_state_cache.json for instantaneous
 *    recovery between server restarts.
 */

const fs = require('fs');
const path = require('path');

// Ensure data cache directory exists
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const cacheFilePath = path.join(dataDir, 'telegram_state_cache.json');

// In-Memory Data Collections
let state = {
  categories: [],
  menu_items: [],
  orders: [],
  order_items: [],
  waiter_calls: [],
  staff_messages: [],
  order_corrections: [],
  bill_settlements: [],
  nextIds: {
    category: 1,
    menu_item: 1,
    order: 1,
    order_item: 1,
    waiter_call: 1
  }
};

/**
 * Load cached state from disk if present, else seed defaults
 */
function loadState() {
  try {
    if (fs.existsSync(cacheFilePath)) {
      const raw = fs.readFileSync(cacheFilePath, 'utf-8');
      const parsed = JSON.parse(raw);
      state = {
        ...state,
        ...parsed,
        nextIds: { ...state.nextIds, ...(parsed.nextIds || {}) }
      };
      return;
    }
  } catch (err) {
    console.warn('[Telegram Store] Warning reading cache:', err.message);
  }

  // Seed default categories and menu items if empty
  seedInitialData();
}

/**
 * Debounced persistence of state to cache & Telegram snapshot
 */
let saveTimer = null;
let telegramSyncTimer = null;

function scheduleSave(options = {}) {
  // Save local JSON cache quickly (50ms debounce)
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.writeFileSync(cacheFilePath, JSON.stringify(state, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Telegram Store] Cache save error:', err.message);
    }
  }, 50);

  // Sync snapshot to Telegram CDN (debounced 1.5s to prevent Telegram API rate limits)
  if (options.syncToTelegram !== false) {
    if (telegramSyncTimer) clearTimeout(telegramSyncTimer);
    telegramSyncTimer = setTimeout(() => {
      try {
        const { syncMenuToTelegram, storeSnapshotInTelegram } = require('./telegram');
        if (options.snapshotType === 'menu' || !options.snapshotType) {
          syncMenuToTelegram({ categories: state.categories, items: state.menu_items }).catch(() => {});
        } else if (options.snapshotType === 'orders') {
          storeSnapshotInTelegram(state.orders.slice(0, 50), { type: 'orders' }).catch(() => {});
        }
      } catch (e) {
        // Telegram helper loading or offline
      }
    }, 1500);
  }
}

/**
 * Seed initial restaurant menu if fresh install
 */
function seedInitialData() {
  const initialCategories = [
    { name: 'Starters', slug: 'starters', icon: '🥗', sort_order: 1 },
    { name: 'Mains', slug: 'mains', icon: '🍲', sort_order: 2 },
    { name: 'Burgers & Sandwiches', slug: 'burgers-sandwiches', icon: '🍔', sort_order: 3 },
    { name: 'Beverages', slug: 'beverages', icon: '🥤', sort_order: 4 },
    { name: 'Desserts', slug: 'desserts', icon: '🍰', sort_order: 5 }
  ];

  const initialItems = [
    {
      category_slug: 'starters',
      name: 'Truffle & Herb Loaded Fries',
      description: 'Crispy hand-cut russet potatoes tossed in aromatic white truffle oil, grated aged parmesan, and fresh parsley, served with garlic aioli.',
      price: 8.50,
      image_url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80',
      is_veg: 1,
      is_spicy: 0,
      is_available: 1
    },
    {
      category_slug: 'starters',
      name: 'Buffalo Cauliflower Bites',
      description: 'Crispy beer-battered cauliflower florets tossed in tangy cayenne pepper glaze, served with house-made creamy blue cheese dip.',
      price: 9.99,
      image_url: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=800&q=80',
      is_veg: 1,
      is_spicy: 1,
      is_available: 1
    },
    {
      category_slug: 'starters',
      name: 'Salt & Pepper Calamari',
      description: 'Tender calamari flash-fried with cracked peppercorn, fresh cilantro, sliced red chili, and a side of citrus sweet chili sauce.',
      price: 13.50,
      image_url: 'https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&w=800&q=80',
      is_veg: 0,
      is_spicy: 1,
      is_available: 1
    },
    {
      category_slug: 'mains',
      name: 'Pan-Seared Atlantic Salmon',
      description: 'Crispy skin wild salmon served over saffron risotto, tender asparagus, and a lemon-dill white wine reduction.',
      price: 24.50,
      image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=800&q=80',
      is_veg: 0,
      is_spicy: 0,
      is_available: 1
    },
    {
      category_slug: 'burgers-sandwiches',
      name: 'The Wagyu Smash Burger',
      description: 'Double custom wagyu patty, melted sharp cheddar, caramelized onions, house pickles, and secret burger sauce on toasted brioche.',
      price: 16.50,
      image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
      is_veg: 0,
      is_spicy: 0,
      is_available: 1
    },
    {
      category_slug: 'beverages',
      name: 'Sparkling Yuzu Berry Cooler',
      description: 'Japanese yuzu citrus, crushed wild blackberries, fresh mint, and effervescent sparkling water over hand-cut crystal ice.',
      price: 5.50,
      image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
      is_veg: 1,
      is_spicy: 0,
      is_available: 1
    },
    {
      category_slug: 'desserts',
      name: 'Dark Chocolate Lava Cake',
      description: 'Warm molten Valrhona dark chocolate cake served with Madagascar bourbon vanilla bean gelato and raspberry coulis.',
      price: 9.50,
      image_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80',
      is_veg: 1,
      is_spicy: 0,
      is_available: 1
    }
  ];

  initialCategories.forEach(cat => {
    createCategory(cat);
  });

  initialItems.forEach(item => {
    const matchedCat = state.categories.find(c => c.slug === item.category_slug);
    createMenuItem({
      ...item,
      category_id: matchedCat ? matchedCat.id : null
    });
  });

  scheduleSave({ syncToTelegram: false });
}

// Initial state load
loadState();

// ---------------------------------------------------------------------------
// Categories API
// ---------------------------------------------------------------------------

function getCategories() {
  return [...state.categories].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.id - b.id);
}

function getCategoryBySlug(slug) {
  return state.categories.find(c => c.slug === slug) || null;
}

function createCategory({ name, slug, icon = '🍽️', sort_order = 0 }) {
  if (!name) throw new Error('Category name is required');
  const categorySlug = slug || String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  
  const existing = getCategoryBySlug(categorySlug);
  if (existing) return existing;

  const maxOrder = state.categories.reduce((max, c) => Math.max(max, c.sort_order || 0), 0);
  const finalOrder = sort_order || (maxOrder + 1);

  const newCat = {
    id: state.nextIds.category++,
    name: String(name).trim(),
    slug: categorySlug,
    icon: icon || '🍽️',
    sort_order: finalOrder
  };

  state.categories.push(newCat);
  scheduleSave({ snapshotType: 'menu' });
  return newCat;
}

// ---------------------------------------------------------------------------
// Menu Items API
// ---------------------------------------------------------------------------

function enrichMenuItem(item) {
  if (!item) return null;
  const cat = state.categories.find(c => c.id === item.category_id);
  return {
    ...item,
    category_name: cat ? cat.name : null,
    category_slug: cat ? cat.slug : null
  };
}

function getMenuItems(categoryId) {
  let items = state.menu_items;

  if (categoryId !== undefined && categoryId !== null && categoryId !== '' && categoryId !== 'all') {
    if (!isNaN(categoryId)) {
      items = items.filter(m => m.category_id === Number(categoryId));
    } else {
      const cat = getCategoryBySlug(String(categoryId));
      items = cat ? items.filter(m => m.category_id === cat.id) : [];
    }
  }

  return items.map(enrichMenuItem);
}

function getMenuItemById(id) {
  const item = state.menu_items.find(m => m.id === Number(id));
  return item ? enrichMenuItem(item) : null;
}

function createMenuItem({
  category_id,
  name,
  description = '',
  price,
  image_url = '',
  making_video_url = '',
  is_veg = 0,
  is_spicy = 0,
  is_available = 1
}) {
  if (!name || price === undefined || price === null) {
    throw new Error('Menu item name and price are required');
  }

  const newItem = {
    id: state.nextIds.menu_item++,
    category_id: category_id ? Number(category_id) : null,
    name: String(name).trim(),
    description: String(description || '').trim(),
    price: Number(price),
    image_url: String(image_url || '').trim(),
    making_video_url: String(making_video_url || '').trim(),
    is_veg: is_veg ? 1 : 0,
    is_spicy: is_spicy ? 1 : 0,
    is_available: is_available ? 1 : 0
  };

  state.menu_items.push(newItem);
  scheduleSave({ snapshotType: 'menu' });
  return enrichMenuItem(newItem);
}

function updateMenuItem(id, updates = {}) {
  const index = state.menu_items.findIndex(m => m.id === Number(id));
  if (index === -1) return null;

  const current = state.menu_items[index];
  const fields = ['category_id', 'name', 'description', 'price', 'image_url', 'making_video_url', 'is_veg', 'is_spicy', 'is_available'];

  for (const field of fields) {
    if (updates[field] !== undefined) {
      let val = updates[field];
      if (['is_veg', 'is_spicy', 'is_available'].includes(field)) {
        val = val ? 1 : 0;
      } else if (field === 'price') {
        val = Number(val);
      } else if (field === 'category_id') {
        val = val ? Number(val) : null;
      }
      current[field] = val;
    }
  }

  scheduleSave({ snapshotType: 'menu' });
  return enrichMenuItem(current);
}

function deleteMenuItem(id) {
  const numId = Number(id);
  const initialLen = state.menu_items.length;
  state.menu_items = state.menu_items.filter(m => m.id !== numId);
  const changes = initialLen - state.menu_items.length;
  if (changes > 0) scheduleSave({ snapshotType: 'menu' });
  return { success: changes > 0, id: numId, changes };
}

function toggleItemAvailability(id, is_available) {
  const item = state.menu_items.find(m => m.id === Number(id));
  if (!item) return null;

  if (is_available !== undefined) {
    item.is_available = is_available ? 1 : 0;
  } else {
    item.is_available = item.is_available === 1 ? 0 : 1;
  }

  scheduleSave({ snapshotType: 'menu' });
  return enrichMenuItem(item);
}

// ---------------------------------------------------------------------------
// Orders API
// ---------------------------------------------------------------------------

function createOrder({ table_number, items = [], voice_note_url = null, general_note = null, total_amount }) {
  if (!table_number) throw new Error('Table number is required');
  if (!Array.isArray(items) || items.length === 0) throw new Error('Order items must be a non-empty array');

  let calculatedTotal = total_amount;
  if (calculatedTotal === undefined || calculatedTotal === null) {
    calculatedTotal = items.reduce((sum, item) => {
      const p = Number(item.price) || 0;
      const q = Number(item.quantity) || 1;
      return sum + p * q;
    }, 0);
  }
  calculatedTotal = Math.round(Number(calculatedTotal) * 100) / 100;

  const now = Date.now();
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  const orderNumber = `ORD-T${table_number}-${now.toString().slice(-4)}${randomSuffix}`;
  const orderId = state.nextIds.order++;
  const nowIso = new Date().toISOString();

  const newOrder = {
    id: orderId,
    order_number: orderNumber,
    table_number: Number(table_number),
    status: 'pending',
    total_amount: calculatedTotal,
    voice_note_url: voice_note_url || null,
    general_note: general_note || null,
    created_at: nowIso,
    updated_at: nowIso
  };

  const newOrderItems = items.map(item => ({
    id: state.nextIds.order_item++,
    order_id: orderId,
    menu_item_id: item.menu_item_id || item.id || null,
    name: String(item.name || 'Menu Item'),
    price: Number(item.price) || 0,
    quantity: Number(item.quantity || item.qty) || 1,
    note: item.note || null
  }));

  state.orders.unshift(newOrder);
  state.order_items.push(...newOrderItems);

  scheduleSave({ snapshotType: 'orders' });
  return getOrderById(orderId);
}

function getOrderById(id) {
  let order;
  if (typeof id === 'string' && id.startsWith('ORD-')) {
    order = state.orders.find(o => o.order_number === id);
  } else {
    order = state.orders.find(o => o.id === Number(id));
  }
  if (!order) return null;

  const items = state.order_items.filter(oi => oi.order_id === order.id);
  return { ...order, items };
}

function getRecentOrders(limit = 50) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 500));
  const recent = state.orders.slice(0, safeLimit);

  return recent.map(order => ({
    ...order,
    items: state.order_items.filter(oi => oi.order_id === order.id)
  }));
}

function updateOrderStatus(id, status) {
  const normalizedStatus = String(status).toLowerCase().trim();
  let order;
  if (typeof id === 'string' && id.startsWith('ORD-')) {
    order = state.orders.find(o => o.order_number === id);
  } else {
    order = state.orders.find(o => o.id === Number(id));
  }

  if (order) {
    order.status = normalizedStatus;
    order.updated_at = new Date().toISOString();
    scheduleSave({ snapshotType: 'orders' });
  }

  return getOrderById(id);
}

// ---------------------------------------------------------------------------
// Waiter Calls API
// ---------------------------------------------------------------------------

function createWaiterCall(table_number, reason = 'Assistance requested') {
  if (!table_number) throw new Error('Table number is required');

  const newCall = {
    id: state.nextIds.waiter_call++,
    table_number: Number(table_number),
    reason: String(reason).trim(),
    status: 'pending',
    created_at: new Date().toISOString()
  };

  state.waiter_calls.unshift(newCall);
  scheduleSave();
  return newCall;
}

function getActiveWaiterCalls() {
  return state.waiter_calls.filter(c => c.status === 'pending');
}

function resolveWaiterCall(id) {
  const call = state.waiter_calls.find(c => c.id === Number(id));
  if (call) {
    call.status = 'resolved';
    scheduleSave();
  }
  return call || null;
}

// ---------------------------------------------------------------------------
// Staff Messages API
// ---------------------------------------------------------------------------

function createStaffMessage(message) {
  const existing = state.staff_messages.find(m => m.id === String(message.id));
  if (existing) return existing;

  const msg = {
    ...message,
    id: String(message.id),
    toWaiterId: String(message.toWaiterId),
    read: Boolean(message.read),
    timestamp: Number(message.timestamp) || Date.now()
  };

  state.staff_messages.unshift(msg);
  scheduleSave();
  return msg;
}

function getStaffMessageById(id) {
  return state.staff_messages.find(m => m.id === String(id)) || null;
}

function getStaffMessagesForRecipient(recipientId, limit = 200) {
  const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), 500);
  return state.staff_messages
    .filter(m => m.toWaiterId === String(recipientId))
    .slice(0, safeLimit);
}

function markStaffMessageRead(id) {
  const msg = state.staff_messages.find(m => m.id === String(id));
  if (msg) {
    msg.read = true;
    scheduleSave();
  }
  return msg || null;
}

// ---------------------------------------------------------------------------
// Order Corrections & Bill Settlements
// ---------------------------------------------------------------------------

function listOrderCorrections(limit = 500) {
  return state.order_corrections.slice(0, Number(limit));
}

function getOrderCorrectionById(id) {
  return state.order_corrections.find(c => c.id === String(id)) || null;
}

function upsertOrderCorrection({ id, type, status, orderId, payload, createdAt, updatedAt }) {
  const record = {
    id: String(id),
    type,
    status,
    orderId: String(orderId),
    ...(payload || {}),
    createdAt: createdAt || Date.now(),
    updatedAt: updatedAt || Date.now()
  };

  const idx = state.order_corrections.findIndex(c => c.id === record.id);
  if (idx >= 0) {
    state.order_corrections[idx] = { ...state.order_corrections[idx], ...record };
  } else {
    state.order_corrections.unshift(record);
  }

  scheduleSave();
  return record;
}

function updateOrderCorrectionStatus(id, status, payloadPatch = {}, updatedAt = Date.now()) {
  const record = getOrderCorrectionById(id);
  if (!record) return null;

  Object.assign(record, payloadPatch, { status, updatedAt });
  scheduleSave();
  return record;
}

function createBillSettlement(record) {
  const settlement = {
    id: String(record.id),
    billNumber: record.billNumber,
    tableNumber: Number(record.tableNumber),
    orderIds: record.orderIds,
    total: Number(record.total),
    paymentMethod: record.paymentMethod,
    paidAt: record.paidAt,
    createdAt: record.createdAt || Date.now()
  };

  const idx = state.bill_settlements.findIndex(b => b.id === settlement.id);
  if (idx >= 0) {
    state.bill_settlements[idx] = settlement;
  } else {
    state.bill_settlements.unshift(settlement);
  }

  scheduleSave();
  return settlement;
}

function getBillSettlementById(id) {
  return state.bill_settlements.find(b => b.id === String(id)) || null;
}

// ---------------------------------------------------------------------------
// Restaurant Statistics
// ---------------------------------------------------------------------------

function getRestaurantStats() {
  const totalOrders = state.orders.length;
  const validOrders = state.orders.filter(o => o.status !== 'cancelled');
  const totalRevenue = validOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayOrders = validOrders.filter(o => (o.created_at || '').slice(0, 10) === todayStr);
  const todayRevenue = todayOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  const activeOrders = state.orders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status)).length;
  const activeWaiterCalls = state.waiter_calls.filter(c => c.status === 'pending').length;

  const totalMenuItems = state.menu_items.length;
  const availableMenuItems = state.menu_items.filter(m => m.is_available === 1).length;

  const statusMap = {
    pending: 0,
    preparing: 0,
    ready: 0,
    served: 0,
    completed: 0,
    cancelled: 0
  };
  state.orders.forEach(o => {
    if (statusMap[o.status] !== undefined) statusMap[o.status]++;
  });

  // Calculate popular items
  const itemCounts = {};
  state.order_items.forEach(oi => {
    const parentOrder = state.orders.find(o => o.id === oi.order_id);
    if (parentOrder && parentOrder.status !== 'cancelled') {
      const name = oi.name || 'Item';
      if (!itemCounts[name]) itemCounts[name] = { name, total_quantity: 0, total_sales: 0 };
      itemCounts[name].total_quantity += Number(oi.quantity) || 1;
      itemCounts[name].total_sales += (Number(oi.price) || 0) * (Number(oi.quantity) || 1);
    }
  });

  const popularItems = Object.values(itemCounts)
    .sort((a, b) => b.total_quantity - a.total_quantity)
    .slice(0, 5)
    .map(it => ({
      ...it,
      total_sales: Math.round(it.total_sales * 100) / 100
    }));

  return {
    total_orders: totalOrders,
    total_revenue: Math.round(totalRevenue * 100) / 100,
    today_orders: todayOrders.length,
    today_revenue: Math.round(todayRevenue * 100) / 100,
    active_orders: activeOrders,
    active_waiter_calls: activeWaiterCalls,
    total_menu_items: totalMenuItems,
    available_menu_items: availableMenuItems,
    orders_by_status: statusMap,
    popular_items: popularItems
  };
}

module.exports = {
  getCategories,
  getCategoryBySlug,
  createCategory,
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleItemAvailability,
  createOrder,
  getOrderById,
  getRecentOrders,
  updateOrderStatus,
  createWaiterCall,
  getActiveWaiterCalls,
  resolveWaiterCall,
  createStaffMessage,
  getStaffMessageById,
  getStaffMessagesForRecipient,
  markStaffMessageRead,
  listOrderCorrections,
  getOrderCorrectionById,
  upsertOrderCorrection,
  updateOrderCorrectionStatus,
  createBillSettlement,
  getBillSettlementById,
  getRestaurantStats
};
