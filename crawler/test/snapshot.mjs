/**
 * Записва HTML на реални сайтове като fixture файлове.
 *
 *   npm run snapshot -w @kova/crawler                  # всички от REAL_CASES
 *   npm run snapshot -w @kova/crawler -- nickmasch.bg  # само посочените
 *
 * Тегли се веднъж и се комитва. Тестовете после работят върху записаното —
 * живите сайтове се променят и иначе тестът пада без причина.
 *
 * За `renders_without_js` е нужен и рендиран вариант; той се прави с
 * браузъра на collect-фазата, затова тук пазим само суровия HTML и
 * очакваните стойности, които не зависят от рендиране. Случаите с
 * рендиране са в `fixtures.mjs` като записан HTML двойка.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { botAllowed } from '@kova/shared-audit';
import { REAL_CASES } from './fixtures.mjs';

const UA = 'KovaResearchBot/1.0 (+https://kova.bg/research)';

/** Същото правило като при обхождането: забраната в robots.txt се уважава. */
async function allowedByRobots(domain) {
  try {
    const res = await fetch(`https://${domain}/robots.txt`, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status !== 200) return true;
    const body = await res.text();
    if (/<!doctype html|<html[\s>]/i.test(body.slice(0, 1000))) return true;
    return botAllowed(body, 'KovaResearchBot');
  } catch {
    return true;
  }
}

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = resolve(HERE, 'fixtures');

const wanted = process.argv.slice(2);
const cases = wanted.length ? REAL_CASES.filter((c) => wanted.includes(c.domain)) : REAL_CASES;

if (!cases.length) {
  console.error('Няма съвпадащи домейни в REAL_CASES.');
  process.exit(2);
}

mkdirSync(DIR, { recursive: true });

for (const c of cases) {
  const url = `https://${c.domain}/`;
  if (!(await allowedByRobots(c.domain))) {
    console.error(`⊘ ${c.domain}: robots.txt забранява KovaResearchBot — пропуснат`);
    continue;
  }
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
      headers: { 'User-Agent': UA },
    });
    const html = await res.text();
    const path = resolve(DIR, c.file);
    writeFileSync(path, html, 'utf8');
    console.log(`✓ ${c.domain} → ${c.file} (${res.status}, ${html.length} знака)`);
  } catch (err) {
    console.error(`✗ ${c.domain}: ${(err).message}`);
  }
}

console.log('\nСега пусни: npm test -w @kova/crawler');
