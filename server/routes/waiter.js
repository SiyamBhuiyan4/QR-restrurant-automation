const express = require('express');
const router = express.Router();
const db = require('../db');

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
 * Common call handler for both /call and /
 */
function handleCreateCall(req, res) {
  try {
    const body = req.body || {};
    const rawTable = body.table_number !== undefined 
      ? body.table_number 
      : (body.tableNumber !== undefined ? body.tableNumber : body.table);

    const tableNumber = Number(rawTable);
    if (!tableNumber || isNaN(tableNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Valid table number is required'
      });
    }

    const rawReason = body.reason || body.type || 'waiter';
    const reason = String(rawReason).trim();

    const callRecord = db.createWaiterCall(tableNumber, reason);

    // Emit Socket.IO real-time alert for staff & KDS
    emitSocket(req, 'waiter:call', callRecord);

    return res.status(201).json({
      success: true,
      message: `Waiter requested for Table ${tableNumber} (${reason})`,
      data: callRecord
    });
  } catch (err) {
    console.error('Error creating waiter call:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to request waiter: ' + err.message
    });
  }
}

/**
 * Common list handler for active waiter calls
 */
function handleGetCalls(req, res) {
  try {
    const calls = db.getActiveWaiterCalls();
    return res.status(200).json({
      success: true,
      data: calls
    });
  } catch (err) {
    console.error('Error fetching waiter calls:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve waiter calls: ' + err.message
    });
  }
}

/**
 * Common resolve handler
 */
function handleResolveCall(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid waiter call ID'
      });
    }

    const resolvedCall = db.resolveWaiterCall(id);
    if (!resolvedCall) {
      return res.status(404).json({
        success: false,
        error: 'Waiter call not found'
      });
    }

    // Emit Socket.IO event to dismiss alert on staff dashboards
    emitSocket(req, 'waiter:resolved', { id, call: resolvedCall });

    return res.status(200).json({
      success: true,
      message: 'Waiter call resolved',
      data: resolvedCall
    });
  } catch (err) {
    console.error('Error resolving waiter call:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to resolve waiter call: ' + err.message
    });
  }
}

// Routes mapping
router.post('/call', handleCreateCall);
router.post('/', handleCreateCall);

router.get('/calls', handleGetCalls);
router.get('/', handleGetCalls);

router.patch('/calls/:id/resolve', handleResolveCall);
router.patch('/:id/resolve', handleResolveCall);
router.post('/calls/:id/resolve', handleResolveCall);

module.exports = router;
