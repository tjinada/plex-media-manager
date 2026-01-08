# TJ Plex Media Manager - PWA Setup

## Overview

Progressive Web App (PWA) configuration enables the application to be installed on mobile devices (iOS, Android) and desktops, providing an app-like experience.

---

## PWA Requirements

### Core Requirements

1. **HTTPS** - Required for service workers (localhost is exempt for development)
2. **Web App Manifest** - Defines app metadata, icons, theme
3. **Service Worker** - Enables offline capabilities and caching
4. **Responsive Design** - Works on all screen sizes

### iOS-Specific Requirements

iOS has additional requirements for a good PWA experience:
- Apple touch icons
- Status bar meta tags
- Splash screen images (optional but recommended)

---

## Web App Manifest

File: `client/src/manifest.webmanifest`

```json
{
  "name": "TJ Plex Media Manager",
  "short_name": "TJ Media",
  "description": "Analyze and manage your Plex media library",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#14b8a6",
  "orientation": "any",
  "scope": "/",
  "icons": [
    {
      "src": "assets/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],
  "categories": ["utilities", "entertainment"],
  "shortcuts": [
    {
      "name": "Movies",
      "short_name": "Movies",
      "url": "/movies",
      "icons": [{"src": "assets/icons/shortcut-movies.png", "sizes": "96x96"}]
    },
    {
      "name": "TV Shows",
      "short_name": "Shows",
      "url": "/shows",
      "icons": [{"src": "assets/icons/shortcut-shows.png", "sizes": "96x96"}]
    }
  ]
}
```

---

## HTML Head Tags

Add to `client/src/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>TJ Plex Media Manager</title>
  <base href="/">
  
  <!-- Viewport -->
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  
  <!-- PWA Meta Tags -->
  <meta name="theme-color" content="#14b8a6">
  <meta name="description" content="Analyze and manage your Plex media library">
  
  <!-- iOS Meta Tags -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="TJ Media">
  
  <!-- Apple Touch Icons -->
  <link rel="apple-touch-icon" href="assets/icons/icon-152x152.png">
  <link rel="apple-touch-icon" sizes="180x180" href="assets/icons/apple-touch-icon-180x180.png">
  
  <!-- Manifest -->
  <link rel="manifest" href="manifest.webmanifest">
  
  <!-- Favicon -->
  <link rel="icon" type="image/png" sizes="32x32" href="assets/icons/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="assets/icons/favicon-16x16.png">
  
  <!-- iOS Splash Screens (optional) -->
  <!-- iPhone X / XS / 11 Pro -->
  <link rel="apple-touch-startup-image" 
        href="assets/splash/splash-1125x2436.png"
        media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)">
  <!-- iPhone XR / 11 -->
  <link rel="apple-touch-startup-image"
        href="assets/splash/splash-828x1792.png"
        media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)">
  <!-- iPhone 12/13/14 Pro -->
  <link rel="apple-touch-startup-image"
        href="assets/splash/splash-1170x2532.png"
        media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)">
</head>
<body>
  <app-root></app-root>
</body>
</html>
```

---

## Angular PWA Setup

### Install Angular PWA

```bash
cd client
ng add @angular/pwa
```

This will:
- Add `@angular/service-worker` package
- Create `ngsw-config.json`
- Update `angular.json` with service worker config
- Create default manifest and icons

### Service Worker Configuration

File: `client/ngsw-config.json`

```json
{
  "$schema": "./node_modules/@angular/service-worker/config/schema.json",
  "index": "/index.html",
  "assetGroups": [
    {
      "name": "app",
      "installMode": "prefetch",
      "resources": {
        "files": [
          "/favicon.ico",
          "/index.html",
          "/manifest.webmanifest",
          "/*.css",
          "/*.js"
        ]
      }
    },
    {
      "name": "assets",
      "installMode": "lazy",
      "updateMode": "prefetch",
      "resources": {
        "files": [
          "/assets/**",
          "/*.(svg|cur|jpg|jpeg|png|apng|webp|avif|gif|otf|ttf|woff|woff2)"
        ]
      }
    }
  ],
  "dataGroups": [
    {
      "name": "api-freshness",
      "urls": [
        "/api/stats/**",
        "/api/sync/status"
      ],
      "cacheConfig": {
        "strategy": "freshness",
        "maxSize": 100,
        "maxAge": "1h",
        "timeout": "10s"
      }
    },
    {
      "name": "api-performance",
      "urls": [
        "/api/movies",
        "/api/shows",
        "/api/movies/*",
        "/api/shows/*"
      ],
      "cacheConfig": {
        "strategy": "performance",
        "maxSize": 500,
        "maxAge": "1d"
      }
    }
  ]
}
```

### Angular Configuration

Update `client/angular.json`:

```json
{
  "projects": {
    "client": {
      "architect": {
        "build": {
          "configurations": {
            "production": {
              "serviceWorker": true,
              "ngswConfigPath": "ngsw-config.json"
            }
          }
        }
      }
    }
  }
}
```

---

## Icon Requirements

### Required Icons

| Size | Filename | Purpose |
|------|----------|---------|
| 16x16 | favicon-16x16.png | Browser favicon |
| 32x32 | favicon-32x32.png | Browser favicon |
| 72x72 | icon-72x72.png | Android |
| 96x96 | icon-96x96.png | Android |
| 128x128 | icon-128x128.png | Android |
| 144x144 | icon-144x144.png | Android |
| 152x152 | icon-152x152.png | iOS |
| 180x180 | apple-touch-icon-180x180.png | iOS |
| 192x192 | icon-192x192.png | Android |
| 384x384 | icon-384x384.png | Android |
| 512x512 | icon-512x512.png | Android, PWA install |

### Icon Design Guidelines

- Use a simple, recognizable design
- Works well at small sizes
- Consistent with app theme (dark background, teal accent)
- Maskable icons should have safe zone (inner 80%)

### Suggested Icon Concept

```
┌────────────────────┐
│                    │
│   ┌────────────┐   │
│   │            │   │
│   │    📊      │   │  (Media chart icon)
│   │            │   │
│   └────────────┘   │
│                    │
│      TJ Media      │
│                    │
└────────────────────┘
  Dark bg (#0a0a0a)
  Icon accent (#14b8a6)
```

---

## iOS Installation Experience

### Add to Home Screen Flow

1. User opens app in Safari
2. Tap Share button (box with arrow)
3. Tap "Add to Home Screen"
4. Optionally rename, tap "Add"

### Optimizing iOS Experience

**Status Bar:**
- `black-translucent` gives edge-to-edge design
- App content extends behind status bar
- Add padding-top for safe area: `padding-top: env(safe-area-inset-top)`

**Safe Areas (Tailwind):**
```css
/* Add to global styles */
.safe-area-inset-top {
  padding-top: env(safe-area-inset-top);
}

.safe-area-inset-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
```

**Bottom Navigation Safe Area:**
```html
<nav class="fixed bottom-0 pb-[env(safe-area-inset-bottom)]">
  <!-- Bottom nav content -->
</nav>
```

---

## Testing PWA

### Chrome DevTools

1. Open DevTools (F12)
2. Go to Application tab
3. Check Manifest section for errors
4. Check Service Workers section
5. Use Lighthouse for PWA audit

### Lighthouse PWA Audit

```bash
# In Chrome DevTools
# Go to Lighthouse tab
# Check "Progressive Web App"
# Run audit
```

Target scores:
- PWA: 100
- Performance: 90+
- Accessibility: 90+
- Best Practices: 90+

### Testing on iOS

1. Deploy to accessible URL (or use ngrok for local testing)
2. Open Safari on iPhone
3. Navigate to app URL
4. Add to Home Screen
5. Open from Home Screen
6. Verify standalone mode (no Safari UI)

---

## Offline Behavior (Future Phase)

For Phase 1, offline will show a basic offline page. Future enhancement:

### Basic Offline Page

Create `client/src/offline.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Offline - TJ Media</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      background: #0a0a0a;
      color: #ffffff;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      text-align: center;
    }
    .container {
      padding: 2rem;
    }
    h1 {
      color: #14b8a6;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📴 You're Offline</h1>
    <p>TJ Plex Media Manager requires an internet connection.</p>
    <p>Please check your connection and try again.</p>
  </div>
</body>
</html>
```

### Future: Cached Library Data

In a future phase, we could cache library data for offline browsing:
- Store movie/show list in IndexedDB
- Cache poster images
- Allow browsing without network
- Queue actions for when back online

---

## Deployment Considerations

### HTTPS Requirement

PWA features require HTTPS. Options for Unraid:

1. **Reverse Proxy (Recommended)**
   - Use Nginx Proxy Manager or Traefik
   - Get Let's Encrypt certificate
   - Proxy to internal HTTP service

2. **Local Network Exception**
   - `localhost` works without HTTPS
   - Some browsers allow `192.168.*` addresses

### Docker Network

Ensure the app is accessible on the network:
```yaml
# docker-compose.yml
services:
  client:
    ports:
      - "8080:80"  # Expose on port 8080
```

Access via: `http://{unraid-ip}:8080`

For PWA installation, ideally access via HTTPS reverse proxy:
`https://media.yourdomain.com`

---

## Checklist

### Phase 1 PWA Checklist

- [ ] Web App Manifest created
- [ ] Icons generated (all sizes)
- [ ] HTML meta tags added
- [ ] Angular service worker enabled
- [ ] App installable on iOS
- [ ] App installable on Android
- [ ] Basic offline page works
- [ ] Lighthouse PWA score: 90+

### Icon Files to Create

```
client/src/assets/icons/
├── favicon-16x16.png
├── favicon-32x32.png
├── icon-72x72.png
├── icon-96x96.png
├── icon-128x128.png
├── icon-144x144.png
├── icon-152x152.png
├── icon-192x192.png
├── icon-384x384.png
├── icon-512x512.png
├── apple-touch-icon-180x180.png
├── shortcut-movies.png (96x96)
└── shortcut-shows.png (96x96)
```
