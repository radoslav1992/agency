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
} from '@kova/shared-audit';
import { CASES, ROLE_CASES } from './fixtures.mjs';

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

console.log('\nРоли на страници');
for (const c of ROLE_CASES) check(`${c.url}`, classifyRole(c.url, c.text), c.expect);

console.log('\nrobots.txt — уважаване на забраната');
check('изричен Disallow за нашия бот', botAllowed('User-agent: KovaResearchBot\nDisallow: /', 'KovaResearchBot'), false);
check('общ Disallow за всички', botAllowed('User-agent: *\nDisallow: /', 'KovaResearchBot'), false);
check('разрешено', botAllowed('User-agent: *\nAllow: /', 'KovaResearchBot'), true);

console.log(failures === 0 ? '\nВсичко минава.' : `\n${failures} проверки се провалят.`);
process.exit(failures === 0 ? 0 : 1);
