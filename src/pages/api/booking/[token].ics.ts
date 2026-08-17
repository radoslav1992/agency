import type { APIRoute } from 'astro';
import { bookingByToken } from '../../../lib/booking.ts';
import { buildIcs } from '../../../lib/ics.ts';
import { SITE } from '../../../data/site.mjs';
import { TIMEZONE } from '../../../data/booking.mjs';
import { zonedDateKey, zonedTimeLabel } from '../../../lib/time.ts';

/**
 * Файлът за календара на посетителя.
 *
 * Пътят носи тайния низ, а не идентификатора: адресът се отваря от календарно
 * приложение, тоест минава през чужд сървър, и не бива да се познава по ред.
 */
export const prerender = false;

export const GET: APIRoute = async ({ params, locals, url }) => {
  const db = locals.runtime?.env?.BOOKINGS;
  if (!db) return new Response('Not Found', { status: 404 });

  const booking = await bookingByToken(db, String(params.token ?? ''));
  if (!booking || booking.status !== 'confirmed') {
    return new Response('Not Found', { status: 404 });
  }

  const locale = booking.locale === 'en' ? 'en' : 'bg';
  const bookingUrl = new URL(
    `${locale === 'en' ? '/en/booking/' : '/booking/'}?done=${booking.token}`,
    url.origin,
  ).toString();

  const ics = buildIcs({
    uid: `${booking.id}@kova.bg`,
    startUtc: booking.start_utc,
    endUtc: booking.start_utc + booking.minutes * 60_000,
    title:
      locale === 'en' ? 'Call with Kova Studio' : 'Разговор с Кова студио',
    description:
      locale === 'en'
        ? `A ${booking.minutes}-minute call with Radoslav Dodnikov.\n\nManage or cancel: ${bookingUrl}`
        : `${booking.minutes}-минутен разговор с Радослав Додников.\n\nПромяна или отказ: ${bookingUrl}`,
    organiserName: locale === 'en' ? 'Kova Studio' : 'Кова студио',
    organiserEmail: SITE.email,
    url: bookingUrl,
    createdUtc: booking.created_utc,
  });

  return new Response(ics, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      // Име по ISO дата: „вторник, 18 август“ минава през ASCII филтъра на
      // заглавието и излиза като „kova--18-14-00.ics“.
      'content-disposition': `attachment; filename="kova-${zonedDateKey(booking.start_utc, TIMEZONE)}-${zonedTimeLabel(booking.start_utc, TIMEZONE).replace(':', '')}.ics"`,
      // Часът може да бъде отказан; кеширано копие би възкресявало отменен час.
      'cache-control': 'no-store',
    },
  });
};
