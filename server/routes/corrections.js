const express = require('express');
const router = express.Router();
const db = require('../db');

const CORRECTION_TYPES = ['void', 'discount', 'void_request'];
const DISCOUNT_TYPES = ['percent', 'fixed'];
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function emitSocket(req, event, data) {
  try {
    const io = req.io || (req.app && typeof req.app.get === 'function' ? req.app.get('io') : null);
    if (io && typeof io.emit === 'function') io.emit(event, data);
  } catch (err) {
    console.warn(`[Socket.IO emit warning (${event})]:`, err.message);
  }
}

function fail(res, status, error) {
  return res.status(status).json({ success: false, error });
}

function cleanText(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

function isNonEmptyId(value) {
  return (typeof value === 'string' || typeof value === 'number') && String(value).trim() !== '' && String(value).length <= 64;
}

function validateItemIndexes(value) {
  if (!Array.isArray(value) || value.length === 0) return null;
  const ok = value.every(v => Number.isInteger(v) && v >= 0 && v < 1000);
  return ok ? [...new Set(value)] : null;
}

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// GET /api/corrections - all corrections (voids, discounts, void requests)
router.get('/corrections', (req, res) => {
  try {
    const data = db.listOrderCorrections(Number(req.query.limit) || 500);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('Error listing corrections:', err);
    return fail(res, 500, 'Failed to load corrections');
  }
});

// POST /api/corrections - create a void, discount, or void request
router.post('/corrections', (req, res) => {
  try {
    const body = req.body || {};
    const type = body.type;
    if (!CORRECTION_TYPES.includes(type)) {
      return fail(res, 400, `type must be one of: ${CORRECTION_TYPES.join(', ')}`);
    }
    if (!isNonEmptyId(body.orderId)) {
      return fail(res, 400, 'orderId is required');
    }
    const reason = cleanText(body.reason, 200);
    if (!reason) {
      return fail(res, 400, 'reason is required');
    }
    if (body.id !== undefined && (typeof body.id !== 'string' || !ID_PATTERN.test(body.id))) {
      return fail(res, 400, 'id must be 1-64 characters: letters, digits, _ or -');
    }

    const now = Date.now();
    const id = body.id || generateId(type === 'void_request' ? 'vreq' : type);
    const base = {
      orderId: String(body.orderId),
      orderLabel: cleanText(body.orderLabel, 120),
      tableNumber: body.tableNumber ?? null,
      reason,
      note: cleanText(body.note, 500),
      actor: body.actor && typeof body.actor === 'object' ? body.actor : null,
      createdAt: now
    };

    let status;
    let payload;

    if (type === 'discount') {
      const discountType = body.discountType;
      if (!DISCOUNT_TYPES.includes(discountType)) {
        return fail(res, 400, 'discountType must be percent or fixed');
      }
      const value = Number(body.value);
      if (!Number.isFinite(value) || value <= 0) {
        return fail(res, 400, 'value must be a number above zero');
      }
      if (discountType === 'percent' && value > 100) {
        return fail(res, 400, 'percent discount cannot exceed 100');
      }
      status = 'applied';
      payload = { ...base, discountType, value, appliedBy: cleanText(body.appliedBy, 100) || null, appliedAt: now };
    } else {
      const itemIndexes = validateItemIndexes(body.itemIndexes);
      if (!itemIndexes) {
        return fail(res, 400, 'itemIndexes must be a non-empty array of item positions');
      }
      const itemNames = Array.isArray(body.itemNames) ? body.itemNames.map(n => cleanText(n, 120)).slice(0, 200) : [];
      status = type === 'void_request' ? 'pending' : 'applied';
      payload = {
        ...base,
        itemIndexes,
        itemNames,
        wholeOrder: body.wholeOrder === true,
        requestedBy: cleanText(body.requestedBy, 100) || null,
        requestedById: cleanText(body.requestedById, 100) || null,
        requestedAt: now
      };
      if (type === 'void') {
        payload.appliedBy = cleanText(body.appliedBy, 100) || null;
        payload.appliedAt = now;
      }
    }

    const record = db.upsertOrderCorrection({
      id, type, status, orderId: payload.orderId, payload, createdAt: now, updatedAt: now
    });

    emitSocket(req, 'correction:changed', { action: 'created', record });
    return res.status(201).json({ success: true, data: record });
  } catch (err) {
    console.error('Error creating correction:', err);
    return fail(res, 500, 'Failed to save correction');
  }
});

// PATCH /api/corrections/:id - approve/reject a pending void request, or clear a discount
router.patch('/corrections/:id', (req, res) => {
  try {
    const current = db.getOrderCorrectionById(req.params.id);
    if (!current) return fail(res, 404, 'Correction not found');

    const status = (req.body || {}).status;
    const resolvedBy = cleanText((req.body || {}).resolvedBy, 100) || null;
    const now = Date.now();

    if (current.type === 'void_request') {
      if (!['approved', 'rejected'].includes(status)) {
        return fail(res, 400, 'status must be approved or rejected for a void request');
      }
      if (current.status !== 'pending') {
        return fail(res, 409, 'Void request is no longer pending');
      }
      const record = db.updateOrderCorrectionStatus(current.id, status, { resolvedBy, resolvedAt: now }, now);
      emitSocket(req, 'correction:changed', { action: status === 'approved' ? 'approved' : 'rejected', record });
      return res.json({ success: true, data: record });
    }

    if (current.type === 'discount') {
      if (status !== 'cleared') {
        return fail(res, 400, 'status must be cleared for a discount');
      }
      if (current.status !== 'applied') {
        return fail(res, 409, 'Discount is already cleared');
      }
      const record = db.updateOrderCorrectionStatus(current.id, 'cleared', { clearedBy: resolvedBy, clearedAt: now }, now);
      emitSocket(req, 'correction:changed', { action: 'cleared', record });
      return res.json({ success: true, data: record });
    }

    return fail(res, 400, 'Voids cannot be changed');
  } catch (err) {
    console.error('Error updating correction:', err);
    return fail(res, 500, 'Failed to update correction');
  }
});

// POST /api/settlements - record a table bill settlement
router.post('/settlements', (req, res) => {
  try {
    const body = req.body || {};
    const billNumber = cleanText(body.billNumber, 40);
    if (!billNumber) return fail(res, 400, 'billNumber is required');

    const tableNumber = Number(body.tableNumber);
    if (!Number.isInteger(tableNumber) || tableNumber <= 0) {
      return fail(res, 400, 'tableNumber must be a positive integer');
    }

    if (!Array.isArray(body.orderIds) || body.orderIds.length === 0 || !body.orderIds.every(isNonEmptyId)) {
      return fail(res, 400, 'orderIds must be a non-empty array of order ids');
    }

    const total = Number(body.total);
    if (!Number.isFinite(total) || total < 0) {
      return fail(res, 400, 'total must be a number of zero or more');
    }

    const paymentMethod = cleanText(body.paymentMethod, 40);
    if (!paymentMethod) return fail(res, 400, 'paymentMethod is required');

    const paidAtDate = new Date(body.paidAt);
    if (!body.paidAt || Number.isNaN(paidAtDate.getTime())) {
      return fail(res, 400, 'paidAt must be a valid date');
    }

    const now = Date.now();
    const record = db.createBillSettlement({
      id: generateId('settle'),
      billNumber,
      tableNumber,
      orderIds: body.orderIds.map(String),
      total,
      paymentMethod,
      paidAt: paidAtDate.toISOString(),
      createdAt: now
    });

    emitSocket(req, 'settlement:created', record);
    return res.status(201).json({ success: true, data: record });
  } catch (err) {
    console.error('Error recording settlement:', err);
    return fail(res, 500, 'Failed to record settlement');
  }
});

module.exports = router;
