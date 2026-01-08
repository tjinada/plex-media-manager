# TJ Plex Media Manager - Data Models

## Overview

All data is stored in MongoDB using Mongoose ODM. Collections are designed to store synced media data from Plex along with configuration for connected services.

---

## Collections

| Collection | Purpose |
|------------|---------|
| `plexservers` | Connected Plex server configuration |
| `movies` | Movie metadata and file information |
| `tvshows` | TV Show metadata |
| `seasons` | Season information for TV shows |
| `episodes` | Episode metadata and file information |
| `configs` | App configuration (Radarr, Sonarr, etc.) |
| `syncjobs` | Sync job history and status |

---

## Schema Definitions

### PlexServer

Stores the connected Plex server information.

```javascript
{
  _id: ObjectId,
  name: String,                    // Server friendly name (e.g., "TJPlex")
  host: String,                    // Server URL (e.g., "http://192.168.0.243:32400")
  token: String,                   // Plex auth token (encrypted)
  machineId: String,               // Plex server machine identifier
  version: String,                 // Plex server version
  platform: String,                // Server platform (e.g., "Linux")
  isConnected: Boolean,            // Current connection status
  lastSyncAt: Date,                // Last successful sync timestamp
  createdAt: Date,
  updatedAt: Date
}
```

### Movie

Stores movie metadata and media file details.

```javascript
{
  _id: ObjectId,
  plexId: String,                  // Plex rating key (unique identifier)
  serverId: ObjectId,              // Reference to PlexServer
  
  // Basic Metadata
  title: String,
  originalTitle: String,           // Original title if different
  year: Number,
  summary: String,
  tagline: String,
  contentRating: String,           // e.g., "PG-13", "R"
  rating: Number,                  // Plex rating
  audienceRating: Number,          // Audience rating
  studio: String,
  
  // Media Identifiers
  guid: String,                    // Plex GUID
  imdbId: String,                  // IMDB ID if available
  tmdbId: String,                  // TMDB ID if available
  
  // Artwork
  posterUrl: String,               // Poster image URL
  artUrl: String,                  // Background art URL
  thumbUrl: String,                // Thumbnail URL
  
  // Genres & Tags
  genres: [String],                // e.g., ["Action", "Sci-Fi"]
  directors: [String],
  writers: [String],
  actors: [{
    name: String,
    role: String,
    thumb: String
  }],
  
  // Media File Information
  media: {
    // Video
    videoCodec: String,            // e.g., "hevc", "h264", "av1"
    videoProfile: String,          // e.g., "main 10"
    videoBitrate: Number,          // Kbps
    videoFrameRate: String,        // e.g., "24p", "23.976"
    
    // Resolution
    width: Number,                 // e.g., 3840
    height: Number,                // e.g., 2160
    resolution: String,            // Computed: "4K", "1080p", "720p", "SD"
    aspectRatio: String,           // e.g., "2.39:1"
    
    // Audio (primary track)
    audioCodec: String,            // e.g., "truehd", "dts", "aac"
    audioProfile: String,          // e.g., "Atmos", "DTS-HD MA"
    audioChannels: Number,         // e.g., 8 (7.1)
    audioBitrate: Number,          // Kbps
    
    // Container & File
    container: String,             // e.g., "mkv", "mp4"
    fileSize: Number,              // Bytes
    filePath: String,              // Full file path
    fileName: String,              // File name only
    duration: Number,              // Duration in milliseconds
    bitrate: Number,               // Overall bitrate Kbps
    
    // Additional Audio Tracks
    audioTracks: [{
      codec: String,
      channels: Number,
      language: String,
      title: String
    }],
    
    // Subtitles
    subtitles: [{
      language: String,
      codec: String,               // e.g., "srt", "pgs", "ass"
      forced: Boolean,
      title: String
    }]
  },
  
  // Library Info
  libraryId: String,               // Plex library section ID
  libraryName: String,             // Plex library name
  
  // Timestamps
  addedAt: Date,                   // When added to Plex
  updatedAt: Date,                 // Last updated in Plex
  lastSyncedAt: Date,              // Last synced to our DB
  createdAt: Date,
  
  // Indexes
  // Index on: plexId, serverId, title, year, resolution, videoCodec
}
```

### TVShow

Stores TV show metadata (parent level).

```javascript
{
  _id: ObjectId,
  plexId: String,                  // Plex rating key
  serverId: ObjectId,              // Reference to PlexServer
  
  // Basic Metadata
  title: String,
  originalTitle: String,
  year: Number,                    // First air year
  summary: String,
  tagline: String,
  contentRating: String,           // e.g., "TV-MA"
  rating: Number,
  studio: String,                  // Network
  
  // Media Identifiers
  guid: String,
  imdbId: String,
  tmdbId: String,
  tvdbId: String,
  
  // Artwork
  posterUrl: String,
  artUrl: String,
  thumbUrl: String,
  bannerUrl: String,
  
  // Genres & Tags
  genres: [String],
  actors: [{
    name: String,
    role: String,
    thumb: String
  }],
  
  // Stats (computed from episodes)
  seasonCount: Number,
  episodeCount: Number,
  totalFileSize: Number,           // Sum of all episode file sizes
  
  // Aggregate Media Info (most common across episodes)
  dominantResolution: String,      // Most common resolution
  dominantVideoCodec: String,      // Most common video codec
  
  // Library Info
  libraryId: String,
  libraryName: String,
  
  // Timestamps
  addedAt: Date,
  updatedAt: Date,
  lastSyncedAt: Date,
  createdAt: Date
}
```

### Season

Stores season information for TV shows.

```javascript
{
  _id: ObjectId,
  plexId: String,                  // Plex rating key
  serverId: ObjectId,              // Reference to PlexServer
  showId: ObjectId,                // Reference to TVShow
  
  // Basic Metadata
  title: String,                   // e.g., "Season 1" or custom title
  seasonNumber: Number,
  summary: String,
  
  // Artwork
  posterUrl: String,
  thumbUrl: String,
  
  // Stats
  episodeCount: Number,
  totalFileSize: Number,
  
  // Timestamps
  addedAt: Date,
  updatedAt: Date,
  lastSyncedAt: Date,
  createdAt: Date
}
```

### Episode

Stores episode metadata and file information.

```javascript
{
  _id: ObjectId,
  plexId: String,                  // Plex rating key
  serverId: ObjectId,              // Reference to PlexServer
  showId: ObjectId,                // Reference to TVShow
  seasonId: ObjectId,              // Reference to Season
  
  // Basic Metadata
  title: String,
  seasonNumber: Number,
  episodeNumber: Number,
  summary: String,
  contentRating: String,
  rating: Number,
  
  // Media Identifiers
  guid: String,
  imdbId: String,
  tmdbId: String,
  tvdbId: String,
  
  // Artwork
  thumbUrl: String,
  
  // Directors & Writers
  directors: [String],
  writers: [String],
  
  // Media File Information (same structure as Movie.media)
  media: {
    videoCodec: String,
    videoProfile: String,
    videoBitrate: Number,
    videoFrameRate: String,
    
    width: Number,
    height: Number,
    resolution: String,
    aspectRatio: String,
    
    audioCodec: String,
    audioProfile: String,
    audioChannels: Number,
    audioBitrate: Number,
    
    container: String,
    fileSize: Number,
    filePath: String,
    fileName: String,
    duration: Number,
    bitrate: Number,
    
    audioTracks: [{
      codec: String,
      channels: Number,
      language: String,
      title: String
    }],
    
    subtitles: [{
      language: String,
      codec: String,
      forced: Boolean,
      title: String
    }]
  },
  
  // Library Info
  libraryId: String,
  libraryName: String,
  
  // Timestamps
  originallyAiredAt: Date,         // Original air date
  addedAt: Date,
  updatedAt: Date,
  lastSyncedAt: Date,
  createdAt: Date
}
```

### Config

Stores application configuration for external services.

```javascript
{
  _id: ObjectId,
  key: String,                     // Unique config key
  
  // Radarr Configuration (key: "radarr")
  radarr: {
    enabled: Boolean,
    host: String,                  // e.g., "http://192.168.0.243:7878"
    apiKey: String,                // API key (encrypted)
    isConnected: Boolean,
    lastCheckedAt: Date
  },
  
  // Sonarr Configuration (key: "sonarr")
  sonarr: {
    enabled: Boolean,
    host: String,                  // e.g., "http://192.168.0.243:8989"
    apiKey: String,                // API key (encrypted)
    isConnected: Boolean,
    lastCheckedAt: Date
  },
  
  // General App Settings (key: "general")
  general: {
    syncIntervalMinutes: Number,   // Auto-sync interval
    theme: String,                 // "dark" | "light"
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

### SyncJob

Tracks sync job history and status.

```javascript
{
  _id: ObjectId,
  serverId: ObjectId,              // Reference to PlexServer
  
  type: String,                    // "full" | "incremental" | "movies" | "shows"
  status: String,                  // "pending" | "running" | "completed" | "failed"
  
  // Progress
  totalItems: Number,
  processedItems: Number,
  
  // Results
  moviesAdded: Number,
  moviesUpdated: Number,
  showsAdded: Number,
  showsUpdated: Number,
  episodesAdded: Number,
  episodesUpdated: Number,
  
  // Error Information
  error: String,                   // Error message if failed
  
  // Timestamps
  startedAt: Date,
  completedAt: Date,
  createdAt: Date
}
```

---

## Indexes

### Performance Indexes

```javascript
// Movies
db.movies.createIndex({ plexId: 1, serverId: 1 }, { unique: true })
db.movies.createIndex({ serverId: 1 })
db.movies.createIndex({ title: "text" })
db.movies.createIndex({ year: 1 })
db.movies.createIndex({ "media.resolution": 1 })
db.movies.createIndex({ "media.videoCodec": 1 })
db.movies.createIndex({ "media.fileSize": 1 })

// TV Shows
db.tvshows.createIndex({ plexId: 1, serverId: 1 }, { unique: true })
db.tvshows.createIndex({ serverId: 1 })
db.tvshows.createIndex({ title: "text" })

// Episodes
db.episodes.createIndex({ plexId: 1, serverId: 1 }, { unique: true })
db.episodes.createIndex({ showId: 1, seasonNumber: 1, episodeNumber: 1 })
db.episodes.createIndex({ "media.resolution": 1 })
db.episodes.createIndex({ "media.videoCodec": 1 })

// Seasons
db.seasons.createIndex({ showId: 1, seasonNumber: 1 })
```

---

## Resolution Mapping

Helper function to determine resolution label from dimensions:

```javascript
function getResolution(width, height) {
  if (width >= 3840 || height >= 2160) return "4K";
  if (width >= 1920 || height >= 1080) return "1080p";
  if (width >= 1280 || height >= 720) return "720p";
  if (width >= 720 || height >= 480) return "480p";
  return "SD";
}
```

---

## Codec Normalization

Standard codec names for consistency:

| Raw Value | Normalized |
|-----------|------------|
| hevc, h265, x265 | HEVC |
| h264, x264, avc | H.264 |
| av1 | AV1 |
| mpeg4, divx, xvid | MPEG-4 |
| vc1 | VC-1 |
| truehd | TrueHD |
| dts-hd ma, dts-hd | DTS-HD MA |
| dts | DTS |
| ac3, eac3 | AC3/EAC3 |
| aac | AAC |
| flac | FLAC |
