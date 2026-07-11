// AI design critic for the website scorer. Receives the mobile screenshot
// that PageSpeed already captured (sent from the visitor's browser) and asks
// Claude to judge visual modernity — the thing Lighthouse can't see.
//
// Requires ANTHROPIC_API_KEY as a Vercel environment variable. Use a key
// created just for this endpoint so it can be rotated/capped independently.

// Rate limits are in-memory per serverless instance — they reset on cold
// starts, so treat them as flood protection, not a hard budget. If real
// traffic arrives, swap for Upstash Redis.
const DAILY_PER_IP = 10;
const DAILY_GLOBAL = 300;

const ipHits = new Map();
let globalHits = { day: '', count: 0 };

const ALLOWED_REFERERS = [
  'korestack.tech',
  'sreenalluri.github.io',
  'localhost:8090',
  'localhost:3000',
];

const PROMPT = `You are a demanding design director at a top agency, reviewing a small business website's mobile screenshot ({url}) to decide if it needs a redesign. You reject most work as not good enough. Be harsh and specific — your job is to find what's wrong, not to reassure.

Judge ONLY visual design, not speed or code. Weigh: typography (modern typefaces, clear hierarchy, generous sizing vs. tiny/system fonts), whitespace (does it breathe, or is it cramped and text-heavy), color (current and intentional, or muddy/dated/default), imagery (fresh and authentic, or dated stock photos, clip art, gradients, low-res), components (buttons, nav, cards — clean and current, or beveled/glossy/2010s), and overall composition (does it look like a business that's thriving in 2026, or coasting on a site built years ago).

SCORING — be strict. Most small-business sites are mediocre and should land in the 30s–50s. Do NOT give benefit of the doubt; when unsure, score LOWER.
- 85-100: genuinely current, could pass for a well-funded 2026 brand. RARE — reserve it.
- 70-84: solid and modern but unremarkable; minor dated touches.
- 50-69: functional but visibly aging; a customer would notice it looks a few years old.
- 30-49: clearly dated (feels ~2012-2016); cramped, generic-template, or dated imagery.
- 0-29: looks abandoned, broken, or straight out of the 2000s.

A clean, fast, but BORING or GENERIC site is NOT modern — bland templates, default fonts, and stock photography should score in the 40s regardless of how "tidy" it looks. Reserve 70+ for design that a working designer would actually be proud of today.

Respond with ONLY a JSON object, no other text:
{
  "design_score": <0-100, calibrated to the strict bands above>,
  "era_guess": "<the design era it feels like, e.g. '2012-2015'>",
  "verdicts": [<exactly 3 short strings — the most dated or weakest things a customer would notice, concrete and specific to THIS screenshot>],
  "worth_keeping": [<1-2 short strings — visual elements that genuinely work; use an empty array if nothing stands out>]
}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const referer = req.headers.referer || req.headers.origin || '';
  if (!ALLOWED_REFERERS.some((h) => referer.includes(h))) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // The env var must be JUST the key (sk-ant-...). Guard against a key with
  // stray whitespace or, worse, a whole pasted curl command — either would
  // make Headers.append throw a cryptic 500 downstream.
  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim();
  if (!apiKey || /\s/.test(apiKey) || !apiKey.startsWith('sk-ant-')) {
    return res.status(503).json({ error: 'Design review not configured' });
  }

  // Flood protection
  const today = new Date().toISOString().slice(0, 10);
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (globalHits.day !== today) globalHits = { day: today, count: 0 };
  if (globalHits.count >= DAILY_GLOBAL) {
    return res.status(429).json({ error: 'Daily capacity reached' });
  }
  const rec = ipHits.get(ip);
  const ipCount = rec && rec.day === today ? rec.count : 0;
  if (ipCount >= DAILY_PER_IP) {
    return res.status(429).json({ error: 'Rate limit reached — try again tomorrow' });
  }

  // Validate input
  const { url, screenshot } = req.body || {};
  if (typeof url !== 'string' || url.length > 300) {
    return res.status(400).json({ error: 'Invalid url' });
  }
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(screenshot || '');
  if (!m || m[2].length > 2000000) {
    return res.status(400).json({ error: 'Invalid screenshot' });
  }

  globalHits.count += 1;
  ipHits.set(ip, { day: today, count: ipCount + 1 });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } },
            { type: 'text', text: PROMPT.replace('{url}', url) },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Anthropic API ${response.status}`);
    }

    const data = await response.json();
    const text = (data.content || []).find((b) => b.type === 'text')?.text || '';
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}') + 1;
    if (start < 0 || end <= start) throw new Error('No JSON in model response');
    const parsed = JSON.parse(text.slice(start, end));

    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.design_score))));
    if (!Number.isFinite(score)) throw new Error('Bad design_score');

    return res.status(200).json({
      design_score: score,
      era_guess: String(parsed.era_guess || '').slice(0, 40),
      verdicts: (Array.isArray(parsed.verdicts) ? parsed.verdicts : []).slice(0, 3).map((v) => String(v).slice(0, 200)),
      worth_keeping: (Array.isArray(parsed.worth_keeping) ? parsed.worth_keeping : []).slice(0, 2).map((v) => String(v).slice(0, 200)),
    });
  } catch (err) {
    console.error('Design check error:', err);
    return res.status(500).json({ error: 'Design review failed' });
  }
}
