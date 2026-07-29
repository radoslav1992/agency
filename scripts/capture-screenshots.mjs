/**
 * Прави екранни снимки на проектите от портфолиото.
 *
 *   npm run shots            # всички проекти
 *   npm run shots -- plumeo  # само тези, чийто адрес съдържа „plumeo“
 *
 * Записва ги в src/assets/projects/<домейн-без-разширение>.png, откъдето
 * картите ги вземат автоматично. Изисква Playwright:
 *
 *   npm i -D playwright && npx playwright install chromium
 */
import { chromium } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'src/assets/projects');

const WIDTH = 1600;
const HEIGHT = 1000; // 16:10 — същото съотношение като на картата

// Адресите се четат от данните, за да няма два списъка, които се разминават.
const source = await readFile(resolve(root, 'src/data/projects.ts'), 'utf8');
const urls = [...source.matchAll(/url:\s*'([^']+)'/g)].map((m) => m[1]);

const filter = process.argv.slice(2);
const targets = urls.filter((url) => filter.length === 0 || filter.some((f) => url.includes(f)));

if (targets.length === 0) {
  console.error('Няма съвпадащи проекти.');
  process.exit(1);
}

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
  colorScheme: 'light',
});

for (const url of targets) {
  const slug = new URL(url).hostname.replace(/^www\./, '').replace(/\.[^.]+$/, '');
  const file = resolve(outDir, `${slug}.png`);
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });
    // Дай време на шрифтове и анимации да се успокоят.
    await page.waitForTimeout(1500);
    await page.screenshot({ path: file });
    console.log(`✓ ${slug}.png  ←  ${url}`);
  } catch (error) {
    console.error(`✗ ${url}: ${error.message}`);
  } finally {
    await page.close();
  }
}

await browser.close();
console.log(`\nГотово. Файловете са в ${outDir}`);
