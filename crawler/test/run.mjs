/**
 * Тестове с известни отговори за екстракторите.
 *
 *   npm test -w @kova/crawler
 *
 * Нула мрежа: всичко се смята върху записан HTML. Целта е всяко следващо
 * пипане по екстракторите да се сблъска с очакваните стойности, вместо
 * грешката да се появи чак в таблицата след пускане.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  deriveSeo,
  deriveSchema,
  deriveRenderability,
  deriveContactSignals,
  deriveDocumentSignals,
  detectStack,
  deriveLanguages,
  deriveWeight,
  classifyRole,
  botAllowed,
  botAccess,
} from '@kova/shared-audit';
import { CASES, REAL_CASES, ROLE_CASES } from './fixtures.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
let failures = 0;

function check(label, actual, expected) {
  const ok = String(actual) === String(expected);
  if (!ok) failures++;
  console.log(`  ${ok ? '✓' : '✗'} ${label}: ${actual}${ok ? '' : `  (очаквано: ${expected})`}`);
}

/** Всички стойности, които един fixture може да провери. */
function measure(html, rendered, url) {
  const seo = deriveSeo(html, url);
  const schema = deriveSchema(html);
  const stack = detectStack(html, {});
  const contact = deriveContactSignals(html);
  const docs = deriveDocumentSignals(html, url);
  const render = deriveRenderability(html, rendered ?? html);
  return {
    ...seo,
    ...schema,
    ...stack,
    ...contact,
    ...docs,
    ...render,
    ...deriveLanguages(html),
    ...deriveWeight(html),
    schema_types: schema.schema_types.join(','),
  };
}

console.log('Екстрактори върху записан HTML\n');
for (const c of CASES) {
  const html = c.file ? readFileSync(resolve(HERE, 'fixtures', c.file), 'utf8') : c.html;
  if (c.file && !existsSync(resolve(HERE, 'fixtures', c.file))) {
    console.log(`  ⚠ ${c.name}: липсва ${c.file}, пропуснат`);
    continue;
  }
  console.log(c.name);
  const got = measure(html, c.rendered, c.url);
  for (const [key, expected] of Object.entries(c.expect)) check(key, got[key], expected);
}

console.log('\nРеални сайтове (записани с npm run snapshot)');
let snapshotted = 0;
for (const c of REAL_CASES) {
  const path = resolve(HERE, 'fixtures', c.file);
  if (!existsSync(path)) {
    console.log(`  ⚠ ${c.domain}: няма запис — пусни "npm run snapshot -w @kova/crawler"`);
    continue;
  }
  snapshotted++;
  console.log(`  ${c.domain}`);
  const got = measure(readFileSync(path, 'utf8'), null, `https://${c.domain}/`);
  for (const [key, expected] of Object.entries(c.expect)) check(`  ${key}`, got[key], expected);
}
if (!snapshotted) console.log('  (нито един реален сайт не е записан още)');

console.log('\nrobots.txt — три състояния, не булево');
const BLOCK_AI = 'User-agent: GPTBot\nUser-agent: ClaudeBot\nDisallow: /\n\nUser-agent: *\nAllow: /';
check('изброени агенти в една група → GPTBot', botAccess(BLOCK_AI, 'GPTBot'), 'disallow');
check('изброени агенти в една група → ClaudeBot', botAccess(BLOCK_AI, 'ClaudeBot'), 'disallow');
check('непосочен бот пада на * → allow', botAccess(BLOCK_AI, 'PerplexityBot'), 'allow');
check('празен robots.txt → unspecified', botAccess('', 'GPTBot'), 'unspecified');
check('само други агенти → unspecified', botAccess('User-agent: Googlebot\nDisallow: /admin', 'GPTBot'), 'unspecified');
check('общ Disallow → disallow', botAccess('User-agent: *\nDisallow: /', 'GPTBot'), 'disallow');
check('само път-специфично правило → allow', botAccess('User-agent: *\nDisallow: /admin', 'GPTBot'), 'allow');
check('обхождането спира при забрана', botAllowed('User-agent: KovaResearchBot\nDisallow: /', 'KovaResearchBot'), false);

console.log(failures === 0 ? '\nВсичко минава.' : `\n${failures} проверки се провалят.`);
process.exit(failures === 0 ? 0 : 1);
