const WebSocket = require('ws');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.homeSubscribers = new Set();
    this.pollingIntervals = {};
    this.lastStreamingData = null;
    this.lastDownloadData = null;
    this.homeAggregator = null;
  }

  /**
   * Initialize WebSocket server
   * @param {http.Server} server - HTTP server instance
   */
  initialize(server) {
    this.wss = new WebSocket.Server({
      server,
      path: '/ws'
    });

    this.wss.on('connection', (ws) => {
      console.log('WebSocket client connected');

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    console.log('WebSocket server initialized');
    return this;
  }

  /**
   * Set the home aggregator service (called after initialization to avoid circular deps)
   */
  setHomeAggregator(aggregator) {
    this.homeAggregator = aggregator;
  }

  /**
   * Handle incoming messages
   */
  handleMessage(ws, data) {
    switch (data.type) {
      case 'subscribe':
        if (data.channel === 'home') {
          this.subscribeToHome(ws);
        }
        break;

      case 'unsubscribe':
        if (data.channel === 'home') {
          this.unsubscribeFromHome(ws);
        }
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  }

  /**
   * Subscribe a client to home updates
   */
  subscribeToHome(ws) {
    this.homeSubscribers.add(ws);
    console.log(`Client subscribed to home. Total: ${this.homeSubscribers.size}`);

    // Start polling if this is the first subscriber
    if (this.homeSubscribers.size === 1) {
      this.startHomePolling();
    }

    // Send current data immediately
    this.sendCurrentData(ws);
  }

  /**
   * Unsubscribe a client from home updates
   */
  unsubscribeFromHome(ws) {
    this.homeSubscribers.delete(ws);
    console.log(`Client unsubscribed from home. Total: ${this.homeSubscribers.size}`);

    // Stop polling if no more subscribers
    if (this.homeSubscribers.size === 0) {
      this.stopHomePolling();
    }
  }

  /**
   * Handle client disconnect
   */
  handleDisconnect(ws) {
    this.homeSubscribers.delete(ws);
    console.log(`WebSocket client disconnected. Subscribers: ${this.homeSubscribers.size}`);

    if (this.homeSubscribers.size === 0) {
      this.stopHomePolling();
    }
  }

  /**
   * Start polling for home page data
   */
  startHomePolling() {
    if (!this.homeAggregator) {
      console.warn('Home aggregator not set, skipping polling');
      return;
    }

    console.log('Starting home polling...');

    // Streaming: every 10 seconds
    this.pollingIntervals.streaming = setInterval(() => {
      this.pollStreaming();
    }, 10000);

    // Downloads: every 5 seconds
    this.pollingIntervals.downloads = setInterval(() => {
      this.pollDownloads();
    }, 5000);

    // Stats: every 30 seconds
    this.pollingIntervals.stats = setInterval(() => {
      this.pollStats();
    }, 30000);

    // Initial poll
    this.pollStreaming();
    this.pollDownloads();
    this.pollStats();
  }

  /**
   * Stop polling
   */
  stopHomePolling() {
    console.log('Stopping home polling...');

    Object.values(this.pollingIntervals).forEach(interval => {
      clearInterval(interval);
    });
    this.pollingIntervals = {};
  }

  /**
   * Poll streaming sessions
   */
  async pollStreaming() {
    if (!this.homeAggregator) return;

    try {
      const sessions = await this.homeAggregator.getStreamingSessions();

      // Detect changes for individual events
      if (this.lastStreamingData) {
        const previousKeys = new Set(this.lastStreamingData.map(s => s.sessionKey));
        const currentKeys = new Set(sessions.map(s => s.sessionKey));

        // New streams
        sessions.forEach(session => {
          if (!previousKeys.has(session.sessionKey)) {
            this.broadcast('streaming:started', session);
          }
        });

        // Ended streams
        this.lastStreamingData.forEach(session => {
          if (!currentKeys.has(session.sessionKey)) {
            this.broadcast('streaming:stopped', { sessionKey: session.sessionKey });
          }
        });
      }

      this.lastStreamingData = sessions;
      this.broadcast('streaming:update', sessions);
    } catch (error) {
      console.error('Error polling streaming:', error.message);
    }
  }

  /**
   * Poll download queue
   */
  async pollDownloads() {
    if (!this.homeAggregator) return;

    try {
      const downloadsData = await this.homeAggregator.getDownloads();
      const downloads = downloadsData.items || [];

      // Detect completed downloads
      if (this.lastDownloadData) {
        const currentIds = new Set(downloads.map(d => d.id));

        this.lastDownloadData.forEach(item => {
          if (!currentIds.has(item.id) && item.progress >= 95) {
            this.broadcast('download:completed', {
              id: item.id,
              title: item.title,
              type: item.type,
              source: item.source,
              quality: item.quality
            });
          }
        });
      }

      this.lastDownloadData = downloads;
      this.broadcast('downloads:update', {
        items: downloads,
        totalSpeed: downloadsData.totalSpeed,
        totalActive: downloadsData.totalActive,
        totalQueued: downloadsData.totalQueued
      });
    } catch (error) {
      console.error('Error polling downloads:', error.message);
    }
  }

  /**
   * Poll quick stats
   */
  async pollStats() {
    if (!this.homeAggregator) return;

    try {
      const stats = await this.homeAggregator.getQuickStats();
      this.broadcast('stats:update', stats);
    } catch (error) {
      console.error('Error polling stats:', error.message);
    }
  }

  /**
   * Send current data to a newly subscribed client
   */
  async sendCurrentData(ws) {
    try {
      if (this.lastStreamingData) {
        this.send(ws, 'streaming:update', this.lastStreamingData);
      }
      if (this.lastDownloadData) {
        this.send(ws, 'downloads:update', this.lastDownloadData);
      }

      if (this.homeAggregator) {
        const stats = await this.homeAggregator.getQuickStats();
        this.send(ws, 'stats:update', stats);
      }
    } catch (error) {
      console.error('Error sending current data:', error.message);
    }
  }

  /**
   * Send message to a specific client
   */
  send(ws, type, data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, data }));
    }
  }

  /**
   * Broadcast message to all home subscribers
   */
  broadcast(type, data) {
    const message = JSON.stringify({ type, data });

    this.homeSubscribers.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  /**
   * Emit a new activity event
   */
  emitActivity(activity) {
    this.broadcast('activity:new', activity);
  }
}

module.exports = new WebSocketService();
