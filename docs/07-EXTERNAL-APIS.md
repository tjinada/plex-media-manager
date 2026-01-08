# TJ Plex Media Manager - External APIs

## Overview

This document details the external APIs used by TJ Plex Media Manager and the specific endpoints required for each integration.

---

## Plex API

### Authentication

#### Plex OAuth Flow

1. **Create PIN** - Request a PIN from Plex
2. **User Authorization** - User visits Plex auth URL and logs in
3. **Check PIN** - Poll for PIN status until authenticated
4. **Get Token** - Receive auth token when complete

#### Endpoints

**Create PIN:**
```
POST https://plex.tv/api/v2/pins
Headers:
  X-Plex-Client-Identifier: {unique-app-id}
  X-Plex-Product: TJ Plex Media Manager
  Accept: application/json

Response:
{
  "id": 123456789,
  "code": "ABCD1234",
  "authToken": null,  // null until authenticated
  "expiresAt": "2026-01-07T11:00:00Z"
}
```

**Auth URL:**
```
https://app.plex.tv/auth#?clientID={X-Plex-Client-Identifier}&code={pin.code}&context[device][product]=TJ%20Plex%20Media%20Manager
```

**Check PIN Status:**
```
GET https://plex.tv/api/v2/pins/{pinId}
Headers:
  X-Plex-Client-Identifier: {unique-app-id}
  Accept: application/json

Response (authenticated):
{
  "id": 123456789,
  "code": "ABCD1234",
  "authToken": "abc123xyz..."  // Token when authenticated
}
```

#### Required Headers for All Plex Requests

```
X-Plex-Client-Identifier: {unique-app-id}
X-Plex-Product: TJ Plex Media Manager
X-Plex-Version: 1.0.0
X-Plex-Platform: Web
X-Plex-Token: {auth-token}
Accept: application/json
```

### Server Discovery

**Get User's Servers:**
```
GET https://plex.tv/api/v2/resources?includeHttps=1&includeRelay=1
Headers: [standard headers + token]

Response:
{
  "MediaContainer": {
    "Device": [
      {
        "name": "TJPlex",
        "publicAddress": "...",
        "accessToken": "...",
        "connections": [
          {
            "uri": "http://192.168.0.243:32400",
            "local": true
          }
        ]
      }
    ]
  }
}
```

### Library Endpoints

**Get Libraries (Sections):**
```
GET {server_url}/library/sections
Headers: [standard headers]

Response:
{
  "MediaContainer": {
    "Directory": [
      {
        "key": "1",
        "title": "Movies",
        "type": "movie"
      },
      {
        "key": "2", 
        "title": "TV Shows",
        "type": "show"
      }
    ]
  }
}
```

**Get All Movies in Library:**
```
GET {server_url}/library/sections/{sectionId}/all
Headers: [standard headers]

Response:
{
  "MediaContainer": {
    "Metadata": [
      {
        "ratingKey": "12345",
        "title": "Avatar",
        "year": 2009,
        "summary": "...",
        "thumb": "/library/metadata/12345/thumb",
        "art": "/library/metadata/12345/art",
        "contentRating": "PG-13",
        "rating": 7.9,
        "studio": "20th Century Fox",
        "Genre": [{"tag": "Action"}],
        "Director": [{"tag": "James Cameron"}],
        "Media": [...]
      }
    ]
  }
}
```

**Get Detailed Movie Metadata (with media info):**
```
GET {server_url}/library/metadata/{ratingKey}
Headers: [standard headers]

Response includes nested Media/Part/Stream data:
{
  "MediaContainer": {
    "Metadata": [{
      "ratingKey": "12345",
      "title": "Avatar",
      "Media": [{
        "videoCodec": "hevc",
        "videoProfile": "main 10",
        "width": 3840,
        "height": 2160,
        "bitrate": 37000,
        "audioCodec": "truehd",
        "audioChannels": 8,
        "container": "mkv",
        "Part": [{
          "file": "/movies/Avatar (2009)/Avatar.mkv",
          "size": 45000000000,
          "duration": 9720000,
          "Stream": [
            {
              "streamType": 1,  // 1=video, 2=audio, 3=subtitle
              "codec": "hevc",
              "bitrate": 35000,
              "width": 3840,
              "height": 2160,
              "displayTitle": "4K (HEVC Main 10)"
            },
            {
              "streamType": 2,
              "codec": "truehd",
              "channels": 8,
              "bitrate": 4500,
              "language": "English",
              "displayTitle": "English (TRUEHD 7.1)"
            }
          ]
        }]
      }]
    }]
  }
}
```

**Get All TV Shows:**
```
GET {server_url}/library/sections/{sectionId}/all
Headers: [standard headers]

Response similar to movies but type="show"
```

**Get Show Seasons:**
```
GET {server_url}/library/metadata/{showRatingKey}/children
Headers: [standard headers]

Response:
{
  "MediaContainer": {
    "Metadata": [
      {
        "ratingKey": "23456",
        "parentRatingKey": "12345",
        "title": "Season 1",
        "index": 1,  // Season number
        "leafCount": 7  // Episode count
      }
    ]
  }
}
```

**Get Season Episodes:**
```
GET {server_url}/library/metadata/{seasonRatingKey}/children
Headers: [standard headers]

Response includes episode metadata with Media info (same structure as movies)
```

### Image URLs

Plex images require authentication. Format:
```
{server_url}{thumb_path}?X-Plex-Token={token}

Example:
http://192.168.0.243:32400/library/metadata/12345/thumb?X-Plex-Token=abc123
```

For the app, we'll proxy these through our backend to avoid exposing tokens to the client.

---

## Radarr API

### Base URL
```
{radarr_url}/api/v3
```

### Authentication
All requests require API key in header:
```
X-Api-Key: {api_key}
```

### Endpoints

**Test Connection / Get Status:**
```
GET /api/v3/system/status

Response:
{
  "version": "5.0.0.8057",
  "appName": "Radarr"
}
```

**Get All Movies:**
```
GET /api/v3/movie

Response:
[
  {
    "id": 123,
    "title": "Avatar",
    "year": 2009,
    "tmdbId": 19995,
    "imdbId": "tt0499549",
    "monitored": true,
    "hasFile": true,
    "qualityProfileId": 1,
    "path": "/movies/Avatar (2009)",
    "sizeOnDisk": 45000000000,
    "images": [
      {"coverType": "poster", "remoteUrl": "https://..."}
    ],
    "movieFile": {
      "quality": {"quality": {"name": "Remux-2160p"}},
      "mediaInfo": {...}
    }
  }
]
```

**Get Missing Movies (Wanted):**
```
GET /api/v3/wanted/missing?page=1&pageSize=50&sortKey=title&sortDirection=ascending

Response:
{
  "page": 1,
  "pageSize": 50,
  "totalRecords": 15,
  "records": [
    {
      "id": 456,
      "title": "Dune: Part Two",
      "year": 2024,
      "monitored": true,
      "hasFile": false,
      "images": [...]
    }
  ]
}
```

**Get Quality Profiles:**
```
GET /api/v3/qualityprofile

Response:
[
  {
    "id": 1,
    "name": "Ultra-HD",
    "cutoff": 31,  // Quality ID for cutoff
    "items": [...]
  }
]
```

**Trigger Search for Movie:**
```
POST /api/v3/command
Body:
{
  "name": "MoviesSearch",
  "movieIds": [123]
}

Response:
{
  "id": 789,
  "name": "MoviesSearch",
  "status": "queued"
}
```

**Get Movies by Quality Cutoff Unmet (Upgrade Candidates):**
```
GET /api/v3/wanted/cutoff?page=1&pageSize=50

Response similar to missing, but these are movies that have files
but don't meet the quality cutoff.
```

---

## Sonarr API

### Base URL
```
{sonarr_url}/api/v3
```

### Authentication
All requests require API key in header:
```
X-Api-Key: {api_key}
```

### Endpoints

**Test Connection / Get Status:**
```
GET /api/v3/system/status

Response:
{
  "version": "4.0.0.700",
  "appName": "Sonarr"
}
```

**Get All Series:**
```
GET /api/v3/series

Response:
[
  {
    "id": 123,
    "title": "Breaking Bad",
    "year": 2008,
    "tvdbId": 81189,
    "imdbId": "tt0903747",
    "monitored": true,
    "qualityProfileId": 1,
    "path": "/tv/Breaking Bad",
    "statistics": {
      "seasonCount": 5,
      "episodeCount": 62,
      "episodeFileCount": 62,
      "sizeOnDisk": 180000000000,
      "percentOfEpisodes": 100
    },
    "images": [...]
  }
]
```

**Get Episodes for Series:**
```
GET /api/v3/episode?seriesId={seriesId}

Response:
[
  {
    "id": 456,
    "seriesId": 123,
    "seasonNumber": 1,
    "episodeNumber": 1,
    "title": "Pilot",
    "airDate": "2008-01-20",
    "monitored": true,
    "hasFile": true,
    "episodeFile": {
      "quality": {...},
      "size": 3500000000,
      "mediaInfo": {...}
    }
  }
]
```

**Get Missing Episodes (Wanted):**
```
GET /api/v3/wanted/missing?page=1&pageSize=50&includeSeries=true

Response:
{
  "page": 1,
  "pageSize": 50,
  "totalRecords": 25,
  "records": [
    {
      "id": 789,
      "seriesId": 123,
      "title": "Episode Title",
      "seasonNumber": 2,
      "episodeNumber": 3,
      "airDate": "2026-01-12",
      "monitored": true,
      "hasFile": false,
      "series": {
        "title": "The Last of Us"
      }
    }
  ]
}
```

**Get Cutoff Unmet (Upgrade Candidates):**
```
GET /api/v3/wanted/cutoff?page=1&pageSize=50&includeSeries=true

Response similar to missing.
```

**Trigger Episode Search:**
```
POST /api/v3/command
Body:
{
  "name": "EpisodeSearch",
  "episodeIds": [789]
}

Response:
{
  "id": 999,
  "name": "EpisodeSearch", 
  "status": "queued"
}
```

**Trigger Season Search:**
```
POST /api/v3/command
Body:
{
  "name": "SeasonSearch",
  "seriesId": 123,
  "seasonNumber": 1
}
```

---

## Error Handling

### Common HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process response |
| 400 | Bad Request | Check request parameters |
| 401 | Unauthorized | Check API key / token |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Log and retry |
| 503 | Service Unavailable | Service is down, retry later |

### Retry Strategy

For transient errors (5xx, network timeouts):
- Retry up to 3 times
- Exponential backoff: 1s, 2s, 4s
- Log failures for debugging

---

## Rate Limiting

### Plex
- No strict rate limits documented
- Be respectful: batch requests where possible
- Sync in background, not on every page load

### Radarr / Sonarr
- No strict rate limits for local instances
- Avoid excessive polling (once per minute max for status)
- Batch operations where possible

---

## Data Mapping

### Resolution Mapping

| Plex Width | Resolution Label |
|------------|------------------|
| ≥ 3840 | 4K |
| ≥ 1920 | 1080p |
| ≥ 1280 | 720p |
| ≥ 720 | 480p |
| < 720 | SD |

### Codec Normalization

| Plex Value | Normalized |
|------------|------------|
| hevc, h265 | HEVC |
| h264, avc | H.264 |
| av1 | AV1 |
| mpeg4 | MPEG-4 |
| truehd | TrueHD |
| dts-hd ma | DTS-HD MA |
| dts | DTS |
| ac3, eac3 | AC3/EAC3 |
| aac | AAC |

---

## Security Notes

1. **Token Storage**: Store Plex tokens and API keys encrypted in MongoDB
2. **Backend Only**: Never expose tokens/API keys to frontend
3. **Proxy Images**: Proxy Plex images through backend to avoid token exposure
4. **Validate Inputs**: Sanitize all user inputs before API calls
5. **HTTPS**: Use HTTPS for external Plex.tv calls; local services may use HTTP
