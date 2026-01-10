require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { connectDB } = require('./src/config/db');
const { errorHandler } = require('./src/middleware/errorHandler');
const routes = require('./src/routes');
const environment = require('./src/config/environment');
const autoSyncService = require('./src/services/auto-sync.service');

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

// Start server
const startServer = async () => {
  try {
    await connectDB();
    
    // Initialize auto-sync scheduler
    await autoSyncService.initialize();
    
    app.listen(environment.port, () => {
      console.log(`Server running on port ${environment.port} in ${environment.nodeEnv} mode`);
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
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  autoSyncService.stop();
  process.exit(0);
});

startServer();
