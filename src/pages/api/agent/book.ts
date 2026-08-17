import type { APIRoute } from 'astro';
import { availability, createBooking } from '../../../lib/booking.ts';
import { agentJson, checkAgent } from '../../../lib/agent-auth.ts';
import { notifyStudio } from '../../../lib/notify.ts';
import { TIMEZONE } from '../../../data/booking.mjs';
import { bgIn, longDateLabel, zonedTimeLabel } from '../../../lib/time.ts';

/**
 * Запазването по телефона.
 *
 * Различава се от `/api/book` в три неща, всяко от които идва от това, че
 * насреща има глас, а не форма:
 *
 *   1. Имейлът НЕ е задължителен. Продиктуван на глас, той е грешен по-често,
 *      отколкото верен — „радослав точка додников“ стига до модела като
 *      каквото се сети. Телефонът е достатъчен и агентът и без това го знае
 *      от обаждането.
 *   2. Провалът не е код на състояние, а изречение. Агентът трябва да КАЖЕ
 *      какво е станало, а `409` не се изговаря. Затова всеки отговор носи
 *      `speak` — готов текст на езика на разговора.
 *   3. При зает час веднага се предлагат следващите свободни. Иначе агентът
 *      трябва да вика втори инструмент, а обаждащият се чака в мълчание.
 */
export const prerender = false;

type Payload = {
  start_utc?: unknown;
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  note?: unknown;
  locale?: unknown;
};

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime?.env ?? ({} as Env);
  const gate = checkAgent(request, env);
  if (!gate.ok) return gate.response;

  const db = env.BOOKINGS;
  if (!db) return agentJson({ ok: false, error: 'not_configured' }, 503);

  const body = (await request.json().catch(() => ({}))) as Payload;
  const locale = body.locale === 'en' ? 'en' : 'bg';
  const startUtc = Number(body.start_utc);
  const name = clean(body.name, 120);
  const phone = clean(body.phone, 40);
  const email = clean(body.email, 180);
  const note = clean(body.note, 1200);

  if (!Number.isFinite(startUtc) || name.length < 2) {
    return agentJson(
      {
        ok: false,
        error: 'invalid',
        speak:
          locale === 'en'
            ? 'I still need a name and a slot before I can book.'
            : 'Трябват ми име и час, за да запазя.',
      },
      422,
    );
  }

  const now = Date.now();
  const result = await createBooking(
    db,
    { startUtc, name, email, phone, note, source: 'agent', locale },
    now,
  );

  if (!result.ok) {
    // Часът е отишъл, докато сме говорили. Предлагаме следващите, за да може
    // агентът да продължи в същото изречение.
    const days = await availability(db, now, { limitDays: 1 });
    const alternatives = days[0]?.slots.slice(0, 3) ?? [];
    const times = alternatives.map((slot) => zonedTimeLabel(slot.startUtc, TIMEZONE));
    const dayLabel = days[0] ? longDateLabel(days[0].slots[0].startUtc, TIMEZONE, locale) : '';

    return agentJson(
      {
        ok: false,
        error: 'taken',
        alternatives: alternatives.map((slot) => ({
          start_utc: slot.startUtc,
          time: zonedTimeLabel(slot.startUtc, TIMEZONE),
        })),
        speak:
          times.length > 0
            ? locale === 'en'
              ? `That slot has just been taken. On ${dayLabel} I still have ${times.join(', ')}.`
              : `Този час току-що беше зает. ${bgIn(dayLabel, true)} ${dayLabel} са свободни ${times.join(', ')}.`
            : locale === 'en'
              ? 'That slot has just been taken and I have nothing else free right now.'
              : 'Този час току-що беше зает, а друг свободен в момента няма.',
      },
      409,
    );
  }

  const booking = result.booking;
  const notice = notifyStudio(env, booking);
  const ctx = locals.runtime?.ctx;
  if (ctx?.waitUntil) ctx.waitUntil(notice);
  else await notice;

  const when = `${longDateLabel(booking.start_utc, TIMEZONE, locale)}, ${zonedTimeLabel(booking.start_utc, TIMEZONE)}`;

  return agentJson(
    {
      ok: true,
      booking_id: booking.id,
      when,
      timezone: TIMEZONE,
      // Адресът е за прочитане на глас или за изпращане със съобщение —
      // от него човекът може да свали часа в календара си или да го откаже.
      manage_url: new URL(
        `${locale === 'en' ? '/en/booking/' : '/booking/'}?done=${booking.token}`,
        request.url,
      ).toString(),
      speak:
        locale === 'en'
          ? `Booked. ${when}, Bulgarian time. Radoslav will be there.`
          : `Готово, запазих ${when} българско време. Радослав ще те чака.`,
    },
    200,
  );
};

export const ALL: APIRoute = () =>
  new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
