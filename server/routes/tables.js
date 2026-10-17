const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const path = require('path');

// Try to import getLocalIp helper from server/network
let getLocalIp = () => '127.0.0.1';
try {
  const netModule = require('../network');
  if (typeof netModule.getLocalIp === 'function') {
    getLocalIp = netModule.getLocalIp;
  }
} catch (e) {
  // fallback if network.js not loaded
}

/**
 * Determine default baseUrl based on request headers and local IP
 */
function resolveBaseUrl(req) {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.get('host');
  
  if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    return `${protocol}://${host}`;
  }

  // Use LAN IP so mobile phones scanning QR code can connect over Wi-Fi
  const lanIp = getLocalIp();
  const port = process.env.PORT || 3000;
  return `https://${lanIp}:${port}`;
}

/**
 * GET /api/tables/info
 * Returns local network IP, server port, baseUrl, and default table QR URLs.
 */
router.get('/info', (req, res) => {
  try {
    const lanIp = getLocalIp();
    const port = Number(process.env.PORT) || 3000;
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const baseUrl = req.query.baseUrl || resolveBaseUrl(req);
    const tableCount = Math.min(Math.max(Number(req.query.count) || 20, 1), 100);

    const tables = [];
    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');

    for (let i = 1; i <= tableCount; i++) {
      tables.push({
        table: i,
        url: `${cleanBaseUrl}/?table=${i}`
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        localIp: lanIp,
        port,
        protocol,
        baseUrl: cleanBaseUrl,
        totalTables: tableCount,
        tables
      }
    });
  } catch (err) {
    console.error('Error fetching tables info:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve tables info: ' + err.message
    });
  }
});

/**
 * GET /api/tables/qr
 * Generates a QR code data URL pointing to `${baseUrl}/?table=${tableNumber}`
 * Query params:
 *   ?table=N (required, e.g. 1, 2, 3...)
 *   ?baseUrl=https://... (optional, defaults to LAN IP URL)
 *   ?format=dataUrl|svg (optional, default: dataUrl)
 */
router.get('/qr', async (req, res) => {
  try {
    const rawTable = req.query.table !== undefined ? req.query.table : req.query.tableNumber;
    const table = Number(rawTable);

    if (!table || isNaN(table) || table < 1) {
      return res.status(400).json({
        success: false,
        error: 'A valid table number (?table=N) is required'
      });
    }

    const rawBaseUrl = req.query.baseUrl ? String(req.query.baseUrl).trim() : resolveBaseUrl(req);
    const cleanBaseUrl = rawBaseUrl.replace(/\/+$/, '');
    const targetUrl = `${cleanBaseUrl}/?table=${table}`;

    const qrOptions = {
      errorCorrectionLevel: 'H',
      margin: 2,
      scale: 8,
      color: {
        dark: '#0f172a', // Slate 900
        light: '#ffffff'
      }
    };

    if (req.query.format === 'svg') {
      const svgString = await QRCode.toString(targetUrl, { ...qrOptions, type: 'svg' });
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.status(200).send(svgString);
    }

    const dataUrl = await QRCode.toDataURL(targetUrl, qrOptions);

    return res.status(200).json({
      success: true,
      data: {
        table,
        url: targetUrl,
        qrCode: dataUrl
      }
    });
  } catch (err) {
    console.error('Error generating QR code:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate QR code: ' + err.message
    });
  }
});

/**
 * GET /api/tables/batch-qr
 * Generates QR codes for multiple tables in a single request (useful for printable stickers).
 * Query params:
 *   ?from=1&to=10
 *   ?baseUrl=...
 */
router.get('/batch-qr', async (req, res) => {
  try {
    const from = Math.max(1, Number(req.query.from) || 1);
    const to = Math.min(50, Math.max(from, Number(req.query.to) || 10));
    const rawBaseUrl = req.query.baseUrl ? String(req.query.baseUrl).trim() : resolveBaseUrl(req);
    const cleanBaseUrl = rawBaseUrl.replace(/\/+$/, '');

    const qrOptions = {
      errorCorrectionLevel: 'H',
      margin: 2,
      scale: 6,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    };

    const results = [];
    for (let table = from; table <= to; table++) {
      const targetUrl = `${cleanBaseUrl}/?table=${table}`;
      const dataUrl = await QRCode.toDataURL(targetUrl, qrOptions);
      results.push({
        table,
        url: targetUrl,
        qrCode: dataUrl
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        from,
        to,
        baseUrl: cleanBaseUrl,
        tables: results
      }
    });
  } catch (err) {
    console.error('Error generating batch QR codes:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate batch QR codes: ' + err.message
    });
  }
});

module.exports = router;
