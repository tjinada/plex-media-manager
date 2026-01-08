# TJ Plex Media Manager - Development Phases

## Phase Overview

| Phase | Name | Focus | Status |
|-------|------|-------|--------|
| 1 | Foundation & Plex Library Sync | Core infrastructure, Plex connection, basic sync | Planned |
| 2 | Library Browser & Filters | Browsable library with filtering and search | Planned |
| 3 | Visual Dashboard | Charts and analytics for library composition | Planned |
| 4 | Radarr/Sonarr Integration | Arr stack connection, missing/wanted content | Planned |

---

## Phase 1: Foundation & Plex Library Sync

### Objective
Establish core infrastructure and get Plex library data flowing into the application.

### Scope

**Backend:**
- Express server setup with basic middleware
- MongoDB connection with Mongoose
- Plex authentication (OAuth flow + manual token fallback)
- Plex API service for fetching library data
- Movie and TV Show sync from Plex
- Basic sync job to pull library metadata

**Frontend:**
- Angular app initialization with Tailwind CSS
- App shell with responsive layout (sidebar desktop / bottom nav mobile)
- Routing setup
- Settings page for Plex connection
- Basic library list view (simple table/cards showing synced content)
- PWA manifest and basic configuration

**Docker:**
- Dockerfile for client (Angular build + Nginx)
- Dockerfile for server (Node.js)
- docker-compose.yml with all services (client, server, MongoDB)

### Deliverables
- [ ] Docker compose stack runs successfully
- [ ] User can connect Plex server (OAuth or token)
- [ ] Library syncs movies and TV shows to MongoDB
- [ ] Basic list view shows synced content
- [ ] App works on mobile and desktop
- [ ] PWA installable (manifest configured)

### Data Synced in Phase 1
- Movies: title, year, poster, rating key
- TV Shows: title, year, poster, rating key, season count
- Media info: resolution, codec, container, file size, bitrate (basic)

---

## Phase 2: Library Browser & Filters

### Objective
Make library data useful with comprehensive browsing, filtering, and search capabilities.

### Scope

**Backend:**
- Enhanced sync to capture full media details
- Filter/search API endpoints with query parameters
- Pagination support
- Movie detail endpoint (full file/media info)
- TV Show detail endpoint (with seasons and episodes)

**Frontend:**
- Movies page with sortable/filterable table
- TV Shows page with sortable/filterable table
- Filter panel (resolution, codec, file size range, container format)
- Search bar with debounced search
- Movie detail page (all media/file information)
- TV Show detail page (seasons, episodes with file details)
- Responsive card view for mobile, table for desktop

### Deliverables
- [ ] Movies page with full filtering capabilities
- [ ] TV Shows page with full filtering capabilities
- [ ] Search works across titles
- [ ] Filters: resolution, codec, container, file size
- [ ] Sorting by any column
- [ ] Detail pages show complete file information
- [ ] Mobile-friendly card layouts

### Filter Options
- **Resolution**: 4K, 1080p, 720p, 480p, SD
- **Video Codec**: HEVC/H.265, H.264, AV1, MPEG4, Other
- **Container**: MKV, MP4, AVI, Other
- **File Size**: Custom range (e.g., 0-5GB, 5-15GB, 15GB+)
- **Audio Codec**: AAC, AC3, DTS, TrueHD, Atmos, Other

---

## Phase 3: Visual Dashboard

### Objective
Provide at-a-glance visual understanding of library composition through charts and statistics.

### Scope

**Backend:**
- Statistics aggregation endpoints
- Resolution distribution data
- Codec distribution data
- File size statistics
- Storage breakdown

**Frontend:**
- Dashboard page as home/landing page
- Summary cards (total movies, shows, episodes, storage used)
- Resolution distribution chart (pie/donut)
- Video codec distribution chart (pie/donut)
- Audio codec distribution chart
- File size distribution (histogram or bar chart)
- Container format breakdown
- Responsive chart layouts

### Deliverables
- [ ] Dashboard is the landing page
- [ ] Summary stat cards displayed
- [ ] Resolution distribution chart
- [ ] Video codec distribution chart
- [ ] Audio codec distribution chart
- [ ] File size distribution visualization
- [ ] Charts render properly on mobile

### Chart Library
- Recommend: ngx-charts or Chart.js with ng2-charts
- Dark theme compatible
- Responsive sizing

---

## Phase 4: Radarr/Sonarr Integration

### Objective
Connect to Radarr and Sonarr to identify missing content and enable search requests.

### Scope

**Backend:**
- Radarr API service (connection, movies, missing, search)
- Sonarr API service (connection, series, missing episodes, search)
- Settings storage for Radarr/Sonarr configuration
- Missing content comparison (in Arr but not in Plex)
- Upgrade candidate identification (quality cutoff not met)
- Search trigger endpoints

**Frontend:**
- Settings page sections for Radarr and Sonarr connection
- Missing Movies page (in Radarr, not in Plex)
- Missing Episodes page (in Sonarr, not in Plex)
- Upgrade candidates view
- Search button to trigger download search
- Status indicators (monitored, downloaded, missing)

### Deliverables
- [ ] Radarr connection configurable in settings
- [ ] Sonarr connection configurable in settings
- [ ] Missing Movies page shows Radarr wanted items
- [ ] Missing Episodes page shows Sonarr wanted items
- [ ] Can trigger search for individual items
- [ ] Shows upgrade candidates (have lower quality than cutoff)

### Arr Integration Features
- Test connection button
- Show monitored vs unmonitored
- Display quality profile info
- Show if item is missing or available
- Trigger automatic search via API

---

## Future Phases (Backlog)

### Phase 5: Enhanced Features
- Bulk actions (mark multiple for upgrade)
- Duplicate detection
- Storage analysis by folder/drive
- Quality profile comparison

### Phase 6: Advanced PWA
- Offline mode with cached library data
- Push notifications for completed downloads
- Background sync

### Phase 7: Additional Integrations
- Overseerr integration for requests
- Tautulli integration for play statistics (optional)
- Bazarr integration for subtitles

---

## Definition of Done (All Phases)

Each phase is complete when:
1. All deliverables checked off
2. Works on both mobile and desktop
3. Docker deployment tested
4. No critical bugs
5. Code follows KISS/YAGNI/SOLID principles
