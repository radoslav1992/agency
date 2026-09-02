import type { ImageMetadata } from 'astro';

/**
 * Корицата на наръчник по име на файл, без разширение.
 *
 * Глоб, а не статичен `import`: липсващият файл трябва да покаже рамка, а не
 * да счупи build-а. Нов наръчник се добавя с един запис в `data/guides.ts` и
 * една картинка в `src/assets/guides/` — нищо тук не се пипа.
 *
 * Стои в `lib/`, защото и списъкът, и страницата на отделния наръчник
 * търсят корици; преди това беше преписано на две места.
 */
const covers = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/guides/*.{png,jpg,jpeg,webp,avif}',
  { eager: true },
);

export function coverOf(name: string): ImageMetadata | undefined {
  return Object.entries(covers).find(
    ([path]) => path.split('/').pop()?.replace(/\.\w+$/, '') === name,
  )?.[1].default;
}
