/**
 * Derive-фаза (т. 2): чисти функции над записаните артефакти. Нула мрежа.
 * Затова нова метрика през ноември се смята върху артефактите от август.
 *
 * Статусите следват т. 8 и НЕ се сливат в булево:
 *   - `check(bool)`     → passed|failed   (проверка за качество)
 *   - `measured(value)` → passed          (описателна метрика, стойността е в value_*)
 *   - not_measurable    → липсва нужният артефакт
 *   - not_applicable    → метриката няма смисъл за този сайт
 *   - error             → артефактът е грешка от collect
 */
import { openDb } from './db.ts';
import { readArtifact } from './artifacts.ts';
import type { DatabaseSync } from 'node:sqlite';
import {
  deriveSeo,
  deriveRobotsAi,
  deriveSchema,
  deriveContactSignals,
  deriveDocumentSignals,
  deriveRenderability,
  contentDiffersByUa,
  deriveMxProvider,
  detectStack,
  deriveCareers,
  deriveCommerce,
  deriveLanguages,
  deriveTeamHeadcount,
  deriveFreshness,
  derivePerformance,
  deriveA11y,
} from '@kova/shared-audit';

type Status = 'passed' | 'failed' | 'not_applicable' | 'not_measurable' | 'error';

interface MetricRow {
  key: string;
  status: Status;
  num?: number;
  bool?: boolean;
  text?: string;
  evidence?: string;
}

const check = (key: string, ok: boolean, evidence?: string): MetricRow => ({
  key,
  status: ok ? 'passed' : 'failed',
  bool: ok,
  evidence,
});
const measuredNum = (key: string, n: number, evidence?: string): MetricRow => ({
  key,
  status: 'passed',
  num: n,
  evidence,
});
const measuredText = (key: string, t: string, evidence?: string): MetricRow => ({
  key,
  status: 'passed',
  text: t,
  evidence,
});
const measuredBool = (key: string, b: boolean, evidence?: string): MetricRow => ({
  key,
  status: 'passed',
  bool: b,
  evidence,
});

/** Артефактите за един домейн в един run, по (kind, ua_variant). */
function loadArtifacts(db: DatabaseSync, runId: string, domain: string): Map<string, string> {
  const rows = db
    .prepare(
      `SELECT kind, ua_variant, artifact_path, error FROM fetches
       WHERE run_id=? AND domain=? AND page_slug='home'`,
    )
    .all(runId, domain) as { kind: string; ua_variant: string; artifact_path: string | null; error: string | null }[];
  const map = new Map<string, string>();
  for (const r of rows) {
    if (!r.artifact_path || r.error) continue;
    try {
      map.set(`${r.kind}:${r.ua_variant}`, readArtifact(r.artifact_path));
    } catch {
      /* липсващ файл — третира се като not_measurable по-долу */
    }
  }
  return map;
}

interface LoadedPage {
  role: string;
  slug: string;
  html: string;
}

/** Подстраниците (не home) с успешно свален raw_html (браузърен UA). */
function loadPages(db: DatabaseSync, runId: string, domain: string): LoadedPage[] {
  const rows = db
    .prepare(
      `SELECT p.page_role AS role, p.page_slug AS slug, f.artifact_path AS path
       FROM pages p JOIN fetches f
         ON f.run_id=p.run_id AND f.domain=p.domain AND f.page_slug=p.page_slug
       WHERE p.run_id=? AND p.domain=? AND p.page_slug!='home'
         AND f.kind='raw_html' AND f.ua_variant='browser' AND f.error IS NULL AND f.artifact_path IS NOT NULL`,
    )
    .all(runId, domain) as { role: string; slug: string; path: string }[];
  const out: LoadedPage[] = [];
  for (const r of rows) {
    try {
      out.push({ role: r.role, slug: r.slug, html: readArtifact(r.path) });
    } catch {
      /* липсващ файл */
    }
  }
  return out;
}

function deriveDomain(db: DatabaseSync, runId: string, domain: string): MetricRow[] {
  const art = loadArtifacts(db, runId, domain);
  const url = `https://${domain}/`;
  const rawBrowser = art.get('raw_html:browser');
  const rawResearch = art.get('raw_html:research');
  const rawAi = art.get('raw_html:aicrawler');
  const rendered = art.get('rendered_html:-');
  const out: MetricRow[] = [];

  // --- Технически SEO ---
  if (rawBrowser) {
    const seo = deriveSeo(rawBrowser, url);
    out.push(check('title_present', seo.title_present, url));
    out.push(measuredNum('title_length', seo.title_length));
    out.push(check('meta_desc_present', seo.meta_desc_present, url));
    out.push(measuredNum('meta_desc_length', seo.meta_desc_length));
    out.push(measuredNum('h1_count', seo.h1_count));
    out.push(check('canonical_present', seo.canonical_present, url));
    out.push(check('canonical_self', seo.canonical_self));
    out.push(check('viewport_meta', seo.viewport_meta));
    out.push(check('html_lang_present', seo.html_lang_present));

    const schema = deriveSchema(rawBrowser);
    out.push(measuredText('schema_types', schema.schema_types.join(',')));
    out.push(measuredBool('schema_valid', schema.schema_valid));
    out.push(measuredBool('has_localbusiness_schema', schema.has_localbusiness_schema));

    // --- Стек, възраст, език, достъпност (от началната) ---
    let headers: Record<string, string> = {};
    try {
      headers = JSON.parse(art.get('headers:-') ?? '{}');
    } catch {
      /* без headers */
    }
    const stack = detectStack(rawBrowser, headers);
    out.push(measuredText('cms', stack.cms, url));
    out.push(measuredText('framework', stack.framework));
    out.push(measuredBool('is_spa', stack.is_spa, url));

    const langs = deriveLanguages(rawBrowser);
    out.push(measuredText('languages', langs.languages.join(',')));
    out.push(measuredBool('has_english_version', langs.has_english_version));

    const commerce = deriveCommerce(rawBrowser);
    out.push(measuredText('ecommerce_platform', commerce.ecommerce_platform, url));
    out.push(measuredBool('has_online_payment', commerce.has_online_payment));
    out.push(measuredText('courier_integration', commerce.courier_integration));
    out.push(measuredNum('product_count_estimate', commerce.product_count_estimate));

    const a11y = deriveA11y(rawBrowser);
    out.push(
      a11y.img_alt_coverage === null
        ? { key: 'img_alt_coverage', status: 'not_applicable' }
        : measuredNum('img_alt_coverage', a11y.img_alt_coverage, url),
    );
    out.push(
      a11y.form_label_coverage === null
        ? { key: 'form_label_coverage', status: 'not_applicable' }
        : measuredNum('form_label_coverage', a11y.form_label_coverage, url),
    );
  } else {
    out.push({ key: 'title_present', status: 'not_measurable' });
  }

  // --- Оперативни сигнали по страници (контакти / документи / кариери / екип) ---
  const pages = loadPages(db, runId, domain);
  const pageOf = (role: string): LoadedPage | undefined => pages.find((p) => p.role === role);
  const allHtml = [rawBrowser, ...pages.map((p) => p.html)].filter((h): h is string => Boolean(h));

  const contactHtml = pageOf('contact')?.html ?? rawBrowser;
  if (contactHtml) {
    const evidence = pageOf('contact') ? `${url}${pageOf('contact')!.slug}/` : url;
    const contact = deriveContactSignals(contactHtml);
    out.push(measuredBool('has_contact_form', contact.has_contact_form, evidence));
    out.push(
      contact.has_contact_form
        ? measuredNum('contact_form_field_count', contact.contact_form_field_count, evidence)
        : { key: 'contact_form_field_count', status: 'not_applicable' },
    );
    out.push(measuredBool('contact_only_email', contact.contact_only_email, evidence));
    out.push(measuredBool('order_by_email_text', contact.order_by_email_text, evidence));
    out.push(measuredBool('facebook_as_primary_contact', contact.facebook_as_primary_contact, evidence));
    out.push(measuredBool('has_live_chat', contact.has_live_chat, evidence));
  }

  // Документи — сумирано през всички събрани страници.
  if (allHtml.length) {
    let formCount = 0;
    const types = new Set<string>();
    let priceListPdf = false;
    let catalogPdf = false;
    for (const h of allHtml) {
      const d = deriveDocumentSignals(h, url);
      formCount += d.downloadable_form_count;
      d.downloadable_form_types.forEach((t) => types.add(t));
      priceListPdf = priceListPdf || d.price_list_is_pdf;
      catalogPdf = catalogPdf || d.catalog_is_pdf;
    }
    out.push(measuredNum('downloadable_form_count', formCount, url));
    out.push(measuredText('downloadable_form_types', [...types].join(',')));
    out.push(measuredBool('price_list_is_pdf', priceListPdf));
    out.push(measuredBool('catalog_is_pdf', catalogPdf));
  }

  // Кариери — най-острият сигнал (hiring_admin_roles).
  const careers = pageOf('careers');
  if (careers) {
    const c = deriveCareers(careers.html);
    out.push(measuredBool('has_job_listings', c.has_job_listings, `${url}${careers.slug}/`));
    out.push(measuredBool('hiring_admin_roles', c.hiring_admin_roles, `${url}${careers.slug}/`));
  } else {
    out.push(measuredBool('has_job_listings', false, url));
    out.push({ key: 'hiring_admin_roles', status: 'not_applicable' });
  }

  // Екип — брой хора на страница „за нас/екип".
  const about = pageOf('about');
  out.push(
    about
      ? measuredNum('team_page_headcount', deriveTeamHeadcount(about.html), `${url}${about.slug}/`)
      : { key: 'team_page_headcount', status: 'not_applicable' },
  );

  // --- AI четимост: JS зависимост и cloaking ---
  if (rawBrowser && rendered) {
    const r = deriveRenderability(rawBrowser, rendered);
    out.push(check('renders_without_js', r.renders_without_js, url));
    out.push(measuredNum('text_ratio_raw_rendered', r.text_ratio_raw_rendered, url));
  } else {
    out.push({ key: 'renders_without_js', status: 'not_measurable' });
  }
  if (rawResearch && rawAi) {
    out.push(measuredBool('content_differs_by_ua', contentDiffersByUa(rawResearch, rawAi), url));
  } else {
    out.push({ key: 'content_differs_by_ua', status: 'not_measurable' });
  }

  // --- robots.txt за AI ботове ---
  const robots = art.get('robots_txt:-') ?? '';
  const robotsAi = deriveRobotsAi(robots);
  for (const [key, allowed] of Object.entries(robotsAi)) out.push(check(key, allowed, `${url}robots.txt`));
  out.push(measuredBool('has_llms_txt', art.has('llms_txt:-'), `${url}llms.txt`));

  // --- Поща и TLS ---
  const dnsRaw = art.get('dns:-');
  if (dnsRaw) {
    const mx = (JSON.parse(dnsRaw).mx ?? []) as string[];
    out.push(measuredText('mx_provider', deriveMxProvider(mx)));
  } else out.push({ key: 'mx_provider', status: 'not_measurable' });

  const tlsRaw = art.get('tls:-');
  if (tlsRaw) {
    const tls = JSON.parse(tlsRaw) as { valid: boolean; expiresDays: number | null };
    out.push(check('tls_valid', tls.valid));
    if (tls.expiresDays !== null) out.push(measuredNum('tls_expires_days', tls.expiresDays));
  } else out.push({ key: 'tls_valid', status: 'not_measurable' });

  // --- Възраст на домейна (RDAP) ---
  const rdapRaw = art.get('rdap:-');
  const registered = rdapRaw ? (JSON.parse(rdapRaw).registered as string | null) : null;
  if (registered) {
    const years = Math.round(((Date.now() - Date.parse(registered)) / (365.25 * 86_400_000)) * 10) / 10;
    out.push(measuredNum('domain_age_years', years, 'rdap.org'));
  } else out.push({ key: 'domain_age_years', status: 'not_measurable' });

  // --- Свежест на съдържанието (sitemap lastmod) ---
  const sitemap = art.get('sitemap:-');
  if (sitemap) {
    const fresh = deriveFreshness(sitemap, Date.now());
    if (fresh.last_content_update) {
      out.push(measuredText('last_content_update', fresh.last_content_update, `${url}sitemap.xml`));
      out.push(measuredNum('content_stale_months', fresh.content_stale_months ?? 0));
    } else {
      out.push({ key: 'last_content_update', status: 'not_measurable' });
    }
  } else out.push({ key: 'last_content_update', status: 'not_measurable' });

  // --- Производителност (PageSpeed Insights, ако е събран) ---
  const psiRaw = art.get('psi:-');
  if (psiRaw) {
    const perf = derivePerformance(JSON.parse(psiRaw));
    if (perf.psi_performance_score !== null) out.push(measuredNum('psi_performance_score', perf.psi_performance_score, url));
    if (perf.lcp_ms !== null) out.push(measuredNum('lcp_ms', perf.lcp_ms));
    if (perf.cls !== null) out.push(measuredNum('cls', perf.cls));
    if (perf.inp_ms !== null) out.push(measuredNum('inp_ms', perf.inp_ms));
    out.push(measuredBool('crux_data_available', perf.crux_data_available));
  } else {
    out.push({ key: 'psi_performance_score', status: 'not_measurable' });
  }

  return out;
}

export function derive(runId: string): void {
  const db = openDb();
  const domains = db
    .prepare(`SELECT DISTINCT domain FROM fetches WHERE run_id=? AND domain IS NOT NULL`)
    .all(runId) as { domain: string }[];

  const upsert = db.prepare(
    `INSERT INTO metrics (run_id, domain, metric_key, status, value_num, value_bool, value_text, evidence)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(run_id, domain, metric_key) DO UPDATE SET
       status=excluded.status, value_num=excluded.value_num, value_bool=excluded.value_bool,
       value_text=excluded.value_text, evidence=excluded.evidence`,
  );

  let count = 0;
  for (const { domain } of domains) {
    const metrics = deriveDomain(db, runId, domain);
    for (const m of metrics) {
      upsert.run(
        runId,
        domain,
        m.key,
        m.status,
        m.num ?? null,
        m.bool === undefined ? null : m.bool ? 1 : 0,
        m.text ?? null,
        m.evidence ?? null,
      );
    }
    count += metrics.length;
    console.log(`[derive] ${domain}: ${metrics.length} метрики`);
  }
  db.close();
  console.log(`[derive] готово: ${count} стойности за ${domains.length} домейна.`);
}
