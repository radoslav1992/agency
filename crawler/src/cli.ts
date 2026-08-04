#!/usr/bin/env node --experimental-strip-types
/**
 * Kova research crawler — три отделни команди (т. 1):
 *
 *   crawl   --targets targets.csv --run-id 2026-q3 [--notes "..."]
 *   derive  --run-id 2026-q3
 *   export  --run-id 2026-q3 [--format csv]
 *
 * Пуска се ръчно (workflow_dispatch), без планировчик.
 */
import { existsSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crawl } from './crawl.ts';
import { derive } from './derive.ts';
import { exportCsv } from './export.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
/** Коренът на repo-то — една папка над пакета `crawler/`. */
const REPO_ROOT = resolve(HERE, '..', '..');

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

/**
 * Намира targets файла независимо откъде е пуснат CLI-ят.
 *
 * `npm run crawl -w @kova/crawler` изпълнява скрипта с cwd = `crawler/`, а
 * пътят в командата обикновено е спрямо корена на repo-то
 * (`crawler/targets.csv`). Затова пробваме подред: абсолютен път, cwd,
 * `INIT_CWD` (папката, от която npm е стартиран) и корена на repo-то.
 */
function resolveTargetsPath(input: string): string {
  const candidates = isAbsolute(input)
    ? [input]
    : [
        resolve(process.cwd(), input),
        ...(process.env.INIT_CWD ? [resolve(process.env.INIT_CWD, input)] : []),
        resolve(REPO_ROOT, input),
      ];

  for (const candidate of candidates) if (existsSync(candidate)) return candidate;

  console.error(
    `Не намирам targets файла "${input}". Пробвах:\n${candidates.map((c) => `  ${c}`).join('\n')}`,
  );
  process.exit(2);
}

function requireFlag(args: string[], name: string): string {
  const v = flag(args, name);
  if (!v) {
    console.error(`Липсва --${name}`);
    process.exit(2);
  }
  return v;
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case 'crawl':
      await crawl({
        targetsPath: resolveTargetsPath(requireFlag(args, 'targets')),
        runId: requireFlag(args, 'run-id'),
        notes: flag(args, 'notes'),
      });
      break;
    case 'derive':
      derive(requireFlag(args, 'run-id'));
      break;
    case 'export': {
      const format = flag(args, 'format') ?? 'csv';
      if (format !== 'csv') {
        console.error(`Неподдържан формат: ${format}`);
        process.exit(2);
      }
      exportCsv(requireFlag(args, 'run-id'));
      break;
    }
    default:
      console.error(
        'Употреба:\n' +
          '  crawl  --targets targets.csv --run-id <id> [--notes "..."]\n' +
          '  derive --run-id <id>\n' +
          '  export --run-id <id> [--format csv]',
      );
      process.exit(2);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
