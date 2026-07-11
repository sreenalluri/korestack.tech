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

// ===== Routing =====
// Real path-based URLs so each page is its own indexable, shareable link.
// Vercel rewrites /services, /rebuild, etc. to index.html; this maps the
// path to the right page and keeps <title>/description in sync per page.
const PAGES = {
  home: {
    path: '/',
    title: 'Korestack | Modern Websites & AI for Houston Small Businesses',
    desc: "Korestack builds fast, modern websites for small businesses — plus AI consulting, hosting, and local SEO. Get a free website score. Live in 2–3 weeks.",
  },
  services: {
    path: '/services',
    title: 'Services — Websites, AI, Hosting & Local SEO | Korestack',
    desc: 'Website design & rebuilds, managed hosting, local SEO, fractional AI consulting, growth programs, and business automation for small businesses.',
  },
  rebuild: {
    path: '/rebuild',
    title: 'Website Design & Rebuild + Free Website Score | Korestack',
    desc: "Is your website losing you customers? Get a free score of your site's speed, mobile experience, and design — then a modern rebuild, live in 2–3 weeks.",
  },
  careers: {
    path: '/careers',
    title: 'Careers — Build AI for Small Business | Korestack',
    desc: 'Join Korestack: ship fast, own your work end to end, and help small businesses win with modern websites and AI. Remote-first.',
  },
  contact: {
    path: '/contact',
    title: 'Contact Korestack — Talk to an Expert',
    desc: 'Talk to Korestack about a modern website, AI, hosting, or local SEO for your small business. We reply within 24 hours.',
  },
};
const PATH_TO_PAGE = Object.fromEntries(Object.entries(PAGES).map(([id, m]) => [m.path, id]));

function applyPageMeta(id) {
  const meta = PAGES[id];
  if (!meta) return;
  document.title = meta.title;
  const d = document.querySelector('meta[name="description"]');
  if (d) d.setAttribute('content', meta.desc);
  // Per-page canonical + og:url. Critical: the static HTML canonical points at
  // "/", so without this every route would consolidate to the homepage and
  // never rank on its own.
  const url = 'https://www.korestack.tech' + (meta.path === '/' ? '/' : meta.path);
  const canon = document.querySelector('link[rel="canonical"]');
  if (canon) canon.setAttribute('href', url);
  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute('content', url);
}

function setNavActive(id) {
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('is-active'));
  const navId = id === 'rebuild' ? 'services' : id;   // sub-pages highlight their parent
  const navLink = document.querySelector(`.nav-links a[data-page="${navId}"]`);
  if (navLink) navLink.classList.add('is-active');
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
    history.pushState({ page: id }, '', (PAGES[id] || PAGES.home).path);
  }
  applyPageMeta(id);

  // close mobile nav
  document.querySelector('.nav-links')?.classList.remove('open');
  document.querySelector('.nav-toggle')?.classList.remove('open');

  setNavActive(id);

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

// ===== Form submit — Resend (via /api/contact serverless function) =====
const CONTACT_ENDPOINT = '/api/contact';

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

  const payload = {
    name:    fullName || '(not provided)',
    email:   email    || '(not provided)',
    company: company  || '(not provided)',
    service: service  || '(not specified)',
    message: message  || '(no message)',
    subject: `New Korestack inquiry from ${fullName}${service ? ' — ' + service : ''}`,
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
      console.error('Contact form error:', err);
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

// ===== Website scorer (Rebuild page) =====
// Calls Google's PageSpeed Insights API directly from the visitor's browser —
// no backend, no API key. Quota is per-visitor-IP, so it scales naturally.
// If Google ever requires a key, create one restricted to this domain and
// set PSI_KEY below.
const PSI_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const PSI_KEY = 'AIzaSyCzKCo4uJBkpGZh0GdqK32HMlM718IuC9c';

const SCORER_STATUS_MESSAGES = [
  'Fetching your site…',
  'Running Google Lighthouse…',
  'Testing the mobile experience…',
  'Checking security & search readiness…',
  'Crunching the score…',
  'Almost there — slow sites take longer to test…',
];

let scorerTimer = null;

function scrollToScorer() {
  document.getElementById('scorer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => document.getElementById('scorer-url')?.focus({ preventScroll: true }), 650);
}

// Navigate to the contact page with the service dropdown preselected,
// so leads arriving from a service page are attributed to that service.
function goToContact(service) {
  showPage('contact');
  if (!service) return;
  const sel = document.getElementById('cf-service');
  if (sel && [...sel.options].some((o) => o.value === service || o.text === service)) {
    sel.value = service;
  }
}

function normalizeSiteUrl(raw) {
  let input = (raw || '').trim();
  if (!input) return null;
  if (!/^https?:\/\//i.test(input)) input = 'https://' + input;
  try {
    const u = new URL(input);
    if (!u.hostname.includes('.')) return null;
    return u.href;
  } catch (e) {
    return null;
  }
}

function escHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function psiCategory(data, key) {
  const s = data?.lighthouseResult?.categories?.[key]?.score;
  return s == null ? null : Math.round(s * 100);
}

function psiAuditPass(data, id) {
  const a = data?.lighthouseResult?.audits?.[id];
  if (!a || a.score == null) return null;
  return a.score >= 0.9;
}

function computeSiteScore(m) {
  // Mirrors the weighting we use in professional audits:
  // performance 35, HTTPS 15, mobile 15, SEO 15, best-practices 10, a11y 10.
  const parts = [
    [m.perf, 35],
    [m.https == null ? null : (m.https ? 100 : 0), 15],
    [m.viewport == null ? null : (m.viewport ? 100 : 0), 15],
    [m.seo, 15],
    [m.bp, 10],
    [m.a11y, 10],
  ];
  let total = 0, weight = 0;
  parts.forEach(([v, w]) => {
    if (v != null) { total += v * w; weight += w; }
  });
  return weight ? Math.round(total / weight) : null;
}

function gradeForScore(score) {
  if (score >= 85) return {
    label: 'Modern & healthy', color: '#1D9E75',
    blurb: 'Your website is doing its job — fast, secure, and mobile-ready. Keep it maintained and it will keep earning.',
  };
  if (score >= 70) return {
    label: 'Solid, with gaps', color: '#534AB7',
    blurb: 'The foundation is there, but a few gaps are quietly costing you visitors. All of them are fixable.',
  };
  if (score >= 50) return {
    label: 'Showing its age', color: '#E09F3E',
    blurb: 'Your site works, but it is aging where customers notice most: speed, mobile experience, and trust signals.',
  };
  return {
    label: 'Costing you customers', color: '#D64545',
    blurb: 'Your website is likely turning people away before you ever hear from them. The good news: this is exactly what a rebuild fixes.',
  };
}

function buildFindings(data, m) {
  const issues = [];
  const wins = [];

  if (m.https === false) {
    issues.push(['bad', 'Not served over HTTPS — Chrome flags your site "Not secure" right in the address bar.']);
  } else if (m.https) {
    wins.push('Secure HTTPS connection — no browser warnings.');
  }

  if (m.viewport === false) {
    issues.push(['bad', "Not mobile-responsive — the layout doesn't adapt to phones, where most local customers find you."]);
  } else if (m.viewport) {
    wins.push('Mobile-ready layout that adapts to phones.');
  }

  const lcp = data?.lighthouseResult?.audits?.['largest-contentful-paint']?.displayValue;
  if (m.perf != null) {
    if (m.perf < 50) {
      issues.push(['bad', `Slow on mobile — performance ${m.perf}/100` +
        (lcp ? `, main content takes ${escHtml(lcp)} to appear` : '') +
        '. Half of visitors give up after 3 seconds.']);
    } else if (m.perf < 80) {
      issues.push(['warn', `Middling mobile speed (${m.perf}/100)` +
        (lcp ? ` — main content appears in ${escHtml(lcp)}` : '') +
        '. Faster competitors will feel more trustworthy.']);
    } else {
      wins.push(`Fast on mobile — performance ${m.perf}/100.`);
    }
  }

  if (m.seo != null) {
    if (m.seo < 80) {
      issues.push(['warn', `Search-engine basics need work (SEO ${m.seo}/100) — Google may struggle to understand and rank your pages.`]);
    } else {
      wins.push(`Search-engine fundamentals in place (SEO ${m.seo}/100).`);
    }
  }

  if (m.a11y != null) {
    if (m.a11y < 80) {
      issues.push(['warn', `Accessibility gaps (${m.a11y}/100) — harder for some customers to use, and a growing legal risk for businesses.`]);
    } else {
      wins.push(`Accessible to most visitors (${m.a11y}/100).`);
    }
  }

  if (m.bp != null) {
    if (m.bp < 80) {
      issues.push(['warn', `Fails modern browser best-practice checks (${m.bp}/100) — often a sign of an aging platform or old plugins.`]);
    } else {
      wins.push(`Follows modern browser best practices (${m.bp}/100).`);
    }
  }

  return { issues, wins };
}

// ── Design-era signals ──
// Lighthouse measures technical health, not looks. But its audit data holds
// build-era fingerprints (jQuery versions, image formats, DOM bloat) that
// date a site even when it scores well technically. This is the free layer;
// the AI screenshot review (/api/design-check) is the judgment layer.
function computeEraSignals(data) {
  const audits = data?.lighthouseResult?.audits || {};
  const signals = [];
  let score = 100;

  const libs = audits['js-libraries']?.details?.items || [];
  const jq = libs.find((l) => /jquery/i.test(l.name || ''));
  if (jq) {
    const major = parseInt(String(jq.version || '').split('.')[0], 10);
    if (major && major < 3) {
      signals.push(`Built on jQuery ${jq.version} — a 2012–2016-era stack`);
      score -= 25;
    } else {
      signals.push('Built on jQuery rather than a modern framework');
      score -= 10;
    }
  }

  if ((audits['modern-image-formats']?.details?.items || []).length >= 3) {
    signals.push('No modern image formats (WebP/AVIF) — typical of pre-2020 builds');
    score -= 20;
  }

  if ((audits['deprecations']?.details?.items || []).length > 0) {
    signals.push('Relies on browser features deprecated years ago');
    score -= 15;
  }

  const docWrite = audits['no-document-write'];
  if (docWrite && docWrite.score != null && docWrite.score < 1) {
    signals.push('Uses document.write() — a pre-2010 scripting pattern');
    score -= 15;
  }

  const dom = audits['dom-size']?.numericValue;
  if (dom > 3000) {
    signals.push(`Extremely heavy page structure (${Math.round(dom)} elements)`);
    score -= 20;
  } else if (dom > 1500) {
    signals.push(`Heavy page structure (${Math.round(dom)} elements)`);
    score -= 10;
  }

  return { signals, eraScore: Math.max(0, score) };
}

function designRingHtml(score, color, caption, loading) {
  return `
    <div class="score-ring-block">
      <div class="score-ring${loading ? ' is-loading' : ''}" style="--p:${loading ? 0 : score};--ring:${color};">
        <div class="score-ring-inner">
          <div class="score-num">${loading ? '…' : score}</div>
          <div class="score-denom">OUT OF 100</div>
        </div>
      </div>
      <div class="score-ring-caption">${caption}</div>
    </div>`;
}

function designColor(score) {
  if (score >= 80) return '#1D9E75';
  if (score >= 60) return '#534AB7';
  if (score >= 40) return '#E09F3E';
  return '#D64545';
}

async function runDesignCheck(url, shot, era, techScore) {
  const box = document.getElementById('design-check');
  const ringSlot = document.getElementById('design-ring-slot');
  if (!box || !ringSlot) return;

  let ai = null;
  if (shot) {
    try {
      const r = await fetch('/api/design-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, screenshot: shot }),
      });
      if (r.ok) ai = await r.json();
    } catch (e) { /* fall back to era signals */ }
  }

  // The AI's visual verdict IS the design score. Era fingerprints can only
  // drag it DOWN (a tidy-looking site running jQuery 1.x is still aging) —
  // they must never pull a dated-looking site UP toward passing.
  // Without the AI (era-only fallback) we cap the score: clean code alone
  // can't prove a site looks modern, so it can't earn a high freshness score.
  const design = ai
    ? Math.min(ai.design_score, Math.round(0.75 * ai.design_score + 0.25 * era.eraScore))
    : Math.min(era.eraScore, 70);
  const color = designColor(design);

  ringSlot.outerHTML = designRingHtml(design, color, ai ? 'Design freshness' : 'Build era (signals)', false);

  const items = [];
  if (ai?.era_guess) {
    items.push(`<div class="design-era-chip">Feels like <strong>${escHtml(ai.era_guess)}</strong> design</div>`);
  }
  const verdicts = (ai?.verdicts?.length ? ai.verdicts : era.signals);
  verdicts.forEach((v) => {
    items.push(`<div class="score-item"><span class="dot ${design < 60 ? 'warn' : 'good'}"></span><span>${escHtml(v)}</span></div>`);
  });
  (ai?.worth_keeping || []).forEach((v) => {
    items.push(`<div class="score-item"><span class="dot good"></span><span>Worth keeping: ${escHtml(v)}</span></div>`);
  });
  if (!verdicts.length) {
    items.push(ai
      ? '<div class="score-item"><span class="dot good"></span><span>Nothing visually dated stood out — this reads as a current design.</span></div>'
      : '<div class="score-item"><span class="dot warn"></span><span>No code-level aging detected, but this is a technical read only — it can\'t judge how the design actually looks.</span></div>');
  }

  box.innerHTML = `
    <div class="score-col-title" style="color:${color};">How modern does it look?</div>
    ${items.join('')}`;

  // A fast site that looks old is the classic silent-killer combo — call it out.
  if (techScore >= 80 && design < 60) {
    const gradeEl = document.querySelector('#scorer-results .score-grade');
    const blurbEl = document.querySelector('#scorer-results .score-blurb');
    if (gradeEl) { gradeEl.textContent = 'Fast — but visually dated'; gradeEl.style.color = '#E09F3E'; }
    if (blurbEl) { blurbEl.textContent = 'The engine is healthy, but the design tells customers a different story. A visual rebuild keeps the speed and fixes the first impression.'; }
  }
}

function renderScore(data, url) {
  // A 200 response can still carry a failed Lighthouse run (e.g. NO_FCP,
  // ERRORED_DOCUMENT_REQUEST). Don't score on partial data — route to the
  // "couldn't analyze" path instead of silently renormalizing weights.
  const rte = data?.lighthouseResult?.runtimeError;
  if (rte?.code && rte.code !== 'NO_ERROR') {
    const e = new Error('Lighthouse runtime error: ' + rte.code);
    e.httpStatus = 500;
    throw e;
  }

  const m = {
    perf:     psiCategory(data, 'performance'),
    a11y:     psiCategory(data, 'accessibility'),
    bp:       psiCategory(data, 'best-practices'),
    seo:      psiCategory(data, 'seo'),
    https:    psiAuditPass(data, 'is-on-https'),
    viewport: psiAuditPass(data, 'viewport'),
  };
  const score = computeSiteScore(m);
  if (score == null) throw new Error('Lighthouse returned no scores');

  const grade = gradeForScore(score);
  const { issues, wins } = buildFindings(data, m);
  const shot = data?.lighthouseResult?.audits?.['final-screenshot']?.details?.data;
  const shotOk = typeof shot === 'string' && shot.startsWith('data:image/');

  const era = computeEraSignals(data);

  const results = document.getElementById('scorer-results');
  results.innerHTML = `
    <div class="score-head">
      <div class="score-rings">
        <div class="score-ring-block">
          <div class="score-ring" style="--p:${score};--ring:${grade.color};">
            <div class="score-ring-inner">
              <div class="score-num">${score}</div>
              <div class="score-denom">OUT OF 100</div>
            </div>
          </div>
          <div class="score-ring-caption">Technical health</div>
        </div>
        <span id="design-ring-slot">${designRingHtml(0, '#C9C6E0', 'Design freshness', true)}</span>
      </div>
      <div class="score-meta">
        <div class="score-grade" style="color:${grade.color}">${grade.label}</div>
        <div class="score-url">${escHtml(url)}</div>
        <div class="score-blurb">${grade.blurb}</div>
      </div>
      ${shotOk ? `<img class="score-shot" src="${escHtml(shot)}" alt="Your site on a phone"/>` : ''}
    </div>
    <div class="design-box" id="design-check">
      <div class="design-loading">Running AI design review…</div>
    </div>
    <div class="score-cols">
      <div>
        <div class="score-col-title bad">Needs attention</div>
        ${issues.length
          ? issues.map(([lvl, t]) => `<div class="score-item"><span class="dot ${lvl}"></span><span>${t}</span></div>`).join('')
          : '<div class="score-item"><span class="dot good"></span><span>Nothing major — nice work.</span></div>'}
      </div>
      <div>
        <div class="score-col-title good">Worth keeping</div>
        ${wins.length
          ? wins.map((t) => `<div class="score-item"><span class="dot good"></span><span>${t}</span></div>`).join('')
          : '<div class="score-item"><span class="dot warn"></span><span>Not much is working in your favor yet — a rebuild would start fresh on solid ground.</span></div>'}
      </div>
    </div>
    <div class="score-cta">
      <div class="score-cta-text">${score >= 85
        ? "Your site's in good shape. If you'd like it to stay that way — hosting, edits, monitoring — that's exactly what we do."
        : "We'll show you exactly what a modern rebuild fixes — free plan, no obligation, live in 2–3 weeks."}</div>
      <button class="btn-primary" style="background:#21305c;" onclick="goToContact('${score >= 85 ? 'Managed Hosting & Edits' : 'Website Design & Rebuild'}')">${score >= 85 ? 'Ask About Managed Hosting' : 'Get My Free Rebuild Plan'} <span class="arrow">→</span></button>
    </div>`;
  results.hidden = false;
  results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Kick off the AI design review without blocking the technical results.
  runDesignCheck(url, shotOk ? shot : null, era, score);
}

function scorerErrorMessage(err) {
  if (err.name === 'AbortError') {
    return 'This is taking longer than usual — the site may be extremely slow, which is a finding in itself.';
  }
  if (err.httpStatus === 429) {
    return 'Google’s analyzer is busy right now. Give it a minute and try again.';
  }
  if (err.httpStatus >= 500) {
    return 'Google’s tools couldn’t reach or analyze this site — it may be unreachable, blocking automated checks, or having technical trouble. That’s usually a sign worth investigating.';
  }
  if (err.httpStatus === 400) {
    return 'Google couldn’t check that address. Double-check the spelling and try again.';
  }
  return 'Couldn’t complete the check right now. Please try again in a moment.';
}

// Every error state gets a human path forward, not just "try again".
function renderScorerErrorCta() {
  const results = document.getElementById('scorer-results');
  if (!results) return;
  results.innerHTML = `
    <div class="score-cta" style="border-top:none;margin-top:0;padding-top:0;">
      <div class="score-cta-text">Prefer a human? We’ll audit your site by hand and send you what we find — free, no obligation.</div>
      <button class="btn-primary" style="background:#21305c;" onclick="goToContact('Website Design & Rebuild')">Get a Free Manual Audit <span class="arrow">→</span></button>
    </div>`;
  results.hidden = false;
}

async function runSiteScore(evt) {
  if (evt) evt.preventDefault();

  const btn = document.getElementById('scorer-btn');
  const status = document.getElementById('scorer-status');
  const results = document.getElementById('scorer-results');
  if (!btn || !status || !results) return;

  const url = normalizeSiteUrl(document.getElementById('scorer-url')?.value);
  if (!url) {
    status.textContent = 'That doesn’t look like a web address — try something like yourbusiness.com';
    status.className = 'scorer-status error';
    return;
  }

  const originalBtn = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = 'Scoring…';
  results.hidden = true;
  status.className = 'scorer-status';

  let msgIdx = 0;
  status.textContent = SCORER_STATUS_MESSAGES[0];
  clearInterval(scorerTimer);
  scorerTimer = setInterval(() => {
    msgIdx = Math.min(msgIdx + 1, SCORER_STATUS_MESSAGES.length - 1);
    status.textContent = SCORER_STATUS_MESSAGES[msgIdx];
  }, 6000);

  const params = new URLSearchParams({ url, strategy: 'mobile' });
  ['PERFORMANCE', 'ACCESSIBILITY', 'BEST_PRACTICES', 'SEO'].forEach((c) => params.append('category', c));
  if (PSI_KEY) params.set('key', PSI_KEY);

  // The abort timer stays armed through the body download, not just the
  // headers — PSI responses run 1–4 MB and can stall on flaky connections.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 95000);
  try {
    const resp = await fetch(`${PSI_ENDPOINT}?${params}`, { signal: controller.signal });

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      const e = new Error(body?.error?.message || `HTTP ${resp.status}`);
      e.httpStatus = resp.status;
      throw e;
    }

    const data = await resp.json();
    renderScore(data, url);
    status.textContent = '';
    status.className = 'scorer-status';
  } catch (err) {
    console.error('Site score failed:', err);
    status.textContent = scorerErrorMessage(err);
    status.className = 'scorer-status error';
    renderScorerErrorCta();
  } finally {
    clearTimeout(timeout);
    clearInterval(scorerTimer);
    btn.disabled = false;
    btn.innerHTML = originalBtn;
  }
}

// ===== Browser history (back/forward button support) =====
const VALID_PAGES = new Set(Object.keys(PAGES));

window.addEventListener('popstate', (e) => {
  const id = e.state?.page || PATH_TO_PAGE[location.pathname] || 'home';
  // skipHistory=true so we don't push a new entry while replaying history.
  // showPage handles nav highlight, title/meta, and the page transition.
  if (VALID_PAGES.has(id)) showPage(id, null, true);
});

// Resolve the page from the real path on initial load (deep links land here
// via the Vercel rewrite). Legacy #hash links are redirected to their path.
// The routed page is switched in instantly — no entrance animation on first paint.
(function initRoute() {
  const hashId = location.hash.replace('#', '');
  let id = PATH_TO_PAGE[location.pathname];
  // On the root path, a legacy /#services bookmark should win over the home default
  if ((!id || id === 'home') && VALID_PAGES.has(hashId)) id = hashId;
  if (!id) id = 'home';
  history.replaceState({ page: id }, '', PAGES[id].path);
  if (id !== 'home') {
    const home = document.getElementById('page-home');
    const target = document.getElementById('page-' + id);
    if (home && target) { home.classList.remove('active'); target.classList.add('active'); window.scrollTo(0, 0); }
  }
  applyPageMeta(id);
  setNavActive(id);
})();

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  initReveals(document);
  bindCardTilt();
  countUpStats();
  bindNavScroll();
  bindTweakPanel();
  // Initial page + nav state is set by initRoute() (runs at parse time).
});
