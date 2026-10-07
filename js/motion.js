// Shared motion preference. Starts from the visitor's system setting; the
// header toggle overrides it and is remembered in this browser only.
const root = document.documentElement;
const listeners = new Set();
const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

function storedChoice() {
  try {
    return localStorage.getItem('motion');
  } catch (e) {
    return null;
  }
}

function apply(on) {
  root.dataset.motion = on ? 'on' : 'off';
  listeners.forEach((fn) => fn(on));
}

export const motion = {
  get on() {
    return root.dataset.motion !== 'off';
  },
  set(on) {
    try {
      localStorage.setItem('motion', on ? 'on' : 'off');
    } catch (e) {
      // Private mode or blocked storage: the choice lasts for this visit.
    }
    apply(on);
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

reduceQuery.addEventListener('change', (event) => {
  if (!storedChoice()) apply(!event.matches);
});
