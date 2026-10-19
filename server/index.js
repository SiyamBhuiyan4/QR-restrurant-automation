const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const { getLocalIp, printServerBanner } = require('./network');
const { getOrCreateCertificates } = require('./ssl');

// Initialize Express application
const app = express();

// CORS middleware allowing all LAN origins and standard methods
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Body parsers with 50mb limit (for audio voice notes and image uploads)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure server/uploads directory exists and serve static uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Route loader that gracefully falls back if route modules are still initializing
function safeRouteRequire(routePath) {
  try {
    return require(routePath);
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND' && (err.message.includes(routePath) || err.requireStack?.[0] === __filename)) {
      const router = express.Router();
      router.use((req, res, next) => {
        try {
          delete require.cache[require.resolve(routePath)];
          const loadedRoute = require(routePath);
          return loadedRoute(req, res, next);
        } catch {
          return res.status(503).json({
            error: `Route ${req.originalUrl} is initializing or not yet available.`
          });
        }
      });
      return router;
    }
    throw err;
  }
}

// Mount API routes
app.use('/api/menu', safeRouteRequire('./routes/menu'));
app.use('/api/orders', safeRouteRequire('./routes/orders'));
app.use('/api/waiter', safeRouteRequire('./routes/waiter'));
app.use('/api/tables', safeRouteRequire('./routes/tables'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    lanIp: getLocalIp(),
    protocol
  });
});

// Serve client/dist static assets if built
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  // SPA fallback for HTML5 History API (KDS, Admin, Customer routes)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io')) {
      return next();
    }
    const indexPath = path.join(clientDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      next();
    }
  });
} else {
  // Helpful landing page when client is not yet built
  app.get('/', (req, res) => {
    const lanIp = getLocalIp();
    res.type('html').send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Smart Restaurant Server</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; margin: 0; }
            .container { max-width: 640px; margin: 40px auto; background: #1e293b; border-radius: 12px; padding: 2rem; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            h1 { color: #38bdf8; margin-top: 0; }
            code { background: #334155; padding: 3px 8px; border-radius: 6px; color: #f472b6; font-family: monospace; font-size: 0.9em; }
            ul { line-height: 2; }
            a { color: #38bdf8; text-decoration: none; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🍽️ Smart Restaurant Server Running</h1>
            <p>Offline-First Local Server is active and listening on LAN.</p>
            <ul>
              <li><strong>Local URL:</strong> <code>${protocol}://localhost:${PORT}</code></li>
              <li><strong>Network URL:</strong> <code>${protocol}://${lanIp}:${PORT}</code></li>
              <li><strong>Health Check:</strong> <a href="/api/health">/api/health</a></li>
            </ul>
            <p>To serve the client application, run <code>npm run build</code> in the <code>client</code> folder or run <code>npm run dev</code> for concurrent development.</p>
          </div>
        </body>
      </html>
    `);
  });
}

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack || err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Setup HTTPS server using self-signed certificates from server/ssl.js
let server;
let protocol = 'https';

try {
  const { key, cert } = getOrCreateCertificates();
  server = https.createServer({ key, cert }, app);
} catch (sslErr) {
  console.error('[SSL] Failed to initialize HTTPS certificates:', sslErr.message);
  console.warn('[Server] Falling back to HTTP server...');
  protocol = 'http';
  server = http.createServer(app);
}

// Initialize Socket.IO on the server
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
  }
});

// Make io instance accessible on Express app and incoming requests
app.set('io', io);
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Handle Socket.IO connection and broadcast events
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Support joining rooms (e.g. table rooms, kitchen, waiter)
  socket.on('join', (room) => {
    socket.join(room);
  });

  // Relay order:new broadcast event to all clients (KDS, Waiter, Admin)
  socket.on('order:new', (payload) => {
    console.log('[Socket.IO] Broadcast order:new:', payload?.order_number || payload?.id || '');
    io.emit('order:new', payload);
  });

  // Relay order:status_update broadcast event (Kitchen, Waiter, Customer)
  socket.on('order:status_update', (payload) => {
    console.log('[Socket.IO] Broadcast order:status_update:', payload?.id || '', payload?.status || '');
    io.emit('order:status_update', payload);
  });

  // Relay waiter:call broadcast event to waiter panel & admin
  socket.on('waiter:call', (payload) => {
    console.log('[Socket.IO] Broadcast waiter:call for table:', payload?.table_number || payload?.tableId || '');
    io.emit('waiter:call', payload);
  });

  // Relay waiter:resolve broadcast event
  socket.on('waiter:resolve', (payload) => {
    console.log('[Socket.IO] Broadcast waiter:resolve for call:', payload?.id || payload?.call_id || '');
    io.emit('waiter:resolve', payload);
  });

  // Relay waiter:acknowledge broadcast event
  socket.on('waiter:acknowledge', (payload) => {
    console.log('[Socket.IO] Broadcast waiter:acknowledge for call:', payload?.id || '');
    io.emit('waiter:acknowledge', payload);
  });

  // Relay waiter:assigned broadcast event
  socket.on('waiter:assigned', (payload) => {
    console.log('[Socket.IO] Broadcast waiter:assigned for call/table:', payload?.id || payload?.table || '');
    io.emit('waiter:assigned', payload);
  });

  socket.on('disconnect', (reason) => {
    // Client disconnected
  });
});

// Bind to host 0.0.0.0 on port 3000 (or process.env.PORT)
const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = '0.0.0.0';

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    printServerBanner(PORT, protocol);
  });
}

module.exports = {
  app,
  server,
  io
};
