/**
 * Export-фаза: широка CSV таблица — по един ред на домейн, колони = метрики.
 * Стойността се взима от value_text/num/bool според това кое е попълнено,
 * а статусите not_applicable / not_measurable / error се изнасят като такива,
 * за да не се четат като „false“ (т. 8).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXPORT_DIR = process.env.CRAWLER_EXPORTS ?? resolve(HERE, '..', 'exports');

function cell(row: { status: string; value_num: number | null; value_bool: number | null; value_text: number | string | null }): string {
  if (row.status === 'not_applicable') return 'n/a';
  if (row.status === 'not_measurable') return '';
  if (row.status === 'error') return 'ERR';
  if (row.value_text !== null) return String(row.value_text);
  if (row.value_num !== null) return String(row.value_num);
  if (row.value_bool !== null) return row.value_bool ? 'true' : 'false';
  return '';
}

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function exportCsv(runId: string): string {
  const db = openDb();
  const rows = db
    .prepare(
      `SELECT domain, metric_key, status, value_num, value_bool, value_text
       FROM metrics WHERE run_id=? ORDER BY domain, metric_key`,
    )
    .all(runId) as {
    domain: string;
    metric_key: string;
    status: string;
    value_num: number | null;
    value_bool: number | null;
    value_text: string | null;
  }[];

  if (!rows.length) {
    db.close();
    throw new Error(`Няма метрики за run "${runId}". Пусни derive първо.`);
  }

  const keys = [...new Set(rows.map((r) => r.metric_key))].sort();
  const byDomain = new Map<string, Map<string, (typeof rows)[number]>>();
  for (const r of rows) {
    if (!byDomain.has(r.domain)) byDomain.set(r.domain, new Map());
    byDomain.get(r.domain)!.set(r.metric_key, r);
  }

  const lines = [['domain', ...keys].map(csvEscape).join(',')];
  for (const [domain, metrics] of byDomain) {
    const line = [domain, ...keys.map((k) => (metrics.has(k) ? cell(metrics.get(k)!) : ''))];
    lines.push(line.map((v) => csvEscape(String(v))).join(','));
  }

  mkdirSync(EXPORT_DIR, { recursive: true });
  const path = resolve(EXPORT_DIR, `${runId}.csv`);
  writeFileSync(path, lines.join('\n') + '\n', 'utf8');

  writeSummary(db, runId);
  db.close();
  console.log(`[export] ${byDomain.size} домейна × ${keys.length} метрики → ${path}`);
  return path;
}

/**
 * Обобщение по метрика: колко сайта минават, колко се провалят и какъв е
 * процентът провали. Това е входът за доклада — от широката таблица тези
 * числа трябва да се смятат на ръка.
 */
function writeSummary(db: ReturnType<typeof openDb>, runId: string): void {
  const rows = db
    .prepare(
      `SELECT metric_key,
              SUM(verdict='pass')             AS pass,
              SUM(verdict='fail')             AS fail,
              SUM(verdict='neutral')          AS neutral,
              SUM(status='not_applicable')    AS na,
              SUM(status='not_measurable')    AS nm,
              SUM(status='error')             AS err
       FROM metrics WHERE run_id=? GROUP BY metric_key ORDER BY metric_key`,
    )
    .all(runId) as Record<string, string | number>[];

  const lines = ['metric_key,pass,fail,neutral,not_applicable,not_measurable,error,fail_rate'];
  for (const r of rows) {
    const pass = Number(r.pass);
    const fail = Number(r.fail);
    const judgedTotal = pass + fail;
    // Празно, а не 0 — метрика без присъда няма процент провали.
    const failRate = judgedTotal > 0 ? (fail / judgedTotal).toFixed(2) : '';
    lines.push(
      [r.metric_key, pass, fail, Number(r.neutral), Number(r.na), Number(r.nm), Number(r.err), failRate].join(','),
    );
  }

  const path = resolve(EXPORT_DIR, `${runId}-summary.csv`);
  writeFileSync(path, lines.join('\n') + '\n', 'utf8');
  console.log(`[export] обобщение по метрики → ${path}`);
}
