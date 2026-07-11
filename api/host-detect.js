// "Who hosts you now?" detector for the Managed Hosting page. Given a domain,
// it fingerprints the current website host/platform, email provider, and DNS
// host from PUBLIC DNS only (DNS-over-HTTPS to dns.google).
//
// Design note: it deliberately does NOT fetch the target site server-side.
// Fetching a user-supplied origin is an SSRF surface (redirects, DNS
// rebinding, IPv6, internal metadata endpoints) that is hard to make safe.
// DNS records — apex A, www CNAME, NS, MX — identify the common builders and
// hosts well enough for a migration conversation, with zero SSRF risk.
//
// No API key needed.

const DAILY_PER_IP = 30;
const DAILY_GLOBAL = 800;
const ipHits = new Map();
let globalHits = { day: '', count: 0 };

const ALLOWED_REFERERS = [
  'korestack.tech', 'www.korestack.tech', 'sreenalluri.github.io',
  'localhost:8090', 'localhost:3000',
];

async function doh(name, type) {
  try {
    const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`, {
      headers: { accept: 'application/dns-json' },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return { ok: false, data: [] };
    const j = await r.json();
    return { ok: true, data: (j.Answer || []).map((a) => String(a.data || '').toLowerCase().replace(/\.$/, '')) };
  } catch (e) { return { ok: false, data: [] }; }
}

// A-record IP-prefix → platform. Order matters (most specific first).
const IP_PREFIXES = [
  ['185.230.63.', 'Wix', 'builder'],
  ['23.236.62.', 'Wix', 'builder'],
  ['198.185.159.', 'Squarespace', 'builder'],
  ['198.49.23.', 'Squarespace', 'builder'],
  ['23.227.38.', 'Shopify', 'builder'],
  ['192.0.78.', 'WordPress.com', 'builder'],
  ['192.0.79.', 'WordPress.com', 'builder'],
  ['185.199.108.', 'GitHub Pages', 'modern'],
  ['185.199.109.', 'GitHub Pages', 'modern'],
  ['185.199.110.', 'GitHub Pages', 'modern'],
  ['185.199.111.', 'GitHub Pages', 'modern'],
  ['64.29.17.', 'Vercel', 'modern'],
  ['76.76.21.21', 'Vercel', 'modern'],
  ['76.76.19.', 'Vercel', 'modern'],
  ['216.198.79.', 'Vercel', 'modern'],
  ['75.2.60.', 'Netlify', 'modern'],
  ['184.168.', 'GoDaddy Website Builder', 'builder'],
  ['160.153.', 'GoDaddy Website Builder', 'builder'],
  ['107.180.', 'GoDaddy Website Builder', 'builder'],
  ['50.63.', 'GoDaddy Website Builder', 'builder'],
];

// Cloudflare proxy ranges — origin is hidden behind the proxy.
const CF_PREFIXES = ['104.16.', '104.17.', '104.18.', '104.19.', '104.20.', '104.21.', '104.22.', '104.23.', '104.24.', '104.25.', '104.26.', '104.27.', '172.64.', '172.65.', '172.66.', '172.67.', '173.245.', '108.162.', '141.101.', '190.93.', '188.114.', '197.234.240.', '198.41.128.'];

// CNAME (www) target substring → platform (strongest signal).
const CNAME_TABLE = [
  ['wixdns.net', 'Wix', 'builder'],
  ['squarespace.com', 'Squarespace', 'builder'],
  ['myshopify.com', 'Shopify', 'builder'],
  ['godaddysites.com', 'GoDaddy Website Builder', 'builder'],
  ['secureserver.net', 'GoDaddy Website Builder', 'builder'],
  ['weeblysite.com', 'Weebly', 'builder'],
  ['weebly.com', 'Weebly', 'builder'],
  ['wordpress.com', 'WordPress.com', 'builder'],
  ['pages.dev', 'Cloudflare Pages', 'modern'],
  ['vercel-dns', 'Vercel', 'modern'],
  ['vercel.app', 'Vercel', 'modern'],
  ['netlify.app', 'Netlify', 'modern'],
  ['netlify.com', 'Netlify', 'modern'],
  ['github.io', 'GitHub Pages', 'modern'],
  ['website-files.com', 'Webflow', 'modern'],
  ['webflow.io', 'Webflow', 'modern'],
];

const MX_TABLE = [
  ['aspmx.l.google.com', 'Google Workspace'], ['googlemail.com', 'Google Workspace'], ['google.com', 'Google Workspace'],
  ['protection.outlook.com', 'Microsoft 365'], ['outlook.com', 'Microsoft 365'],
  ['secureserver.net', 'GoDaddy Email'], ['zoho', 'Zoho Mail'],
  ['messagingengine.com', 'Fastmail'], ['pphosted.com', 'Proofpoint'],
  ['mailgun', 'Mailgun'], ['wixdns', 'Wix Email'], ['icloud.com', 'iCloud Mail'],
];
// Platform-specific nameservers → the platform itself (more stable than IPs).
// Only for NS values that uniquely imply the host; a shared DNS provider like
// GoDaddy's domaincontrol.com does NOT imply GoDaddy hosting, so it's excluded.
const NS_PLATFORM = [
  ['wixdns.net', 'Wix', 'builder'],
  ['squarespacedns.com', 'Squarespace', 'builder'],
  ['vercel-dns', 'Vercel', 'modern'],
];

const NS_TABLE = [
  ['cloudflare.com', 'Cloudflare'], ['domaincontrol.com', 'GoDaddy'], ['wixdns.net', 'Wix'],
  ['squarespacedns.com', 'Squarespace'], ['awsdns', 'AWS Route 53'], ['registrar-servers.com', 'Namecheap'],
  ['googledomains.com', 'Google Domains'], ['nsone.net', 'NS1'], ['dnsmadeeasy', 'DNS Made Easy'],
  ['vercel-dns', 'Vercel'], ['name.com', 'Name.com'], ['bluehost.com', 'Bluehost'],
  ['hostgator.com', 'HostGator'], ['siteground', 'SiteGround'], ['shopify', 'Shopify'],
];

function matchTable(values, table) {
  for (const [needle, ...rest] of table) {
    if (values.some((v) => v.includes(needle))) return rest.length === 1 ? rest[0] : rest;
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const src = req.headers.origin || req.headers.referer || '';
  let host = '';
  try { host = new URL(src).host; } catch (e) {}
  if (!ALLOWED_REFERERS.includes(host)) return res.status(403).json({ error: 'Forbidden' });

  const today = new Date().toISOString().slice(0, 10);
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (globalHits.day !== today) globalHits = { day: today, count: 0 };
  if (globalHits.count >= DAILY_GLOBAL) return res.status(429).json({ error: 'Daily capacity reached' });
  const rec = ipHits.get(ip);
  const ipCount = rec && rec.day === today ? rec.count : 0;
  if (ipCount >= DAILY_PER_IP) return res.status(429).json({ error: 'Rate limit reached — try again tomorrow' });

  let domain = String((req.body || {}).domain || '').trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '').replace(/^www\./, '');
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain) || domain.length > 253) {
    return res.status(400).json({ error: 'Enter a valid domain, e.g. yourbusiness.com' });
  }

  globalHits.count += 1;
  ipHits.set(ip, { day: today, count: ipCount + 1 });

  try {
    const [aRes, cnameRes, nsRes, mxRes] = await Promise.all([
      doh(domain, 'A'),
      doh('www.' + domain, 'CNAME'),
      doh(domain, 'NS'),
      doh(domain, 'MX'),
    ]);

    const aRecords = aRes.data.filter((x) => /^\d+\.\d+\.\d+\.\d+$/.test(x));
    const cnames = cnameRes.data;

    if (!aRecords.length && !cnames.length) {
      return res.status(200).json({ found: false, domain });
    }

    // Platform: CNAME first (most specific), then A-record IP range.
    let platform = null, platformKind = 'unknown';
    const byCname = matchTable(cnames, CNAME_TABLE);
    if (byCname) { platform = byCname[0]; platformKind = byCname[1]; }
    if (!platform) {
      for (const [prefix, name, kind] of IP_PREFIXES) {
        if (aRecords.some((ip4) => ip4.startsWith(prefix))) { platform = name; platformKind = kind; break; }
      }
    }
    if (!platform) {
      const byNs = matchTable(nsRes.data, NS_PLATFORM);
      if (byNs) { platform = byNs[0]; platformKind = byNs[1]; }
    }

    const behindCloudflare = aRecords.some((ip4) => CF_PREFIXES.some((p) => ip4.startsWith(p)))
      || cnames.some((c) => c.includes('cloudflare'));
    // If Cloudflare-proxied and we couldn't otherwise identify the platform,
    // the origin is hidden — report that honestly rather than guessing.
    let originHidden = false;
    if (!platform && behindCloudflare) { platform = 'Behind Cloudflare'; platformKind = 'proxied'; originHidden = true; }

    const emailHost = matchTable(mxRes.data, MX_TABLE) || (mxRes.ok && mxRes.data.length ? 'Other provider' : null);
    const dnsHost = matchTable(nsRes.data, NS_TABLE);
    const cdn = behindCloudflare ? 'Cloudflare' : (platformKind === 'modern' ? platform : null);

    return res.status(200).json({
      found: true,
      domain,
      platform,                 // null = couldn't identify from DNS
      platformKind,             // builder | modern | proxied | unknown
      originHidden,
      emailHost,                // null = none found (only when the MX query succeeded)
      emailChecked: mxRes.ok,   // false = MX lookup itself failed; don't claim "no email"
      dnsHost,
      cdn,
    });
  } catch (err) {
    console.error('Host detect error:', err);
    return res.status(500).json({ error: 'Detection failed' });
  }
}
