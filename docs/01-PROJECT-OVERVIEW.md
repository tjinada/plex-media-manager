# TJ Plex Media Manager - Project Overview

## Vision

TJ Plex Media Manager is a self-hosted web application for analyzing and managing Plex media library content. It provides detailed insights into your media collection's quality, format, and composition, and integrates with Radarr/Sonarr to identify gaps and request upgrades.

## Goals

1. **Library Visibility** - See all Plex content with detailed file metadata (size, format, resolution, codec, bitrate)
2. **Visual Analysis** - Understand library composition through charts and statistics
3. **Decision Support** - Filter and sort content to identify upgrade/downgrade/delete candidates
4. **Arr Integration** - View wanted/missing content from Radarr/Sonarr and trigger searches

## Key Features

- Connect to Plex server via OAuth or manual token
- Sync and browse complete movie and TV show library
- View detailed media file information (resolution, codec, bitrate, file size, container format)
- Filter and search library by any attribute
- Dashboard with visual breakdowns (resolution distribution, codec usage, storage analysis)
- Radarr integration for movie management
- Sonarr integration for TV show management
- View missing/wanted content across services
- Trigger searches for individual items
- Mobile-friendly PWA (installable on iOS/Android)

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Angular 17+ (Standalone Components) |
| Styling | Tailwind CSS |
| Backend | Node.js + Express |
| Database | MongoDB |
| Containerization | Docker + Docker Compose |
| PWA | Angular Service Worker |

## Repository Structure

```
/plex-media-manager
├── /client                 # Angular frontend application
│   ├── /src
│   │   ├── /app
│   │   │   ├── /core       # Services, guards, interceptors
│   │   │   ├── /shared     # Shared components, pipes, directives
│   │   │   ├── /features   # Feature modules (dashboard, movies, shows, etc.)
│   │   │   └── /layouts    # Layout components (shell, sidebar, bottom-nav)
│   │   ├── /assets         # Static assets, icons
│   │   └── /environments   # Environment configurations
│   ├── angular.json
│   ├── tailwind.config.js
│   └── package.json
│
├── /server                 # Express backend application
│   ├── /src
│   │   ├── /config         # Configuration (db, environment)
│   │   ├── /controllers    # Route controllers
│   │   ├── /models         # Mongoose models
│   │   ├── /routes         # Express routes
│   │   ├── /services       # Business logic (Plex, Radarr, Sonarr APIs)
│   │   ├── /jobs           # Background sync jobs
│   │   └── /utils          # Utility functions
│   ├── server.js           # Entry point
│   └── package.json
│
├── /docker                 # Docker configuration
│   ├── Dockerfile.client   # Frontend build
│   ├── Dockerfile.server   # Backend build
│   ├── docker-compose.yml  # Full stack compose
│   └── nginx.conf          # Nginx config for serving frontend
│
├── /docs                   # Project documentation
│   ├── 01-PROJECT-OVERVIEW.md
│   ├── 02-PHASES.md
│   ├── 03-ARCHITECTURE.md
│   ├── 04-DATA-MODELS.md
│   ├── 05-API-ENDPOINTS.md
│   ├── 06-UI-WIREFRAMES.md
│   ├── 07-EXTERNAL-APIS.md
│   └── 08-PWA-SETUP.md
│
├── .gitignore
├── README.md
└── package.json            # Root package.json for scripts
```

## Design Principles

- **KISS (Keep It Simple, Stupid)** - Simple solutions over complex ones
- **YAGNI (You Aren't Gonna Need It)** - Build only what's needed now
- **SOLID** - Clean, maintainable code architecture
- **Mobile-First** - Design for mobile, enhance for desktop

## UI/UX Guidelines

- Dark theme with cyan/teal accent colors (similar to Tracearr)
- Mobile-first responsive design
- Bottom navigation bar on mobile (5 items)
- Collapsible sidebar on desktop
- Card-based layouts for media items
- Touch-friendly targets (minimum 44x44px)
- PWA installable experience

## Target Deployment

- **Platform**: Unraid (Docker container)
- **Access**: Local network + optional remote via reverse proxy
- **PWA**: Installable on iOS/Android home screens
