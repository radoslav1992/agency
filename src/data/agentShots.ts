import type { ImageMetadata } from 'astro';

/**
 * Рисунките на агентите, намерени по име на файла.
 *
 * Стои отделно, защото се ползва на две места — въртележката на началната
 * страница и списъкът в /agents. Дублирането на глоба води до това едното
 * място да хване нов файл, а другото да го пропусне.
 *
 * `import.meta.glob` иска буквален път, затова той е тук, а не параметър.
 */
const shots = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/agents/*.{png,jpg,jpeg,webp,avif}',
  { eager: true },
);

const byId = new Map<string, ImageMetadata>(
  Object.entries(shots).map(([path, mod]) => [
    path.split('/').pop()!.replace(/\.\w+$/, ''),
    mod.default,
  ]),
);

/** Рисунката на агента или `undefined`, ако още няма файл за него. */
export function agentShot(id: string): ImageMetadata | undefined {
  return byId.get(id);
}
