import { motion } from './motion.js';
import { createSky } from './sky.js';
import { createJourney } from './journey.js';

const stops = Array.from(document.querySelectorAll('.stop'));
const sky = createSky(document.querySelector('.sky'), stops.map((stop) => stop.id));
createJourney(sky);

// Motion toggle
const toggle = document.querySelector('.motion-toggle');
const syncToggle = () => toggle.setAttribute('aria-pressed', String(motion.on));
toggle.addEventListener('click', () => motion.set(!motion.on));
motion.subscribe(syncToggle);
syncToggle();

// Illustrations load only when they are first needed.
const illustrations = [
  ['[data-globe]', () => import('./globe.js').then((m) => m.initGlobe)],
  ['[data-blast]', () => import('./blast.js').then((m) => m.initBlast)],
  ['[data-agents]', () => import('./agents.js').then((m) => m.initAgents)],
];

const lazy = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      lazy.unobserve(entry.target);
      const loader = illustrations.find(([selector]) => entry.target.matches(selector));
      loader[1]().then((init) => init(entry.target));
    });
  },
  { rootMargin: '400px 0px' }
);

illustrations.forEach(([selector]) => {
  document.querySelectorAll(selector).forEach((el) => lazy.observe(el));
});
