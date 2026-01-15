require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const { connectDB } = require('./src/config/db');
const { errorHandler } = require('./src/middleware/errorHandler');
const routes = require('./src/routes');
const environment = require('./src/config/environment');
const autoSyncService = require('./src/services/auto-sync.service');
const sessionCaptureService = require('./src/services/session-capture.service');
const tautulliSyncService = require('./src/services/tautulli-sync.service');
const websocketService = require('./src/services/websocket.service');
const homeAggregatorService = require('./src/services/home-aggregator.service');

const app = express();

// Middleware
app.use(cors({
  origin: environment.clientUrl,
  credentials: true
}));
app.use(express.json());

// Request logging in development
if (environment.isDevelopment) {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// API Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler (must be last)
app.use(errorHandler);

// Create HTTP server for WebSocket support
const server = http.createServer(app);

// Start server
const startServer = async () => {
  try {
    await connectDB();

    // Initialize auto-sync scheduler
    await autoSyncService.initialize();

    // Start session capture for real-time device tracking
    await sessionCaptureService.start();

    // Start Tautulli real-time sync if configured
    await tautulliSyncService.startRealtimeSync();

    // Initialize WebSocket server
    websocketService.initialize(server);
    websocketService.setHomeAggregator(homeAggregatorService);

    server.listen(environment.port, () => {
      console.log(`Server running on port ${environment.port} in ${environment.nodeEnv} mode`);
      console.log('WebSocket server ready on /ws');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  autoSyncService.stop();
  sessionCaptureService.stop();
  tautulliSyncService.stopRealtimeSync();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  autoSyncService.stop();
  sessionCaptureService.stop();
  tautulliSyncService.stopRealtimeSync();
  process.exit(0);
});

startServer();
