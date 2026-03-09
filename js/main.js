// Mobile nav toggle
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');

navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
  navToggle.classList.toggle('active');
});

// Close mobile nav when a link is clicked
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.classList.remove('active');
  });
});

// Scroll fade-in animations
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.1,
  rootMargin: '0px 0px -40px 0px'
});

// Elements that should fade in on scroll
document.querySelectorAll([
  '.section-title',
  '.about-text',
  '.about-skills',
  '.about-education',
  '.timeline-item',
  '.timeline-divider',
  '.project-featured',
  '.project-card',
  '.interest-card',
  '.offgrid-intro',
  '.contact-content'
].join(', ')).forEach(el => {
  el.classList.add('fade-in');
  observer.observe(el);
});

// Header shadow on scroll
const header = document.querySelector('.header');
let lastScroll = 0;

window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  if (scrollY > 50) {
    header.style.boxShadow = '0 4px 24px rgba(0, 0, 0, 0.4)';
  } else {
    header.style.boxShadow = 'none';
  }
  lastScroll = scrollY;
}, { passive: true });

// Active nav link highlighting
const sections = document.querySelectorAll('section[id]');
const navItems = document.querySelectorAll('.nav-links a');

const navObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      navItems.forEach(link => {
        link.style.color = '';
        if (link.getAttribute('href') === `#${id}`) {
          link.style.color = 'var(--accent)';
        }
      });
    }
  });
}, { threshold: 0.3, rootMargin: '-70px 0px -50% 0px' });

sections.forEach(section => navObserver.observe(section));

// Scrabble tile shuffle on hover (subtle rotation)
document.querySelectorAll('.scrabble-tile').forEach(tile => {
  tile.addEventListener('mouseenter', () => {
    const rotation = (Math.random() - 0.5) * 6;
    tile.style.transform = `translateY(-3px) rotate(${rotation}deg)`;
  });
  tile.addEventListener('mouseleave', () => {
    tile.style.transform = '';
  });
});

// Easter egg: Konami code shows a canoe emoji parade
let konamiSequence = [];
const konamiCode = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];

document.addEventListener('keydown', (e) => {
  konamiSequence.push(e.keyCode);
  if (konamiSequence.length > konamiCode.length) {
    konamiSequence.shift();
  }
  if (konamiSequence.toString() === konamiCode.toString()) {
    launchCanoeParade();
    konamiSequence = [];
  }
});

function launchCanoeParade() {
  const emojis = ['🛶', '🏕️', '🌲', '🦌', '🐻', '🎣', '⛰️', '🌊'];
  for (let i = 0; i < 20; i++) {
    setTimeout(() => {
      const emoji = document.createElement('div');
      emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      emoji.style.cssText = `
        position: fixed;
        top: -50px;
        left: ${Math.random() * 100}vw;
        font-size: ${24 + Math.random() * 24}px;
        z-index: 9999;
        pointer-events: none;
        animation: emojiRain 3s linear forwards;
      `;
      document.body.appendChild(emoji);
      setTimeout(() => emoji.remove(), 3500);
    }, i * 120);
  }
}

// Add the emoji rain keyframes
const style = document.createElement('style');
style.textContent = `
  @keyframes emojiRain {
    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
    100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
  }
`;
document.head.appendChild(style);
