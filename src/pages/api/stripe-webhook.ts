import type { APIRoute } from 'astro';
import { fulfil, guideOfSession, saleFrom } from '../../lib/guide-sale.ts';
import { isPaid, verifyWebhook, type CheckoutSession } from '../../lib/stripe.ts';
import { SITE } from '../../data/site.mjs';

/**
 * Stripe съобщава, че някой е платил.
 *
 * Това е сигурният път за доставка. Страницата след плащането работи само
 * ако купувачът е изчакал да се зареди; тук Stripe идва при мен независимо
 * от браузъра — при затворен раздел, при паднала мрежа, при плащане, което
 * се потвърждава по-късно от банката. Затова писмото с наръчника тръгва
 * оттук, а страницата е само за нетърпеливите.
 *
 * Двата пътя пишат по един и същи ред в базата и вторият не праща второ
 * писмо.
 *
 * Защитата на Astro срещу чужди заявки (`checkOrigin`) не пречи тук:
 * проверено в `astro/dist/core/app/middlewares.js` — тя спира само заявки с
 * тяло като на формуляр (`x-www-form-urlencoded`, `multipart/form-data`,
 * `text/plain`) или изобщо без `content-type`. Stripe праща
 * `application/json` и минава.
 */
export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime?.env ?? ({} as Env);
  const secret = env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    console.error('Липсва STRIPE_WEBHOOK_SECRET — webhook-ът не приема нищо.');
    return new Response('Not configured', { status: 503 });
  }

  /* Тялото се чете като текст и се подписва точно както е дошло. Мине ли
     през JSON и обратно, подписът пада — редът на полетата се променя. */
  const payload = await request.text();
  const ok = await verifyWebhook(payload, request.headers.get('stripe-signature'), secret);
  if (!ok) {
    console.warn('Webhook с невалиден подпис — отхвърлен.');
    return new Response('Bad signature', { status: 400 });
  }

  let event: { type?: string; data?: { object?: CheckoutSession } };
  try {
    event = JSON.parse(payload);
  } catch {
    return new Response('Bad payload', { status: 400 });
  }

  /* Само завършено плащане. Другите събития се потвърждават с 200 — Stripe
     повтаря всичко, което не е потвърдено, а няма смисъл да се повтаря
     събитие, което така или иначе не ни интересува. */
  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
    return new Response('ignored', { status: 200 });
  }

  const session = event.data?.object;
  if (!session || !isPaid(session)) return new Response('unpaid', { status: 200 });

  const guide = await guideOfSession(env, session);
  if (!guide) {
    // Плащане без разпознаваем наръчник: не гадаем кой файл да пратим.
    console.error(
      `Платена сесия ${session.id}: не разпознах наръчник нито по метаданни, нито по продукт. ` +
        'Липсва `stripeIds` в data/guides.ts?',
    );
    return new Response('unknown guide', { status: 200 });
  }

  const sale = saleFrom(session, guide);
  if (!sale) {
    console.error(`Платена сесия ${session.id} без имейл — няма къде да отиде наръчникът.`);
    return new Response('no email', { status: 200 });
  }

  await fulfil(env, sale, SITE.url, locals.runtime?.ctx?.waitUntil?.bind(locals.runtime.ctx));

  return new Response('ok', { status: 200 });
};

export const ALL: APIRoute = () =>
  new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
