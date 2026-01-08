# TJ Plex Media Manager - API Endpoints

## Base URL

All API endpoints are prefixed with `/api`.

---

## Authentication Endpoints

### Plex OAuth Flow

#### `GET /api/auth/plex/initiate`
Initiates Plex OAuth by creating a PIN.

**Response:**
```json
{
  "pinId": "123456789",
  "authUrl": "https://app.plex.tv/auth#?clientID=...&code=...",
  "code": "ABCD1234"
}
```

#### `GET /api/auth/plex/check/:pinId`
Checks if the PIN has been authenticated.

**Response (pending):**
```json
{
  "authenticated": false
}
```

**Response (success):**
```json
{
  "authenticated": true,
  "token": "plex_token_here",
  "user": {
    "id": "12345",
    "username": "thanujaranjeewa",
    "email": "user@example.com",
    "thumb": "https://..."
  }
}
```

#### `POST /api/auth/plex/token`
Manually set Plex token (fallback method).

**Request:**
```json
{
  "token": "your_plex_token"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "username": "thanujaranjeewa",
    "email": "user@example.com"
  }
}
```

---

## Server Endpoints

### `GET /api/server`
Get connected Plex server information.

**Response:**
```json
{
  "server": {
    "id": "abc123",
    "name": "TJPlex",
    "host": "http://192.168.0.243:32400",
    "version": "1.40.0",
    "platform": "Linux",
    "isConnected": true,
    "lastSyncAt": "2026-01-07T10:30:00Z"
  }
}
```

### `POST /api/server`
Connect a Plex server.

**Request:**
```json
{
  "host": "http://192.168.0.243:32400",
  "token": "plex_token"
}
```

**Response:**
```json
{
  "success": true,
  "server": {
    "id": "abc123",
    "name": "TJPlex",
    "host": "http://192.168.0.243:32400"
  }
}
```

### `DELETE /api/server/:id`
Disconnect and remove a Plex server.

**Response:**
```json
{
  "success": true
}
```

### `POST /api/server/:id/test`
Test connection to Plex server.

**Response:**
```json
{
  "success": true,
  "name": "TJPlex",
  "version": "1.40.0"
}
```

---

## Sync Endpoints

### `POST /api/sync`
Trigger a full library sync.

**Request (optional):**
```json
{
  "type": "full"  // "full" | "movies" | "shows"
}
```

**Response:**
```json
{
  "jobId": "job_abc123",
  "status": "running"
}
```

### `GET /api/sync/status`
Get current sync job status.

**Response:**
```json
{
  "isRunning": true,
  "currentJob": {
    "id": "job_abc123",
    "type": "full",
    "status": "running",
    "totalItems": 500,
    "processedItems": 125,
    "startedAt": "2026-01-07T10:30:00Z"
  }
}
```

### `GET /api/sync/history`
Get sync job history.

**Response:**
```json
{
  "jobs": [
    {
      "id": "job_abc123",
      "type": "full",
      "status": "completed",
      "moviesAdded": 10,
      "moviesUpdated": 45,
      "startedAt": "2026-01-07T10:30:00Z",
      "completedAt": "2026-01-07T10:35:00Z"
    }
  ]
}
```

---

## Movies Endpoints

### `GET /api/movies`
Get all movies with optional filtering.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 50) |
| `sort` | string | Sort field (default: "title") |
| `order` | string | Sort order: "asc" or "desc" |
| `search` | string | Search in title |
| `resolution` | string | Filter by resolution: "4K", "1080p", "720p", "SD" |
| `videoCodec` | string | Filter by codec: "HEVC", "H.264", "AV1" |
| `container` | string | Filter by container: "mkv", "mp4" |
| `minSize` | number | Minimum file size in bytes |
| `maxSize` | number | Maximum file size in bytes |

**Response:**
```json
{
  "movies": [
    {
      "id": "abc123",
      "plexId": "12345",
      "title": "Avatar",
      "year": 2009,
      "posterUrl": "/library/metadata/12345/thumb",
      "resolution": "4K",
      "videoCodec": "HEVC",
      "audioCodec": "TrueHD",
      "container": "mkv",
      "fileSize": 45000000000,
      "duration": 9720000
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 557,
    "totalPages": 12
  }
}
```

### `GET /api/movies/:id`
Get detailed movie information.

**Response:**
```json
{
  "movie": {
    "id": "abc123",
    "plexId": "12345",
    "title": "Avatar",
    "originalTitle": "Avatar",
    "year": 2009,
    "summary": "A paraplegic Marine...",
    "tagline": "Enter the world",
    "contentRating": "PG-13",
    "rating": 7.9,
    "studio": "20th Century Fox",
    "genres": ["Action", "Adventure", "Sci-Fi"],
    "directors": ["James Cameron"],
    "posterUrl": "...",
    "artUrl": "...",
    "media": {
      "videoCodec": "HEVC",
      "videoProfile": "main 10",
      "videoBitrate": 35000,
      "width": 3840,
      "height": 2160,
      "resolution": "4K",
      "aspectRatio": "1.78:1",
      "audioCodec": "TrueHD",
      "audioProfile": "Atmos",
      "audioChannels": 8,
      "container": "mkv",
      "fileSize": 45000000000,
      "filePath": "/movies/Avatar (2009)/Avatar.mkv",
      "fileName": "Avatar.mkv",
      "duration": 9720000,
      "bitrate": 37000,
      "audioTracks": [
        { "codec": "truehd", "channels": 8, "language": "English", "title": "TrueHD Atmos 7.1" },
        { "codec": "ac3", "channels": 6, "language": "English", "title": "AC3 5.1" }
      ],
      "subtitles": [
        { "language": "English", "codec": "srt", "forced": false },
        { "language": "Spanish", "codec": "srt", "forced": false }
      ]
    },
    "addedAt": "2025-12-01T00:00:00Z"
  }
}
```

---

## TV Shows Endpoints

### `GET /api/shows`
Get all TV shows with optional filtering.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `sort` | string | Sort field |
| `order` | string | Sort order |
| `search` | string | Search in title |
| `resolution` | string | Filter by dominant resolution |
| `videoCodec` | string | Filter by dominant codec |

**Response:**
```json
{
  "shows": [
    {
      "id": "xyz789",
      "plexId": "67890",
      "title": "Breaking Bad",
      "year": 2008,
      "posterUrl": "...",
      "seasonCount": 5,
      "episodeCount": 62,
      "dominantResolution": "1080p",
      "dominantVideoCodec": "H.264",
      "totalFileSize": 180000000000
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 89,
    "totalPages": 2
  }
}
```

### `GET /api/shows/:id`
Get detailed TV show information with seasons.

**Response:**
```json
{
  "show": {
    "id": "xyz789",
    "title": "Breaking Bad",
    "year": 2008,
    "summary": "...",
    "genres": ["Drama", "Crime"],
    "posterUrl": "...",
    "seasons": [
      {
        "id": "season1",
        "seasonNumber": 1,
        "title": "Season 1",
        "episodeCount": 7,
        "posterUrl": "..."
      }
    ],
    "totalFileSize": 180000000000
  }
}
```

### `GET /api/shows/:showId/seasons/:seasonNumber`
Get season details with episodes.

**Response:**
```json
{
  "season": {
    "id": "season1",
    "seasonNumber": 1,
    "title": "Season 1",
    "episodes": [
      {
        "id": "ep1",
        "episodeNumber": 1,
        "title": "Pilot",
        "resolution": "1080p",
        "videoCodec": "H.264",
        "fileSize": 3500000000,
        "duration": 3480000
      }
    ]
  }
}
```

### `GET /api/episodes/:id`
Get detailed episode information.

**Response:**
```json
{
  "episode": {
    "id": "ep1",
    "title": "Pilot",
    "seasonNumber": 1,
    "episodeNumber": 1,
    "summary": "...",
    "media": {
      "videoCodec": "H.264",
      "resolution": "1080p",
      "audioCodec": "AAC",
      "fileSize": 3500000000,
      "filePath": "/tv/Breaking Bad/Season 01/S01E01.mkv"
    }
  }
}
```

---

## Statistics Endpoints

### `GET /api/stats/overview`
Get library overview statistics.

**Response:**
```json
{
  "totalMovies": 557,
  "totalShows": 89,
  "totalEpisodes": 2456,
  "totalStorage": 15000000000000,
  "lastSyncAt": "2026-01-07T10:30:00Z"
}
```

### `GET /api/stats/resolution`
Get resolution distribution.

**Response:**
```json
{
  "movies": {
    "4K": 150,
    "1080p": 350,
    "720p": 45,
    "SD": 12
  },
  "episodes": {
    "4K": 200,
    "1080p": 1800,
    "720p": 400,
    "SD": 56
  }
}
```

### `GET /api/stats/codecs`
Get codec distribution.

**Response:**
```json
{
  "video": {
    "movies": {
      "HEVC": 250,
      "H.264": 300,
      "AV1": 7
    },
    "episodes": {
      "HEVC": 500,
      "H.264": 1900,
      "MPEG-4": 56
    }
  },
  "audio": {
    "movies": {
      "TrueHD": 100,
      "DTS-HD MA": 80,
      "AC3": 200,
      "AAC": 177
    }
  }
}
```

### `GET /api/stats/storage`
Get storage breakdown.

**Response:**
```json
{
  "byResolution": {
    "4K": 8000000000000,
    "1080p": 5000000000000,
    "720p": 1500000000000,
    "SD": 500000000000
  },
  "byType": {
    "movies": 10000000000000,
    "episodes": 5000000000000
  }
}
```

---

## Radarr Endpoints

### `GET /api/radarr/config`
Get Radarr configuration.

**Response:**
```json
{
  "enabled": true,
  "host": "http://192.168.0.243:7878",
  "isConnected": true,
  "lastCheckedAt": "2026-01-07T10:30:00Z"
}
```

### `POST /api/radarr/config`
Save Radarr configuration.

**Request:**
```json
{
  "host": "http://192.168.0.243:7878",
  "apiKey": "your_api_key"
}
```

### `POST /api/radarr/test`
Test Radarr connection.

**Response:**
```json
{
  "success": true,
  "version": "5.0.0"
}
```

### `GET /api/radarr/missing`
Get missing movies (in Radarr but not in Plex).

**Response:**
```json
{
  "missing": [
    {
      "radarrId": 123,
      "title": "Dune: Part Two",
      "year": 2024,
      "monitored": true,
      "qualityProfile": "Ultra-HD",
      "posterUrl": "..."
    }
  ],
  "total": 15
}
```

### `POST /api/radarr/search/:radarrId`
Trigger search for a movie in Radarr.

**Response:**
```json
{
  "success": true,
  "message": "Search triggered"
}
```

---

## Sonarr Endpoints

### `GET /api/sonarr/config`
Get Sonarr configuration.

### `POST /api/sonarr/config`
Save Sonarr configuration.

### `POST /api/sonarr/test`
Test Sonarr connection.

### `GET /api/sonarr/missing`
Get missing episodes (in Sonarr but not in Plex).

**Response:**
```json
{
  "missing": [
    {
      "sonarrId": 456,
      "seriesTitle": "The Last of Us",
      "seasonNumber": 2,
      "episodeNumber": 3,
      "episodeTitle": "Episode Title",
      "monitored": true,
      "airDate": "2026-01-12"
    }
  ],
  "total": 25
}
```

### `POST /api/sonarr/search/:sonarrId`
Trigger search for an episode in Sonarr.

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid resolution filter",
    "details": {}
  }
}
```

**HTTP Status Codes:**
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized |
| 404 | Not Found |
| 500 | Internal Server Error |
| 503 | Service Unavailable (external API down) |
