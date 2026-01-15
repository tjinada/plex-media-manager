# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TJ Plex Media Manager is a self-hosted web application for analyzing and managing a Plex media library. It provides detailed insights into media quality, format, and composition while integrating with Radarr/Sonarr for content management and Tautulli for playback analytics.

# Development Principles

## Code Philosophy
- Follow KISS (Keep It Simple, Stupid)
- Follow YAGNI (You Aren't Gonna Need It)  
- Follow SOLID principles

## Workflow Requirements
- ALWAYS list files that will be newly added and modified BEFORE making changes
- DO NOT make any code changes until the design is finalized and approved
- DO NOT add documentation, guides, diagrams, mockups, or test cases unless explicitly requested

## Development Commands

```bash
# Install all dependencies (root, server, client)
npm run install:all

# Run both server and client concurrently (development)
npm run dev

# Run server only (with nodemon hot-reload)
npm run server:dev

# Run client only (Angular dev server)
npm run client:dev

# Build client for production
npm run client:build
```

**Prerequisites:**
- Node.js 18+
- MongoDB 7 running locally on port 27017
- Copy `.env.example` to `.env` in root directory

## Architecture

### Monorepo Structure
- `/client` - Angular 17+ frontend (standalone components, Tailwind CSS)
- `/server` - Express.js backend (Node.js)
- `/docker` - Docker deployment configuration

### Three-Tier Architecture
```
Angular (Nginx :80) → Express API (:3000) → MongoDB (:27017)
                              ↓
              External: Plex, Radarr, Sonarr, Tautulli
```

### Backend Layers (`/server/src`)
- **Routes** (`/routes`) - Express route definitions, mounted at `/api/*`
- **Controllers** (`/controllers`) - Request handling and validation
- **Services** (`/services`) - Business logic and external API integrations
- **Models** (`/models`) - Mongoose schemas for MongoDB

Key services:
- `plex.service.js` - Plex API client
- `sync.service.js` - Library sync orchestration
- `tautulli.service.js` - Tautulli integration for playback data
- `auto-sync.service.js` - Cron-based automatic sync scheduler

### Frontend Structure (`/client/src/app`)
- **Core** (`/core`) - Services, models, HTTP interceptors
- **Features** (`/features`) - Page components (dashboard, movies, shows, storage, wanted, watch-history, compatibility, transcoding, settings)
- **Layouts** (`/layouts`) - Shell, sidebar (desktop), bottom-nav (mobile)
- **Shared** (`/shared`) - Reusable components (filter-panel, range-slider, chart-card)

All feature components use lazy loading via `loadComponent()` in routes.

### API Routes
All routes prefixed with `/api`:
- `/auth` - Plex OAuth authentication
- `/server` - Plex server management
- `/sync` - Library sync operations
- `/movies`, `/shows`, `/episodes` - Media CRUD
- `/stats` - Statistics and analytics
- `/radarr`, `/sonarr` - Arr service integration
- `/watch-history` - Playback history
- `/compatibility` - Device compatibility analysis
- `/transcoding` - Transcode analytics
- `/tautulli` - Tautulli configuration

### Data Models
Primary collections in MongoDB:
- `plexservers` - Plex server config (token encrypted with AES-256-GCM)
- `movies`, `tvshows`, `seasons`, `episodes` - Media metadata with detailed file info (codec, resolution, HDR, bitrate, audio tracks, subtitles)
- `playbacksessions` - Detailed session tracking (transcode decisions, hardware acceleration)
- `radarrconfigs`, `sonarrconfigs`, `tautulliconfigs` - Service configurations

### Utilities
- `server/src/utils/codec.js` - Codec normalization (e.g., hevc/h265/x265 → HEVC)
- `server/src/utils/resolution.js` - Resolution detection from dimensions
- `server/src/config/encryption.js` - AES-256-GCM encryption for tokens
- `server/src/config/compatibility-rules.js` - Device compatibility definitions

## Design Principles
- Dark theme with cyan/teal accents
- Mobile-first responsive design (bottom nav on mobile, collapsible sidebar on desktop)
- Single-user application (one Plex server connection)
- Plex tokens encrypted at rest
