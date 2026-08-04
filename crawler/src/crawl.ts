/**
 * Collect-фаза (т. 2): тегли и записва суровото. Нищо не измерва.
 * Етап 2 от плана работи само с началната страница на всеки домейн.
 */
import { readFileSync } from 'node:fs';
import { openDb } from './db.ts';
import { writeArtifact } from './artifacts.ts';
import { LIMITS, TOOL_VERSION, UA_VARIANTS, type UaVariant } from './config.ts';
import { rawFetch, probeText, renderPage, resolveMx, tlsInfo, rdapInfo, pageSpeed, closeBrowser } from './fetcher.ts';
import { discoverInternalLinks, classifyRole, type PageRole } from '@kova/shared-audit';
import type { DatabaseSync } from 'node:sqlite';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface TargetRow {
  domain: string | null;
  company_name: string;
  eik: string;
  nkid: string;
  sector_label: string;
  region: string;
  size_band: string;
  source: string;
}

/** Минимален CSV парсър — заглавен ред + кавички по избор. */
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim());
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h.trim()] = (cells[i] ?? '').trim()));
    return row;
  });
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function loadTargets(db: DatabaseSync, csvPath: string): TargetRow[] {
  const rows = parseCsv(readFileSync(csvPath, 'utf8'));
  const now = new Date().toISOString();
  const upsert = db.prepare(
    `INSERT INTO targets (domain, company_name, eik, nkid, sector_label, region, size_band, source, added_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(domain) DO UPDATE SET
       company_name=excluded.company_name, eik=excluded.eik, nkid=excluded.nkid,
       sector_label=excluded.sector_label, region=excluded.region,
       size_band=excluded.size_band, source=excluded.source`,
  );
  const targets: TargetRow[] = [];
  for (const r of rows) {
    const domain = normalizeDomain(r.domain ?? '');
    upsert.run(
      domain,
      r.company_name ?? '',
      r.eik ?? '',
      r.nkid ?? '',
      r.sector_label ?? '',
      r.region ?? '',
      r.size_band ?? '',
      r.source ?? 'targets.csv',
      now,
    );
    targets.push({
      domain,
      company_name: r.company_name ?? '',
      eik: r.eik ?? '',
      nkid: r.nkid ?? '',
      sector_label: r.sector_label ?? '',
      region: r.region ?? '',
      size_band: r.size_band ?? '',
      source: r.source ?? 'targets.csv',
    });
  }
  return targets;
}

function normalizeDomain(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  return trimmed.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
}

/** Записва един fetch: артефакт на диск + ред в `fetches`. Resume-безопасно. */
function recordFetch(
  db: DatabaseSync,
  runId: string,
  domain: string,
  slug: string,
  kind: string,
  ua: string,
  status: number,
  data: string,
  error: string | null,
): void {
  const path =
    error || !data ? null : writeArtifact(runId, domain, slug, kind, ua === '-' ? undefined : ua, data);
  db.prepare(
    `INSERT INTO fetches (run_id, domain, page_slug, kind, ua_variant, status_code, fetched_at, artifact_path, error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(run_id, domain, page_slug, kind, ua_variant) DO UPDATE SET
       status_code=excluded.status_code, fetched_at=excluded.fetched_at,
       artifact_path=excluded.artifact_path, error=excluded.error`,
  ).run(runId, domain, slug, kind, ua, status, new Date().toISOString(), path, error);
}

/**
 * Домейнът е приключил, ако е записан TLS редът — той е сред последните
 * per-domain стъпки. Незавършен домейн се пуска отново: home се тегли
 * наново (евтино), а вече събраните подстраници се прескачат (pageCollected).
 */
function domainDone(db: DatabaseSync, runId: string, domain: string): boolean {
  const row = db
    .prepare(`SELECT COUNT(*) AS n FROM fetches WHERE run_id=? AND domain=? AND kind='tls'`)
    .get(runId, domain) as { n: number };
  return row.n > 0;
}

function pageCollected(db: DatabaseSync, runId: string, domain: string, slug: string): boolean {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM fetches
       WHERE run_id=? AND domain=? AND page_slug=? AND kind='raw_html' AND error IS NULL`,
    )
    .get(runId, domain, slug) as { n: number };
  return row.n > 0;
}

/** Пътят → slug: '/' → home, '/за-нас/' → za-nas. */
function slugOf(pathname: string): string {
  const p = pathname.replace(/^\/+|\/+$/g, '');
  if (!p) return 'home';
  return p.replace(/[^a-z0-9]+/gi, '-').slice(0, 60).toLowerCase() || 'home';
}

function extractLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1].trim());
}

/**
 * Кои страници да се обходят освен началната (т. 3): навигационни връзки
 * (по-надеждни) + връзки от sitemap, класифицирани по роля. По една на роля
 * (контакти/за нас/услуги/цени/кариери) + до няколко „други", таван 10 общо.
 */
function selectPages(
  base: string,
  homeHtml: string,
  sitemapXml: string,
): { url: string; slug: string; role: PageRole; via: string }[] {
  const wanted: PageRole[] = ['contact', 'about', 'services', 'pricing', 'careers'];
  const chosen = new Map<string, { url: string; slug: string; role: PageRole; via: string }>();

  const navLinks = discoverInternalLinks(homeHtml, base);
  const sitemapLinks = extractLocs(sitemapXml)
    .map((loc) => {
      try {
        const u = new URL(loc);
        return { url: u.href, role: classifyRole(u.pathname, ''), text: '' };
      } catch {
        return null;
      }
    })
    .filter((x): x is { url: string; role: PageRole; text: string } => Boolean(x));

  const add = (url: string, role: PageRole, via: string) => {
    let path = '/';
    try {
      path = new URL(url).pathname;
    } catch {
      return;
    }
    const slug = slugOf(path);
    if (slug === 'home' || chosen.has(slug) || chosen.size >= LIMITS.maxPagesPerDomain - 1) return;
    chosen.set(slug, { url, slug, role, via });
  };

  // По една страница на желана роля — навигацията има приоритет пред sitemap.
  for (const role of wanted) {
    const nav = navLinks.find((l) => l.role === role);
    if (nav) add(nav.url, role, 'nav');
    else {
      const sm = sitemapLinks.find((l) => l.role === role);
      if (sm) add(sm.url, role, 'sitemap');
    }
  }
  // До няколко „други" от навигацията, за да стигнем разумен обем.
  for (const l of navLinks) if (l.role === 'other') add(l.url, 'other', 'nav');

  return [...chosen.values()];
}

async function crawlDomain(db: DatabaseSync, runId: string, domain: string): Promise<void> {
  const base = `https://${domain}/`;
  const slug = 'home';

  db.prepare(
    `INSERT INTO pages (run_id, domain, page_slug, url, page_role, discovered_via, status_code)
     VALUES (?, ?, 'home', ?, 'home', 'pattern', NULL)
     ON CONFLICT(run_id, domain, page_slug) DO NOTHING`,
  ).run(runId, domain, base);

  // Начална страница с трите UA варианта.
  let homeStatus = 0;
  let homeHtml = '';
  let browserHeaders: Record<string, string> = {};
  for (const ua of Object.keys(UA_VARIANTS) as UaVariant[]) {
    const res = await rawFetch(base, ua);
    if (ua === 'browser') {
      homeStatus = res.status;
      homeHtml = res.body;
      browserHeaders = res.headers;
    }
    recordFetch(db, runId, domain, slug, 'raw_html', ua, res.status, res.body, res.error);
    await sleep(LIMITS.perHostDelayMs);
  }
  recordFetch(db, runId, domain, slug, 'headers', '-', homeStatus, JSON.stringify(browserHeaders, null, 2), null);
  db.prepare(`UPDATE pages SET status_code=? WHERE run_id=? AND domain=? AND page_slug='home'`).run(
    homeStatus,
    runId,
    domain,
  );

  // Рендиране в браузър (само началната — за renders_without_js).
  const rendered = await renderPage(base);
  recordFetch(db, runId, domain, slug, 'rendered_html', '-', rendered.status, rendered.html, rendered.error);
  await sleep(LIMITS.perHostDelayMs);

  // Веднъж на домейн: robots / llms / sitemap.
  let sitemapXml = '';
  for (const [kind, path] of [
    ['robots_txt', 'robots.txt'],
    ['llms_txt', 'llms.txt'],
    ['sitemap', 'sitemap.xml'],
  ] as const) {
    const res = await probeText(`https://${domain}/${path}`);
    const isText = res.status === 200 && !/^\s*<!doctype html|<html/i.test(res.body);
    if (kind === 'sitemap' && isText) sitemapXml = res.body;
    recordFetch(db, runId, domain, slug, kind, '-', res.status, isText ? res.body : '', isText ? null : res.error ?? 'not-found');
    await sleep(LIMITS.perHostDelayMs);
  }

  // Многостранично обхождане: контакти / за нас / услуги / цени / кариери (+ др.).
  const pages = selectPages(base, homeHtml, sitemapXml);
  for (const p of pages) {
    if (pageCollected(db, runId, domain, p.slug)) continue;
    db.prepare(
      `INSERT INTO pages (run_id, domain, page_slug, url, page_role, discovered_via, status_code)
       VALUES (?, ?, ?, ?, ?, ?, NULL)
       ON CONFLICT(run_id, domain, page_slug) DO UPDATE SET
         url=excluded.url, page_role=excluded.page_role, discovered_via=excluded.discovered_via`,
    ).run(runId, domain, p.slug, p.url, p.role, p.via);
    const res = await rawFetch(p.url, 'browser');
    recordFetch(db, runId, domain, p.slug, 'raw_html', 'browser', res.status, res.body, res.error);
    db.prepare(`UPDATE pages SET status_code=? WHERE run_id=? AND domain=? AND page_slug=?`).run(
      res.status,
      runId,
      domain,
      p.slug,
    );
    await sleep(LIMITS.perHostDelayMs);
  }

  // Веднъж на домейн, не са HTTP към хоста: DNS (MX), TLS, RDAP, PageSpeed.
  const mx = await resolveMx(domain);
  recordFetch(db, runId, domain, slug, 'dns', '-', mx.length ? 200 : 0, JSON.stringify({ mx }), null);
  const tls = await tlsInfo(domain);
  recordFetch(db, runId, domain, slug, 'tls', '-', tls.error ? 0 : 200, JSON.stringify(tls), tls.error);
  const rdap = await rdapInfo(domain);
  recordFetch(db, runId, domain, slug, 'rdap', '-', rdap.registered ? 200 : 0, JSON.stringify(rdap), null);
  const psi = await pageSpeed(base);
  if (psi) recordFetch(db, runId, domain, slug, 'psi', '-', 200, JSON.stringify(psi), null);
}

/** Прост пул: N домейна едновременно. */
async function pool<T>(items: T[], size: number, worker: (item: T) => Promise<void>): Promise<void> {
  let idx = 0;
  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (idx < items.length) {
      const item = items[idx++];
      await worker(item);
    }
  });
  await Promise.all(runners);
}

export interface CrawlOptions {
  targetsPath: string;
  runId: string;
  notes?: string;
}

export async function crawl(opts: CrawlOptions): Promise<void> {
  const db = openDb();
  db.prepare(
    `INSERT INTO runs (run_id, started_at, finished_at, tool_version, notes)
     VALUES (?, ?, NULL, ?, ?)
     ON CONFLICT(run_id) DO UPDATE SET started_at=excluded.started_at, tool_version=excluded.tool_version`,
  ).run(opts.runId, new Date().toISOString(), TOOL_VERSION, opts.notes ?? null);

  const targets = loadTargets(db, opts.targetsPath);
  const domains = targets.map((t) => t.domain).filter((d): d is string => Boolean(d));
  const withoutSite = targets.length - domains.length;

  console.log(`[crawl] run=${opts.runId} targets=${targets.length} с домейн=${domains.length} без сайт=${withoutSite}`);

  let done = 0;
  await pool(domains, LIMITS.domainConcurrency, async (domain) => {
    if (domainDone(db, opts.runId, domain)) {
      console.log(`[skip] ${domain} (вече събран в този run)`);
      done++;
      return;
    }
    try {
      await crawlDomain(db, opts.runId, domain);
      console.log(`[ok]   ${domain} (${++done}/${domains.length})`);
    } catch (err) {
      console.error(`[fail] ${domain}: ${(err as Error).message}`);
      recordFetch(db, opts.runId, domain, 'home', 'error', '-', 0, '', String((err as Error).message));
      done++;
    }
  });

  await closeBrowser();
  db.prepare(`UPDATE runs SET finished_at=? WHERE run_id=?`).run(new Date().toISOString(), opts.runId);
  db.close();
  console.log(`[crawl] готово: ${done} домейна.`);
}
