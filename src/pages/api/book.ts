import type { APIRoute } from 'astro';
import { createBooking } from '../../lib/booking.ts';
import { notifyStudio, notifyVisitor } from '../../lib/notify.ts';
import { UI } from '../../i18n/ui.ts';

/** Запазването от сайта. Агентът минава по друг път — `/api/agent/book`. */
export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export const POST: APIRoute = async ({ request, locals, redirect, url }) => {
  const form = await request.formData().catch(() => null);
  if (!form) return new Response('Bad Request', { status: 400 });

  const locale = form.get('locale') === 'en' ? 'en' : 'bg';
  const t = UI[locale].booking;
  const base = locale === 'en' ? '/en/booking/' : '/booking/';

  const fail = (message: string, date?: string) =>
    redirect(`${base}?error=${encodeURIComponent(message)}${date ? `&date=${date}` : ''}`, 303);

  // Примамката е попълнена → бот. Преструваме се, че всичко е наред, и
  // не пишем нищо; истинският посетител не вижда разлика, ботът — също.
  if (clean(form.get('website'), 100)) return redirect(base, 303);

  const startUtc = Number(form.get('start'));
  const name = clean(form.get('name'), 120);
  const email = clean(form.get('email'), 180);
  const phone = clean(form.get('phone'), 40);
  const note = clean(form.get('note'), 1200);

  if (!Number.isFinite(startUtc) || name.length < 2 || !EMAIL_RE.test(email)) {
    return fail(t.invalid);
  }

  const db = locals.runtime?.env?.BOOKINGS;
  if (!db) {
    console.warn('Календарът няма връзка към D1 — запазването е отказано.');
    return fail(t.unavailable);
  }

  const now = Date.now();
  const result = await createBooking(
    db,
    { startUtc, name, email, phone, note, source: 'web', locale },
    now,
  );

  if (!result.ok) return fail(t.taken);

  const env = locals.runtime?.env ?? ({} as Env);
  // Известията не бива да бавят отговора: часът вече е записан и човекът
  // чака екран, а не поща. `waitUntil` държи Worker-а жив, докато писмото
  // тръгне, без да задържа пренасочването.
  const notifications = Promise.all([
    notifyStudio(env, result.booking),
    notifyVisitor(env, result.booking, url.origin),
  ]);
  const ctx = locals.runtime?.ctx;
  if (ctx?.waitUntil) ctx.waitUntil(notifications);
  else await notifications;

  return redirect(`${base}?done=${result.booking.token}`, 303);
};

export const ALL: APIRoute = () =>
  new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
