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

-- status казва дали измерването е успяло; verdict — как се представя сайтът.
-- Разделени са нарочно: описателните метрики (cms, languages) нямат добра и
-- лоша стойност, а слети в едно поле правеха всяка измерена стойност
-- "passed" и правеха процента провали неизчислим.
CREATE TABLE IF NOT EXISTS metrics (
  run_id TEXT,
  domain TEXT,
  metric_key TEXT,
  status TEXT,                      -- ok|not_applicable|not_measurable|error
  verdict TEXT,                     -- pass|fail|neutral
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
  migrate(db);
  return db;
}

/**
 * Дребни миграции за бази, създадени с по-ранна схема. Базата в R2 живее
 * между тримесечията, така че не може просто да се пресъздаде.
 */
function migrate(db: DatabaseSync): void {
  const columns = db.prepare(`PRAGMA table_info(metrics)`).all() as { name: string }[];
  if (!columns.some((c) => c.name === 'verdict')) {
    db.exec(`ALTER TABLE metrics ADD COLUMN verdict TEXT`);
    // Старите редове са с петте слети статуса — привеждаме ги към новия модел.
    db.exec(`UPDATE metrics SET verdict='pass'    WHERE status='passed'`);
    db.exec(`UPDATE metrics SET verdict='fail'    WHERE status='failed'`);
    db.exec(`UPDATE metrics SET verdict='neutral' WHERE verdict IS NULL`);
    db.exec(`UPDATE metrics SET status='ok' WHERE status IN ('passed','failed')`);
  }
}
