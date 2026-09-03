import type { APIRoute } from 'astro';
import { GUIDES } from '../../data/guides.ts';
import { verifyDownload } from '../../lib/guide-download.ts';

/**
 * Единственият път до файла на наръчника.
 *
 * Кофата е частна, значи този маршрут е и вратата, и ключалката. Затова тук
 * няма нищо освен проверка и подаване: всяко „ако“ повече е място, където
 * файлът може да излезе без плащане.
 *
 * Отказва СЕ ЗАТВОРЕНО — липсва ли ключът за подписите или връзката към
 * кофата, връща 503 и не подава нищо. Обратното (да пусне при липсваща
 * настройка) би значело, че забравена тайна раздава продукта безплатно.
 */
export const prerender = false;

export const GET: APIRoute = async ({ url, locals }) => {
  const env = locals.runtime?.env ?? ({} as Env);
  const secret = env.DOWNLOAD_SECRET;
  const bucket = env.GUIDE_FILES;

  if (!secret || !bucket) {
    console.error('Свалянето не е настроено — липсва DOWNLOAD_SECRET или кофата GUIDE_FILES.');
    return new Response('Свалянето не е настроено.', { status: 503 });
  }

  const token = url.searchParams.get('t') ?? '';
  const claim = token ? await verifyDownload(secret, token) : null;
  if (!claim) {
    // Един отговор за подправено, изтекло и липсващо. Разликата между тях е
    // подсказка за този, който търси начин да мине.
    return new Response('Връзката е невалидна или срокът ѝ е изтекъл.', { status: 403 });
  }

  const guide = GUIDES.find((item) => item.slug === claim.guide);
  if (!guide) return new Response('Няма такъв наръчник.', { status: 404 });

  const object = await bucket.get(guide.file.key);
  if (!object) {
    console.error(`Липсва файл в кофата: ${guide.file.key}`);
    return new Response('Файлът липсва. Пиши ми и ще го получиш веднага.', { status: 404 });
  }

  console.log(`Сваляне: ${guide.slug} по покупка ${claim.purchase}`);

  return new Response(object.body, {
    headers: {
      'content-type': object.httpMetadata?.contentType ?? 'application/pdf',
      /* `attachment` вместо разглеждане в браузъра: файлът е за прибиране, а
         вграденият четец на телефона го отваря и после човекът не го намира. */
      'content-disposition': `attachment; filename="${guide.file.filename}"`,
      'content-length': String(object.size),
      etag: object.httpEtag,
      /* Частен и НЕкеширан от посредници: адресът носи подпис, а кеш по
         пътя би подал файла и след изтичането му. */
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
};

export const ALL: APIRoute = () =>
  new Response('Method Not Allowed', { status: 405, headers: { allow: 'GET' } });
