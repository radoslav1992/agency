import type { APIRoute } from 'astro';
import { bookingById, cancelBooking } from '../../../lib/booking.ts';
import { notifyVisitor } from '../../../lib/notify.ts';
import { guardAdmin } from '../../../lib/admin-auth.ts';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, redirect, url }) => {
  const env = locals.runtime?.env ?? ({} as Env);
  const gate = await guardAdmin(request.headers.get('cookie') ?? undefined, env);
  if (!gate.ok) return redirect(`/admin/?error=${encodeURIComponent('Сесията изтече. Влез пак.')}`, 303);

  const db = env.BOOKINGS;
  const form = await request.formData().catch(() => null);
  const id = String(form?.get('id') ?? '');
  if (!db || !id) return redirect('/admin/', 303);

  /*
   * Записът се чете ПРЕДИ отказа: след `UPDATE` вече не знаем на кого да
   * пишем, а точно този случай е единственият, в който човекът отсреща няма
   * никакъв друг начин да разбере. Отказът от сайта е негово действие и той
   * го вижда на екрана; отказът оттук идва изневиделица.
   */
  const booking = await bookingById(db, id);

  await cancelBooking(db, id, Date.now());

  // Известие до теб не се праща — ти си го отказал.
  if (booking) {
    const notice = notifyVisitor(env, booking, url.origin, 'cancelled');
    const ctx = locals.runtime?.ctx;
    if (ctx?.waitUntil) ctx.waitUntil(notice);
    else await notice;
  }

  return redirect('/admin/', 303);
};

export const ALL: APIRoute = () =>
  new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
