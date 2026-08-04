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
import { crawl } from './crawl.ts';
import { derive } from './derive.ts';
import { exportCsv } from './export.ts';

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
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
        targetsPath: requireFlag(args, 'targets'),
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
