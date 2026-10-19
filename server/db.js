const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = __dirname;
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'restaurant.db');
const db = new DatabaseSync(dbPath);

// Enable WAL mode for high-concurrency read/write and foreign keys
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    icon TEXT,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    image_url TEXT,
    is_veg INTEGER DEFAULT 0,
    is_spicy INTEGER DEFAULT 0,
    is_available INTEGER DEFAULT 1,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE NOT NULL,
    table_number INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    total_amount REAL NOT NULL,
    voice_note_url TEXT,
    general_note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    menu_item_id INTEGER,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL,
    note TEXT,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS waiter_calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_number INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
  CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
  CREATE INDEX IF NOT EXISTS idx_waiter_calls_status ON waiter_calls(status);
`);

// Migration: Ensure making_video_url column exists on menu_items
try {
  const cols = db.prepare('PRAGMA table_info(menu_items)').all();
  if (!cols.some(c => c.name === 'making_video_url')) {
    db.exec('ALTER TABLE menu_items ADD COLUMN making_video_url TEXT;');
  }
} catch (e) {
  // Column already exists or table setup error
}

/**
 * -------------------------------------------------------------
 * Query Functions
 * -------------------------------------------------------------
 */

// Categories
function getCategories() {
  const stmt = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC, id ASC');
  return stmt.all();
}

function getCategoryBySlug(slug) {
  const stmt = db.prepare('SELECT * FROM categories WHERE slug = ?');
  return stmt.get(slug) || null;
}

function createCategory({ name, slug, icon = '🍽️', sort_order = 0 }) {
  if (!name) {
    throw new Error('Category name is required');
  }
  const categorySlug = slug || String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const existing = getCategoryBySlug(categorySlug);
  if (existing) {
    return existing;
  }
  const maxOrderStmt = db.prepare('SELECT MAX(sort_order) as maxOrder FROM categories');
  const maxOrder = maxOrderStmt.get()?.maxOrder || 0;
  const finalOrder = sort_order || (maxOrder + 1);

  const stmt = db.prepare(`
    INSERT INTO categories (name, slug, icon, sort_order)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(String(name).trim(), categorySlug, icon || '🍽️', finalOrder);
  return {
    id: result.lastInsertRowid,
    name: String(name).trim(),
    slug: categorySlug,
    icon: icon || '🍽️',
    sort_order: finalOrder
  };
}

// Menu Items
function getMenuItems(categoryId) {
  if (categoryId !== undefined && categoryId !== null && categoryId !== '' && categoryId !== 'all') {
    // If passed a numeric id or string id
    if (!isNaN(categoryId)) {
      const stmt = db.prepare(`
        SELECT m.*, c.name AS category_name, c.slug AS category_slug
        FROM menu_items m
        LEFT JOIN categories c ON m.category_id = c.id
        WHERE m.category_id = ?
        ORDER BY m.id ASC
      `);
      return stmt.all(Number(categoryId));
    } else {
      // If passed category slug
      const stmt = db.prepare(`
        SELECT m.*, c.name AS category_name, c.slug AS category_slug
        FROM menu_items m
        LEFT JOIN categories c ON m.category_id = c.id
        WHERE c.slug = ?
        ORDER BY m.id ASC
      `);
      return stmt.all(String(categoryId));
    }
  }

  const stmt = db.prepare(`
    SELECT m.*, c.name AS category_name, c.slug AS category_slug
    FROM menu_items m
    LEFT JOIN categories c ON m.category_id = c.id
    ORDER BY c.sort_order ASC, m.id ASC
  `);
  return stmt.all();
}

function getMenuItemById(id) {
  const stmt = db.prepare(`
    SELECT m.*, c.name AS category_name, c.slug AS category_slug
    FROM menu_items m
    LEFT JOIN categories c ON m.category_id = c.id
    WHERE m.id = ?
  `);
  return stmt.get(Number(id)) || null;
}

function createMenuItem({ category_id, name, description = '', price, image_url = '', making_video_url = '', is_veg = 0, is_spicy = 0, is_available = 1 }) {
  if (!name || price === undefined || price === null) {
    throw new Error('Menu item name and price are required');
  }

  const stmt = db.prepare(`
    INSERT INTO menu_items (category_id, name, description, price, image_url, making_video_url, is_veg, is_spicy, is_available)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    category_id ? Number(category_id) : null,
    String(name).trim(),
    String(description || '').trim(),
    Number(price),
    String(image_url || '').trim(),
    String(making_video_url || '').trim(),
    is_veg ? 1 : 0,
    is_spicy ? 1 : 0,
    is_available ? 1 : 0
  );

  return getMenuItemById(result.lastInsertRowid);
}

function updateMenuItem(id, updates = {}) {
  const existing = getMenuItemById(id);
  if (!existing) {
    return null;
  }

  const fields = ['category_id', 'name', 'description', 'price', 'image_url', 'making_video_url', 'is_veg', 'is_spicy', 'is_available'];
  const setClauses = [];
  const values = [];

  for (const field of fields) {
    if (updates[field] !== undefined) {
      setClauses.push(`${field} = ?`);
      let val = updates[field];
      if (['is_veg', 'is_spicy', 'is_available'].includes(field)) {
        val = val ? 1 : 0;
      } else if (field === 'price') {
        val = Number(val);
      } else if (field === 'category_id') {
        val = val ? Number(val) : null;
      }
      values.push(val);
    }
  }

  if (setClauses.length > 0) {
    values.push(Number(id));
    const stmt = db.prepare(`UPDATE menu_items SET ${setClauses.join(', ')} WHERE id = ?`);
    stmt.run(...values);
  }

  return getMenuItemById(id);
}

function deleteMenuItem(id) {
  const stmt = db.prepare('DELETE FROM menu_items WHERE id = ?');
  const result = stmt.run(Number(id));
  return { success: result.changes > 0, id: Number(id), changes: result.changes };
}

function toggleItemAvailability(id, is_available) {
  let stmt;
  if (is_available !== undefined) {
    stmt = db.prepare('UPDATE menu_items SET is_available = ? WHERE id = ?');
    stmt.run(is_available ? 1 : 0, Number(id));
  } else {
    stmt = db.prepare('UPDATE menu_items SET is_available = CASE WHEN is_available = 1 THEN 0 ELSE 1 END WHERE id = ?');
    stmt.run(Number(id));
  }
  return getMenuItemById(id);
}

// Orders
function createOrder({ table_number, items = [], voice_note_url = null, general_note = null, total_amount }) {
  if (!table_number) {
    throw new Error('Table number is required');
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Order items must be a non-empty array');
  }

  // Calculate total amount if not explicitly provided
  let calculatedTotal = total_amount;
  if (calculatedTotal === undefined || calculatedTotal === null) {
    calculatedTotal = items.reduce((sum, item) => {
      const p = Number(item.price) || 0;
      const q = Number(item.quantity) || 1;
      return sum + p * q;
    }, 0);
  }
  calculatedTotal = Math.round(Number(calculatedTotal) * 100) / 100;

  // Generate unique order number (e.g. ORD-T4-829103)
  const now = Date.now();
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  const orderNumber = `ORD-T${table_number}-${now.toString().slice(-4)}${randomSuffix}`;

  // Execute transactionally
  db.exec('BEGIN TRANSACTION;');
  try {
    const orderStmt = db.prepare(`
      INSERT INTO orders (order_number, table_number, status, total_amount, voice_note_url, general_note, created_at, updated_at)
      VALUES (?, ?, 'pending', ?, ?, ?, datetime('now'), datetime('now'))
    `);

    const orderRes = orderStmt.run(
      orderNumber,
      Number(table_number),
      calculatedTotal,
      voice_note_url || null,
      general_note || null
    );

    const orderId = Number(orderRes.lastInsertRowid);

    const itemStmt = db.prepare(`
      INSERT INTO order_items (order_id, menu_item_id, name, price, quantity, note)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const item of items) {
      itemStmt.run(
        orderId,
        item.menu_item_id || item.id || null,
        String(item.name || 'Menu Item'),
        Number(item.price) || 0,
        Number(item.quantity) || 1,
        item.note || null
      );
    }

    db.exec('COMMIT;');
    return getOrderById(orderId);
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

function getOrderById(id) {
  let order;
  if (typeof id === 'string' && id.startsWith('ORD-')) {
    const stmt = db.prepare('SELECT * FROM orders WHERE order_number = ?');
    order = stmt.get(id);
  } else {
    const stmt = db.prepare('SELECT * FROM orders WHERE id = ?');
    order = stmt.get(Number(id));
  }

  if (!order) return null;

  const itemsStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC');
  const items = itemsStmt.all(order.id);

  return {
    ...order,
    items
  };
}

function getRecentOrders(limit = 50) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 500));
  const ordersStmt = db.prepare('SELECT * FROM orders ORDER BY created_at DESC, id DESC LIMIT ?');
  const orders = ordersStmt.all(safeLimit);

  if (orders.length === 0) {
    return [];
  }

  const orderIds = orders.map(o => o.id);
  const placeholders = orderIds.map(() => '?').join(',');
  const itemsStmt = db.prepare(`SELECT * FROM order_items WHERE order_id IN (${placeholders}) ORDER BY id ASC`);
  const allItems = itemsStmt.all(...orderIds);

  const itemsByOrderId = {};
  for (const item of allItems) {
    if (!itemsByOrderId[item.order_id]) {
      itemsByOrderId[item.order_id] = [];
    }
    itemsByOrderId[item.order_id].push(item);
  }

  return orders.map(order => ({
    ...order,
    items: itemsByOrderId[order.id] || []
  }));
}

function updateOrderStatus(id, status) {
  const validStatuses = ['pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'];
  const normalizedStatus = String(status).toLowerCase().trim();

  let stmt;
  if (typeof id === 'string' && id.startsWith('ORD-')) {
    stmt = db.prepare(`
      UPDATE orders
      SET status = ?, updated_at = datetime('now')
      WHERE order_number = ?
    `);
    stmt.run(normalizedStatus, id);
  } else {
    stmt = db.prepare(`
      UPDATE orders
      SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(normalizedStatus, Number(id));
  }

  return getOrderById(id);
}

// Waiter Calls
function createWaiterCall(table_number, reason = 'Assistance requested') {
  if (!table_number) {
    throw new Error('Table number is required');
  }

  const stmt = db.prepare(`
    INSERT INTO waiter_calls (table_number, reason, status, created_at)
    VALUES (?, ?, 'pending', datetime('now'))
  `);

  const result = stmt.run(Number(table_number), String(reason).trim());
  const callStmt = db.prepare('SELECT * FROM waiter_calls WHERE id = ?');
  return callStmt.get(result.lastInsertRowid);
}

function getActiveWaiterCalls() {
  const stmt = db.prepare(`
    SELECT * FROM waiter_calls
    WHERE status = 'pending'
    ORDER BY created_at DESC, id DESC
  `);
  return stmt.all();
}

function resolveWaiterCall(id) {
  const stmt = db.prepare(`
    UPDATE waiter_calls
    SET status = 'resolved'
    WHERE id = ?
  `);
  stmt.run(Number(id));

  const getStmt = db.prepare('SELECT * FROM waiter_calls WHERE id = ?');
  return getStmt.get(Number(id)) || null;
}

// Restaurant Statistics for Kitchen / Dashboard
function getRestaurantStats() {
  const totals = db.prepare(`
    SELECT
      COUNT(*) AS total_orders,
      COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) AS total_revenue
    FROM orders
  `).get();

  const todayStats = db.prepare(`
    SELECT
      COUNT(*) AS today_orders,
      COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) AS today_revenue
    FROM orders
    WHERE date(created_at) = date('now')
  `).get();

  const activeOrders = db.prepare(`
    SELECT COUNT(*) AS active_orders
    FROM orders
    WHERE status IN ('pending', 'preparing', 'ready')
  `).get();

  const activeCalls = db.prepare(`
    SELECT COUNT(*) AS active_waiter_calls
    FROM waiter_calls
    WHERE status = 'pending'
  `).get();

  const menuStats = db.prepare(`
    SELECT
      COUNT(*) AS total_menu_items,
      SUM(CASE WHEN is_available = 1 THEN 1 ELSE 0 END) AS available_menu_items
    FROM menu_items
  `).get();

  const popularItems = db.prepare(`
    SELECT
      oi.name,
      SUM(oi.quantity) AS total_quantity,
      ROUND(SUM(oi.price * oi.quantity), 2) AS total_sales
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status != 'cancelled'
    GROUP BY oi.name
    ORDER BY total_quantity DESC
    LIMIT 5
  `).all();

  const statusCounts = db.prepare(`
    SELECT status, COUNT(*) AS count
    FROM orders
    GROUP BY status
  `).all();

  const statusMap = {
    pending: 0,
    preparing: 0,
    ready: 0,
    served: 0,
    completed: 0,
    cancelled: 0
  };
  for (const s of statusCounts) {
    statusMap[s.status] = s.count;
  }

  return {
    total_orders: totals.total_orders,
    total_revenue: Math.round(totals.total_revenue * 100) / 100,
    today_orders: todayStats.today_orders,
    today_revenue: Math.round(todayStats.today_revenue * 100) / 100,
    active_orders: activeOrders.active_orders,
    active_waiter_calls: activeCalls.active_waiter_calls,
    total_menu_items: menuStats.total_menu_items,
    available_menu_items: menuStats.available_menu_items || 0,
    orders_by_status: statusMap,
    popular_items: popularItems
  };
}

module.exports = {
  db,
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
  getRestaurantStats
};

// Check if tables are empty and auto-seed if seed.js exists
try {
  const categoryCount = db.prepare('SELECT count(*) as count FROM categories').get().count;
  if (categoryCount === 0) {
    const seedPath = path.join(__dirname, 'seed.js');
    if (fs.existsSync(seedPath)) {
      const { seedDatabase } = require('./seed');
      if (typeof seedDatabase === 'function') {
        seedDatabase();
      }
    }
  }
} catch (e) {
  // Silent catch during module loading if seed.js is not yet created
}
