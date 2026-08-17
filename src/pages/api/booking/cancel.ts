import type { APIRoute } from 'astro';
import { bookingByToken, cancelBooking } from '../../../lib/booking.ts';
import { notifyStudio } from '../../../lib/notify.ts';
import { UI } from '../../../i18n/ui.ts';

/**
 * Отказ от посетителя.
 *
 * Само POST. Отказ през GET значи, че всеки инструмент, който отваря връзки
 * предварително — четец на поща, антивирусна програма, самият браузър — може
 * да отмени час, който никой не е отменял.
 *
 * Тайният низ е достатъчна самоличност: знае го само този, който е запазил.
 */
export const prerender = false;

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData().catch(() => null);
  if (!form) return new Response('Bad Request', { status: 400 });

  const locale = form.get('locale') === 'en' ? 'en' : 'bg';
  const base = locale === 'en' ? '/en/booking/' : '/booking/';
  const token = String(form.get('token') ?? '');

  const db = locals.runtime?.env?.BOOKINGS;
  if (!db) return redirect(base, 303);

  const booking = await bookingByToken(db, token);
  if (!booking) {
    return redirect(`${base}?error=${encodeURIComponent(UI[locale].booking.notFound)}`, 303);
  }

  if (booking.status === 'confirmed') {
    await cancelBooking(db, booking.id, Date.now());
    const env = locals.runtime?.env ?? ({} as Env);
    const notice = notifyStudio(env, { ...booking, status: 'cancelled' }, true);
    const ctx = locals.runtime?.ctx;
    if (ctx?.waitUntil) ctx.waitUntil(notice);
    else await notice;
  }

  return redirect(`${base}?cancelled=${booking.token}`, 303);
};

export const ALL: APIRoute = () =>
  new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
