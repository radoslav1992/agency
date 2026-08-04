/**
 * SQLite слой (node:sqlite, вграден в Node 22). Схемата е от т. 5 на
 * спецификацията. `targets` живее отделно от `runs`, за да е стабилна
 * извадката между тримесечията.
 */
import { DatabaseSync } from 'node:sqlite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const DB_PATH = process.env.CRAWLER_DB ?? resolve(HERE, '..', 'crawler.db');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS runs (
  run_id TEXT PRIMARY KEY,
  started_at TEXT,
  finished_at TEXT,
  tool_version TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS targets (
  domain TEXT PRIMARY KEY,          -- NULL е валидно: фирма без сайт
  company_name TEXT,
  eik TEXT,
  nkid TEXT,
  sector_label TEXT,
  region TEXT,
  size_band TEXT,
  source TEXT,
  added_at TEXT
);

CREATE TABLE IF NOT EXISTS pages (
  run_id TEXT,
  domain TEXT,
  page_slug TEXT,
  url TEXT,
  page_role TEXT,                   -- home|contact|about|services|pricing|careers|other
  discovered_via TEXT,              -- nav|sitemap|pattern
  status_code INTEGER,
  PRIMARY KEY (run_id, domain, page_slug)
);

CREATE TABLE IF NOT EXISTS fetches (
  run_id TEXT,
  domain TEXT,
  page_slug TEXT,
  kind TEXT,                        -- raw_html|rendered_html|headers|robots_txt|llms_txt|sitemap|dns|tls
  ua_variant TEXT,                  -- research|browser|aicrawler|-
  status_code INTEGER,
  fetched_at TEXT,
  artifact_path TEXT,
  error TEXT,
  PRIMARY KEY (run_id, domain, page_slug, kind, ua_variant)
);

CREATE TABLE IF NOT EXISTS metrics (
  run_id TEXT,
  domain TEXT,
  metric_key TEXT,
  status TEXT,                      -- passed|failed|not_applicable|not_measurable|error
  value_num REAL,
  value_bool INTEGER,
  value_text TEXT,
  evidence TEXT,                    -- url + цитат
  PRIMARY KEY (run_id, domain, metric_key)
);

CREATE TABLE IF NOT EXISTS outreach (
  domain TEXT PRIMARY KEY,
  contacted_at TEXT,
  top_findings TEXT,
  replied_at TEXT,
  outcome TEXT
);
`;

export function openDb(): DatabaseSync {
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  return db;
}
