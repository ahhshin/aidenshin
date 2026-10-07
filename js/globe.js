// Illustration for the 2023 map: a dotted globe with layers that can be
// switched on and off. Every layer point is invented for the illustration.
import { LAND } from './land.js';
import { motion } from './motion.js';

const RAD = Math.PI / 180;

function rng(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeLayers() {
  const random = rng(7);
  const landCount = LAND.length / 2;
  const pickLand = () => {
    const i = Math.floor(random() * landCount) * 2;
    return [LAND[i], LAND[i + 1]];
  };
  const centres = Array.from({ length: 7 }, pickLand);
  const rfp = [];
  centres.forEach(([lon, lat]) => {
    const n = 14 + Math.floor(random() * 18);
    for (let i = 0; i < n; i++) {
      rfp.push([lon + (random() - 0.5) * 14, lat + (random() - 0.5) * 9]);
    }
  });
  const sat = [];
  centres.slice(0, 4).forEach(([lon, lat]) => {
    for (let gx = -2; gx <= 2; gx++) {
      for (let gy = -1; gy <= 1; gy++) {
        if (random() < 0.7) sat.push([lon + gx * 3.4, lat + gy * 3.4]);
      }
    }
  });
  const model = centres.map(([lon, lat]) => [lon, lat, 0.35 + random() * 0.65]);
  return { rfp, sat, model };
}

export function initGlobe(figure) {
  const canvas = figure.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const buttons = Array.from(figure.querySelectorAll('[data-layer]'));
  const layers = makeLayers();
  const shown = { rfp: 1, sat: 0, model: 0 };
  const target = { ...shown };
  buttons.forEach((b) => (target[b.dataset.layer] = shown[b.dataset.layer] = b.getAttribute('aria-pressed') === 'true' ? 1 : 0));

  let size = 0;
  let lon0 = 80;
  let lat0 = 22;
  let dragging = null;
  let inView = false;
  let raf = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    size = rect.width;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    request();
  }

  function project(lon, lat, R, c) {
    const l = (lon - lon0) * RAD;
    const p = lat * RAD;
    const p0 = lat0 * RAD;
    const cosc = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l);
    return {
      x: c + R * Math.cos(p) * Math.sin(l),
      y: c - R * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l)),
      z: cosc,
    };
  }

  function draw() {
    const c = size / 2;
    const R = size * 0.42;
    ctx.clearRect(0, 0, size, size);

    const atmosphere = ctx.createRadialGradient(c, c, R * 0.92, c, c, R * 1.18);
    atmosphere.addColorStop(0, 'rgba(143, 203, 181, 0.25)');
    atmosphere.addColorStop(1, 'rgba(143, 203, 181, 0)');
    ctx.fillStyle = atmosphere;
    ctx.beginPath();
    ctx.arc(c, c, R * 1.18, 0, Math.PI * 2);
    ctx.fill();

    const ocean = ctx.createRadialGradient(c - R * 0.35, c - R * 0.4, R * 0.1, c, c, R);
    ocean.addColorStop(0, '#2a3b52');
    ocean.addColorStop(1, '#141127');
    ctx.fillStyle = ocean;
    ctx.beginPath();
    ctx.arc(c, c, R, 0, Math.PI * 2);
    ctx.fill();

    // Graticule
    ctx.strokeStyle = 'rgba(243, 234, 219, 0.09)';
    ctx.lineWidth = 1;
    const line = (pts) => {
      ctx.beginPath();
      let pen = false;
      pts.forEach(([lo, la]) => {
        const q = project(lo, la, R, c);
        if (q.z < 0) {
          pen = false;
          return;
        }
        if (pen) ctx.lineTo(q.x, q.y);
        else ctx.moveTo(q.x, q.y);
        pen = true;
      });
      ctx.stroke();
    };
    for (let lo = -180; lo < 180; lo += 30) {
      line(Array.from({ length: 37 }, (_, i) => [lo, -90 + i * 5]));
    }
    for (let la = -60; la <= 60; la += 30) {
      line(Array.from({ length: 73 }, (_, i) => [-180 + i * 5, la]));
    }

    // Land as dots
    ctx.fillStyle = '#f3eadb';
    for (let i = 0; i < LAND.length; i += 2) {
      const q = project(LAND[i], LAND[i + 1], R, c);
      if (q.z <= 0) continue;
      ctx.globalAlpha = 0.15 + 0.5 * q.z;
      const s = 0.9 + 1.1 * q.z;
      ctx.fillRect(q.x - s / 2, q.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;

    if (shown.sat > 0.01) {
      ctx.strokeStyle = '#8fcbb5';
      ctx.fillStyle = 'rgba(143, 203, 181, 0.22)';
      layers.sat.forEach(([lo, la]) => {
        const q = project(lo, la, R, c);
        if (q.z <= 0.05) return;
        const s = R * 0.055 * q.z;
        ctx.globalAlpha = shown.sat * (0.4 + 0.6 * q.z);
        ctx.fillRect(q.x - s / 2, q.y - s / 2, s, s);
        ctx.strokeRect(q.x - s / 2, q.y - s / 2, s, s);
      });
    }
    if (shown.rfp > 0.01) {
      ctx.fillStyle = '#f2a65a';
      layers.rfp.forEach(([lo, la]) => {
        const q = project(lo, la, R, c);
        if (q.z <= 0) return;
        ctx.globalAlpha = shown.rfp * (0.35 + 0.65 * q.z);
        ctx.beginPath();
        ctx.arc(q.x, q.y, 1.2 + 1.4 * q.z, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    if (shown.model > 0.01) {
      ctx.strokeStyle = '#e48a86';
      ctx.lineWidth = 1.6;
      layers.model.forEach(([lo, la, score]) => {
        const q = project(lo, la, R, c);
        if (q.z <= 0.05) return;
        ctx.globalAlpha = shown.model * q.z;
        ctx.beginPath();
        ctx.arc(q.x, q.y, R * 0.16 * score * q.z, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = shown.model * q.z * 0.15;
        ctx.fillStyle = '#e48a86';
        ctx.fill();
      });
    }
    ctx.globalAlpha = 1;

    // Rim
    ctx.strokeStyle = 'rgba(243, 234, 219, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(c, c, R, 0, Math.PI * 2);
    ctx.stroke();
  }

  function tick() {
    raf = 0;
    let moving = false;
    for (const key of Object.keys(shown)) {
      const diff = target[key] - shown[key];
      if (Math.abs(diff) > 0.01) {
        shown[key] += motion.on ? diff * 0.15 : diff;
        moving = true;
      } else {
        shown[key] = target[key];
      }
    }
    const spinning = motion.on && inView && !dragging;
    if (spinning) lon0 -= 0.08;
    draw();
    if (moving || spinning) request();
  }

  function request() {
    if (!raf && size) raf = requestAnimationFrame(tick);
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const on = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(on));
      target[button.dataset.layer] = on ? 1 : 0;
      request();
    });
  });

  canvas.addEventListener('pointerdown', (event) => {
    dragging = { x: event.clientX, y: event.clientY, lon: lon0, lat: lat0, id: event.pointerId };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging || event.pointerId !== dragging.id) return;
    lon0 = dragging.lon - (event.clientX - dragging.x) * 0.45;
    lat0 = Math.max(-60, Math.min(60, dragging.lat + (event.clientY - dragging.y) * 0.3));
    request();
  });
  const release = () => {
    dragging = null;
    request();
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver((entries) => {
    inView = entries[0].isIntersecting;
    if (inView) request();
  }).observe(canvas);
  motion.subscribe(request);
}
