const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

// Ensure uploads/voices directory exists
const voicesUploadDir = path.join(__dirname, '..', 'uploads', 'voices');
if (!fs.existsSync(voicesUploadDir)) {
  fs.mkdirSync(voicesUploadDir, { recursive: true });
}

// Setup multer disk storage for voice notes
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, voicesUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    let ext = path.extname(file.originalname) || '';
    if (!ext) {
      if (file.mimetype.includes('webm')) ext = '.webm';
      else if (file.mimetype.includes('wav')) ext = '.wav';
      else if (file.mimetype.includes('mp4') || file.mimetype.includes('m4a')) ext = '.mp4';
      else if (file.mimetype.includes('ogg')) ext = '.ogg';
      else ext = '.webm';
    }
    cb(null, `voice-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Allow common audio formats recorded by browser MediaRecorder
  const allowedMimes = [
    'audio/webm',
    'audio/wav',
    'audio/x-wav',
    'audio/mp4',
    'audio/aac',
    'audio/m4a',
    'audio/x-m4a',
    'audio/ogg',
    'video/webm',
    'video/mp4'
  ];
  if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(null, true); // Permissive for local-first audio blobs
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
  fileFilter
});

/**
 * Helper to emit Socket.IO events safely
 */
function emitSocket(req, event, data) {
  try {
    const io = req.io || (req.app && typeof req.app.get === 'function' ? req.app.get('io') : null);
    if (io && typeof io.emit === 'function') {
      io.emit(event, data);
    }
  } catch (err) {
    console.warn(`[Socket.IO emit warning (${event})]:`, err.message);
  }
}

/**
 * Helper to save base64 audio string to disk
 */
function saveBase64Audio(base64Data) {
  try {
    if (!base64Data || typeof base64Data !== 'string') return null;

    // Detect format: "data:audio/webm;base64,...."
    let mimeType = 'audio/webm';
    let rawBase64 = base64Data;
    let ext = '.webm';

    const matches = base64Data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (matches) {
      mimeType = matches[1];
      rawBase64 = matches[2];
      if (mimeType.includes('wav')) ext = '.wav';
      else if (mimeType.includes('mp4')) ext = '.mp4';
      else if (mimeType.includes('ogg')) ext = '.ogg';
      else ext = '.webm';
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const fileName = `voice-${uniqueSuffix}${ext}`;
    const filePath = path.join(voicesUploadDir, fileName);

    const buffer = Buffer.from(rawBase64, 'base64');
    fs.writeFileSync(filePath, buffer);

    return `/uploads/voices/${fileName}`;
  } catch (err) {
    console.error('Failed to save base64 audio:', err);
    return null;
  }
}

/**
 * GET /api/orders/stats
 * Overview stats for kitchen and admin dashboard
 */
router.get('/stats', (req, res) => {
  try {
    const stats = db.getRestaurantStats();
    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (err) {
    console.error('Error fetching restaurant stats:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve stats: ' + err.message
    });
  }
});

/**
 * GET /api/orders
 * Returns recent orders with optional status filtering
 * Query params:
 *   ?status=pending|preparing|ready|served|cancelled
 *   ?limit=50
 */
router.get('/', (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    let orders = db.getRecentOrders(limit);

    if (req.query.status) {
      const requestedStatuses = req.query.status
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);

      if (requestedStatuses.length > 0) {
        orders = orders.filter(o => requestedStatuses.includes(o.status.toLowerCase()));
      }
    }

    if (req.query.table || req.query.table_number) {
      const tableNum = Number(req.query.table || req.query.table_number);
      if (!isNaN(tableNum)) {
        orders = orders.filter(o => o.table_number === tableNum);
      }
    }

    return res.status(200).json({
      success: true,
      data: orders
    });
  } catch (err) {
    console.error('Error fetching orders:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve orders: ' + err.message
    });
  }
});

/**
 * GET /api/orders/:id
 * Retrieve single order by ID or order_number
 */
router.get('/:id', (req, res) => {
  try {
    const order = db.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: order
    });
  } catch (err) {
    console.error('Error retrieving order:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve order: ' + err.message
    });
  }
});

/**
 * POST /api/orders
 * Creates an order.
 * Accepts JSON or multipart/form-data (with optional voiceNote file upload or base64 audio).
 * Emits Socket.IO 'order:new' to notify KDS immediately.
 */
router.post('/', upload.single('voiceNote'), async (req, res) => {
  try {
    const body = req.body || {};

    // 1. Resolve table number
    const rawTable = body.table_number !== undefined ? body.table_number : (body.tableNumber !== undefined ? body.tableNumber : body.table);
    const tableNumber = Number(rawTable);
    if (!tableNumber || isNaN(tableNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Valid table number is required'
      });
    }

    // 2. Resolve items array
    let items = body.items;
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: 'Items parameter must be a valid JSON array string'
        });
      }
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Order must contain at least one item'
      });
    }

    // 3. Format order items
    const normalizedItems = items.map(it => ({
      menu_item_id: it.menu_item_id || it.id || it.menuItemId || null,
      name: it.name || 'Menu Item',
      price: Number(it.price) || 0,
      quantity: Number(it.quantity || it.qty) || 1,
      note: it.note || it.itemNote || null
    }));

    // 4. Resolve voice note URL (Direct to Telegram CDN with local fallback)
    let voiceNoteUrl = null;
    let localVoicePath = null;
    if (req.file) {
      voiceNoteUrl = `/uploads/voices/${req.file.filename}`;
      localVoicePath = req.file.path;
    } else if (body.voiceNote || body.voice_note || body.voiceNoteUrl || body.voice_note_url) {
      const voiceInput = body.voiceNote || body.voice_note || body.voiceNoteUrl || body.voice_note_url;
      if (typeof voiceInput === 'string') {
        if (voiceInput.startsWith('data:audio') || voiceInput.length > 500) {
          // It's a base64 encoded audio string
          voiceNoteUrl = saveBase64Audio(voiceInput);
          if (voiceNoteUrl) {
            localVoicePath = path.join(__dirname, '..', voiceNoteUrl.replace(/^\//, ''));
          }
        } else if (voiceInput.startsWith('/uploads/') || voiceInput.startsWith('http') || voiceInput.startsWith('/telegram-media/')) {
          voiceNoteUrl = voiceInput;
        }
      }
    }

    // Try hosting voice note directly on Telegram CDN
    if (localVoicePath && fs.existsSync(localVoicePath)) {
      try {
        const { storeMediaInTelegram } = require('../telegram');
        const tgVoice = await storeMediaInTelegram(localVoicePath, `🎙️ Customer Voice Note (Table #${tableNumber})`);
        if (tgVoice && tgVoice.success && tgVoice.permanentUrl) {
          voiceNoteUrl = tgVoice.permanentUrl;
        }
      } catch (tgVoiceErr) {
        console.warn('[Telegram Voice CDN upload fallback]:', tgVoiceErr.message);
      }
    }

    // 5. General notes
    const generalNote = body.general_note || body.generalNote || body.note || body.notes || null;

    // 6. Total amount
    const rawTotal = body.total_amount !== undefined ? body.total_amount : body.totalAmount;
    let totalAmount = rawTotal !== undefined && rawTotal !== null ? Number(rawTotal) : undefined;

    // 7. Save order in SQLite
    const savedOrder = db.createOrder({
      table_number: tableNumber,
      items: normalizedItems,
      voice_note_url: voiceNoteUrl,
      general_note: generalNote ? String(generalNote).trim() : null,
      total_amount: totalAmount
    });

    const { sendOrderToTelegram } = require('../telegram');

    // 8. Emit Socket.IO event for KDS instant real-time notification
    emitSocket(req, 'order:new', savedOrder);

    // 9. Post order to Telegram Channel (database / notification feed) with full details
    const orderPayloadForTelegram = {
      ...savedOrder,
      table_number: tableNumber,
      items: normalizedItems,
      customer_name: body.customer_name || body.customerName || body.guest,
      payment_method: body.payment_method || body.paymentMethod,
      voice_note_url: voiceNoteUrl || savedOrder.voice_note_url,
      general_note: generalNote ? String(generalNote).trim() : savedOrder.general_note
    };
    sendOrderToTelegram(orderPayloadForTelegram).catch(err => {
      console.warn('[Telegram order send error]:', err.message);
    });

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: savedOrder
    });
  } catch (err) {
    console.error('Error creating order:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to create order: ' + err.message
    });
  }
});

/**
 * PATCH /api/orders/:id/status
 * Updates order status ('pending', 'preparing', 'ready', 'served', 'completed', 'cancelled')
 * Emits Socket.IO 'order:status_update'
 */
router.patch('/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || typeof status !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    const normalizedStatus = status.trim().toLowerCase();
    const validStatuses = ['pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'];

    if (!validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const existing = db.getOrderById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const updatedOrder = db.updateOrderStatus(id, normalizedStatus);

    // Emit Socket.IO real-time notification
    emitSocket(req, 'order:status_update', updatedOrder);

    // Notify Telegram Channel of status transition
    const { sendOrderStatusUpdateToTelegram } = require('../telegram');
    sendOrderStatusUpdateToTelegram(updatedOrder, normalizedStatus, { note: req.body.note }).catch(err => {
      console.warn('[Telegram order status update error]:', err.message);
    });

    return res.status(200).json({
      success: true,
      data: updatedOrder
    });
  } catch (err) {
    console.error('Error updating order status:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to update order status: ' + err.message
    });
  }
});

module.exports = router;
