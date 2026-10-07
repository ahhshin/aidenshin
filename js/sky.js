// The night sky: a starfield the camera flies through, plus one body per stop.
// Each stop sits STOP_GAP units further along the z axis, so travelling
// between stops really is moving the camera forward or back through space.
import { motion } from './motion.js';

const TAU = Math.PI * 2;
const STOP_GAP = 1600;
const BODY_DISTANCE = 900; // how far in front of the camera a body sits when parked
const DEPTH = 2400;
const NEAR = 6;
// The next stop's body is hidden while parked and fades in as the camera approaches.
const APPEAR = STOP_GAP + BODY_DISTANCE - 100;
const MAX_STARS = 900;

const STAR_COLOURS = ['243, 234, 219', '255, 210, 160', '186, 226, 214'];

function rng(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const mod = (a, n) => ((a % n) + n) % n;

/* ---------- body painters ---------- */

function sphere(ctx, x, y, r, c0, c1, c2) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r);
  g.addColorStop(0, c0);
  g.addColorStop(0.55, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

function nightSide(ctx, x, y, r) {
  const g = ctx.createLinearGradient(x - r * 0.3, y - r * 0.3, x + r, y + r);
  g.addColorStop(0, 'rgba(12, 9, 22, 0)');
  g.addColorStop(1, 'rgba(12, 9, 22, 0.8)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

function halo(ctx, x, y, r, rgb, strength) {
  const g = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 1.9);
  g.addColorStop(0, `rgba(${rgb}, ${strength})`);
  g.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.9, 0, TAU);
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// About me: a warm moon with a ring of letter tiles in orbit.
const TILES = [['A', 1], ['I', 1], ['D', 2], ['E', 1], ['N', 1]];
function paintTileMoon(ctx, x, y, r, t) {
  const tilt = -0.28;
  const tiles = TILES.map(([letter, value], i) => {
    const a = t * 0.00022 + (i * TAU) / TILES.length;
    const ex = Math.cos(a) * r * 1.6;
    const ey = Math.sin(a) * r * 0.5;
    return {
      letter,
      value,
      depth: Math.sin(a),
      x: x + ex * Math.cos(tilt) - ey * Math.sin(tilt),
      y: y + ex * Math.sin(tilt) + ey * Math.cos(tilt),
    };
  });
  const drawTile = (tile) => {
    const s = r * 0.27 * (1 + tile.depth * 0.16);
    if (s < 2) return;
    ctx.save();
    ctx.translate(tile.x, tile.y);
    ctx.rotate(tilt * 0.6 + tile.depth * 0.15);
    ctx.globalAlpha *= tile.depth < 0 ? 0.75 : 1;
    roundRect(ctx, -s / 2, -s / 2, s, s, s * 0.14);
    ctx.fillStyle = '#efe0bf';
    ctx.fill();
    if (s > 9) {
      ctx.fillStyle = '#2b2230';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `600 ${s * 0.6}px Fraunces, Georgia, serif`;
      ctx.fillText(tile.letter, -s * 0.04, s * 0.02);
      ctx.font = `700 ${s * 0.22}px "Atkinson Hyperlegible", sans-serif`;
      ctx.fillText(String(tile.value), s * 0.3, s * 0.3);
    }
    ctx.restore();
  };

  tiles.filter((tile) => tile.depth < 0).forEach(drawTile);
  halo(ctx, x, y, r, '242, 166, 90', 0.22);
  sphere(ctx, x, y, r, '#ffdcaa', '#d88a4b', '#5a2a34');
  ctx.fillStyle = 'rgba(90, 40, 40, 0.18)';
  [[-0.3, -0.2, 0.18], [0.25, 0.15, 0.12], [-0.05, 0.42, 0.1], [0.38, -0.35, 0.08]].forEach(([cx, cy, cr]) => {
    ctx.beginPath();
    ctx.arc(x + cx * r, y + cy * r, cr * r, 0, TAU);
    ctx.fill();
  });
  nightSide(ctx, x, y, r);
  tiles.filter((tile) => tile.depth >= 0).forEach(drawTile);
}

// Learning by building: a sage planet with rings.
function paintRinged(ctx, x, y, r) {
  const tilt = -0.36;
  const rings = (front) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.beginPath();
    if (front) ctx.rect(-r * 3, 0, r * 6, r * 3);
    else ctx.rect(-r * 3, -r * 3, r * 6, r * 3);
    ctx.clip();
    [
      [1.45, 0.06, 'rgba(243, 234, 219, 0.35)'],
      [1.62, 0.1, 'rgba(242, 166, 90, 0.45)'],
      [1.85, 0.05, 'rgba(243, 234, 219, 0.25)'],
      [2.02, 0.03, 'rgba(242, 166, 90, 0.25)'],
    ].forEach(([rx, wd, colour]) => {
      ctx.strokeStyle = colour;
      ctx.lineWidth = Math.max(0.5, r * wd);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * rx, r * rx * 0.24, 0, 0, TAU);
      ctx.stroke();
    });
    ctx.restore();
  };
  halo(ctx, x, y, r, '143, 203, 181', 0.2);
  rings(false);
  sphere(ctx, x, y, r, '#d4f3e4', '#4f9d8f', '#14303a');
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.clip();
  ctx.fillStyle = 'rgba(20, 48, 58, 0.18)';
  for (let i = -2; i <= 2; i++) {
    ctx.fillRect(x - r, y + i * r * 0.32 - r * 0.05, r * 2, r * 0.1);
  }
  ctx.restore();
  nightSide(ctx, x, y, r);
  rings(true);
}

// Projects: a banded rose giant with a small moon.
function paintGiant(ctx, x, y, r, t) {
  const a = t * 0.00035 + 1.2;
  const moon = { x: x + Math.cos(a) * r * 1.7, y: y + Math.sin(a) * r * 0.42 - r * 0.15, depth: Math.sin(a) };
  const drawMoon = () => {
    const mr = r * 0.15;
    sphere(ctx, moon.x, moon.y, mr, '#fff4e6', '#bfb2a8', '#3a3040');
    nightSide(ctx, moon.x, moon.y, mr);
  };
  if (moon.depth < 0) drawMoon();
  halo(ctx, x, y, r, '228, 138, 134', 0.2);
  sphere(ctx, x, y, r, '#ffd6c9', '#c9696f', '#3a172e');
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.clip();
  ctx.translate(x, y);
  ctx.rotate(0.18);
  const bands = [-0.62, -0.38, -0.12, 0.1, 0.34, 0.58];
  bands.forEach((b, i) => {
    ctx.fillStyle = i % 2 ? 'rgba(255, 236, 220, 0.12)' : 'rgba(70, 20, 50, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, b * r, r * 1.2, r * 0.08, 0, 0, TAU);
    ctx.fill();
  });
  ctx.restore();
  nightSide(ctx, x, y, r);
  if (moon.depth >= 0) drawMoon();
}

// More about my work: a warm beacon sending out slow rings.
function paintBeacon(ctx, x, y, r, t, animate) {
  const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
  glow.addColorStop(0, 'rgba(255, 244, 225, 0.95)');
  glow.addColorStop(0.12, 'rgba(255, 214, 160, 0.8)');
  glow.addColorStop(0.35, 'rgba(242, 166, 90, 0.25)');
  glow.addColorStop(1, 'rgba(242, 166, 90, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.4, 0, TAU);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    const p = animate ? mod(t * 0.00018 + i / 3, 1) : (i + 0.5) / 3;
    ctx.strokeStyle = `rgba(242, 166, 90, ${(1 - p) * 0.4})`;
    ctx.lineWidth = Math.max(0.6, r * 0.02);
    ctx.beginPath();
    ctx.arc(x, y, r * (0.5 + p * 2.2), 0, TAU);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255, 236, 210, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - r * 1.6, y);
  ctx.lineTo(x + r * 1.6, y);
  ctx.moveTo(x, y - r * 1.6);
  ctx.lineTo(x, y + r * 1.6);
  ctx.stroke();
}

const PAINTERS = {
  about: { paint: paintTileMoon, place: [0.3, -0.1], mobile: [0.3, -0.3], size: 0.13 },
  building: { paint: paintRinged, place: [0.29, -0.06], mobile: [0.3, -0.32], size: 0.12 },
  projects: { paint: paintGiant, place: [0.28, -0.1], mobile: [0.3, -0.3], size: 0.16 },
  more: { paint: paintBeacon, place: [0.28, -0.14], mobile: [0.3, -0.32], size: 0.1 },
};

/* ---------- sky ---------- */

export function createSky(canvas, stopIds) {
  const ctx = canvas.getContext('2d', { alpha: true });
  const random = rng(20231);
  const stars = Array.from({ length: MAX_STARS }, () => ({
    x: (random() * 2 - 1) * 1700,
    y: (random() * 2 - 1) * 1700,
    z: random() * DEPTH,
    r: 0.5 + random() * random() * 2.2,
    a: 0.35 + random() * 0.65,
    c: random() < 0.72 ? 0 : random() < 0.6 ? 1 : 2,
    tw: random() * TAU,
    ts: 0.0006 + random() * 0.0016,
  })).sort((s1, s2) => s1.c - s2.c);

  const bodies = stopIds
    .map((id, index) => (PAINTERS[id] ? { id, index, ...PAINTERS[id], z: index * STOP_GAP + BODY_DISTANCE } : null))
    .filter(Boolean);

  let w = 0;
  let h = 0;
  let focal = 1;
  let starCount = 400;
  let camZ = 0;
  let prevCamZ = 0;
  let drift = 0;
  let scrollTarget = 0;
  let scrollEased = 0;
  let trip = null;
  let raf = 0;
  let visible = !document.hidden;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 720 ? 1.5 : 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    focal = Math.max(w, h) * 0.75;
    starCount = Math.round(Math.min(MAX_STARS, Math.max(260, (w * h) / 1700)));
    const narrow = w < 1100;
    bodies.forEach((body) => {
      const [fx, fy] = narrow ? body.mobile : body.place;
      const scale = BODY_DISTANCE / focal;
      body.X = fx * w * scale;
      body.Y = fy * h * scale;
      body.R = body.size * Math.min(Math.max(w, 700), 1500) * (narrow ? 1.2 : 1) * scale;
      body.alpha = narrow ? 0.55 : 1;
    });
    requestDraw();
  }

  function drawStars(t, vel, par) {
    const cx = w / 2;
    const cy = h / 2;
    const twinkle = motion.on;
    const streak = Math.abs(vel) > 0.8;
    let colour = -1;
    for (let i = 0; i < starCount; i++) {
      const s = stars[i];
      const d = mod(s.z - camZ - drift, DEPTH);
      if (d < NEAR) continue;
      const k = focal / d;
      const sx = cx + s.x * k;
      const sy = cy + s.y * k - par * (300 / d);
      if (sx < -40 || sx > w + 40 || sy < -40 || sy > h + 40) continue;
      if (s.c !== colour) {
        colour = s.c;
        ctx.fillStyle = `rgb(${STAR_COLOURS[colour]})`;
        ctx.strokeStyle = `rgb(${STAR_COLOURS[colour]})`;
      }
      const fade = Math.min(1, (DEPTH - d) / 500) * Math.min(1, d / 40);
      const tw = twinkle ? 0.78 + 0.22 * Math.sin(t * s.ts + s.tw) : 1;
      ctx.globalAlpha = s.a * fade * tw;
      const size = Math.min(2.8, Math.max(0.4, s.r * k * 0.35));
      if (streak) {
        const d2 = d + vel * 7;
        if (d2 > NEAR) {
          const k2 = focal / d2;
          ctx.lineWidth = size;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(cx + s.x * k2, cy + s.y * k2 - par * (300 / d2));
          ctx.stroke();
          continue;
        }
      }
      if (size < 1.4) {
        ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
      } else {
        ctx.beginPath();
        ctx.arc(sx, sy, size / 2, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawBodies(t, par) {
    const cx = w / 2;
    const cy = h / 2;
    // Far bodies first so nearer ones overlap them.
    const ordered = bodies
      .map((body) => ({ body, d: body.z - camZ }))
      .filter(({ d }) => d > 40 && d < APPEAR)
      .sort((a, b) => b.d - a.d);
    for (const { body, d } of ordered) {
      const k = focal / d;
      const x = cx + body.X * k;
      const y = cy + body.Y * k - par * 0.12 * (BODY_DISTANCE / d);
      const r = body.R * k;
      if (x + r * 2.5 < 0 || x - r * 2.5 > w || y + r * 2.5 < 0 || y - r * 2.5 > h) continue;
      const farFade = Math.min(1, (APPEAR - d) / 700);
      const nearFade = Math.min(1, (d - 40) / 260);
      ctx.globalAlpha = body.alpha * farFade * nearFade;
      if (r < 1.5) {
        ctx.fillStyle = '#f3eadb';
        ctx.fillRect(x - 1, y - 1, 2, 2);
      } else {
        body.paint(ctx, x, y, r, t, motion.on);
      }
    }
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    raf = 0;
    if (!visible) return;
    const t = now || performance.now();
    let travelling = false;
    if (trip) {
      const p = Math.min(1, (t - trip.start) / trip.duration);
      camZ = trip.from + (trip.to - trip.from) * easeInOut(p);
      travelling = true;
      if (p >= 1) {
        camZ = trip.to;
        const done = trip.resolve;
        trip = null;
        done();
      }
    }
    const vel = camZ - prevCamZ;
    prevCamZ = camZ;
    if (motion.on && !travelling) drift += 0.18;
    scrollEased += (scrollTarget - scrollEased) * (motion.on ? 0.1 : 1);

    ctx.clearRect(0, 0, w, h);
    drawStars(t, vel, scrollEased);
    drawBodies(t, scrollEased);

    const settling = Math.abs(scrollTarget - scrollEased) > 0.5;
    if (motion.on || trip || settling) raf = requestAnimationFrame(frame);
  }

  function requestDraw() {
    if (!raf && visible) raf = requestAnimationFrame(frame);
  }

  function travelTo(index) {
    const to = index * STOP_GAP;
    if (trip) {
      trip.resolve();
      trip = null;
    }
    if (!motion.on || to === camZ) {
      camZ = prevCamZ = to;
      requestDraw();
      return { duration: 0, done: Promise.resolve() };
    }
    const hops = Math.abs(to - camZ) / STOP_GAP;
    const duration = Math.min(2400, 1250 + 380 * (hops - 1));
    let resolve;
    const done = new Promise((r) => (resolve = r));
    trip = { from: camZ, to, start: performance.now(), duration, resolve };
    requestDraw();
    return { duration, done };
  }

  function jumpTo(index) {
    if (trip) {
      trip.resolve();
      trip = null;
    }
    camZ = prevCamZ = index * STOP_GAP;
    requestDraw();
  }

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  });
  window.addEventListener(
    'scroll',
    () => {
      scrollTarget = window.scrollY;
      requestDraw();
    },
    { passive: true }
  );
  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
    if (visible) requestDraw();
  });
  motion.subscribe(() => requestDraw());

  resize();
  return { travelTo, jumpTo, resetScroll: () => { scrollTarget = scrollEased = window.scrollY; requestDraw(); } };
}
