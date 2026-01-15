# TJ Plex Media Manager - Home Page Design

## Overview

The Home Page serves as the application's landing page and activity hub, providing real-time visibility into what's currently happening across the media server ecosystem. Unlike the Dashboard (which focuses on library analytics), the Home Page answers "What's happening right now?"

### Key Features

- **Real-time streaming activity** - Current Plex streams via Tautulli
- **Download queue** - Aggregated from Radarr, Sonarr, NZBGet, and qBittorrent
- **Quick stats** - At-a-glance counts for missing, upgrades, and active items
- **Recent activity** - Scrollable feed of watched, downloaded, and added items
- **WebSocket updates** - Live updates without page refresh

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────────┐    │
│  │HomeComponent│◄───│ HomeService  │◄───│ WebSocketService    │    │
│  └─────────────┘    └──────────────┘    └─────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                │ WebSocket (Socket.io) + REST API
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           BACKEND                                    │
│  ┌─────────────────┐    ┌──────────────────────────────────────┐   │
│  │ WebSocket       │    │              Services                 │   │
│  │ Server          │◄───│ ┌────────────┐ ┌──────────────────┐ │   │
│  │ (Socket.io)     │    │ │ Home       │ │ Download Queue   │ │   │
│  │                 │    │ │ Aggregator │ │ Service          │ │   │
│  │ Broadcasts:     │    │ └────────────┘ └──────────────────┘ │   │
│  │ • streaming     │    │ ┌────────────┐ ┌──────────────────┐ │   │
│  │ • downloads     │    │ │ Tautulli   │ │ NZBGet Service   │ │   │
│  │ • stats         │    │ │ Service    │ │                  │ │   │
│  │ • activity      │    │ └────────────┘ └──────────────────┘ │   │
│  └─────────────────┘    │ ┌────────────┐ ┌──────────────────┐ │   │
│                         │ │ Radarr     │ │ qBittorrent      │ │   │
│                         │ │ Service    │ │ Service          │ │   │
│                         │ └────────────┘ └──────────────────┘ │   │
│                         │ ┌────────────┐                      │   │
│                         │ │ Sonarr     │                      │   │
│                         │ │ Service    │                      │   │
│                         │ └────────────┘                      │   │
│                         └──────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       EXTERNAL SERVICES                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐  ┌───────────┐ │
│  │Tautulli │  │ Radarr  │  │ Sonarr  │  │ NZBGet │  │qBittorrent│ │
│  │  :8181  │  │  :7878  │  │  :8989  │  │  :6789 │  │   :8080   │ │
│  └─────────┘  └─────────┘  └─────────┘  └────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Initial Load**: Client requests `/api/home` for full page data
2. **WebSocket Connection**: Client subscribes to `home` channel
3. **Polling Loop**: Server polls external services at intervals
4. **Broadcasting**: Server emits events to subscribed clients
5. **UI Updates**: Angular components react to WebSocket events

---

## File Structure

### New Files (18 files)

| File | Purpose |
|------|---------|
| `server/src/services/nzbget.service.js` | NZBGet API integration |
| `server/src/services/qbittorrent.service.js` | qBittorrent API integration |
| `server/src/services/download-queue.service.js` | Aggregates all download sources |
| `server/src/services/websocket.service.js` | Socket.io server + event broadcasting |
| `server/src/services/home-aggregator.service.js` | Combines all home page data |
| `server/src/controllers/home.controller.js` | REST endpoints for home page |
| `server/src/controllers/nzbget.controller.js` | NZBGet config endpoints |
| `server/src/controllers/qbittorrent.controller.js` | qBittorrent config endpoints |
| `server/src/routes/home.routes.js` | `/api/home` routes |
| `server/src/routes/nzbget.routes.js` | `/api/nzbget` routes |
| `server/src/routes/qbittorrent.routes.js` | `/api/qbittorrent` routes |
| `server/src/models/NzbgetConfig.js` | NZBGet configuration schema |
| `server/src/models/QbittorrentConfig.js` | qBittorrent configuration schema |
| `client/src/app/features/home/home.component.ts` | Home page component |
| `client/src/app/features/home/home.component.html` | Home page template |
| `client/src/app/core/services/home.service.ts` | Home data service |
| `client/src/app/core/services/websocket.service.ts` | WebSocket client service |
| `client/src/app/core/models/home.model.ts` | TypeScript interfaces |

### Modified Files (10 files)

| File | Changes |
|------|---------|
| `server/server.js` | Initialize Socket.io server |
| `server/package.json` | Add socket.io dependency |
| `server/src/services/radarr.service.js` | Add `getQueue()` method |
| `server/src/services/sonarr.service.js` | Add `getQueue()` method |
| `server/src/routes/index.js` | Register new routes |
| `server/src/models/index.js` | Export new models |
| `client/package.json` | Add socket.io-client dependency |
| `client/src/app/app.routes.ts` | Add `/home` as default route |
| `client/src/app/layouts/sidebar/sidebar.component.ts` | Add Home nav item |
| `client/src/app/layouts/sidebar/sidebar.component.html` | Add Home nav icon |
| `client/src/app/features/settings/settings.component.ts` | Add download client config |
| `client/src/app/features/settings/settings.component.html` | Add download client UI |

---

## Data Models

### Backend Schemas

#### NzbgetConfig

```javascript
// server/src/models/NzbgetConfig.js
const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../config/encryption');

const nzbgetConfigSchema = new mongoose.Schema({
  host: {
    type: String,
    required: true
  },
  username: {
    type: String,
    default: ''
  },
  password: {
    type: String,
    default: ''
  },
  enabled: {
    type: Boolean,
    default: true
  },
  isConnected: {
    type: Boolean,
    default: false
  },
  version: String,
  lastCheckedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Static methods for singleton pattern
nzbgetConfigSchema.statics.getConfig = async function() {
  return await this.findOne();
};

nzbgetConfigSchema.statics.saveConfig = async function(data) {
  const existing = await this.findOne();
  if (existing) {
    Object.assign(existing, data, { updatedAt: new Date() });
    return await existing.save();
  }
  return await this.create(data);
};

// Instance method to get decrypted password
nzbgetConfigSchema.methods.getDecryptedPassword = function() {
  return this.password ? decrypt(this.password) : '';
};

module.exports = mongoose.model('NzbgetConfig', nzbgetConfigSchema);
```

#### QbittorrentConfig

```javascript
// server/src/models/QbittorrentConfig.js
const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../config/encryption');

const qbittorrentConfigSchema = new mongoose.Schema({
  host: {
    type: String,
    required: true
  },
  username: {
    type: String,
    default: ''
  },
  password: {
    type: String,
    default: ''
  },
  enabled: {
    type: Boolean,
    default: true
  },
  isConnected: {
    type: Boolean,
    default: false
  },
  version: String,
  lastCheckedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Static methods for singleton pattern
qbittorrentConfigSchema.statics.getConfig = async function() {
  return await this.findOne();
};

qbittorrentConfigSchema.statics.saveConfig = async function(data) {
  const existing = await this.findOne();
  if (existing) {
    Object.assign(existing, data, { updatedAt: new Date() });
    return await existing.save();
  }
  return await this.create(data);
};

// Instance method to get decrypted password
qbittorrentConfigSchema.methods.getDecryptedPassword = function() {
  return this.password ? decrypt(this.password) : '';
};

module.exports = mongoose.model('QbittorrentConfig', qbittorrentConfigSchema);
```

### Frontend Interfaces

```typescript
// client/src/app/core/models/home.model.ts

/**
 * Represents an active streaming session from Tautulli
 */
export interface StreamingSession {
  sessionKey: string;
  user: {
    name: string;
    id?: string;
    thumb?: string;
  };
  media: {
    type: 'movie' | 'episode';
    title: string;
    year?: number;
    showTitle?: string;
    seasonEpisode?: string;  // e.g., "S01E05"
    thumb?: string;
    ratingKey?: string;
  };
  player: {
    name: string;
    platform: string;
    product?: string;
  };
  quality: {
    resolution: string;
    videoCodec: string;
    audioCodec?: string;
  };
  playback: {
    decision: 'directplay' | 'transcode' | 'copy';
    progress: number;        // 0-100 percentage
    duration: number;        // milliseconds
    state: 'playing' | 'paused' | 'buffering';
  };
  transcoding?: {
    videoDecision: 'directplay' | 'transcode' | 'copy';
    audioDecision: 'directplay' | 'transcode' | 'copy';
    hwDecode: boolean;
    hwEncode: boolean;
    speed?: number;
    throttled?: boolean;
  };
  network: {
    location: 'lan' | 'wan';
    bandwidth?: number;
    secure: boolean;
  };
}

/**
 * Represents an item in the download queue
 */
export interface DownloadItem {
  id: string;
  source: 'radarr' | 'sonarr' | 'nzbget' | 'qbittorrent';
  type: 'movie' | 'episode' | 'season' | 'unknown';
  title: string;
  status: 'downloading' | 'queued' | 'paused' | 'extracting' | 'importing' | 'seeding' | 'stalled' | 'error';
  progress: number;          // 0-100 percentage
  size: number;              // bytes
  sizeRemaining: number;     // bytes
  speed?: number;            // bytes per second
  eta?: string;              // human readable ETA
  etaSeconds?: number;       // seconds until complete
  quality?: string;          // e.g., "Bluray-2160p"
  indexer?: string;          // e.g., "NZBgeek"
  added?: Date;
  // Episode-specific fields
  seriesTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
}

/**
 * Quick stats for the home page header
 */
export interface QuickStats {
  streaming: {
    active: number;
    transcoding: number;
  };
  downloads: {
    active: number;
    queued: number;
    totalSpeed: number;      // bytes per second
  };
  radarr: {
    missing: number;
    upcoming: number;
    upgrades: number;
    configured: boolean;
  };
  sonarr: {
    missing: number;
    upcoming: number;
    upgrades: number;
    configured: boolean;
  };
}

/**
 * Recent activity item
 */
export interface RecentActivity {
  id: string;
  type: 'watched' | 'downloaded' | 'added';
  timestamp: Date;
  media: {
    type: 'movie' | 'episode';
    title: string;
    year?: number;
    showTitle?: string;
    seasonEpisode?: string;
    thumb?: string;
    ratingKey?: string;
  };
  user?: string;             // For watched items
  details?: string;          // Additional context
  quality?: string;          // For downloaded items
}

/**
 * Complete home page data response
 */
export interface HomeData {
  streaming: StreamingSession[];
  downloads: DownloadItem[];
  stats: QuickStats;
  recentActivity: RecentActivity[];
}

/**
 * Paginated activity response
 */
export interface ActivityResponse {
  activities: RecentActivity[];
  total: number;
  hasMore: boolean;
}

/**
 * WebSocket connection status
 */
export interface WebSocketStatus {
  connected: boolean;
  reconnecting: boolean;
  lastUpdate?: Date;
}

/**
 * Download client configuration (for settings)
 */
export interface NzbgetConfig {
  host: string;
  username?: string;
  enabled: boolean;
  isConnected: boolean;
  version?: string;
  lastCheckedAt?: Date;
}

export interface QbittorrentConfig {
  host: string;
  username?: string;
  enabled: boolean;
  isConnected: boolean;
  version?: string;
  lastCheckedAt?: Date;
}
```

---

## API Endpoints

### Home Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/home` | Full home page data (initial load) |
| `GET` | `/api/home/streaming` | Current streaming sessions only |
| `GET` | `/api/home/downloads` | Current download queue only |
| `GET` | `/api/home/stats` | Quick stats only |
| `GET` | `/api/home/activity` | Paginated recent activity |

#### `GET /api/home`

Returns complete home page data for initial load.

**Response:**
```json
{
  "streaming": [
    {
      "sessionKey": "abc123",
      "user": {
        "name": "John",
        "thumb": "https://..."
      },
      "media": {
        "type": "movie",
        "title": "The Matrix",
        "year": 1999,
        "thumb": "/library/metadata/12345/thumb"
      },
      "player": {
        "name": "Apple TV",
        "platform": "tvOS"
      },
      "quality": {
        "resolution": "4K",
        "videoCodec": "HEVC"
      },
      "playback": {
        "decision": "directplay",
        "progress": 45,
        "duration": 8160000,
        "state": "playing"
      },
      "network": {
        "location": "lan",
        "secure": false
      }
    }
  ],
  "downloads": [
    {
      "id": "radarr-123",
      "source": "radarr",
      "type": "movie",
      "title": "Dune: Part Two (2024)",
      "status": "downloading",
      "progress": 45.5,
      "size": 45000000000,
      "sizeRemaining": 24525000000,
      "speed": 25000000,
      "eta": "16m 21s",
      "quality": "Remux-2160p",
      "indexer": "NZBgeek"
    }
  ],
  "stats": {
    "streaming": {
      "active": 2,
      "transcoding": 1
    },
    "downloads": {
      "active": 3,
      "queued": 5,
      "totalSpeed": 35000000
    },
    "radarr": {
      "missing": 12,
      "upcoming": 5,
      "upgrades": 45,
      "configured": true
    },
    "sonarr": {
      "missing": 8,
      "upcoming": 15,
      "upgrades": 120,
      "configured": true
    }
  },
  "recentActivity": [
    {
      "id": "activity-1",
      "type": "watched",
      "timestamp": "2026-01-15T10:30:00Z",
      "media": {
        "type": "movie",
        "title": "The Matrix",
        "year": 1999
      },
      "user": "John"
    }
  ]
}
```

#### `GET /api/home/activity`

Returns paginated recent activity.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 10 | Number of items to return |
| `offset` | number | 0 | Number of items to skip |
| `type` | string | all | Filter by type: `watched`, `downloaded`, `added`, or `all` |

**Response:**
```json
{
  "activities": [...],
  "total": 150,
  "hasMore": true
}
```

### NZBGet Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/nzbget/config` | Get configuration (credentials masked) |
| `POST` | `/api/nzbget/config` | Save configuration |
| `DELETE` | `/api/nzbget/config` | Remove configuration |
| `POST` | `/api/nzbget/test` | Test connection |
| `GET` | `/api/nzbget/queue` | Get current download queue |
| `GET` | `/api/nzbget/history` | Get recent download history |

#### `GET /api/nzbget/config`

**Response:**
```json
{
  "configured": true,
  "config": {
    "host": "http://192.168.1.100:6789",
    "username": "admin",
    "enabled": true,
    "isConnected": true,
    "version": "21.1",
    "lastCheckedAt": "2026-01-15T10:00:00Z"
  }
}
```

#### `POST /api/nzbget/config`

**Request:**
```json
{
  "host": "http://192.168.1.100:6789",
  "username": "admin",
  "password": "password123",
  "enabled": true
}
```

#### `POST /api/nzbget/test`

**Request:**
```json
{
  "host": "http://192.168.1.100:6789",
  "username": "admin",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "version": "21.1",
  "downloadRate": 25000000,
  "remainingSize": 45000000000,
  "queuedItems": 5
}
```

#### `GET /api/nzbget/queue`

**Response:**
```json
{
  "downloads": [
    {
      "id": "nzbget-12345",
      "name": "Dune.Part.Two.2024.2160p.UHD.BluRay.REMUX",
      "status": "downloading",
      "progress": 45.5,
      "size": 45000000000,
      "sizeRemaining": 24525000000,
      "speed": 25000000,
      "eta": "16m 21s",
      "category": "movies"
    }
  ],
  "speed": 25000000,
  "sizeRemaining": 45000000000,
  "downloadPaused": false
}
```

### qBittorrent Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/qbittorrent/config` | Get configuration (credentials masked) |
| `POST` | `/api/qbittorrent/config` | Save configuration |
| `DELETE` | `/api/qbittorrent/config` | Remove configuration |
| `POST` | `/api/qbittorrent/test` | Test connection |
| `GET` | `/api/qbittorrent/queue` | Get current torrents |

#### `GET /api/qbittorrent/config`

**Response:**
```json
{
  "configured": true,
  "config": {
    "host": "http://192.168.1.100:8080",
    "username": "admin",
    "enabled": true,
    "isConnected": true,
    "version": "4.6.2",
    "lastCheckedAt": "2026-01-15T10:00:00Z"
  }
}
```

#### `POST /api/qbittorrent/test`

**Request:**
```json
{
  "host": "http://192.168.1.100:8080",
  "username": "admin",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "version": "4.6.2",
  "downloadSpeed": 15000000,
  "uploadSpeed": 5000000,
  "activeTorrents": 3
}
```

#### `GET /api/qbittorrent/queue`

**Response:**
```json
{
  "torrents": [
    {
      "id": "qbt-abcd1234",
      "name": "Shogun.S01E05.1080p.AMZN.WEB-DL",
      "status": "downloading",
      "progress": 78.2,
      "size": 2500000000,
      "sizeRemaining": 545000000,
      "downloadSpeed": 15000000,
      "uploadSpeed": 2000000,
      "eta": "36s",
      "seeds": 45,
      "peers": 12,
      "ratio": 0.5,
      "category": "tv-sonarr"
    }
  ],
  "downloadSpeed": 15000000,
  "uploadSpeed": 5000000
}
```

---

## WebSocket Events

### Connection

The WebSocket server uses Socket.io on the same port as the HTTP server.

**Client Connection:**
```typescript
const socket = io('/', {
  transports: ['websocket'],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000
});
```

### Server → Client Events

| Event | Payload | Frequency | Description |
|-------|---------|-----------|-------------|
| `streaming:update` | `StreamingSession[]` | 10s | Full streaming list update |
| `streaming:started` | `StreamingSession` | On event | New stream started |
| `streaming:stopped` | `{ sessionKey: string }` | On event | Stream ended |
| `streaming:progress` | `{ sessionKey, progress, state }` | 10s | Progress update |
| `downloads:update` | `DownloadItem[]` | 5s | Full download list update |
| `download:progress` | `{ id, progress, speed, eta }` | 5s | Individual item progress |
| `download:completed` | `{ id, title, type, source }` | On event | Download finished |
| `download:added` | `DownloadItem` | On event | New item added to queue |
| `stats:update` | `QuickStats` | 30s | Stats refresh |
| `activity:new` | `RecentActivity` | On event | New activity logged |

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `subscribe:home` | `{}` | Start receiving home updates |
| `unsubscribe:home` | `{}` | Stop receiving updates |

### Event Payloads

#### `streaming:update`
```json
[
  {
    "sessionKey": "abc123",
    "user": { "name": "John" },
    "media": { "type": "movie", "title": "The Matrix" },
    "playback": { "progress": 45, "state": "playing" }
  }
]
```

#### `download:progress`
```json
{
  "id": "radarr-123",
  "progress": 67.8,
  "speed": 28500000,
  "eta": "8m 45s",
  "status": "downloading"
}
```

#### `download:completed`
```json
{
  "id": "radarr-123",
  "title": "Dune: Part Two (2024)",
  "type": "movie",
  "source": "radarr",
  "quality": "Remux-2160p"
}
```

#### `activity:new`
```json
{
  "id": "activity-xyz",
  "type": "downloaded",
  "timestamp": "2026-01-15T10:45:00Z",
  "media": {
    "type": "movie",
    "title": "Dune: Part Two",
    "year": 2024
  },
  "quality": "Remux-2160p"
}
```

---

## WebSocket Service Implementation

### Backend Service

```javascript
// server/src/services/websocket.service.js

const { Server } = require('socket.io');
const tautulliService = require('./tautulli.service');
const downloadQueueService = require('./download-queue.service');
const homeAggregatorService = require('./home-aggregator.service');

class WebSocketService {
  constructor() {
    this.io = null;
    this.homeSubscribers = new Set();
    this.pollingIntervals = {};
    this.lastStreamingData = null;
    this.lastDownloadData = null;
  }

  /**
   * Initialize Socket.io server
   */
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling']
    });

    this.io.on('connection', (socket) => {
      console.log(`WebSocket client connected: ${socket.id}`);

      socket.on('subscribe:home', () => {
        this.subscribeToHome(socket);
      });

      socket.on('unsubscribe:home', () => {
        this.unsubscribeFromHome(socket);
      });

      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });

    return this;
  }

  /**
   * Subscribe a socket to home updates
   */
  subscribeToHome(socket) {
    this.homeSubscribers.add(socket.id);
    socket.join('home');
    console.log(`Socket ${socket.id} subscribed to home. Total: ${this.homeSubscribers.size}`);

    // Start polling if this is the first subscriber
    if (this.homeSubscribers.size === 1) {
      this.startHomePolling();
    }

    // Send current data immediately
    this.sendCurrentData(socket);
  }

  /**
   * Unsubscribe a socket from home updates
   */
  unsubscribeFromHome(socket) {
    this.homeSubscribers.delete(socket.id);
    socket.leave('home');
    console.log(`Socket ${socket.id} unsubscribed from home. Total: ${this.homeSubscribers.size}`);

    // Stop polling if no more subscribers
    if (this.homeSubscribers.size === 0) {
      this.stopHomePolling();
    }
  }

  /**
   * Handle socket disconnect
   */
  handleDisconnect(socket) {
    this.homeSubscribers.delete(socket.id);
    console.log(`Socket ${socket.id} disconnected. Subscribers: ${this.homeSubscribers.size}`);

    if (this.homeSubscribers.size === 0) {
      this.stopHomePolling();
    }
  }

  /**
   * Start polling for home page data
   */
  startHomePolling() {
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
   * Poll streaming sessions from Tautulli
   */
  async pollStreaming() {
    try {
      const sessions = await homeAggregatorService.getStreamingSessions();
      
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
   * Poll download queue from all sources
   */
  async pollDownloads() {
    try {
      const downloads = await downloadQueueService.getAggregatedQueue();
      
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
      this.broadcast('downloads:update', downloads);
    } catch (error) {
      console.error('Error polling downloads:', error.message);
    }
  }

  /**
   * Poll quick stats
   */
  async pollStats() {
    try {
      const stats = await homeAggregatorService.getQuickStats();
      this.broadcast('stats:update', stats);
    } catch (error) {
      console.error('Error polling stats:', error.message);
    }
  }

  /**
   * Send current data to a newly subscribed socket
   */
  async sendCurrentData(socket) {
    try {
      if (this.lastStreamingData) {
        socket.emit('streaming:update', this.lastStreamingData);
      }
      if (this.lastDownloadData) {
        socket.emit('downloads:update', this.lastDownloadData);
      }

      const stats = await homeAggregatorService.getQuickStats();
      socket.emit('stats:update', stats);
    } catch (error) {
      console.error('Error sending current data:', error.message);
    }
  }

  /**
   * Broadcast event to all home subscribers
   */
  broadcast(event, data) {
    this.io.to('home').emit(event, data);
  }

  /**
   * Emit a new activity event
   */
  emitActivity(activity) {
    this.broadcast('activity:new', activity);
  }
}

module.exports = new WebSocketService();
```

### Frontend Service

```typescript
// client/src/app/core/services/websocket.service.ts

import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { 
  StreamingSession, 
  DownloadItem, 
  QuickStats, 
  RecentActivity,
  WebSocketStatus 
} from '@core/models/home.model';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
  private socket: Socket | null = null;
  
  // Connection status
  private statusSubject = new BehaviorSubject<WebSocketStatus>({
    connected: false,
    reconnecting: false
  });
  
  // Data subjects
  private streamingSubject = new BehaviorSubject<StreamingSession[]>([]);
  private downloadsSubject = new BehaviorSubject<DownloadItem[]>([]);
  private statsSubject = new BehaviorSubject<QuickStats | null>(null);
  
  // Event subjects
  private streamStartedSubject = new Subject<StreamingSession>();
  private streamStoppedSubject = new Subject<{ sessionKey: string }>();
  private downloadCompletedSubject = new Subject<{ id: string; title: string; type: string }>();
  private activitySubject = new Subject<RecentActivity>();

  // Public observables
  status$ = this.statusSubject.asObservable();
  streaming$ = this.streamingSubject.asObservable();
  downloads$ = this.downloadsSubject.asObservable();
  stats$ = this.statsSubject.asObservable();
  streamStarted$ = this.streamStartedSubject.asObservable();
  streamStopped$ = this.streamStoppedSubject.asObservable();
  downloadCompleted$ = this.downloadCompletedSubject.asObservable();
  newActivity$ = this.activitySubject.asObservable();

  constructor() {}

  /**
   * Connect to WebSocket server and subscribe to home updates
   */
  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io('/', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    this.setupEventListeners();
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.emit('unsubscribe:home');
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.statusSubject.next({ connected: false, reconnecting: false });
  }

  /**
   * Setup socket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.statusSubject.next({ 
        connected: true, 
        reconnecting: false,
        lastUpdate: new Date()
      });
      this.socket?.emit('subscribe:home');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      this.statusSubject.next({ connected: false, reconnecting: false });
    });

    this.socket.on('reconnecting', () => {
      this.statusSubject.next({ connected: false, reconnecting: true });
    });

    this.socket.on('reconnect_failed', () => {
      console.error('WebSocket reconnection failed');
      this.statusSubject.next({ connected: false, reconnecting: false });
    });

    // Streaming events
    this.socket.on('streaming:update', (sessions: StreamingSession[]) => {
      this.streamingSubject.next(sessions);
      this.updateLastUpdate();
    });

    this.socket.on('streaming:started', (session: StreamingSession) => {
      this.streamStartedSubject.next(session);
    });

    this.socket.on('streaming:stopped', (data: { sessionKey: string }) => {
      this.streamStoppedSubject.next(data);
    });

    // Download events
    this.socket.on('downloads:update', (downloads: DownloadItem[]) => {
      this.downloadsSubject.next(downloads);
      this.updateLastUpdate();
    });

    this.socket.on('download:completed', (data: any) => {
      this.downloadCompletedSubject.next(data);
    });

    // Stats events
    this.socket.on('stats:update', (stats: QuickStats) => {
      this.statsSubject.next(stats);
      this.updateLastUpdate();
    });

    // Activity events
    this.socket.on('activity:new', (activity: RecentActivity) => {
      this.activitySubject.next(activity);
    });
  }

  /**
   * Update last update timestamp
   */
  private updateLastUpdate(): void {
    const current = this.statusSubject.value;
    this.statusSubject.next({
      ...current,
      lastUpdate: new Date()
    });
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
```

---

## External Service APIs

### NZBGet JSON-RPC API

NZBGet uses JSON-RPC over HTTP. All methods are called via POST to `http://host:port/jsonrpc`.

**Authentication:**
- Uses HTTP Basic Auth with username:password
- URL format: `http://username:password@host:port/jsonrpc`

**Key Methods:**

| Method | Description |
|--------|-------------|
| `version` | Get NZBGet version |
| `status` | Get download status and speed |
| `listgroups` | Get queue items |
| `history` | Get download history |

**Example Request:**
```json
{
  "method": "listgroups",
  "params": [],
  "id": 1
}
```

**Example Response:**
```json
{
  "result": [
    {
      "NZBID": 12345,
      "NZBName": "Dune.Part.Two.2024.2160p.UHD.BluRay.REMUX",
      "Status": "DOWNLOADING",
      "FileSizeMB": 45000,
      "RemainingSizeMB": 24525,
      "DownloadedSizeMB": 20475,
      "Category": "movies",
      "DownloadRate": 25000000
    }
  ]
}
```

### qBittorrent Web API

qBittorrent uses a REST API with cookie-based authentication.

**Authentication Flow:**
1. POST `/api/v2/auth/login` with `username` and `password`
2. Store `SID` cookie for subsequent requests
3. All requests must include the cookie

**Key Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v2/app/version` | Get qBittorrent version |
| `GET` | `/api/v2/transfer/info` | Get global transfer info |
| `GET` | `/api/v2/torrents/info` | Get torrent list |
| `GET` | `/api/v2/sync/maindata` | Get all data (efficient) |

**Example Torrent Response:**
```json
[
  {
    "hash": "abcd1234...",
    "name": "Shogun.S01E05.1080p.AMZN.WEB-DL",
    "progress": 0.782,
    "size": 2500000000,
    "dlspeed": 15000000,
    "upspeed": 2000000,
    "eta": 36,
    "state": "downloading",
    "category": "tv-sonarr",
    "num_seeds": 45,
    "num_leechs": 12,
    "ratio": 0.5
  }
]
```

### Radarr Queue API

**Endpoint:** `GET /api/v3/queue`

**Query Parameters:**
- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 20)
- `includeMovie` - Include movie details (default: false)

**Response:**
```json
{
  "page": 1,
  "pageSize": 20,
  "totalRecords": 3,
  "records": [
    {
      "id": 123,
      "movieId": 456,
      "title": "Dune.Part.Two.2024.2160p.UHD.BluRay.REMUX",
      "status": "downloading",
      "trackedDownloadStatus": "ok",
      "trackedDownloadState": "downloading",
      "size": 45000000000,
      "sizeleft": 24525000000,
      "timeleft": "00:16:21",
      "estimatedCompletionTime": "2026-01-15T11:00:00Z",
      "protocol": "usenet",
      "indexer": "NZBgeek",
      "downloadClient": "NZBGet",
      "quality": {
        "quality": {
          "name": "Remux-2160p"
        }
      },
      "movie": {
        "title": "Dune: Part Two",
        "year": 2024
      }
    }
  ]
}
```

### Sonarr Queue API

**Endpoint:** `GET /api/v3/queue`

**Query Parameters:**
- `page` - Page number
- `pageSize` - Items per page
- `includeSeries` - Include series details
- `includeEpisode` - Include episode details

**Response:**
```json
{
  "page": 1,
  "pageSize": 20,
  "totalRecords": 5,
  "records": [
    {
      "id": 789,
      "seriesId": 101,
      "episodeId": 202,
      "title": "Shogun.S01E05.1080p.AMZN.WEB-DL",
      "status": "downloading",
      "trackedDownloadStatus": "ok",
      "trackedDownloadState": "downloading",
      "size": 2500000000,
      "sizeleft": 545000000,
      "timeleft": "00:00:36",
      "protocol": "torrent",
      "indexer": "TorrentLeech",
      "downloadClient": "qBittorrent",
      "quality": {
        "quality": {
          "name": "WEBDL-1080p"
        }
      },
      "series": {
        "title": "Shōgun"
      },
      "episode": {
        "seasonNumber": 1,
        "episodeNumber": 5,
        "title": "Broken to the Fist"
      }
    }
  ]
}
```

---

## UI Components

### Section Order

The home page sections are displayed in this order:
1. **Quick Stats** - At-a-glance overview (always at top)
2. **Now Streaming** - Active Plex streams
3. **Downloads** - Active download queue (collapses when empty)
4. **Recent Activity** - Tabbed history view

### Downloads Section Behavior

The Downloads section adapts based on content:

**When downloads are active:**
- Full section with filter tabs and download items
- Shows progress bars, speeds, ETAs

**When no downloads (collapsed/empty state):**
- Single compact row (~40px height)
- Minimal real estate usage
```
┌─ DOWNLOADS ───────────────────────────────────────────────────────────┐
│ ⬇️ No active downloads                                                │
└───────────────────────────────────────────────────────────────────────┘
```

### Recent Activity Tabs

The Recent Activity section uses tabs to filter by activity type:

| Tab | Description | Data Source |
|-----|-------------|-------------|
| **Watch History** | Items watched by users | PlaybackSession / Tautulli history |
| **Download History** | Completed downloads | Radarr/Sonarr history API |
| **Added to Library** | Recently added media | Plex recently added |

Each tab maintains its own pagination state and "Load More" functionality.

### Home Page Layout (Desktop)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ HOME                                                    ● Live Connected│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌─ QUICK STATS ───────────────────────────────────────────────────────┐│
│ │ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐            ││
│ │ │ Streaming │ │ Downloads │ │  Missing  │ │ Upgrades  │            ││
│ │ │     2     │ │     8     │ │    20     │ │   165     │            ││
│ │ │ 1 transc. │ │  40 MB/s  │ │ 12M + 8E  │ │ 45M + 120E│            ││
│ │ └───────────┘ └───────────┘ └───────────┘ └───────────┘            ││
│ └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ ┌─ NOW STREAMING (2) ─────────────────────────────────────────────────┐│
│ │ ┌─────────────────────────┐ ┌─────────────────────────┐            ││
│ │ │ 🎬 The Matrix           │ │ 📺 Breaking Bad         │            ││
│ │ │ John • Apple TV         │ │ Jane • Roku             │            ││
│ │ │ 4K HEVC • Direct Play   │ │ 1080p H.264 • Transcode │            ││
│ │ │ ████████░░░░░ 45%       │ │ █████░░░░░░░░ 32%       │            ││
│ │ │ LAN • Playing           │ │ WAN • Playing           │            ││
│ │ └─────────────────────────┘ └─────────────────────────┘            ││
│ │ Empty state: "No active streams"                                    ││
│ └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ ┌─ DOWNLOADS (3 active • 5 queued) ──────────────────────── 40 MB/s ──┐│
│ │ Filter: [All ▼] [Movies] [TV] [NZBGet] [qBittorrent]                ││
│ │ ┌───────────────────────────────────────────────────────────────┐  ││
│ │ │ 🎬 Dune: Part Two (2024)                     Remux-2160p      │  ││
│ │ │    ████████████░░░░░░░░ 45.5%    12.5 GB left    25 MB/s      │  ││
│ │ │    NZBGet • NZBgeek                              ETA: 16m 21s │  ││
│ │ ├───────────────────────────────────────────────────────────────┤  ││
│ │ │ 📺 Shōgun S01E05 - Broken to the Fist           WEBDL-1080p   │  ││
│ │ │    ██████████████████░░ 78.2%    545 MB left     15 MB/s      │  ││
│ │ │    qBittorrent • TorrentLeech                    ETA: 36s     │  ││
│ │ └───────────────────────────────────────────────────────────────┘  ││
│ └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ ── OR when no downloads (collapsed): ──────────────────────────────────│
│ ┌─ DOWNLOADS ─────────────────────────────────────────────────────────┐│
│ │ ⬇️ No active downloads                                              ││
│ └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ ┌─ RECENT ACTIVITY ───────────────────────────────────────────────────┐│
│ │ [Watch History]  [Download History]  [Added to Library]             ││
│ │ ─────────────────────────────────────────────────────────────────── ││
│ │                                                                      ││
│ │ ── Watch History Tab (default) ──                                    ││
│ │ ┌───────────────────────────────────────────────────────────────┐  ││
│ │ │ 🎬 John watched The Matrix (1999)                    2h ago   │  ││
│ │ ├───────────────────────────────────────────────────────────────┤  ││
│ │ │ 📺 Jane watched Breaking Bad S01E02                  5h ago   │  ││
│ │ ├───────────────────────────────────────────────────────────────┤  ││
│ │ │ 🎬 John watched Oppenheimer (2023)                  Yesterday │  ││
│ │ ├───────────────────────────────────────────────────────────────┤  ││
│ │ │ 📺 John watched Shogun S01E04                       Yesterday │  ││
│ │ └───────────────────────────────────────────────────────────────┘  ││
│ │                      [ Load More ]                                  ││
│ │                                                                      ││
│ │ ── Download History Tab ──                                           ││
│ │ ┌───────────────────────────────────────────────────────────────┐  ││
│ │ │ 🎬 Oppenheimer (2023)              Remux-2160p       2h ago   │  ││
│ │ ├───────────────────────────────────────────────────────────────┤  ││
│ │ │ 📺 Shogun S01E04                   WEBDL-2160p      Yesterday │  ││
│ │ ├───────────────────────────────────────────────────────────────┤  ││
│ │ │ 🎬 Poor Things (2023)              Remux-1080p      Yesterday │  ││
│ │ └───────────────────────────────────────────────────────────────┘  ││
│ │                      [ Load More ]                                  ││
│ │                                                                      ││
│ │ ── Added to Library Tab ──                                           ││
│ │ ┌───────────────────────────────────────────────────────────────┐  ││
│ │ │ 🎬 Oppenheimer (2023)                                2h ago   │  ││
│ │ ├───────────────────────────────────────────────────────────────┤  ││
│ │ │ 📺 Shogun S01E04 - Broken to the Fist              Yesterday  │  ││
│ │ ├───────────────────────────────────────────────────────────────┤  ││
│ │ │ 🎬 Poor Things (2023)                              Yesterday  │  ││
│ │ └───────────────────────────────────────────────────────────────┘  ││
│ │                      [ Load More ]                                  ││
│ └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Home Page Layout (Mobile)

```
┌─────────────────────────────┐
│ HOME              ● Live    │
├─────────────────────────────┤
│                             │
│ ┌─────┬─────┬─────┬─────┐  │
│ │  2  │  8  │ 20  │ 165 │  │
│ │Stream│Down│Miss │Upgr │  │
│ └─────┴─────┴─────┴─────┘  │
│                             │
│ NOW STREAMING (2)           │
│ ┌─────────────────────────┐ │
│ │ 🎬 The Matrix           │ │
│ │ John • Apple TV • 4K    │ │
│ │ ████████░░░░░ 45%       │ │
│ │ Direct Play • LAN       │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ 📺 Breaking Bad S01E03  │ │
│ │ Jane • Roku • 1080p     │ │
│ │ █████░░░░░░░░ 32%       │ │
│ │ Transcode • WAN         │ │
│ └─────────────────────────┘ │
│                             │
│ DOWNLOADS (3)        40MB/s │
│ ┌─────────────────────────┐ │
│ │ 🎬 Dune: Part Two       │ │
│ │ ████████░░░░ 45% • 16m  │ │
│ │ NZBGet • 25 MB/s        │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ 📺 Shōgun S01E05        │ │
│ │ ██████████████░░ 78%    │ │
│ │ qBittorrent • 36s       │ │
│ └─────────────────────────┘ │
│         + 1 more            │
│                             │
│ ── OR when empty: ───────── │
│ ┌─────────────────────────┐ │
│ │ ⬇️ No active downloads  │ │
│ └─────────────────────────┘ │
│                             │
│ RECENT ACTIVITY             │
│ [Watch] [Downloads] [Added] │
│ ─────────────────────────── │
│ ┌─────────────────────────┐ │
│ │ 🎬 John watched         │ │
│ │ The Matrix • 2h ago     │ │
│ ├─────────────────────────┤ │
│ │ 📺 Jane watched         │ │
│ │ Breaking Bad S01E02     │ │
│ │ 5h ago                  │ │
│ ├─────────────────────────┤ │
│ │ 🎬 John watched         │ │
│ │ Oppenheimer • Yesterday │ │
│ └─────────────────────────┘ │
│       [ Load More ]         │
│                             │
├─────────────────────────────┤
│ 🏠  🎬  📺  💾  ⚙️         │
└─────────────────────────────┘
```

---

## Settings Page Additions

New sections for download client configuration:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SETTINGS                                                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ... existing sections (Plex, Radarr, Sonarr, Tautulli) ...             │
│                                                                         │
│ ┌─ DOWNLOAD CLIENTS ──────────────────────────────────────────────────┐│
│ │                                                                      ││
│ │ NZBGet                                               [Test] [Save]  ││
│ │ ┌──────────────────────────────────────────────────────────────┐   ││
│ │ │ Host     [http://192.168.1.100:6789                       ]  │   ││
│ │ │ Username [admin                                           ]  │   ││
│ │ │ Password [••••••••                                        ]  │   ││
│ │ │ ☑ Enabled                                                    │   ││
│ │ │                                                              │   ││
│ │ │ Status: ● Connected (v21.1)                                  │   ││
│ │ └──────────────────────────────────────────────────────────────┘   ││
│ │                                                                      ││
│ │ qBittorrent                                          [Test] [Save]  ││
│ │ ┌──────────────────────────────────────────────────────────────┐   ││
│ │ │ Host     [http://192.168.1.100:8080                       ]  │   ││
│ │ │ Username [admin                                           ]  │   ││
│ │ │ Password [••••••••                                        ]  │   ││
│ │ │ ☑ Enabled                                                    │   ││
│ │ │                                                              │   ││
│ │ │ Status: ● Connected (v4.6.2)                                 │   ││
│ │ └──────────────────────────────────────────────────────────────┘   ││
│ │                                                                      ││
│ └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Core Infrastructure
1. Add Socket.io dependencies (backend + frontend)
2. WebSocket service (backend)
3. WebSocket service (frontend)
4. Home page component shell
5. Route changes (Home as default landing page)
6. Sidebar navigation update with Home icon

### Phase 2: Streaming & Stats
1. Integrate Tautulli activity for streaming sessions
2. Quick stats aggregation from existing services
3. Real-time streaming updates via WebSocket
4. Stats refresh via WebSocket

### Phase 3: Download Clients
1. NZBGet service + model + controller + routes
2. qBittorrent service + model + controller + routes
3. Settings UI for both clients
4. Connection testing

### Phase 4: Download Queue
1. Radarr queue method
2. Sonarr queue method
3. Download queue aggregator service
4. Downloads UI section with filtering
5. Real-time download updates via WebSocket

### Phase 5: Recent Activity
1. Activity aggregation from multiple sources:
   - Watched items (PlaybackSession collection)
   - Downloaded items (Radarr/Sonarr history)
   - Added to library (Plex recently added)
2. Paginated activity endpoint
3. Activity UI with "Load More"
4. Real-time activity updates via WebSocket

---

## Dependencies

### Backend (`server/package.json`)

```json
{
  "dependencies": {
    "socket.io": "^4.7.4"
  }
}
```

### Frontend (`client/package.json`)

```json
{
  "dependencies": {
    "socket.io-client": "^4.7.4"
  }
}
```

---

## Error Handling

### WebSocket Reconnection

The frontend WebSocket service handles reconnection automatically:
- Max 10 reconnection attempts
- 1-5 second delay between attempts
- Exponential backoff
- UI indicator for connection status

### Service Unavailability

When external services are unavailable:
- Graceful degradation (show available data)
- Error indicators per section
- Retry on next poll cycle
- No crashes or full page errors

### Empty States

Each section has appropriate empty states:
- **Streaming**: "No active streams"
- **Downloads**: "No active downloads"
- **Activity**: "No recent activity"

---

## Performance Considerations

### Polling Optimization

- Only poll when there are active WebSocket subscribers
- Different intervals per data type (streaming: 10s, downloads: 5s, stats: 30s)
- Stop polling when no subscribers

### Data Caching

- Cache last known data in WebSocket service
- Send cached data immediately to new subscribers
- Diff detection for change events

### Frontend Optimization

- OnPush change detection strategy
- TrackBy functions for ngFor loops
- Unsubscribe from observables on destroy
