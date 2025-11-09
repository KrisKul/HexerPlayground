/* /app.js */
(() => {
  // --- App state
  const App = {
    dpr: Math.max(1, Math.min(window.devicePixelRatio || 1, 3)),
    size: { w: 0, h: 0 },
    ctx: null,
    audioReady: false,
    muted: true,
    raf: 0,
    lastTs: 0,
    fpsEMA: 60,
    camera: { x: 0, y: 0, z: 1 },
    pointers: new Map(),
    grid: { radius: 25, tiles: new Map() }
  };

  // --- Utilities
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const key = (q,r) => `${q},${r}`;
  const sqrt3 = Math.sqrt(3);

  // --- Hex math (pointy-top axial)
  const hex = {
    axialToPixel(q, r, radius) {
      const x = radius * sqrt3 * (q + r/2);
      const y = radius * 3/2 * r;
      return { x, y };
    },
    pixelToAxial(x, y, radius) {
      const q = (sqrt3/3 * x - 1/3 * y) / radius;
      const r = (2/3 * y) / radius;
      return hex.round({ q, r });
    },
    round({ q, r }) {
      let x = q, z = r, y = -x - z;
      let rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
      const x_diff = Math.abs(rx - x), y_diff = Math.abs(ry - y), z_diff = Math.abs(rz - z);
      if (x_diff > y_diff && x_diff > z_diff) rx = -ry - rz;
      else if (y_diff > z_diff) ry = -rx - rz;
      else rz = -rx - ry;
      return { q: rx, r: rz };
    },
    polygon(center, radius) {
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const a = Math.PI/180 * (60 * i - 30);
        pts.push({ x: center.x + radius * Math.cos(a), y: center.y + radius * Math.sin(a) });
      }
      return pts;
    }
  };

  // --- Grid seed
  function ensureSeedGrid() {
    if (App.grid.tiles.size) return;
    for (let r = -8; r <= 8; r++) {
      for (let q = -8; q <= 8; q++) {
        if (Math.abs(q + r) <= 8) App.grid.tiles.set(key(q,r), { owned: false });
      }
    }
  }

  // --- Canvas/setup
  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  App.ctx = ctx;

  function resize() {
    const wrap = document.getElementById('stage-wrap');
    const rect = wrap.getBoundingClientRect();
    App.size.w = Math.floor(rect.width);
    App.size.h = Math.floor(rect.height);
    const needW = Math.max(1, Math.floor(App.size.w * App.dpr));
    const needH = Math.max(1, Math.floor(App.size.h * App.dpr));
    if (canvas.width !== needW || canvas.height !== needH) {
      canvas.width = needW; canvas.height = needH;
    }
    ctx.setTransform(App.dpr, 0, 0, App.dpr, 0, 0);
  }

  // --- Camera transforms
  function worldToScreen(wx, wy) {
    return { x: (wx - App.camera.x) * App.camera.z + App.size.w/2,
             y: (wy - App.camera.y) * App.camera.z + App.size.h/2 };
  }
  function screenToWorld(sx, sy) {
    return { x: (sx - App.size.w/2) / App.camera.z + App.camera.x,
             y: (sy - App.size.h/2) / App.camera.z + App.camera.y };
  }

  // --- Render
  function drawHex(center, radius, fill, stroke) {
    const pts = hex.polygon(center, radius);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  function render() {
    ctx.clearRect(0, 0, App.size.w, App.size.h);

    const r = App.grid.radius * App.camera.z;
    ctx.lineWidth = Math.max(1, 1 * (App.dpr / 2));

    // Compute viewport bounds in axial to cull
    const tl = screenToWorld(0, 0);
    const br = screenToWorld(App.size.w, App.size.h);
    const pad = 2;
    const minAxial = hex.pixelToAxial(tl.x - 3*r, tl.y - 3*r, App.grid.radius);
    const maxAxial = hex.pixelToAxial(br.x + 3*r, br.y + 3*r, App.grid.radius);

    for (const [k, tile] of App.grid.tiles) {
      const [qStr, rStr] = k.split(",");
      const q = +qStr, rr = +rStr;

      // quick cull by axial box
      if (q < minAxial.q - pad || q > maxAxial.q + pad || rr < minAxial.r - pad || rr > maxAxial.r + pad) continue;

      const p = hex.axialToPixel(q, rr, App.grid.radius);
      const s = worldToScreen(p.x, p.y);
      drawHex(s, r - 0.5, tile.owned ? "#26c281" : null, "rgba(255,255,255,.08)");
    }
  }

  // --- Loop
  function frame(ts) {
    const dt = App.lastTs ? (ts - App.lastTs) / 1000 : 0;
    App.lastTs = ts;
    const fps = dt > 0 ? 1/dt : 60;
    App.fpsEMA = App.fpsEMA * 0.92 + fps * 0.08;
    render();
    document.getElementById('fps').textContent = `FPS: ${Math.round(App.fpsEMA)}`;
    App.raf = requestAnimationFrame(frame);
  }

  // --- Input (Pointer Events)
  let lastTap = 0;
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    App.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (App.pointers.size === 1) {
      // single pointer: detect double-tap
      const now = e.timeStamp;
      if (now - lastTap < 280) {
        const w = screenToWorld(e.clientX, e.clientY);
        // zoom to tapped tile
        App.camera.x = w.x; App.camera.y = w.y;
        App.camera.z = clamp(App.camera.z * 1.6, 0.5, 3.5);
      }
      lastTap = now;
    }
  }, { passive: true });

  canvas.addEventListener('pointermove', (e) => {
    const prev = App.pointers.get(e.pointerId);
    if (!prev) return;
    App.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (App.pointers.size === 1) {
      // pan
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      App.camera.x -= dx / App.camera.z;
      App.camera.y -= dy / App.camera.z;
    } else if (App.pointers.size === 2) {
      // pinch-zoom
      const pts = Array.from(App.pointers.values());
      const p0 = pts[0], p1 = pts[1];
      const prevDist = Math.hypot((prev.x - (p0===prev?p1.x:p0.x)), (prev.y - (p0===prev?p1.y:p0.y)));
      const currDist = Math.hypot(p0.x - p1.x, p0.y - p1.y);
      if (prevDist && currDist) {
        const center = { x: (p0.x + p1.x)/2, y: (p0.y + p1.y)/2 };
        const before = screenToWorld(center.x, center.y);
        App.camera.z = clamp(App.camera.z * (currDist/prevDist), 0.5, 3.5);
        const after = screenToWorld(center.x, center.y);
        // keep focal point stable
        App.camera.x += before.x - after.x;
        App.camera.y += before.y - after.y;
      }
    }
  }, { passive: true });

  canvas.addEventListener('pointerup', (e) => {
    const wasOnly = App.pointers.size === 1;
    const start = App.pointers.get(e.pointerId);
    App.pointers.delete(e.pointerId);
    if (wasOnly && start) {
      // treat as tap if moved little
      const dx = Math.abs(e.clientX - start.x);
      const dy = Math.abs(e.clientY - start.y);
      if (dx < 6 && dy < 6) {
        const w = screenToWorld(e.clientX, e.clientY);
        const { q, r } = hex.pixelToAxial(w.x, w.y, App.grid.radius);
        const id = key(q, r);
        const t = App.grid.tiles.get(id);
        if (t) { t.owned = !t.owned; ping(); }
      }
    }
  }, { passive: true });

  // wheel zoom for desktop testing
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const focus = { x: e.clientX, y: e.clientY };
    const before = screenToWorld(focus.x, focus.y);
    const factor = Math.pow(1.0015, -e.deltaY);
    App.camera.z = clamp(App.camera.z * factor, 0.5, 3.5);
    const after = screenToWorld(focus.x, focus.y);
    App.camera.x += before.x - after.x;
    App.camera.y += before.y - after.y;
  }, { passive: false });

  // --- Audio (unlocked on first interaction)
  let audioCtx;
  function initAudioOnce() {
    if (App.audioReady) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
      g.gain.value = 0; o.type = "sine"; o.frequency.value = 440;
      o.connect(g).connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.01);
      App.audioReady = true;
    } catch {}
  }
  function ping() {
    if (!App.audioReady || App.muted) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      gain.gain.value = 0.08; // quiet
      osc.type = "triangle"; osc.frequency.value = 660;
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(); osc.stop(audioCtx.currentTime + 0.06);
    } catch {}
  }

  // --- UI controls
  document.getElementById('mute').addEventListener('click', () => {
    initAudioOnce();
    App.muted = !App.muted;
    document.getElementById('mute').textContent = App.muted ? "🔇" : "🔊";
  });
  document.getElementById('reset').addEventListener('click', () => {
    App.camera = { x: 0, y: 0, z: 1 };
    for (const t of App.grid.tiles.values()) t.owned = false;
  });

  // install hint if not standalone
  const installChip = document.getElementById('install');
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (!isStandalone) installChip.hidden = false;

  // --- Start
  ensureSeedGrid();
  resize();
  window.addEventListener('resize', () => { resize(); }, { passive: true });
  window.addEventListener('orientationchange', () => { setTimeout(resize, 200); }, { passive: true });
  canvas.addEventListener('pointerdown', initAudioOnce, { once: true, passive: true });

  cancelAnimationFrame(App.raf);
  App.raf = requestAnimationFrame(frame);
})();
