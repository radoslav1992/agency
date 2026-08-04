/**
 * Derive-фаза (т. 2): чисти функции над записаните артефакти. Нула мрежа.
 * Затова нова метрика през ноември се смята върху артефактите от август.
 *
 * ДВЕ РАЗЛИЧНИ НЕЩА, В ДВЕ РАЗЛИЧНИ ПОЛЕТА:
 *
 *   status  — успя ли измерването:  ok | not_applicable | not_measurable | error
 *   verdict — как се представя сайтът: pass | fail | neutral
 *
 * Описателните метрики (cms, languages, schema_types) и оперативните сигнали
 * (форми, документи, кариери) са `neutral` — те нямат добра и лоша стойност.
 * Слети в едно поле, всяка измерена стойност излизаше „passed" и процентът
 * провали ставаше неизчислим, а точно той е изходът на доклада.
 *
 * Всяка метрика с присъда носи и `evidence` — адресът, от който е изведена.
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
  deriveWeight,
  botAllowed,
} from '@kova/shared-audit';

type Status = 'ok' | 'not_applicable' | 'not_measurable' | 'error';
type Verdict = 'pass' | 'fail' | 'neutral';

interface MetricRow {
  key: string;
  status: Status;
  verdict: Verdict;
  num?: number;
  bool?: boolean;
  text?: string;
  evidence?: string;
}

type Value = { num?: number; bool?: boolean; text?: string };

/** Измерено и оценено: стойността има добра и лоша страна. */
const judged = (key: string, value: Value, good: boolean, evidence: string): MetricRow => ({
  key,
  status: 'ok',
  verdict: good ? 'pass' : 'fail',
  ...value,
  evidence,
});

/** Измерено, но без оценка — описателна стойност или оперативен сигнал. */
const fact = (key: string, value: Value, evidence: string): MetricRow => ({
  key,
  status: 'ok',
  verdict: 'neutral',
  ...value,
  evidence,
});

const notApplicable = (key: string): MetricRow => ({ key, status: 'not_applicable', verdict: 'neutral' });
const notMeasurable = (key: string): MetricRow => ({ key, status: 'not_measurable', verdict: 'neutral' });

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

export function deriveDomain(db: DatabaseSync, runId: string, domain: string): MetricRow[] {
  const art = loadArtifacts(db, runId, domain);
  const url = `https://${domain}/`;
  const rawBrowser = art.get('raw_html:browser');
  const rawResearch = art.get('raw_html:research');
  const rawAi = art.get('raw_html:aicrawler');
  const rendered = art.get('rendered_html:-');
  const out: MetricRow[] = [];

  if (rawBrowser) {
    /* ---------- Технически SEO (оценими) ---------- */
    const seo = deriveSeo(rawBrowser, url);
    out.push(judged('title_present', { bool: seo.title_present }, seo.title_present, url));
    out.push(judged('title_length', { num: seo.title_length }, seo.title_length >= 10 && seo.title_length <= 70, url));
    out.push(judged('meta_desc_present', { bool: seo.meta_desc_present }, seo.meta_desc_present, url));
    out.push(
      judged('meta_desc_length', { num: seo.meta_desc_length }, seo.meta_desc_length >= 50 && seo.meta_desc_length <= 160, url),
    );
    out.push(judged('h1_count', { num: seo.h1_count }, seo.h1_count === 1, url));
    out.push(judged('canonical_present', { bool: seo.canonical_present }, seo.canonical_present, url));
    out.push(
      seo.canonical_present
        ? judged('canonical_self', { bool: seo.canonical_self }, seo.canonical_self, url)
        : notApplicable('canonical_self'),
    );
    out.push(judged('viewport_meta', { bool: seo.viewport_meta }, seo.viewport_meta, url));
    out.push(judged('html_lang_present', { bool: seo.html_lang_present }, seo.html_lang_present, url));

    /* ---------- Структурирани данни ---------- */
    const schema = deriveSchema(rawBrowser);
    out.push(fact('schema_types', { text: schema.schema_types.join(',') }, url));
    out.push(
      schema.schema_types.length
        ? judged('schema_valid', { bool: schema.schema_valid }, schema.schema_valid, url)
        : notApplicable('schema_valid'),
    );
    out.push(fact('has_localbusiness_schema', { bool: schema.has_localbusiness_schema }, url));

    /* ---------- Стек, език, търговия (описателни) ---------- */
    let headers: Record<string, string> = {};
    try {
      headers = JSON.parse(art.get('headers:-') ?? '{}');
    } catch {
      /* без headers */
    }
    const stack = detectStack(rawBrowser, headers);
    out.push(fact('cms', { text: stack.cms }, url));
    out.push(fact('framework', { text: stack.framework }, url));
    out.push(fact('is_spa', { bool: stack.is_spa }, url));

    const langs = deriveLanguages(rawBrowser);
    out.push(fact('languages', { text: langs.languages.join(',') }, url));
    out.push(fact('has_english_version', { bool: langs.has_english_version }, url));

    const commerce = deriveCommerce(rawBrowser);
    out.push(fact('ecommerce_platform', { text: commerce.ecommerce_platform }, url));
    out.push(fact('has_online_payment', { bool: commerce.has_online_payment }, url));
    out.push(fact('courier_integration', { text: commerce.courier_integration }, url));
    out.push(fact('product_count_estimate', { num: commerce.product_count_estimate }, url));

    /* ---------- Достъпност (оценима) ---------- */
    const a11y = deriveA11y(rawBrowser);
    out.push(
      a11y.img_alt_coverage === null
        ? notApplicable('img_alt_coverage')
        : judged('img_alt_coverage', { num: a11y.img_alt_coverage }, a11y.img_alt_coverage >= 0.9, url),
    );
    out.push(
      a11y.form_label_coverage === null
        ? notApplicable('form_label_coverage')
        : judged('form_label_coverage', { num: a11y.form_label_coverage }, a11y.form_label_coverage >= 0.9, url),
    );

    /* ---------- Тегло (без PageSpeed ключ) ---------- */
    const weight = deriveWeight(rawBrowser);
    out.push(judged('page_weight_kb', { num: weight.page_weight_kb }, weight.page_weight_kb <= 2000, url));
    out.push(fact('request_count', { num: weight.request_count }, url));
  } else {
    for (const key of ['title_present', 'schema_types', 'cms', 'page_weight_kb']) out.push(notMeasurable(key));
  }

  /* ---------- Четимост за машини (оценима) ---------- */
  if (rawBrowser && rendered) {
    const r = deriveRenderability(rawBrowser, rendered);
    out.push(judged('renders_without_js', { bool: r.renders_without_js }, r.renders_without_js, url));
    out.push(judged('text_ratio_raw_rendered', { num: r.text_ratio_raw_rendered }, r.text_ratio_raw_rendered >= 0.6, url));
  } else {
    out.push(notMeasurable('renders_without_js'));
    out.push(notMeasurable('text_ratio_raw_rendered'));
  }
  // Различно съдържание според питащия е проблем — затова `true` е провал.
  if (rawResearch && rawAi) {
    const differs = contentDiffersByUa(rawResearch, rawAi);
    out.push(judged('content_differs_by_ua', { bool: differs }, !differs, url));
  } else out.push(notMeasurable('content_differs_by_ua'));

  /* ---------- Достъп за AI ботове ---------- */
  const robots = art.get('robots_txt:-') ?? '';
  const robotsEvidence = `${url}robots.txt`;
  for (const [key, allowed] of Object.entries(deriveRobotsAi(robots)))
    out.push(judged(key, { bool: allowed }, allowed, robotsEvidence));
  // За нашия бот — само констатация, не оценка на сайта.
  out.push(fact('robots_blocks_research', { bool: !botAllowed(robots, 'KovaResearchBot') }, robotsEvidence));

  const llmsBody = art.get('llms_txt:-');
  out.push(
    judged(
      'has_llms_txt',
      { bool: llmsBody !== undefined },
      llmsBody !== undefined,
      llmsBody !== undefined ? `${url}llms.txt (${llmsBody.length} знака)` : `${url}llms.txt`,
    ),
  );

  /* ---------- Оперативни сигнали (описателни, за писмата) ---------- */
  const pages = loadPages(db, runId, domain);
  const pageOf = (role: string): LoadedPage | undefined => pages.find((p) => p.role === role);
  const allPages = [...(rawBrowser ? [{ slug: '', html: rawBrowser }] : []), ...pages];

  const contactPage = pageOf('contact');
  const contactHtml = contactPage?.html ?? rawBrowser;
  if (contactHtml) {
    const evidence = contactPage ? `${url}${contactPage.slug}/` : url;
    const contact = deriveContactSignals(contactHtml);
    out.push(fact('has_contact_form', { bool: contact.has_contact_form }, evidence));
    out.push(
      contact.has_contact_form
        ? fact('contact_form_field_count', { num: contact.contact_form_field_count }, evidence)
        : notApplicable('contact_form_field_count'),
    );
    out.push(fact('contact_only_email', { bool: contact.contact_only_email }, evidence));
    out.push(fact('order_by_email_text', { bool: contact.order_by_email_text }, evidence));
    out.push(fact('facebook_as_primary_contact', { bool: contact.facebook_as_primary_contact }, evidence));
    out.push(fact('has_live_chat', { bool: contact.has_live_chat }, evidence));
  } else {
    for (const key of ['has_contact_form', 'contact_only_email', 'order_by_email_text']) out.push(notMeasurable(key));
  }

  // Документи: сумирано, а доказателството сочи страниците, които ги носят.
  if (allPages.length) {
    let formCount = 0;
    const types = new Set<string>();
    let priceListPdf = false;
    let catalogPdf = false;
    const sources: string[] = [];
    for (const p of allPages) {
      const d = deriveDocumentSignals(p.html, url);
      if (d.downloadable_form_count || d.price_list_is_pdf || d.catalog_is_pdf) {
        sources.push(`${url}${p.slug}${p.slug ? '/' : ''}`);
      }
      formCount += d.downloadable_form_count;
      d.downloadable_form_types.forEach((t) => types.add(t));
      priceListPdf = priceListPdf || d.price_list_is_pdf;
      catalogPdf = catalogPdf || d.catalog_is_pdf;
    }
    const evidence = sources.length ? sources.slice(0, 3).join(' ') : url;
    out.push(fact('downloadable_form_count', { num: formCount }, evidence));
    out.push(fact('downloadable_form_types', { text: [...types].join(',') }, evidence));
    out.push(fact('price_list_is_pdf', { bool: priceListPdf }, evidence));
    out.push(fact('catalog_is_pdf', { bool: catalogPdf }, evidence));
  }

  const careers = pageOf('careers');
  if (careers) {
    const evidence = `${url}${careers.slug}/`;
    const c = deriveCareers(careers.html);
    out.push(fact('has_job_listings', { bool: c.has_job_listings }, evidence));
    out.push(fact('hiring_admin_roles', { bool: c.hiring_admin_roles }, evidence));
  } else {
    // Без страница „Кариери" не знаем дали фирмата наема — това не е „не".
    out.push(notApplicable('has_job_listings'));
    out.push(notApplicable('hiring_admin_roles'));
  }

  const about = pageOf('about');
  out.push(
    about
      ? fact('team_page_headcount', { num: deriveTeamHeadcount(about.html) }, `${url}${about.slug}/`)
      : notApplicable('team_page_headcount'),
  );

  /* ---------- Поща, TLS, възраст, свежест ---------- */
  const dnsRaw = art.get('dns:-');
  if (dnsRaw) {
    const mx = (JSON.parse(dnsRaw).mx ?? []) as string[];
    out.push(fact('mx_provider', { text: deriveMxProvider(mx) }, `DNS MX ${domain}`));
  } else out.push(notMeasurable('mx_provider'));

  const tlsRaw = art.get('tls:-');
  if (tlsRaw) {
    const tls = JSON.parse(tlsRaw) as { valid: boolean; expiresDays: number | null };
    out.push(judged('tls_valid', { bool: tls.valid }, tls.valid, `TLS ${domain}:443`));
    out.push(
      tls.expiresDays === null
        ? notMeasurable('tls_expires_days')
        : judged('tls_expires_days', { num: tls.expiresDays }, tls.expiresDays >= 14, `TLS ${domain}:443`),
    );
  } else {
    out.push(notMeasurable('tls_valid'));
    out.push(notMeasurable('tls_expires_days'));
  }

  const rdapRaw = art.get('rdap:-');
  const registered = rdapRaw ? (JSON.parse(rdapRaw).registered as string | null) : null;
  if (registered) {
    const years = Math.round(((Date.now() - Date.parse(registered)) / (365.25 * 86_400_000)) * 10) / 10;
    out.push(fact('domain_age_years', { num: years }, `RDAP registration ${registered.slice(0, 10)}`));
  } else out.push(notMeasurable('domain_age_years'));

  const sitemap = art.get('sitemap:-');
  if (sitemap) {
    const fresh = deriveFreshness(sitemap, Date.now());
    if (fresh.last_content_update) {
      const evidence = `${url}sitemap.xml`;
      out.push(fact('last_content_update', { text: fresh.last_content_update }, evidence));
      out.push(
        judged('content_stale_months', { num: fresh.content_stale_months ?? 0 }, (fresh.content_stale_months ?? 0) <= 12, evidence),
      );
    } else {
      out.push(notMeasurable('last_content_update'));
      out.push(notMeasurable('content_stale_months'));
    }
  } else {
    out.push(notMeasurable('last_content_update'));
    out.push(notMeasurable('content_stale_months'));
  }

  /* ---------- Производителност (само с PAGESPEED_API_KEY) ---------- */
  const psiRaw = art.get('psi:-');
  if (psiRaw) {
    const perf = derivePerformance(JSON.parse(psiRaw));
    const evidence = `PageSpeed Insights (mobile) ${url}`;
    out.push(
      perf.psi_performance_score === null
        ? notMeasurable('psi_performance_score')
        : judged('psi_performance_score', { num: perf.psi_performance_score }, perf.psi_performance_score >= 50, evidence),
    );
    out.push(perf.lcp_ms === null ? notMeasurable('lcp_ms') : judged('lcp_ms', { num: perf.lcp_ms }, perf.lcp_ms <= 2500, evidence));
    out.push(perf.cls === null ? notMeasurable('cls') : judged('cls', { num: perf.cls }, perf.cls <= 0.1, evidence));
    out.push(perf.inp_ms === null ? notMeasurable('inp_ms') : judged('inp_ms', { num: perf.inp_ms }, perf.inp_ms <= 200, evidence));
    // Липсата на полеви данни е находка сама по себе си, не провал.
    out.push(fact('crux_data_available', { bool: perf.crux_data_available }, evidence));
  } else {
    for (const key of ['psi_performance_score', 'lcp_ms', 'cls', 'inp_ms', 'crux_data_available'])
      out.push(notMeasurable(key));
  }

  return out;
}

export function derive(runId: string): void {
  const db = openDb();
  const domains = db
    .prepare(`SELECT DISTINCT domain FROM fetches WHERE run_id=? AND domain IS NOT NULL`)
    .all(runId) as { domain: string }[];

  const upsert = db.prepare(
    `INSERT INTO metrics (run_id, domain, metric_key, status, verdict, value_num, value_bool, value_text, evidence)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(run_id, domain, metric_key) DO UPDATE SET
       status=excluded.status, verdict=excluded.verdict, value_num=excluded.value_num,
       value_bool=excluded.value_bool, value_text=excluded.value_text, evidence=excluded.evidence`,
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
        m.verdict,
        m.num ?? null,
        m.bool === undefined ? null : m.bool ? 1 : 0,
        m.text ?? null,
        m.evidence ?? null,
      );
    }
    count += metrics.length;
    const failed = metrics.filter((m) => m.verdict === 'fail').length;
    console.log(`[derive] ${domain}: ${metrics.length} метрики, ${failed} провала`);
  }
  db.close();
  console.log(`[derive] готово: ${count} стойности за ${domains.length} домейна.`);
}
