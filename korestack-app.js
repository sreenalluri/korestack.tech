// ===== Korestack v2 — interactions =====

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "transition": "slide",
  "background": "mesh",
  "accent": "balanced"
}/*EDITMODE-END*/;

const STORAGE_KEY = 'korestack_tweaks_v2';
let tweaks = { ...TWEAK_DEFAULTS };
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  tweaks = { ...tweaks, ...saved };
} catch (e) {}

function applyTweaks() {
  document.body.dataset.transition = tweaks.transition;
  document.body.dataset.bg = tweaks.background;
  document.body.dataset.accent = tweaks.accent;
  if (tweaks.accent === 'purple') {
    document.documentElement.style.setProperty('--accent-a', 'var(--purple-mid)');
    document.documentElement.style.setProperty('--accent-b', 'var(--purple-light)');
  } else if (tweaks.accent === 'teal') {
    document.documentElement.style.setProperty('--accent-a', 'var(--teal-mid)');
    document.documentElement.style.setProperty('--accent-b', 'var(--teal-light)');
  } else {
    document.documentElement.style.setProperty('--accent-a', 'var(--purple-mid)');
    document.documentElement.style.setProperty('--accent-b', 'var(--teal-mid)');
  }
}
applyTweaks();

function setTweak(key, value) {
  tweaks[key] = value;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tweaks)); } catch(e) {}
  applyTweaks();
  try {
    window.parent.postMessage({type: '__edit_mode_set_keys', edits: { [key]: value }}, '*');
  } catch(e) {}
  // re-render panel actives
  document.querySelectorAll('[data-tweak]').forEach(btn => {
    const k = btn.dataset.tweak;
    btn.classList.toggle('active', tweaks[k] === btn.dataset.value);
  });
}

// ===== Page transitions =====
let isTransitioning = false;

function showPage(id, evt, skipHistory) {
  if (evt) evt.preventDefault();
  if (isTransitioning) return;
  const target = document.getElementById('page-' + id);
  const current = document.querySelector('.page.active');
  if (!target || target === current) return;

  if (!skipHistory) {
    history.pushState({ page: id }, '', '#' + id);
  }

  // close mobile nav
  document.querySelector('.nav-links')?.classList.remove('open');
  document.querySelector('.nav-toggle')?.classList.remove('open');

  // update nav active state
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('is-active'));
  const navLink = document.querySelector(`.nav-links a[data-page="${id}"]`);
  if (navLink) navLink.classList.add('is-active');

  isTransitioning = true;
  const mode = tweaks.transition;

  if (mode === 'instant') {
    current.classList.remove('active');
    target.classList.add('active');
    window.scrollTo(0, 0);
    isTransitioning = false;
    runRevealsIn(target);
    return;
  }

  if (mode === 'curtain') {
    const curtain = document.querySelector('.page-curtain');
    curtain.classList.remove('out');
    curtain.classList.add('in');
    setTimeout(() => {
      current.classList.remove('active');
      target.classList.add('active');
      window.scrollTo(0, 0);
      runRevealsIn(target);
      curtain.classList.remove('in');
      curtain.classList.add('out');
      setTimeout(() => {
        curtain.classList.remove('out');
        isTransitioning = false;
      }, 520);
    }, 520);
    return;
  }

  // slide / blur — both pages overlap during animation
  current.classList.add('is-exiting');
  target.classList.add('active', 'is-entering');
  window.scrollTo(0, 0);
  runRevealsIn(target);

  setTimeout(() => {
    current.classList.remove('active', 'is-exiting');
    target.classList.remove('is-entering');
    isTransitioning = false;
  }, 540);
}

// ===== Browser history (back/forward button support) =====
const VALID_PAGES = new Set(['home', 'services', 'contact', 'careers']);

window.addEventListener('popstate', (e) => {
  const id = e.state?.page || location.hash.replace('#', '') || 'home';
  if (VALID_PAGES.has(id)) showPage(id, null, true);
});

// Navigate to the page in the URL hash on initial load
(function () {
  const id = location.hash.replace('#', '');
  if (VALID_PAGES.has(id) && id !== 'home') {
    history.replaceState({ page: id }, '', '#' + id);
    showPage(id, null, true);
  } else {
    history.replaceState({ page: 'home' }, '', location.href);
  }
})();

function runRevealsIn(scope) {
  scope.querySelectorAll('.reveal').forEach(el => el.classList.remove('in'));
  requestAnimationFrame(() => initReveals(scope));
  // re-trigger bar fills
  scope.querySelectorAll('.bar-fill').forEach(el => { el.style.width = '0'; });
}

// ===== Scroll reveal =====
function initReveals(scope = document) {
  const els = scope.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => io.observe(el));

  // hero chart card
  const chart = scope.querySelector('#hv-chart');
  if (chart) {
    const co = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { chart.classList.add('in'); co.unobserve(e.target); } });
    }, { threshold: 0.2 });
    co.observe(chart);
  }

  // bar fills
  const bars = scope.querySelectorAll('.bar-fill[data-w]');
  const bo = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.width = e.target.dataset.w + '%';
        bo.unobserve(e.target);
      }
    });
  }, { threshold: 0.4 });
  bars.forEach(el => bo.observe(el));
}

// ===== Form submit — Web3Forms =====
// Get your free access key at web3forms.com — enter hello@korestack.tech and copy the key.
const CONTACT_ENDPOINT = 'https://api.web3forms.com/submit';
const WEB3FORMS_KEY    = 'YOUR_ACCESS_KEY';

const SUCCESS_HTML =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M20 6L9 17l-5-5"/></svg>' +
  " Message sent! We'll be in touch within 24 hours.";

const ERROR_HTML =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
  '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>' +
  '<line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
  " Couldn't send right now. Please try again in a moment.";

function handleSubmit(evt) {
  if (evt) evt.preventDefault();

  const form = document.querySelector('#contact-form');
  const btn  = form?.querySelector('.form-submit');
  const msg  = document.getElementById('success-msg');
  if (!form || !btn || !msg) return;

  // Honeypot — bots fill hidden fields; real users don't
  if (form.querySelector('[name="_honey"]')?.value) return;

  const get = (id) => (document.getElementById(id)?.value || '').trim();
  const first   = get('cf-first');
  const last    = get('cf-last');
  const email   = get('cf-email');
  const company = get('cf-company');
  const service = get('cf-service');
  const message = get('cf-message');
  const fullName = `${first} ${last}`.trim();

  const subject = `New Korestack inquiry from ${fullName}${service ? ' — ' + service : ''}`;

  const payload = {
    access_key: WEB3FORMS_KEY,
    subject,
    name:    fullName || '(not provided)',
    email:   email    || '(not provided)',
    company: company  || '(not provided)',
    service: service  || '(not specified)',
    message: message  || '(no message)',
  };

  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = 'Sending…';
  msg.classList.remove('show', 'error');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  fetch(CONTACT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(payload),
    signal: controller.signal,
  })
    .then((r) => r.json().catch(() => ({})))
    .then((data) => {
      const ok = data && (data.success === 'true' || data.success === true);
      if (!ok) throw new Error(data?.message || 'submission failed');

      msg.innerHTML = SUCCESS_HTML;
      msg.classList.add('show');
      form.reset();
      setTimeout(() => msg.classList.remove('show'), 5000);
    })
    .catch((err) => {
      console.error('Web3Forms error:', err);
      msg.innerHTML = ERROR_HTML;
      msg.classList.add('show', 'error');
      setTimeout(() => msg.classList.remove('show', 'error'), 6000);
    })
    .finally(() => {
      clearTimeout(timeout);
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    });
}

// ===== Mobile nav =====
function toggleNav() {
  const links = document.querySelector('.nav-links');
  const btn = document.querySelector('.nav-toggle');
  links.classList.toggle('open');
  btn.classList.toggle('open');
}

// ===== Service card 3D tilt =====
function bindCardTilt() {
  document.querySelectorAll('.service-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const mx = ((e.clientX - r.left) / r.width) * 100;
      const my = ((e.clientY - r.top) / r.height) * 100;
      card.style.setProperty('--mx', mx + '%');
      card.style.setProperty('--my', my + '%');
      const rx = (my - 50) / 16;
      const ry = (50 - mx) / 16;
      card.style.transform = `translateY(-4px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

// ===== Stat count-up =====
function countUpStats() {
  const els = document.querySelectorAll('[data-count]');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const dur = 1200;
      const start = performance.now();
      function tick(now) {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        const val = target * eased;
        const display = target % 1 === 0 ? Math.round(val) : val.toFixed(1);
        el.textContent = display + suffix;
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      io.unobserve(el);
    });
  }, { threshold: 0.5 });
  els.forEach(el => io.observe(el));
}

// ===== Nav scroll bg =====
function bindNavScroll() {
  const nav = document.querySelector('nav');
  let ticking = false;
  document.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        nav.classList.toggle('scrolled', window.scrollY > 24);
        ticking = false;
      });
      ticking = true;
    }
  });
}

// ===== Tweak panel protocol =====
function bindTweakPanel() {
  const panel = document.querySelector('.tweaks-panel');

  window.addEventListener('message', (e) => {
    const msg = e.data || {};
    if (msg.type === '__activate_edit_mode') panel.classList.add('open');
    if (msg.type === '__deactivate_edit_mode') panel.classList.remove('open');
  });

  // announce after listener is up
  try { window.parent.postMessage({type: '__edit_mode_available'}, '*'); } catch(e) {}

  document.querySelectorAll('[data-tweak]').forEach(btn => {
    btn.addEventListener('click', () => setTweak(btn.dataset.tweak, btn.dataset.value));
    btn.classList.toggle('active', tweaks[btn.dataset.tweak] === btn.dataset.value);
  });

  document.querySelector('.tweaks-close')?.addEventListener('click', () => {
    panel.classList.remove('open');
    try { window.parent.postMessage({type: '__edit_mode_dismissed'}, '*'); } catch(e) {}
  });
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  initReveals(document);
  bindCardTilt();
  countUpStats();
  bindNavScroll();
  bindTweakPanel();

  // mark default nav link active
  const initial = document.querySelector('.page.active')?.id?.replace('page-', '');
  if (initial) {
    const a = document.querySelector(`.nav-links a[data-page="${initial}"]`);
    if (a) a.classList.add('is-active');
  }
});
