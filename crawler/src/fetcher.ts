/**
 * Мрежов слой на collect-фазата. Само тегли и връща суровото — нищо не
 * измерва. Всеки провал се връща като стойност (error), не хвърля.
 */
import tls from 'node:tls';
import { LIMITS, CHROMIUM_PATH, type UaVariant, UA_VARIANTS } from './config.ts';

export interface RawResult {
  status: number;
  headers: Record<string, string>;
  body: string;
  error: string | null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Обикновен GET с даден UA, таймаут и един повторен опит при 5xx/таймаут. */
export async function rawFetch(url: string, ua: UaVariant): Promise<RawResult> {
  for (let attempt = 0; attempt <= LIMITS.retries; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(LIMITS.artifactTimeoutMs),
        headers: {
          'User-Agent': UA_VARIANTS[ua],
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'bg,en;q=0.8',
        },
      });
      const body = (await res.text()).slice(0, LIMITS.maxHtmlBytes);
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => (headers[k.toLowerCase()] = v));
      if (res.status >= 500 && attempt < LIMITS.retries) {
        await sleep(LIMITS.perHostDelayMs);
        continue;
      }
      return { status: res.status, headers, body, error: null };
    } catch (err) {
      if (attempt < LIMITS.retries) {
        await sleep(LIMITS.perHostDelayMs);
        continue;
      }
      return { status: 0, headers: {}, body: '', error: String((err as Error).message ?? err) };
    }
  }
  return { status: 0, headers: {}, body: '', error: 'unreachable' };
}

/** Прост текстов GET за robots.txt / llms.txt / sitemap.xml. */
export async function probeText(url: string): Promise<RawResult> {
  return rawFetch(url, 'research');
}

/* ------------------------------------------------------------------ */
/* Рендиране в браузър (един процес, преизползван)                     */
/* ------------------------------------------------------------------ */

let browserPromise: Promise<import('playwright-core').Browser> | null = null;

async function getBrowser(): Promise<import('playwright-core').Browser> {
  if (!browserPromise) {
    browserPromise = (async () => {
      const { chromium } = await import('playwright-core');
      return chromium.launch({
        headless: true,
        ...(CHROMIUM_PATH ? { executablePath: CHROMIUM_PATH } : {}),
      });
    })();
  }
  return browserPromise;
}

export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    const b = await browserPromise;
    await b.close();
    browserPromise = null;
  }
}

export interface RenderResult {
  status: number;
  html: string;
  error: string | null;
}

/** Рендира страницата с браузърния UA след networkidle. */
export async function renderPage(url: string): Promise<RenderResult> {
  let context: import('playwright-core').BrowserContext | null = null;
  try {
    const browser = await getBrowser();
    context = await browser.newContext({ userAgent: UA_VARIANTS.browser });
    const page = await context.newPage();
    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: LIMITS.renderTimeoutMs,
    });
    const html = (await page.content()).slice(0, LIMITS.maxHtmlBytes);
    return { status: response?.status() ?? 0, html, error: null };
  } catch (err) {
    return { status: 0, html: '', error: String((err as Error).message ?? err) };
  } finally {
    if (context) await context.close().catch(() => {});
  }
}

/* ------------------------------------------------------------------ */
/* DNS (MX) и TLS                                                      */
/* ------------------------------------------------------------------ */

/** MX записите през DNS-over-HTTPS — казват къде е пощата на фирмата. */
export async function resolveMx(domain: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`,
      { headers: { Accept: 'application/dns-json' }, signal: AbortSignal.timeout(LIMITS.artifactTimeoutMs) },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { Answer?: { data: string }[] };
    return (data.Answer ?? []).map((a) => a.data.replace(/^\d+\s+/, '').replace(/\.$/, ''));
  } catch {
    return [];
  }
}

export interface TlsInfo {
  valid: boolean;
  expiresDays: number | null;
  issuer: string | null;
  error: string | null;
}

/** Сертификатът на 443 — валиден ли е и кога изтича. */
export function tlsInfo(domain: string): Promise<TlsInfo> {
  return new Promise((resolvePromise) => {
    const socket = tls.connect(
      { host: domain, port: 443, servername: domain, timeout: LIMITS.artifactTimeoutMs },
      () => {
        const cert = socket.getPeerCertificate();
        const authorized = socket.authorized;
        let expiresDays: number | null = null;
        if (cert && cert.valid_to) {
          expiresDays = Math.round((Date.parse(cert.valid_to) - Date.now()) / 86_400_000);
        }
        const issuer = cert && cert.issuer ? cert.issuer.O ?? cert.issuer.CN ?? null : null;
        socket.end();
        resolvePromise({ valid: authorized, expiresDays, issuer, error: null });
      },
    );
    socket.on('error', (err) => resolvePromise({ valid: false, expiresDays: null, issuer: null, error: String(err.message) }));
    socket.on('timeout', () => {
      socket.destroy();
      resolvePromise({ valid: false, expiresDays: null, issuer: null, error: 'timeout' });
    });
  });
}

/** WHOIS-заместител: RDAP регистрацията на домейна (за възрастта му). */
export async function rdapInfo(domain: string): Promise<{ registered: string | null; country: string | null }> {
  try {
    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      headers: { Accept: 'application/rdap+json' },
      signal: AbortSignal.timeout(LIMITS.artifactTimeoutMs),
      redirect: 'follow',
    });
    if (!res.ok) return { registered: null, country: null };
    const data = (await res.json()) as {
      events?: { eventAction: string; eventDate: string }[];
      entities?: { vcardArray?: unknown }[];
    };
    const reg = data.events?.find((e) => e.eventAction === 'registration')?.eventDate ?? null;
    return { registered: reg, country: null };
  } catch {
    return { registered: null, country: null };
  }
}

/** PageSpeed Insights (mobile). Изисква PAGESPEED_API_KEY; иначе връща null. */
export async function pageSpeed(url: string): Promise<unknown | null> {
  const key = process.env.PAGESPEED_API_KEY;
  if (!key) return null;
  try {
    const api = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
    api.searchParams.set('url', url);
    api.searchParams.set('strategy', 'mobile');
    api.searchParams.set('category', 'performance');
    api.searchParams.set('key', key);
    const res = await fetch(api.href, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
