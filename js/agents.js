// Illustration of agents dividing work, passing information, joining results
// and checking them. Stepping works with or without motion.
import { motion } from './motion.js';

const CAPTIONS = [
  'Press “Step through” to follow a task through the system.',
  'Divide the work: the task is split between three agents, each with its own part.',
  'Pass information and bring the results together: each agent hands its output to one place.',
  'Check the work: the combined result is reviewed before anyone relies on it.',
];

export function initAgents(figure) {
  const svg = figure.querySelector('svg');
  const button = figure.querySelector('[data-agents-step]');
  const caption = figure.querySelector('.agents-caption');
  const packets = svg.querySelector('.agent-packets');
  const paths = Array.from(svg.querySelectorAll('.agent-paths path'));
  const nodes = Array.from(svg.querySelectorAll('.node'));
  let step = 0;
  let raf = 0;

  function paint() {
    paths.forEach((p) => p.classList.toggle('is-lit', Number(p.dataset.step) <= step && step > 0));
    nodes.forEach((n) => {
      const s = Number(n.dataset.step);
      n.classList.toggle('is-lit', step > 0 && s === step);
      n.classList.toggle('is-done', step > 0 && s < step);
    });
    caption.textContent = CAPTIONS[step];
    button.textContent = step === CAPTIONS.length - 1 ? 'Start over' : 'Step through';
  }

  function sendPackets(stepNumber) {
    cancelAnimationFrame(raf);
    packets.replaceChildren();
    if (!motion.on) return;
    const active = paths.filter((p) => Number(p.dataset.step) === stepNumber);
    const dots = active.map(() => {
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('r', '5');
      packets.appendChild(dot);
      return dot;
    });
    const lengths = active.map((p) => p.getTotalLength());
    const start = performance.now();
    const duration = 900;
    const frame = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      active.forEach((p, i) => {
        const pt = p.getPointAtLength(lengths[i] * e);
        dots[i].setAttribute('cx', pt.x);
        dots[i].setAttribute('cy', pt.y);
      });
      if (t < 1) raf = requestAnimationFrame(frame);
      else packets.replaceChildren();
    };
    raf = requestAnimationFrame(frame);
  }

  button.addEventListener('click', () => {
    step = (step + 1) % CAPTIONS.length;
    paint();
    if (step > 0) sendPackets(step);
  });

  paint();
}
