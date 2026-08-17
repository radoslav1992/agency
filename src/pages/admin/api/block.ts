import type { APIRoute } from 'astro';
import { addBlock } from '../../../lib/booking.ts';
import { guardAdmin } from '../../../lib/admin-auth.ts';
import { zonedTimeToUtc } from '../../../lib/time.ts';
import { TIMEZONE } from '../../../data/booking.mjs';

export const prerender = false;

/**
 * `datetime-local` дава `2026-08-20T14:30` — местно време без зона.
 *
 * Точно затова минава през `zonedTimeToUtc`, а не през `new Date(...)`:
 * `new Date` би го изтълкувал в зоната на СЪРВЪРА, която на Cloudflare е UTC.
 * Затворен следобед би станал затворена сутрин.
 */
function parseLocal(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number) as unknown as number[];
  return zonedTimeToUtc(y, mo, d, h, mi, TIMEZONE);
}

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const env = locals.runtime?.env ?? ({} as Env);
  const gate = await guardAdmin(request.headers.get('cookie') ?? undefined, env);
  if (!gate.ok) return redirect(`/admin/?error=${encodeURIComponent('Сесията изтече. Влез пак.')}`, 303);

  const db = env.BOOKINGS;
  const form = await request.formData().catch(() => null);
  if (!db || !form) return redirect('/admin/', 303);

  const from = parseLocal(String(form.get('from') ?? ''));
  const to = parseLocal(String(form.get('to') ?? ''));
  const reason = String(form.get('reason') ?? '').trim().slice(0, 120);

  const fail = (message: string) =>
    redirect(`/admin/?error=${encodeURIComponent(message)}`, 303);

  if (from === null || to === null) return fail('Датите не се четат.');
  if (to <= from) return fail('Краят трябва да е след началото.');

  await addBlock(db, from, to, reason, Date.now());
  return redirect('/admin/', 303);
};

export const ALL: APIRoute = () =>
  new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
