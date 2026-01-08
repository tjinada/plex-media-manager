# TJ Plex Media Manager - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              UNRAID SERVER                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     Docker Compose Stack                               │  │
│  │                                                                        │  │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐               │  │
│  │  │   Nginx     │    │   Express   │    │   MongoDB   │               │  │
│  │  │  (Client)   │───▶│   (Server)  │───▶│  Database   │               │  │
│  │  │   :80       │    │   :3000     │    │   :27017    │               │  │
│  │  └─────────────┘    └──────┬──────┘    └─────────────┘               │  │
│  │                            │                                          │  │
│  └────────────────────────────┼──────────────────────────────────────────┘  │
│                               │                                              │
│                               ▼                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                      External Services                                  │ │
│  │   ┌──────────┐    ┌──────────┐    ┌──────────┐                        │ │
│  │   │   Plex   │    │  Radarr  │    │  Sonarr  │                        │ │
│  │   │  :32400  │    │  :7878   │    │  :8989   │                        │ │
│  │   └──────────┘    └──────────┘    └──────────┘                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                               ▲
                               │
              ┌────────────────┴────────────────┐
              │                                 │
        ┌─────┴─────┐                    ┌──────┴──────┐
        │  Desktop  │                    │   Mobile    │
        │  Browser  │                    │  PWA/Browser│
        └───────────┘                    └─────────────┘
```

## Component Architecture

### Frontend (Angular)

```
┌────────────────────────────────────────────────────────────────┐
│                        Angular App                              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    App Shell                             │   │
│  │  ┌─────────────┐  ┌───────────────────────────────────┐ │   │
│  │  │   Sidebar   │  │          Router Outlet            │ │   │
│  │  │  (Desktop)  │  │                                   │ │   │
│  │  │             │  │  ┌─────────────────────────────┐  │ │   │
│  │  │ - Dashboard │  │  │      Feature Component      │  │ │   │
│  │  │ - Movies    │  │  │                             │  │ │   │
│  │  │ - TV Shows  │  │  │   (Dashboard, Movies,       │  │ │   │
│  │  │ - Wanted    │  │  │    Shows, Wanted, Settings) │  │ │   │
│  │  │ - Settings  │  │  │                             │  │ │   │
│  │  │             │  │  └─────────────────────────────┘  │ │   │
│  │  └─────────────┘  └───────────────────────────────────┘ │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │              Bottom Nav (Mobile)                    │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    Core      │  │    Shared    │  │   Features   │          │
│  │  - Services  │  │ - Components │  │ - Dashboard  │          │
│  │  - Guards    │  │ - Pipes      │  │ - Movies     │          │
│  │  - Intercept │  │ - Directives │  │ - Shows      │          │
│  │  - Models    │  │              │  │ - Wanted     │          │
│  └──────────────┘  └──────────────┘  │ - Settings   │          │
│                                       └──────────────┘          │
└────────────────────────────────────────────────────────────────┘
```

### Backend (Express)

```
┌────────────────────────────────────────────────────────────────┐
│                       Express Server                            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     Middleware                           │   │
│  │   CORS │ JSON Parser │ Error Handler │ Request Logger   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                       Routes                             │   │
│  │   /api/auth  │  /api/server  │  /api/movies  │  /api/shows │
│  │   /api/stats │  /api/radarr  │  /api/sonarr  │  /api/sync  │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Controllers                           │   │
│  │  Handle request/response, input validation               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      Services                            │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │   Plex   │ │  Radarr  │ │  Sonarr  │ │   Sync   │   │   │
│  │  │ Service  │ │ Service  │ │ Service  │ │ Service  │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 Models (Mongoose)                        │   │
│  │   PlexServer │ Movie │ TVShow │ Season │ Episode │ Config│   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      MongoDB                             │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Plex Library Sync Flow

```
┌──────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│  Client  │         │  Server  │         │   Plex   │         │ MongoDB  │
└────┬─────┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │                    │
     │  Trigger Sync      │                    │                    │
     │───────────────────▶│                    │                    │
     │                    │                    │                    │
     │                    │  Get Libraries     │                    │
     │                    │───────────────────▶│                    │
     │                    │                    │                    │
     │                    │  Library List      │                    │
     │                    │◀───────────────────│                    │
     │                    │                    │                    │
     │                    │  Get All Movies    │                    │
     │                    │───────────────────▶│                    │
     │                    │                    │                    │
     │                    │  Movie Data        │                    │
     │                    │◀───────────────────│                    │
     │                    │                    │                    │
     │                    │  Get Media Info    │                    │
     │                    │───────────────────▶│                    │
     │                    │                    │                    │
     │                    │  File Details      │                    │
     │                    │◀───────────────────│                    │
     │                    │                    │                    │
     │                    │                    │   Upsert Movies    │
     │                    │────────────────────────────────────────▶│
     │                    │                    │                    │
     │  Sync Complete     │                    │                    │
     │◀───────────────────│                    │                    │
     │                    │                    │                    │
```

### Authentication Flow (Plex OAuth)

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Client  │         │  Server  │         │   Plex   │
└────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │
     │  Request Auth URL  │                    │
     │───────────────────▶│                    │
     │                    │                    │
     │                    │  Create PIN        │
     │                    │───────────────────▶│
     │                    │                    │
     │                    │  PIN + Auth URL    │
     │                    │◀───────────────────│
     │                    │                    │
     │  Auth URL + PIN ID │                    │
     │◀───────────────────│                    │
     │                    │                    │
     │  User Opens URL    │                    │
     │  (Plex Login)      │                    │
     │─────────────────────────────────────────▶
     │                    │                    │
     │  Check PIN Status  │                    │
     │───────────────────▶│                    │
     │                    │                    │
     │                    │  Check PIN         │
     │                    │───────────────────▶│
     │                    │                    │
     │                    │  Auth Token        │
     │                    │◀───────────────────│
     │                    │                    │
     │  Token Received    │                    │
     │◀───────────────────│                    │
     │                    │                    │
```

## Docker Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    docker-compose.yml                        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Network: tjpmm-network (bridge)                       │ │
│  │                                                        │ │
│  │  ┌──────────────────┐                                  │ │
│  │  │  tjpmm-client    │                                  │ │
│  │  │  (nginx:alpine)  │                                  │ │
│  │  │                  │                                  │ │
│  │  │  Port: 80:80     │                                  │ │
│  │  │  Serves Angular  │                                  │ │
│  │  │  Proxies /api    │──────┐                           │ │
│  │  └──────────────────┘      │                           │ │
│  │                            │                           │ │
│  │                            ▼                           │ │
│  │  ┌──────────────────┐                                  │ │
│  │  │  tjpmm-server    │                                  │ │
│  │  │  (node:20-alpine)│                                  │ │
│  │  │                  │                                  │ │
│  │  │  Port: 3000      │                                  │ │
│  │  │  (internal only) │──────┐                           │ │
│  │  └──────────────────┘      │                           │ │
│  │                            │                           │ │
│  │                            ▼                           │ │
│  │  ┌──────────────────┐                                  │ │
│  │  │  tjpmm-mongo     │                                  │ │
│  │  │  (mongo:7)       │                                  │ │
│  │  │                  │                                  │ │
│  │  │  Port: 27017     │                                  │ │
│  │  │  (internal only) │                                  │ │
│  │  │                  │                                  │ │
│  │  │  Volume:         │                                  │ │
│  │  │  mongo-data      │                                  │ │
│  │  └──────────────────┘                                  │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Volumes:                                                    │
│  - mongo-data: Persistent database storage                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Security Considerations

1. **Network Isolation**: MongoDB and server only exposed internally within Docker network
2. **Plex Token Storage**: Encrypted at rest in MongoDB
3. **API Keys**: Radarr/Sonarr API keys stored securely, never exposed to client
4. **CORS**: Configured to only allow requests from the frontend origin
5. **Input Validation**: All API inputs validated before processing

## Scalability Notes

For a single-user home media server application, the current architecture is sufficient. Future considerations if needed:

- Redis for caching frequent queries
- Background job queue (Bull) for large library syncs
- Pagination with cursor-based approach for very large libraries
