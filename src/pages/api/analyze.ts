import type { APIRoute } from 'astro';
import { analyzeSite, assertSafeRemoteUrl, configureSelfFetch, sanitizeUrl } from '../../lib/analyzer';

/** Работи на Cloudflare Worker-а, не се пререндерира. */
export const prerender = false;

const ERRORS = {
  badRequest: 'Невалидно запитване.',
  invalidUrl: 'Невалиден адрес. Провери дали е изписан правилно (например example.bg).',
  disallowedUrl: 'Този адрес не е позволен — вътрешни и частни адреси не се анализират.',
  fetchFailed:
    'Сайтът не отговори навреме или отказа връзката. Провери адреса и опитай отново.',
} as const;

function normalizeInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export const POST: APIRoute = async ({ request, locals }) => {
  // Worker не може да прави fetch към собствения си хост (Cloudflare блокира
  // рекурсията), затова заявките към нашия домейн минават през ASSETS binding-а.
  try {
    const selfHost = new URL(request.url).hostname.toLowerCase();
    const bare = selfHost.replace(/^www\./, '');
    configureSelfFetch([bare, `www.${bare}`], locals.runtime?.env?.ASSETS);
  } catch {
    /* без конфигурация — анализът на чужди сайтове работи както досега */
  }

  let body: { url?: unknown };
  try {
    body = (await request.json()) as { url?: unknown };
  } catch {
    return Response.json({ ok: false, error: ERRORS.badRequest }, { status: 400 });
  }

  if (typeof body.url !== 'string' || body.url.length > 2048) {
    return Response.json({ ok: false, error: ERRORS.badRequest }, { status: 400 });
  }

  const url = normalizeInput(body.url);
  if (!url || !sanitizeUrl(url)) {
    return Response.json({ ok: false, error: ERRORS.invalidUrl }, { status: 422 });
  }

  const safeUrl = await assertSafeRemoteUrl(url);
  if (!safeUrl) {
    return Response.json({ ok: false, error: ERRORS.disallowedUrl }, { status: 422 });
  }

  try {
    const result = await analyzeSite(safeUrl);
    return Response.json({ ok: true, result });
  } catch (error) {
    console.error('Site analysis failed', error);
    return Response.json({ ok: false, error: ERRORS.fetchFailed }, { status: 502 });
  }
};

/** Всичко различно от POST на този маршрут. */
export const ALL: APIRoute = () =>
  new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
