const express = require('express');
const router = express.Router();
const db = require('../db');

const MAX_TEXT_LENGTH = 500;
const MAX_ID_LENGTH = 100;

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

function cleanId(value, max = MAX_ID_LENGTH) {
  if (value === undefined || value === null) return '';
  return String(value).trim().slice(0, max);
}

/**
 * GET /api/staff/messages?recipient=<id>
 */
function handleGetMessages(req, res) {
  try {
    const recipient = cleanId(req.query.recipient || req.query.toWaiterId);
    if (!recipient) {
      return res.status(400).json({ success: false, error: 'recipient is required' });
    }
    const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500);
    const messages = db.getStaffMessagesForRecipient(recipient, limit);
    return res.status(200).json({ success: true, data: messages });
  } catch (err) {
    console.error('Error fetching staff messages:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve messages: ' + err.message });
  }
}

/**
 * POST /api/staff/messages
 * Body: the message object the client already builds (id, toWaiterId, text, ...).
 */
function handleSendMessage(req, res) {
  try {
    const body = req.body || {};

    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) {
      return res.status(400).json({ success: false, error: 'Message text is required' });
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({ success: false, error: `Message must be ${MAX_TEXT_LENGTH} characters or fewer` });
    }

    const toWaiterId = cleanId(body.toWaiterId);
    if (!toWaiterId) {
      return res.status(400).json({ success: false, error: 'Recipient (toWaiterId) is required' });
    }

    const now = Date.now();
    const id = cleanId(body.id, 100) || `msg-${now}-${Math.random().toString(36).slice(2, 6)}`;
    const isAlert = body.isAlert === true || body.category === 'alert';

    const message = {
      id,
      from: cleanId(body.from, 30) || (body.fromEmployeeId ? 'Employee' : 'Admin'),
      fromName: cleanId(body.fromName, 80) || 'Unknown',
      fromRole: cleanId(body.fromRole, 80),
      fromEmployeeId: cleanId(body.fromEmployeeId, 40),
      fromStaffId: cleanId(body.fromStaffId, 40),
      toWaiterId,
      toWaiterName: cleanId(body.toWaiterName, 80) || 'Floor Specialist',
      text,
      timestamp: Number.isFinite(Number(body.timestamp)) ? Number(body.timestamp) : now,
      status: cleanId(body.status, 20) || 'pending',
      urgent: body.urgent !== false,
      isAlert,
      category: isAlert ? 'alert' : 'normal',
      tableNumber: body.tableNumber ? Number(body.tableNumber) || null : null,
      replies: [],
      read: false
    };

    const saved = db.createStaffMessage(message);

    emitSocket(req, 'staff:message', saved);

    return res.status(201).json({ success: true, data: saved });
  } catch (err) {
    console.error('Error sending staff message:', err);
    return res.status(500).json({ success: false, error: 'Failed to send message: ' + err.message });
  }
}

/**
 * PATCH /api/staff/messages/:id/read
 */
function handleMarkRead(req, res) {
  try {
    const id = cleanId(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, error: 'Invalid message ID' });
    }
    const updated = db.markStaffMessageRead(id);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }
    emitSocket(req, 'staff:message:read', { id, read: true });
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    console.error('Error marking staff message read:', err);
    return res.status(500).json({ success: false, error: 'Failed to update message: ' + err.message });
  }
}

router.get('/messages', handleGetMessages);
router.post('/messages', handleSendMessage);
router.patch('/messages/:id/read', handleMarkRead);

module.exports = router;
