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

const PROMPT = `You are a senior brand and web designer giving an honest, calibrated assessment of a small business website from a screenshot ({url}). Judge the VISUAL DESIGN only — not speed or code. Be fair: reward genuinely good modern design, and flag genuinely dated work. You are not trying to fail sites; you are placing this one accurately.

The image may be a partial or long full-page screenshot — judge the design you can see and do NOT penalize for content that is cut off or for the screenshot's own resolution.

Weigh these, roughly in order of importance:
- Typography: modern typefaces, clear hierarchy, comfortable sizing (vs. tiny text, clashing or default system fonts)
- Layout & whitespace: intentional, breathing composition (vs. cramped, cluttered, or template-default)
- Color: current, cohesive, purposeful (vs. muddy, clashing, garish, or default-blue)
- Imagery: fresh, high-quality, authentic (vs. dated stock, clip art, heavy gradients, low-res)
- Components: buttons, nav, cards, forms that look current (vs. beveled/glossy/2010s chrome)
- Composition: does it feel like a business investing in itself today

IMPORTANT: clean and simple is GOOD, not boring. A minimal, well-executed site (think Stripe, Apple, Linear) is the height of modern design — reward restraint and polish. Only mark simplicity down when it's genuinely generic: a default template with system fonts and no craft. Intentional, well-composed minimalism should score HIGH.

SCORING BANDS — calibrate honestly to what you see:
- 90-100: exceptional — award-worthy, could headline a design gallery.
- 75-89: modern, clean, professional — a strong current site a good designer would happily ship today. Most well-executed redesigns belong here.
- 60-74: solid but with some dated touches or uneven execution.
- 40-59: visibly dated — feels a few years behind (roughly 2012–2018).
- 20-39: clearly old or neglected.
- 0-19: broken, empty, or straight out of the 2000s.

Score what's in front of you fairly. If the design is strong, say so with a high number; if it's dated, place it low. Respond with ONLY a JSON object, no other text:
{
  "design_score": <0-100 per the bands above>,
  "era_guess": "<the era the design feels like, e.g. '2022-2026' or '2012-2015'>",
  "verdicts": [<exactly 3 short, specific strings — the weakest or most dated things a customer would notice; if the design is strong, these are the smallest remaining nitpicks>],
  "worth_keeping": [<1-3 short strings — the visual elements that genuinely work>]
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
  // Full-page screenshots run larger than the old mobile thumbnail; Anthropic
  // downscales oversized images, so a generous cap is fine (~5MB base64).
  if (!m || m[2].length > 5000000) {
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
