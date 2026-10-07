// Moves between stops. Each stop is one "page"; going to another stop flies
// the sky camera there while the old page streams past and the new one
// arrives out of the distance. Plain #links keep working without this script.
import { motion } from './motion.js';

export function createJourney(sky) {
  const stops = Array.from(document.querySelectorAll('.stop'));
  const routeLinks = Array.from(document.querySelectorAll('[data-route]'));
  const untilFound = 'onbeforematch' in document.body;
  const visited = new Set();
  let current = null;
  let running = null;
  let queued = null;

  function hide(stop) {
    if (untilFound) stop.setAttribute('hidden', 'until-found');
    else stop.hidden = true;
  }

  function show(stop) {
    stop.hidden = false;
    stop.removeAttribute('hidden');
  }

  function locate(hash) {
    const id = decodeURIComponent((hash || '').replace(/^#/, ''));
    const el = id ? document.getElementById(id) : null;
    const stop = el ? el.closest('.stop') : null;
    return stop ? { el, stop } : null;
  }

  function headingFor(el, stop) {
    if (!el || el === stop) return stop.querySelector('h1, .stop-title');
    if (el.matches('h1, h2, h3')) return el;
    const own = el.querySelector(':scope > h1, :scope > h2, :scope > h3');
    if (own) return own;
    const chapter = el.closest('.chapter');
    return chapter ? chapter.querySelector('h2') : stop.querySelector('h1, .stop-title');
  }

  function setActive(stop) {
    current = stop;
    visited.add(stop.id);
    document.body.dataset.stop = stop.id;
    routeLinks.forEach((link) => {
      if (link.dataset.route === stop.id) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
      link.classList.toggle('is-visited', visited.has(link.dataset.route) && link.dataset.route !== stop.id);
    });
    document.title = stop.id === 'home' ? 'Aiden Shin' : `${stop.dataset.title} · Aiden Shin`;
  }

  function settle(stop, el, smooth = false) {
    if (el && el !== stop) {
      el.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'instant' });
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    sky.resetScroll();
    const heading = headingFor(el, stop);
    if (heading) heading.focus({ preventScroll: true });
  }

  function keyframes(fromId, toId, dir) {
    // Leaving the shore lifts off; arriving back at it settles down onto the lake.
    if (fromId === 'home' && dir > 0) {
      return {
        out: [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(22%)' }],
        in: [{ opacity: 0, transform: 'scale(0.55)' }, { opacity: 1, transform: 'scale(1)' }],
      };
    }
    if (toId === 'home' && dir < 0) {
      return {
        out: [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.55)' }],
        in: [{ opacity: 0, transform: 'translateY(22%)' }, { opacity: 1, transform: 'translateY(0)' }],
      };
    }
    const near = { opacity: 0, transform: 'scale(1.6)' };
    const far = { opacity: 0, transform: 'scale(0.55)' };
    const here = { opacity: 1, transform: 'scale(1)' };
    return dir > 0 ? { out: [here, near], in: [far, here] } : { out: [here, far], in: [near, here] };
  }

  async function travel(from, to, el) {
    const fromIndex = stops.indexOf(from);
    const toIndex = stops.indexOf(to);
    const dir = toIndex > fromIndex ? 1 : -1;
    const { duration, done } = sky.travelTo(toIndex);

    if (!motion.on || !duration) {
      hide(from);
      show(to);
      setActive(to);
      settle(to, el);
      if (to.animate) {
        await to.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' }).finished.catch(() => {});
      }
      return;
    }

    const y = window.scrollY;
    const mid = window.innerHeight * 0.45;
    from.style.setProperty('--leave-top', `${-y}px`);
    from.style.transformOrigin = `50% ${y + mid}px`;
    from.classList.add('is-travelling');
    from.inert = true;

    show(to);
    to.style.transformOrigin = `50% ${mid}px`;
    to.classList.add('is-arriving');
    setActive(to);
    window.scrollTo({ top: 0, behavior: 'instant' });
    sky.resetScroll();

    const frames = keyframes(from.id, to.id, dir);
    const leaving = from.animate(frames.out, {
      duration: duration * 0.45,
      easing: 'cubic-bezier(.55, 0, .8, .2)',
      fill: 'forwards',
    });
    const arriving = to.animate(frames.in, {
      duration: duration * 0.52,
      delay: duration * 0.48,
      easing: 'cubic-bezier(.15, .75, .25, 1)',
      fill: 'backwards',
    });

    await Promise.all([leaving.finished, arriving.finished, done]).catch(() => {});

    leaving.cancel();
    hide(from);
    from.inert = false;
    from.classList.remove('is-travelling');
    from.style.removeProperty('--leave-top');
    from.style.transformOrigin = '';
    to.classList.remove('is-arriving');
    to.style.transformOrigin = '';
    settle(to, el, true);
  }

  async function go(hash) {
    const target = locate(hash) || { el: stops[0], stop: stops[0] };
    if (running) {
      queued = hash;
      return;
    }
    if (target.stop === current) {
      const smooth = motion.on && target.el !== target.stop;
      if (target.el && target.el !== target.stop) {
        target.el.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'instant' });
      } else {
        window.scrollTo({ top: 0, behavior: motion.on ? 'smooth' : 'instant' });
      }
      const heading = headingFor(target.el, target.stop);
      if (heading) heading.focus({ preventScroll: true });
      return;
    }
    running = travel(current, target.stop, target.el);
    await running;
    running = null;
    if (queued !== null) {
      const next = queued;
      queued = null;
      go(next);
    }
  }

  // Start wherever the address points.
  const start = locate(window.location.hash) || { el: stops[0], stop: stops[0] };
  stops.forEach((stop) => (stop === start.stop ? show(stop) : hide(stop)));
  setActive(start.stop);
  sky.jumpTo(stops.indexOf(start.stop));
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (start.el !== start.stop) requestAnimationFrame(() => start.el.scrollIntoView({ block: 'start', behavior: 'instant' }));

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const hash = link.getAttribute('href');
    if (hash === '#main') {
      event.preventDefault();
      const heading = headingFor(null, current);
      if (heading) heading.focus();
      return;
    }
    if (!locate(hash)) return;
    event.preventDefault();
    if (window.location.hash !== hash) history.pushState(null, '', hash);
    go(hash);
  });

  window.addEventListener('popstate', () => go(window.location.hash));

  // Find-in-page can reveal text on another stop; switch to it without a flight.
  stops.forEach((stop) => {
    stop.addEventListener('beforematch', () => {
      if (stop === current) return;
      if (current) hide(current);
      setActive(stop);
      sky.jumpTo(stops.indexOf(stop));
      history.replaceState(null, '', `#${stop.id}`);
    });
  });

  return { go };
}
