// Google Business Profile lookup for the Local SEO checker. Takes a business
// name + city, finds the place via Google Places API (New), and returns the
// profile signals Google's local ranking actually uses: rating, review count,
// review recency, hours, photos, linked website, and operating status.
//
// Requires GOOGLE_PLACES_API_KEY as a Vercel environment variable — a
// SERVER-side key with "Places API (New)" enabled, restricted to that API
// only. Do NOT reuse the browser PageSpeed key (that one is referer-locked
// and public by design; this one must stay secret).

// In-memory flood protection (resets on cold starts — deterrent, not budget).
// Places text search with rating/review fields bills at a premium SKU whose
// free tier is ~1k calls/month: 30/day ≈ 900/month keeps this $0. Raise
// deliberately if the tool takes off.
const DAILY_PER_IP = 5;
const DAILY_GLOBAL = 30;

const ipHits = new Map();
let globalHits = { day: '', count: 0 };

// Exact hosts (matched against the parsed Origin/Referer host).
const ALLOWED_REFERERS = [
  'korestack.tech',
  'www.korestack.tech',
  'sreenalluri.github.io',
  'localhost:8090',
  'localhost:3000',
];

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.rating',
  'places.userRatingCount',
  'places.websiteUri',
  'places.regularOpeningHours.periods',
  'places.photos.name',
  'places.businessStatus',
  'places.reviews.publishTime',
  'places.googleMapsUri',
  'places.primaryTypeDisplayName',
].join(',');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Exact host match on the parsed Origin/Referer, not a substring test
  // (substring would let evil-korestack.tech.attacker.com through).
  const src = req.headers.origin || req.headers.referer || '';
  let host = '';
  try { host = new URL(src).host; } catch (e) { /* no/invalid header */ }
  if (!ALLOWED_REFERERS.includes(host)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const apiKey = (process.env.GOOGLE_PLACES_API_KEY || '').trim();
  if (!apiKey || /\s/.test(apiKey)) {
    return res.status(503).json({ error: 'Local check not configured' });
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

  const { query } = req.body || {};
  if (typeof query !== 'string' || query.trim().length < 3 || query.length > 120) {
    return res.status(400).json({ error: 'Invalid query' });
  }

  globalHits.count += 1;
  ipHits.set(ip, { day: today, count: ipCount + 1 });

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({ textQuery: query.trim(), pageSize: 1 }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('Places API error:', response.status, err?.error?.status, err?.error?.message);
      // 429 → rate limited (client shows "try tomorrow"); 403 → key/API/billing
      // misconfig, surface as "not configured" so it's distinguishable from a
      // transient failure; everything else → generic 500.
      if (response.status === 429) return res.status(429).json({ error: 'Rate limit reached' });
      if (response.status === 403) return res.status(503).json({ error: 'Local check not configured' });
      return res.status(500).json({ error: 'Lookup failed' });
    }

    const data = await response.json();
    const p = (data.places || [])[0];
    if (!p) {
      return res.status(200).json({ found: false });
    }

    // Days since the newest of the returned reviews (Places returns up to 5
    // "most relevant" — an approximation of recency, not the newest five).
    let recentReviewDays = null;
    for (const r of p.reviews || []) {
      const t = Date.parse(r.publishTime || '');
      if (!Number.isNaN(t)) {
        const days = Math.floor((Date.now() - t) / 86400000);
        if (recentReviewDays == null || days < recentReviewDays) recentReviewDays = days;
      }
    }

    return res.status(200).json({
      found: true,
      name: p.displayName?.text || null,
      address: p.formattedAddress || null,
      rating: p.rating ?? null,
      reviewCount: p.userRatingCount ?? 0,
      websiteUri: p.websiteUri || null,
      hasHours: !!(p.regularOpeningHours?.periods?.length),
      photoCount: (p.photos || []).length,
      businessStatus: p.businessStatus || 'UNKNOWN',
      mapsUrl: p.googleMapsUri || null,
      primaryType: p.primaryTypeDisplayName?.text || null,
      recentReviewDays,
    });
  } catch (err) {
    console.error('Local presence error:', err);
    return res.status(500).json({ error: 'Lookup failed' });
  }
}
