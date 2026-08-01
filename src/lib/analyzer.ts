/**
 * Анализатор на сайтове — събира всичко за един URL от страната на сървъра.
 *
 * Използва само Web API (fetch, URL, TextEncoder) и публичния DNS-over-HTTPS
 * на Cloudflare — без Node вградени модули и без външни платени услуги, така
 * че работи еднакво на Cloudflare Worker-а и в `astro dev`.
 */

const FETCH_TIMEOUT_MS = 8_000;
const PROBE_TIMEOUT_MS = 4_000;
const DNS_TIMEOUT_MS = 4_000;
const MAX_REDIRECT_HOPS = 10;
/** Груба защита на CPU времето — regex анализът спира дотук. */
const MAX_HTML_CHARS = 1_500_000;
const MAX_SITEMAP_URLS = 20;
const MAX_HEADINGS = 40;
const MAX_OUTBOUND_DOMAINS = 30;
const MAX_KEYWORDS = 12;

const USER_AGENT =
  'Mozilla/5.0 (compatible; KovaStudioAnalyzer/1.0; +https://kova.studio/analyzer/)';

const COMMON_SITEMAP_PATHS = [
  '/sitemap.xml',
  '/sitemap_index.xml',
  '/sitemap-index.xml',
  '/sitemap-0.xml',
  '/sitemap1.xml',
  '/wp-sitemap.xml',
];

/* ------------------------------------------------------------------ */
/* Безопасност на адреса (защита от SSRF)                              */
/* ------------------------------------------------------------------ */

const VALID_HOSTNAME_RE = /^(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(\.[a-zA-Z0-9-]{1,63})*\.[a-zA-Z]{2,}$/;
const HOSTNAME_BLOCKLIST = new Set(['localhost', 'localhost.localdomain', 'broadcasthost']);

function isIpv4(value: string): boolean {
  const parts = value.split('.');
  return parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255);
}

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, oct) => acc * 256 + Number(oct), 0);
}

const PRIVATE_IPV4_RANGES: [number, number][] = [
  [ipv4ToInt('0.0.0.0'), ipv4ToInt('0.255.255.255')],
  [ipv4ToInt('10.0.0.0'), ipv4ToInt('10.255.255.255')],
  [ipv4ToInt('100.64.0.0'), ipv4ToInt('100.127.255.255')],
  [ipv4ToInt('127.0.0.0'), ipv4ToInt('127.255.255.255')],
  [ipv4ToInt('169.254.0.0'), ipv4ToInt('169.254.255.255')],
  [ipv4ToInt('172.16.0.0'), ipv4ToInt('172.31.255.255')],
  [ipv4ToInt('192.0.0.0'), ipv4ToInt('192.0.0.255')],
  [ipv4ToInt('192.0.2.0'), ipv4ToInt('192.0.2.255')],
  [ipv4ToInt('192.168.0.0'), ipv4ToInt('192.168.255.255')],
  [ipv4ToInt('198.18.0.0'), ipv4ToInt('198.19.255.255')],
  [ipv4ToInt('198.51.100.0'), ipv4ToInt('198.51.100.255')],
  [ipv4ToInt('203.0.113.0'), ipv4ToInt('203.0.113.255')],
  [ipv4ToInt('224.0.0.0'), ipv4ToInt('255.255.255.255')],
];

const PRIVATE_IPV6_PREFIXES = ['::', '::1', 'fc', 'fd', 'fe8', 'fe9', 'fea', 'feb', 'ff'];

export function isPrivateIp(ip: string): boolean {
  const cleaned = ip.replace(/^\[/, '').replace(/\]$/, '').toLowerCase();
  if (HOSTNAME_BLOCKLIST.has(cleaned)) return true;

  if (isIpv4(cleaned)) {
    const value = ipv4ToInt(cleaned);
    return PRIVATE_IPV4_RANGES.some(([start, end]) => value >= start && value <= end);
  }

  if (cleaned.includes(':')) {
    if (cleaned.startsWith('::ffff:')) {
      const mapped = cleaned.slice('::ffff:'.length);
      if (isIpv4(mapped)) return isPrivateIp(mapped);
    }
    return PRIVATE_IPV6_PREFIXES.some((prefix) => cleaned.startsWith(prefix));
  }

  return false;
}

/** Връща каноничния адрес или null, ако е невалиден/вътрешен. */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    const host = parsed.hostname.toLowerCase();
    if (isIpv4(host) || host.includes(':')) {
      if (isPrivateIp(host)) return null;
    } else if (host.length > 253 || !VALID_HOSTNAME_RE.test(host) || HOSTNAME_BLOCKLIST.has(host)) {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Проверява и DNS записите на хоста, за да не сочат към вътрешната мрежа
 * (защита срещу DNS rebinding). Връща каноничния адрес или null.
 */
export async function assertSafeRemoteUrl(url: string): Promise<string | null> {
  const safe = sanitizeUrl(url);
  if (!safe) return null;

  const host = new URL(safe).hostname.toLowerCase();
  if (isIpv4(host) || host.includes(':')) return safe;

  const [a, aaaa] = await Promise.all([resolveDns(host, 'A'), resolveDns(host, 'AAAA')]);
  const addresses = [...a, ...aaaa].map((r) => r.data);
  if (addresses.some((addr) => isPrivateIp(addr))) return null;
  return safe;
}

/* ------------------------------------------------------------------ */
/* DNS-over-HTTPS                                                      */
/* ------------------------------------------------------------------ */

export interface DnsRecord {
  name: string;
  data: string;
  ttl?: number;
}

export async function resolveDns(
  name: string,
  type: 'A' | 'AAAA' | 'MX' | 'TXT' | 'NS' | 'CNAME',
): Promise<DnsRecord[]> {
  try {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
      { headers: { Accept: 'application/dns-json' }, signal: AbortSignal.timeout(DNS_TIMEOUT_MS) },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { Answer?: { name: string; data: string; TTL?: number }[] };
    return (data.Answer ?? []).map((a) => ({
      name: a.name,
      data: typeof a.data === 'string' ? a.data.replace(/^"|"$/g, '') : String(a.data),
      ttl: a.TTL,
    }));
  } catch {
    return [];
  }
}

export interface DnsInfo {
  a: string[];
  aaaa: string[];
  mx: string[];
  ns: string[];
  txt: string[];
  spf: string | null;
  dmarc: string | null;
}

export async function collectDns(domain: string): Promise<DnsInfo> {
  const [a, aaaa, mx, ns, txt, dmarcTxt] = await Promise.all([
    resolveDns(domain, 'A'),
    resolveDns(domain, 'AAAA'),
    resolveDns(domain, 'MX'),
    resolveDns(domain, 'NS'),
    resolveDns(domain, 'TXT'),
    resolveDns(`_dmarc.${domain}`, 'TXT'),
  ]);

  const txtValues = txt.map((r) => r.data);
  return {
    a: a.map((r) => r.data),
    aaaa: aaaa.map((r) => r.data),
    mx: mx.map((r) => r.data),
    ns: ns.map((r) => r.data),
    txt: txtValues,
    spf: txtValues.find((v) => v.toLowerCase().startsWith('v=spf1')) ?? null,
    dmarc: dmarcTxt.map((r) => r.data).find((v) => v.toLowerCase().startsWith('v=dmarc1')) ?? null,
  };
}

/* ------------------------------------------------------------------ */
/* Изтегляне на страницата и верига от редиректи                       */
/* ------------------------------------------------------------------ */

export interface PageFetch {
  finalUrl: string;
  status: number;
  ok: boolean;
  responseTimeMs: number;
  htmlBytes: number;
  htmlTruncated: boolean;
  contentType: string | null;
  headers: Record<string, string>;
  html: string;
}

export async function fetchPage(url: string): Promise<PageFetch> {
  const started = Date.now();
  const res = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'bg,en;q=0.8',
    },
  });
  const raw = await res.text();
  const responseTimeMs = Date.now() - started;

  const headers: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  return {
    finalUrl: res.url || url,
    status: res.status,
    ok: res.ok,
    responseTimeMs,
    htmlBytes: new TextEncoder().encode(raw).length,
    htmlTruncated: raw.length > MAX_HTML_CHARS,
    contentType: res.headers.get('content-type'),
    headers,
    html: raw.slice(0, MAX_HTML_CHARS),
  };
}

export interface RedirectHop {
  url: string;
  status: number;
}

export async function followRedirects(url: string): Promise<RedirectHop[]> {
  const chain: RedirectHop[] = [];
  let current: string | null = sanitizeUrl(url);

  for (let i = 0; current && i < MAX_REDIRECT_HOPS; i++) {
    const hopUrl: string = current;
    try {
      const res = await fetch(hopUrl, {
        redirect: 'manual',
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
        headers: { 'User-Agent': USER_AGENT },
      });
      chain.push({ url: hopUrl, status: res.status });
      if (res.status < 300 || res.status >= 400) break;

      const location = res.headers.get('location');
      if (!location) break;
      current = sanitizeUrl(new URL(location, hopUrl).href);
    } catch {
      chain.push({ url: hopUrl, status: 0 });
      break;
    }
  }

  return chain;
}

/* ------------------------------------------------------------------ */
/* SEO одит върху HTML                                                 */
/* ------------------------------------------------------------------ */

export interface SeoAudit {
  title: string | null;
  titleLength: number;
  metaDescription: string | null;
  metaDescriptionLength: number;
  canonical: string | null;
  lang: string | null;
  charset: string | null;
  viewport: boolean;
  favicon: boolean;
  metaRobots: string | null;
  noindex: boolean;
  nofollow: boolean;
  generator: string | null;
  hreflangCount: number;
  headings: { tag: string; text: string }[];
  headingCounts: Record<string, number>;
  imagesTotal: number;
  imagesMissingAlt: number;
  ogTags: Record<string, string>;
  twitterTags: Record<string, string>;
}

export function auditSeo(html: string): SeoAudit {
  const headings: SeoAudit['headings'] = [];
  const headingCounts: Record<string, number> = { H1: 0, H2: 0, H3: 0, H4: 0, H5: 0, H6: 0 };
  const headingRegex = /<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(html)) !== null) {
    const tag = match[1].toUpperCase();
    headingCounts[tag] += 1;
    if (headings.length < MAX_HEADINGS) {
      headings.push({ tag, text: match[2].replace(/<[^>]*>/g, '').trim().slice(0, 120) });
    }
  }

  const imgs = html.match(/<img[^>]*>/gi) ?? [];
  const imagesMissingAlt = imgs.filter((i) => !/alt=/i.test(i) || /alt=["']\s*["']/i.test(i)).length;

  const ogTags: Record<string, string> = {};
  const ogRegex = /<meta[^>]+property=["']og:([^"']+)["'][^>]+content=["']([^"']*)["']/gi;
  while ((match = ogRegex.exec(html)) !== null) ogTags[match[1]] = match[2];

  const twitterTags: Record<string, string> = {};
  const twRegex = /<meta[^>]+name=["']twitter:([^"']+)["'][^>]+content=["']([^"']*)["']/gi;
  while ((match = twRegex.exec(html)) !== null) twitterTags[match[1]] = match[2];

  const first = (re: RegExp): string | null => html.match(re)?.[1]?.trim() ?? null;

  const title = first(/<title[^>]*>([\s\S]*?)<\/title>/i)?.replace(/\s+/g, ' ') ?? null;
  const metaDescription = first(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
  const metaRobots = first(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i);

  return {
    title,
    titleLength: title?.length ?? 0,
    metaDescription,
    metaDescriptionLength: metaDescription?.length ?? 0,
    canonical: first(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i),
    lang: first(/<html[^>]+lang=["']([^"']*)["']/i),
    charset: first(/<meta[^>]+charset=["']?([^"'\s/>]+)/i),
    viewport: /<meta[^>]+name=["']viewport["']/i.test(html),
    favicon: /<link[^>]+rel=["'][^"']*icon[^"']*["']/i.test(html),
    metaRobots,
    noindex: !!metaRobots && /\bnoindex\b/i.test(metaRobots),
    nofollow: !!metaRobots && /\bnofollow\b/i.test(metaRobots),
    generator: first(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']*)["']/i),
    hreflangCount: (html.match(/<link[^>]+hreflang=["'][^"']+["']/gi) ?? []).length,
    headings,
    headingCounts,
    imagesTotal: imgs.length,
    imagesMissingAlt,
    ogTags,
    twitterTags,
  };
}

/* ------------------------------------------------------------------ */
/* Съдържание и ключови думи (кирилица + латиница)                     */
/* ------------------------------------------------------------------ */

const STOP_WORDS = new Set([
  // английски
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'your', 'our', 'all', 'can', 'has', 'have',
  'this', 'that', 'with', 'from', 'was', 'were', 'will', 'more', 'how', 'what', 'when', 'who',
  'about', 'into', 'out', 'get', 'their', 'they', 'them', 'its', 'also', 'than', 'then', 'may',
  // български
  'като', 'това', 'тази', 'този', 'тези', 'той', 'нея', 'него', 'ние', 'вие', 'или', 'ако',
  'при', 'към', 'след', 'пред', 'над', 'под', 'през', 'със', 'във', 'който', 'която', 'което',
  'които', 'какво', 'защо', 'как', 'къде', 'кога', 'един', 'една', 'едно', 'едни', 'още',
  'само', 'вече', 'може', 'могат', 'трябва', 'има', 'няма', 'бъде', 'било', 'била', 'бил',
  'били', 'сме', 'сте', 'съм', 'беше', 'бяха', 'всички', 'всяка', 'всеки', 'всичко', 'нещо',
  'някои', 'много', 'малко', 'повече', 'най', 'тук', 'там', 'сега', 'без', 'да', 'не', 'на',
  'за', 'от', 'по', 'се', 'си',
]);

export interface ContentStats {
  wordCount: number;
  sentenceCount: number;
  avgWordsPerSentence: number;
  keywords: { word: string; count: number }[];
}

export function analyzeContent(html: string): ContentStats {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = text.toLowerCase().match(/[a-zа-я][a-zа-я'-]{2,}/g) ?? [];
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 1);

  const counts = new Map<string, number>();
  for (const word of words) {
    if (STOP_WORDS.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  const keywords = [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_KEYWORDS);

  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    avgWordsPerSentence:
      sentences.length > 0 ? Math.round((words.length / sentences.length) * 10) / 10 : 0,
    keywords,
  };
}

/* ------------------------------------------------------------------ */
/* Връзки                                                              */
/* ------------------------------------------------------------------ */

export interface LinkStats {
  internal: number;
  external: number;
  outboundDomains: { domain: string; href: string }[];
}

function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/^www\./, '');
}

export function analyzeLinks(html: string, baseUrl: string): LinkStats {
  const base = new URL(baseUrl);
  const baseHost = normalizeHost(base.hostname);
  let internal = 0;
  let external = 0;
  const outbound = new Map<string, string>();

  const linkRegex = /<a[^>]+href=["']([^"'#][^"']*)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1].trim();
    if (/^(mailto:|tel:|javascript:|data:)/i.test(href)) continue;
    try {
      const resolved = new URL(href, base);
      if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') continue;
      const host = normalizeHost(resolved.hostname);
      if (host === baseHost) {
        internal += 1;
      } else {
        external += 1;
        if (!outbound.has(host) && outbound.size < MAX_OUTBOUND_DOMAINS) {
          outbound.set(host, resolved.href);
        }
      }
    } catch {
      // невалиден href — пропускаме
    }
  }

  return {
    internal,
    external,
    outboundDomains: [...outbound.entries()].map(([domain, href]) => ({ domain, href })),
  };
}

/* ------------------------------------------------------------------ */
/* Структурирани данни и социални профили                              */
/* ------------------------------------------------------------------ */

export interface StructuredData {
  jsonLdTypes: string[];
  microdataTypes: string[];
}

export function extractStructuredData(html: string): StructuredData {
  const types = new Set<string>();
  const jsonLdRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const collect = (node: unknown): void => {
        if (!node) return;
        if (Array.isArray(node)) return node.forEach(collect);
        if (typeof node === 'object') {
          const record = node as Record<string, unknown>;
          const t = record['@type'];
          if (typeof t === 'string') types.add(t);
          if (Array.isArray(t)) t.forEach((x) => typeof x === 'string' && types.add(x));
          if (record['@graph']) collect(record['@graph']);
        }
      };
      collect(JSON.parse(match[1].trim()));
    } catch {
      // невалиден JSON-LD — пропускаме
    }
  }

  const microdata = new Set<string>();
  const microRegex = /itemtype=["']https?:\/\/schema\.org\/([^"']+)["']/gi;
  while ((match = microRegex.exec(html)) !== null) microdata.add(match[1]);

  return { jsonLdTypes: [...types], microdataTypes: [...microdata] };
}

export interface SocialProfile {
  platform: string;
  url: string;
}

export function extractSocialProfiles(html: string): SocialProfile[] {
  const platforms: { name: string; pattern: RegExp }[] = [
    { name: 'Facebook', pattern: /https?:\/\/(?:www\.)?facebook\.com\/[a-zA-Z0-9.]+/ },
    { name: 'Instagram', pattern: /https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9_.]+/ },
    { name: 'LinkedIn', pattern: /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9_-]+/ },
    { name: 'X (Twitter)', pattern: /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[a-zA-Z0-9_]+/ },
    { name: 'YouTube', pattern: /https?:\/\/(?:www\.)?youtube\.com\/(?:c\/|channel\/|@)[a-zA-Z0-9_-]+/ },
    { name: 'GitHub', pattern: /https?:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/ },
    { name: 'TikTok', pattern: /https?:\/\/(?:www\.)?tiktok\.com\/@[a-zA-Z0-9_.]+/ },
    { name: 'Viber', pattern: /https?:\/\/invite\.viber\.com\/[^"'\s]+/ },
  ];

  const profiles: SocialProfile[] = [];
  for (const { name, pattern } of platforms) {
    const found = html.match(pattern);
    if (found) profiles.push({ platform: name, url: found[0] });
  }
  return profiles;
}

/* ------------------------------------------------------------------ */
/* Контакти на страницата                                              */
/* ------------------------------------------------------------------ */

export interface PageContacts {
  emails: string[];
  phones: string[];
}

export function extractContacts(html: string): PageContacts {
  const emails = new Set<string>();
  const phones = new Set<string>();

  let match: RegExpExecArray | null;
  const mailtoRegex = /href=["']mailto:([^"'?]+)/gi;
  while ((match = mailtoRegex.exec(html)) !== null) emails.add(match[1].trim().toLowerCase());

  const telRegex = /href=["']tel:([^"']+)["']/gi;
  while ((match = telRegex.exec(html)) !== null) phones.add(match[1].trim());

  const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]*>/g, ' ');
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  for (const email of text.match(emailRegex) ?? []) {
    const clean = email.toLowerCase();
    if (!/\.(png|jpe?g|gif|webp|svg|avif|css|js)$/.test(clean)) emails.add(clean);
  }

  return { emails: [...emails].slice(0, 10), phones: [...phones].slice(0, 10) };
}

/* ------------------------------------------------------------------ */
/* Технологии и тракери                                                */
/* ------------------------------------------------------------------ */

export interface Technology {
  name: string;
  category: string;
}

interface TechSignature {
  name: string;
  category: string;
  html?: RegExp;
  header?: { name: string; value?: RegExp };
}

const TECH_SIGNATURES: TechSignature[] = [
  // CMS и платформи
  { name: 'WordPress', category: 'CMS', html: /wp-content\/|wp-includes\/|\/wp-json\// },
  { name: 'WooCommerce', category: 'Онлайн магазин', html: /woocommerce/i },
  { name: 'Joomla', category: 'CMS', html: /\/media\/jui\/|content=["']Joomla/i },
  { name: 'Drupal', category: 'CMS', html: /Drupal\.settings|\/sites\/default\/files/ },
  { name: 'Shopify', category: 'Онлайн магазин', html: /cdn\.shopify\.com|Shopify\.theme/ },
  { name: 'Wix', category: 'Уебсайт билдър', html: /wixstatic\.com|wix\.com\/velo/ },
  { name: 'Squarespace', category: 'Уебсайт билдър', html: /static1\.squarespace\.com|squarespace\.com/ },
  { name: 'Webflow', category: 'Уебсайт билдър', html: /assets(?:-global)?\.website-files\.com|data-wf-page/ },
  { name: 'OpenCart', category: 'Онлайн магазин', html: /catalog\/view\/theme|index\.php\?route=/ },
  { name: 'PrestaShop', category: 'Онлайн магазин', html: /prestashop/i },
  { name: 'Magento', category: 'Онлайн магазин', html: /static\/version\d+\/frontend|Magento_/ },
  { name: 'Ghost', category: 'CMS', html: /content=["']Ghost/i },

  // JavaScript фреймуъркове и библиотеки
  { name: 'Next.js', category: 'JS фреймуърк', html: /__NEXT_DATA__|\/_next\// },
  { name: 'Nuxt', category: 'JS фреймуърк', html: /__NUXT__|\/_nuxt\// },
  { name: 'React', category: 'JS библиотека', html: /data-reactroot|data-reactid|react-dom(?:\.production)?(?:\.min)?\.js/ },
  { name: 'Vue.js', category: 'JS библиотека', html: /data-v-app|vue(?:\.runtime)?(?:\.global)?(?:\.prod)?(?:\.min)?\.js/ },
  { name: 'Angular', category: 'JS фреймуърк', html: /\bng-version=/ },
  { name: 'Svelte', category: 'JS фреймуърк', html: /class=["'][^"']*svelte-[a-z0-9]+/ },
  { name: 'Astro', category: 'JS фреймуърк', html: /<astro-island|astro-route|content=["']Astro/ },
  { name: 'Gatsby', category: 'JS фреймуърк', html: /___gatsby/ },
  { name: 'jQuery', category: 'JS библиотека', html: /jquery[.-][\d.]*(?:min\.)?js/i },
  { name: 'Alpine.js', category: 'JS библиотека', html: /alpinejs|\bx-data=/ },
  { name: 'htmx', category: 'JS библиотека', html: /htmx(?:\.min)?\.js|\bhx-(?:get|post)=/ },

  // CSS и шрифтове
  { name: 'Bootstrap', category: 'CSS фреймуърк', html: /bootstrap(?:\.min)?\.(?:css|js)/i },
  { name: 'Tailwind CSS', category: 'CSS фреймуърк', html: /tailwindcss|class=["'][^"']*\b(?:sm|md|lg|xl|2xl):[a-z-]+/ },
  { name: 'Font Awesome', category: 'Икони и шрифтове', html: /font-?awesome/i },
  { name: 'Google Fonts', category: 'Икони и шрифтове', html: /fonts\.googleapis\.com|fonts\.gstatic\.com/ },

  // Аналитика, маркетинг и чат
  { name: 'Hotjar', category: 'Аналитика', html: /static\.hotjar\.com|\bhjid\b/ },
  { name: 'Microsoft Clarity', category: 'Аналитика', html: /clarity\.ms/ },
  { name: 'Plausible', category: 'Аналитика', html: /plausible\.io\/js/ },
  { name: 'Matomo', category: 'Аналитика', html: /matomo\.js|piwik\.js/ },
  { name: 'Fathom', category: 'Аналитика', html: /usefathom\.com/ },
  { name: 'HubSpot', category: 'Маркетинг', html: /js\.hs-scripts\.com|hubspot/i },
  { name: 'Mailchimp', category: 'Маркетинг', html: /list-manage\.com|chimpstatic\.com/ },
  { name: 'Intercom', category: 'Чат', html: /widget\.intercom\.io/ },
  { name: 'Crisp', category: 'Чат', html: /client\.crisp\.chat/ },
  { name: 'Tawk.to', category: 'Чат', html: /embed\.tawk\.to/ },

  // Плащания и видео
  { name: 'Stripe', category: 'Плащания', html: /js\.stripe\.com/ },
  { name: 'PayPal', category: 'Плащания', html: /paypal\.com\/sdk\/js/ },
  { name: 'YouTube (вграждане)', category: 'Видео', html: /youtube(?:-nocookie)?\.com\/embed/ },
  { name: 'Vimeo (вграждане)', category: 'Видео', html: /player\.vimeo\.com/ },

  // Хостинг, CDN и сървъри — по хедъри
  { name: 'Cloudflare', category: 'Хостинг / CDN', header: { name: 'cf-ray' } },
  { name: 'Cloudflare', category: 'Хостинг / CDN', header: { name: 'server', value: /cloudflare/i } },
  { name: 'Netlify', category: 'Хостинг / CDN', header: { name: 'x-nf-request-id' } },
  { name: 'Vercel', category: 'Хостинг / CDN', header: { name: 'x-vercel-id' } },
  { name: 'GitHub Pages', category: 'Хостинг / CDN', header: { name: 'server', value: /github\.com/i } },
  { name: 'Amazon CloudFront', category: 'Хостинг / CDN', header: { name: 'x-amz-cf-id' } },
  { name: 'nginx', category: 'Уеб сървър', header: { name: 'server', value: /nginx/i } },
  { name: 'Apache', category: 'Уеб сървър', header: { name: 'server', value: /apache/i } },
  { name: 'LiteSpeed', category: 'Уеб сървър', header: { name: 'server', value: /litespeed/i } },
  { name: 'Microsoft IIS', category: 'Уеб сървър', header: { name: 'server', value: /microsoft-iis/i } },
  { name: 'PHP', category: 'Език / Runtime', header: { name: 'x-powered-by', value: /php/i } },
  { name: 'Express', category: 'Език / Runtime', header: { name: 'x-powered-by', value: /express/i } },
  { name: 'ASP.NET', category: 'Език / Runtime', header: { name: 'x-powered-by', value: /asp\.net/i } },
];

export function detectTechnologies(html: string, headers: Record<string, string>): Technology[] {
  const found = new Map<string, Technology>();

  for (const sig of TECH_SIGNATURES) {
    let matches = false;
    if (sig.html) matches = sig.html.test(html);
    if (!matches && sig.header) {
      const value = headers[sig.header.name];
      matches = value !== undefined && (!sig.header.value || sig.header.value.test(value));
    }
    if (matches && !found.has(sig.name)) found.set(sig.name, { name: sig.name, category: sig.category });
  }

  return [...found.values()];
}

export interface Tracker {
  name: string;
  id: string;
}

export function detectTrackers(html: string): Tracker[] {
  const trackers: Tracker[] = [];
  const push = (name: string, id: string | undefined) => {
    if (id && !trackers.some((t) => t.name === name)) trackers.push({ name, id });
  };

  push('Google Tag Manager', html.match(/GTM-[A-Z0-9]+/)?.[0]);
  push('Google Analytics', html.match(/G-[A-Z0-9]{6,}|UA-\d+-\d+/)?.[0]);
  push('Facebook Pixel', html.match(/fbq\(\s*['"]init['"],\s*['"](\d+)['"]/)?.[1]);
  push('TikTok Pixel', html.match(/ttq\.load\(\s*['"]([a-zA-Z0-9]+)['"]\s*\)/)?.[1]);
  push('LinkedIn Insight Tag', html.match(/_linkedin_data_partner_ids\s*=\s*\[\s*['"]?(\d+)/)?.[1]);
  push('Twitter Pixel', html.match(/twq\(\s*['"]config['"],\s*['"]([a-zA-Z0-9]+)['"]/)?.[1]);

  return trackers;
}

/* ------------------------------------------------------------------ */
/* Сигурност                                                           */
/* ------------------------------------------------------------------ */

export interface SecurityInfo {
  https: boolean;
  headers: { key: string; label: string; value: string | null }[];
  grade: string;
  score: number;
  recommendations: string[];
}

const SECURITY_HEADERS: { key: string; label: string; points: number; recommendation: string }[] = [
  {
    key: 'strict-transport-security',
    label: 'Strict-Transport-Security (HSTS)',
    points: 20,
    recommendation: 'Добави Strict-Transport-Security, за да наложиш HTTPS връзки.',
  },
  {
    key: 'content-security-policy',
    label: 'Content-Security-Policy',
    points: 25,
    recommendation: 'Добави Content-Security-Policy срещу XSS и инжектиране на скриптове.',
  },
  {
    key: 'x-frame-options',
    label: 'X-Frame-Options',
    points: 15,
    recommendation: 'Добави X-Frame-Options срещу clickjacking атаки.',
  },
  {
    key: 'x-content-type-options',
    label: 'X-Content-Type-Options',
    points: 15,
    recommendation: 'Добави X-Content-Type-Options: nosniff срещу подмяна на MIME типове.',
  },
  {
    key: 'referrer-policy',
    label: 'Referrer-Policy',
    points: 10,
    recommendation: 'Добави Referrer-Policy, за да ограничиш изтичането на информация.',
  },
  {
    key: 'permissions-policy',
    label: 'Permissions-Policy',
    points: 15,
    recommendation: 'Добави Permissions-Policy, за да ограничиш достъпа до браузърни функции.',
  },
];

export function analyzeSecurity(finalUrl: string, headers: Record<string, string>): SecurityInfo {
  let score = 0;
  const recommendations: string[] = [];
  const rows: SecurityInfo['headers'] = [];

  for (const { key, label, points, recommendation } of SECURITY_HEADERS) {
    const value = headers[key] ?? null;
    rows.push({ key, label, value });
    if (value !== null) score += points;
    else recommendations.push(recommendation);
  }

  const https = finalUrl.startsWith('https://');
  if (!https) recommendations.unshift('Сайтът не използва HTTPS — това е критичен проблем.');

  let grade: string;
  if (!https) grade = 'F';
  else if (score >= 90) grade = 'A';
  else if (score >= 75) grade = 'B';
  else if (score >= 55) grade = 'C';
  else if (score >= 35) grade = 'D';
  else grade = 'F';

  return { https, headers: rows, grade, score, recommendations };
}

/* ------------------------------------------------------------------ */
/* robots.txt и sitemap                                                */
/* ------------------------------------------------------------------ */

export interface RobotsInfo {
  found: boolean;
  sitemaps: string[];
  rules: { userAgent: string; directives: string[] }[];
  raw: string;
}

export async function fetchRobotsTxt(origin: string): Promise<RobotsInfo> {
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) return { found: false, sitemaps: [], rules: [], raw: '' };
    const contentType = res.headers.get('content-type') ?? '';
    const text = await res.text();
    // Някои сайтове връщат 200 с HTML страница вместо истински robots.txt.
    if (contentType.includes('text/html') || /^\s*</.test(text)) {
      return { found: false, sitemaps: [], rules: [], raw: '' };
    }

    const rules: RobotsInfo['rules'] = [];
    const sitemaps: string[] = [];
    let currentAgent = '*';
    let directives: string[] = [];

    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      if (/^user-agent:/i.test(trimmed)) {
        if (directives.length > 0) {
          rules.push({ userAgent: currentAgent, directives });
          directives = [];
        }
        currentAgent = trimmed.split(':').slice(1).join(':').trim();
      } else if (/^sitemap:/i.test(trimmed)) {
        sitemaps.push(trimmed.split(':').slice(1).join(':').trim());
      } else {
        directives.push(trimmed);
      }
    }
    if (directives.length > 0) rules.push({ userAgent: currentAgent, directives });

    return { found: true, sitemaps, rules, raw: text.slice(0, 2000) };
  } catch {
    return { found: false, sitemaps: [], rules: [], raw: '' };
  }
}

export interface SitemapInfo {
  found: boolean;
  url: string | null;
  urlCount: number;
  sampleUrls: string[];
}

function extractLocs(xml: string): string[] {
  return (xml.match(/<loc>([\s\S]*?)<\/loc>/gi) ?? [])
    .map((m) => m.replace(/<\/?loc>/gi, '').trim())
    .filter(Boolean);
}

async function tryFetchSitemapText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!/<urlset[\s>]|<sitemapindex[\s>]/i.test(text)) return null;
    return text;
  } catch {
    return null;
  }
}

export async function fetchSitemap(origin: string, declared: string[]): Promise<SitemapInfo> {
  const candidates = [...declared, ...COMMON_SITEMAP_PATHS.map((p) => `${origin}${p}`)];

  for (const candidate of candidates) {
    const text = await tryFetchSitemapText(candidate);
    if (!text) continue;

    let urls: string[];
    if (/<sitemapindex[\s>]/i.test(text)) {
      const nested = extractLocs(text).slice(0, 3);
      const nestedTexts = await Promise.all(nested.map(tryFetchSitemapText));
      urls = nestedTexts.filter((t): t is string => t !== null).flatMap(extractLocs);
    } else {
      urls = extractLocs(text);
    }

    if (urls.length > 0) {
      return { found: true, url: candidate, urlCount: urls.length, sampleUrls: urls.slice(0, MAX_SITEMAP_URLS) };
    }
  }

  return { found: false, url: null, urlCount: 0, sampleUrls: [] };
}

/* ------------------------------------------------------------------ */
/* Архитектура на страницата                                           */
/* ------------------------------------------------------------------ */

export interface ArchitectureInfo {
  htmlBytes: number;
  domElements: number;
  scriptsExternal: number;
  scriptsInline: number;
  stylesheets: number;
  inlineStyles: number;
  images: number;
  modernImages: number;
  compression: string | null;
}

export function analyzeArchitecture(page: PageFetch): ArchitectureInfo {
  const html = page.html;
  const scriptsTotal = (html.match(/<script[\s>]/gi) ?? []).length;
  const scriptsExternal = (html.match(/<script[^>]+src=/gi) ?? []).length;

  return {
    htmlBytes: page.htmlBytes,
    domElements: (html.match(/<[a-z][a-z0-9-]*/gi) ?? []).length,
    scriptsExternal,
    scriptsInline: scriptsTotal - scriptsExternal,
    stylesheets: (html.match(/<link[^>]+rel=["']stylesheet["']/gi) ?? []).length,
    inlineStyles: (html.match(/<style[\s>]/gi) ?? []).length,
    images: (html.match(/<img[\s>]/gi) ?? []).length,
    modernImages: (html.match(/\.(?:webp|avif)|image\/(?:webp|avif)/gi) ?? []).length,
    compression: page.headers['content-encoding'] ?? null,
  };
}

/* ------------------------------------------------------------------ */
/* Пълен анализ                                                        */
/* ------------------------------------------------------------------ */

export interface AnalysisResult {
  url: string;
  domain: string;
  analyzedAtMs: number;
  page: {
    finalUrl: string;
    status: number;
    ok: boolean;
    responseTimeMs: number;
    contentType: string | null;
    server: string | null;
    poweredBy: string | null;
    htmlTruncated: boolean;
  };
  redirects: RedirectHop[];
  seo: SeoAudit;
  content: ContentStats;
  links: LinkStats;
  structuredData: StructuredData;
  socialProfiles: SocialProfile[];
  contacts: PageContacts;
  technologies: Technology[];
  trackers: Tracker[];
  security: SecurityInfo;
  dns: DnsInfo;
  robots: RobotsInfo;
  sitemap: SitemapInfo;
  architecture: ArchitectureInfo;
}

/** Изпълнява пълния анализ. Хвърля грешка само ако страницата не може да се изтегли. */
export async function analyzeSite(safeUrl: string): Promise<AnalysisResult> {
  const urlObj = new URL(safeUrl);
  const domain = urlObj.hostname;
  const origin = urlObj.origin;

  const [pageResult, redirectsResult, robotsResult, dnsResult] = await Promise.allSettled([
    fetchPage(safeUrl),
    followRedirects(safeUrl),
    fetchRobotsTxt(origin),
    collectDns(domain),
  ]);

  if (pageResult.status === 'rejected') {
    throw new Error('fetch-failed');
  }
  const page = pageResult.value;

  const robots =
    robotsResult.status === 'fulfilled'
      ? robotsResult.value
      : { found: false, sitemaps: [], rules: [], raw: '' };

  const sitemap = await fetchSitemap(origin, robots.sitemaps);

  return {
    url: safeUrl,
    domain,
    analyzedAtMs: Date.now(),
    page: {
      finalUrl: page.finalUrl,
      status: page.status,
      ok: page.ok,
      responseTimeMs: page.responseTimeMs,
      contentType: page.contentType,
      server: page.headers['server'] ?? null,
      poweredBy: page.headers['x-powered-by'] ?? null,
      htmlTruncated: page.htmlTruncated,
    },
    redirects: redirectsResult.status === 'fulfilled' ? redirectsResult.value : [],
    seo: auditSeo(page.html),
    content: analyzeContent(page.html),
    links: analyzeLinks(page.html, page.finalUrl),
    structuredData: extractStructuredData(page.html),
    socialProfiles: extractSocialProfiles(page.html),
    contacts: extractContacts(page.html),
    technologies: detectTechnologies(page.html, page.headers),
    trackers: detectTrackers(page.html),
    security: analyzeSecurity(page.finalUrl, page.headers),
    dns:
      dnsResult.status === 'fulfilled'
        ? dnsResult.value
        : { a: [], aaaa: [], mx: [], ns: [], txt: [], spf: null, dmarc: null },
    robots,
    sitemap,
    architecture: analyzeArchitecture(page),
  };
}
