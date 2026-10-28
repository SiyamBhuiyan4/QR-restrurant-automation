const express = require('express');
const router = express.Router();
const multer = require('multer');
const { Readable } = require('stream');

const {
  callTelegramApi,
  getTelegramCredentials,
  storeMediaInTelegram,
  storeSnapshotInTelegram,
  syncMenuToTelegram,
  sendOrderToTelegram,
  sendOrderStatusUpdateToTelegram,
  sendWaiterCallToTelegram,
  sendWaiterResolveToTelegram,
  sendCustomerReportToTelegram,
  streamTelegramMedia
} = require('../telegram');

const db = require('../db');

// Multer memory storage for incoming files to stream directly to Telegram
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
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
 * GET & POST /api/telegram/sync-menu
 * Synchronizes the entire menu (categories, dishes, prices, media links) to Telegram Channel as a cloud backup snapshot.
 * Accepts optional menu payload in request body or reads directly from SQLite database.
 */
async function handleSyncMenu(req, res) {
  try {
    const customMenu = req.body?.menu || req.body?.data || (req.body?.categories && req.body?.items ? req.body : null);

    const result = await syncMenuToTelegram(customMenu);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to sync menu with Telegram'
      });
    }

    // Emit Socket.IO notification that menu was backed up
    emitSocket(req, 'telegram:menu_synced', {
      timestamp: result.syncedAt,
      stats: result.stats
    });

    return res.status(200).json({
      success: true,
      message: 'Menu synced with Telegram cloud storage successfully',
      data: result
    });
  } catch (err) {
    console.error('[Telegram sync-menu Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Menu sync failed: ' + err.message
    });
  }
}

router.post('/sync-menu', handleSyncMenu);
router.get('/sync-menu', handleSyncMenu);

/**
 * POST /api/telegram/upload
 * Uploads media (dish photo or 360° video reel) directly to Telegram CDN
 * Returns permanent Telegram file ID and CDN streaming URL
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided for upload'
      });
    }

    const caption = req.body.caption || `📸 Food Media: ${req.file.originalname}`;
    const uploadResult = await storeMediaInTelegram(req.file, caption);

    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        error: uploadResult.error || uploadResult.reason || 'Failed to upload media to Telegram'
      });
    }

    return res.status(200).json({
      success: true,
      data: uploadResult
    });
  } catch (err) {
    console.error('[Telegram Upload Route Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Media upload failed: ' + err.message
    });
  }
});

/**
 * POST /api/telegram/snapshot
 * Creates and stores a structured system snapshot (database, orders, or custom state)
 */
router.post('/snapshot', async (req, res) => {
  try {
    const snapshotData = req.body.data || req.body.snapshot || req.body;
    const options = {
      type: req.body.type || 'state',
      filename: req.body.filename,
      caption: req.body.caption,
      metadata: req.body.metadata
    };

    const result = await storeSnapshotInTelegram(snapshotData, options);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to store snapshot in Telegram'
      });
    }

    return res.status(200).json({
      success: true,
      message: `Snapshot (${result.type}) saved to Telegram cloud ledger successfully`,
      data: result
    });
  } catch (err) {
    console.error('[Telegram Snapshot Route Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Snapshot storage failed: ' + err.message
    });
  }
});

/**
 * GET /api/telegram/status
 * Health check & credential verification for Telegram Bot & Channel
 */
router.get('/status', async (req, res) => {
  try {
    const { token, chatId } = getTelegramCredentials();
    if (!token || !chatId) {
      return res.status(200).json({
        success: false,
        configured: false,
        reason: 'Bot token or Chat ID is missing'
      });
    }

    const botRes = await callTelegramApi('getMe');
    const chatRes = await callTelegramApi('getChat', { chat_id: chatId });

    return res.status(200).json({
      success: botRes.success && chatRes.success,
      configured: true,
      bot: botRes.result || null,
      channel: chatRes.result ? {
        id: chatRes.result.id,
        title: chatRes.result.title,
        type: chatRes.result.type,
        invite_link: chatRes.result.invite_link
      } : null,
      chatId: String(chatId)
    });
  } catch (err) {
    console.error('[Telegram Status Route Error]:', err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/telegram/media/:fileId
 * Proxy stream from Telegram CDN with HTTP Range headers for video seeking
 */
router.get('/media/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const rangeHeader = req.headers.range;

    const streamResult = await streamTelegramMedia(fileId, rangeHeader);

    if (!streamResult.ok) {
      return res.status(streamResult.status || 502).json({
        success: false,
        error: streamResult.error || 'Failed to stream media from Telegram'
      });
    }

    res.writeHead(streamResult.status, streamResult.headers);
    const nodeStream = Readable.fromWeb(streamResult.body);
    nodeStream.pipe(res);
  } catch (err) {
    console.error('[Telegram Media Proxy Route Error]:', err);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }
});

/**
 * POST /api/telegram/order
 * Manual or webhook trigger to forward order to Telegram
 */
router.post('/order', async (req, res) => {
  try {
    const order = req.body;
    const result = await sendOrderToTelegram(order);
    return res.status(200).json({
      success: result.success,
      data: result
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/telegram/waiter
 * Manual or webhook trigger to forward waiter alert to Telegram
 */
router.post('/waiter', async (req, res) => {
  try {
    const call = req.body;
    const result = await sendWaiterCallToTelegram(call);
    return res.status(200).json({
      success: result.success,
      data: result
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/telegram/report
 * Forward customer report, complaint, compliment, or table note to Telegram
 */
router.post('/report', async (req, res) => {
  try {
    const report = req.body;
    const result = await sendCustomerReportToTelegram(report);
    return res.status(200).json({
      success: result.success,
      data: result
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
