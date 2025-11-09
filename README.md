# Hexer Starter

- Mobile-first HTML5 canvas game shell with a pointy-top hex grid.
- iPhone-ready: safe-area insets, 120Hz-capable render loop, touch gestures (pan, pinch, tap).
- PWA: offline cache, manifest, installable.

## Run locally
Just open `index.html` with a local server (VS Code Live Server, `python -m http.server`, etc.).  
Service worker requires `http://` or `https://` (not `file://`).

## Deploy
Push these files to GitHub Pages (root). Make sure `sw.js` sits at site root.

## Controls
- Tap: toggle tile.
- Drag: pan.
- Pinch or wheel: zoom.
- Double-tap: zoom into focus.

## Files
- `index.html` – layout/UI
- `app.js` – game logic/render
- `manifest.webmanifest` – PWA metadata
- `sw.js` – offline cache
- `icons/` – app icons
