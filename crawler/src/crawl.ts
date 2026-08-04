/**
 * Collect-фаза (т. 2): тегли и записва суровото. Нищо не измерва.
 * Етап 2 от плана работи само с началната страница на всеки домейн.
 */
import { readFileSync } from 'node:fs';
import { openDb } from './db.ts';
import { writeArtifact } from './artifacts.ts';
import { LIMITS, TOOL_VERSION, UA_VARIANTS, type UaVariant } from './config.ts';
import { rawFetch, probeText, renderPage, resolveMx, tlsInfo, closeBrowser } from './fetcher.ts';
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

function alreadyDone(db: DatabaseSync, runId: string, domain: string): boolean {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM fetches
       WHERE run_id=? AND domain=? AND page_slug='home' AND error IS NULL`,
    )
    .get(runId, domain) as { n: number };
  // home прави 3 raw + 1 rendered + headers + robots + llms + sitemap + dns + tls = 9 успешни.
  return row.n >= 9;
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
  let browserHeaders: Record<string, string> = {};
  for (const ua of Object.keys(UA_VARIANTS) as UaVariant[]) {
    const res = await rawFetch(base, ua);
    if (ua === 'browser') {
      homeStatus = res.status;
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

  // Рендиране в браузър.
  const rendered = await renderPage(base);
  recordFetch(db, runId, domain, slug, 'rendered_html', '-', rendered.status, rendered.html, rendered.error);
  await sleep(LIMITS.perHostDelayMs);

  // Веднъж на домейн: robots / llms / sitemap.
  for (const [kind, path] of [
    ['robots_txt', 'robots.txt'],
    ['llms_txt', 'llms.txt'],
    ['sitemap', 'sitemap.xml'],
  ] as const) {
    const res = await probeText(`https://${domain}/${path}`);
    const isText = res.status === 200 && !/^\s*<!doctype html|<html/i.test(res.body);
    recordFetch(db, runId, domain, slug, kind, '-', res.status, isText ? res.body : '', isText ? null : res.error ?? 'not-found');
    await sleep(LIMITS.perHostDelayMs);
  }

  // DNS (MX) и TLS — не са HTTP към хоста, без забавяне.
  const mx = await resolveMx(domain);
  recordFetch(db, runId, domain, slug, 'dns', '-', mx.length ? 200 : 0, JSON.stringify({ mx }), null);
  const tls = await tlsInfo(domain);
  recordFetch(db, runId, domain, slug, 'tls', '-', tls.error ? 0 : 200, JSON.stringify(tls), tls.error);
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
    if (alreadyDone(db, opts.runId, domain)) {
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
