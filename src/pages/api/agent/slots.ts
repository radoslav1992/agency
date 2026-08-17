import type { APIRoute } from 'astro';
import { availability, describeHours } from '../../../lib/booking.ts';
import { agentJson, checkAgent } from '../../../lib/agent-auth.ts';
import { TIMEZONE } from '../../../data/booking.mjs';
import { bgIn, longDateLabel, zonedTimeLabel } from '../../../lib/time.ts';

/**
 * „Кога е свободен Радослав?“ — инструментът, който агентът вика, преди да
 * предложи час.
 *
 * Отговорът е нарочно КРАТЪК. Агентът трябва да го изговори, а не да го
 * прочете: двайсет часа, изредени на глас, са неразбираеми. Затова по
 * подразбиране се връщат три дни по най-много четири часа — достатъчно за
 * „утре в 10, в 11:20 или в 14“, и достатъчно малко, за да остане разговор.
 *
 * Всеки час носи и `start_utc` — точното число, което после се подава на
 * `/api/agent/book`. Така агентът никога не превръща „в два и половина“ в
 * час сам; той връща обратно това, което сме му дали.
 */
export const prerender = false;

const MAX_DAYS = 3;
const MAX_PER_DAY = 4;

export const GET: APIRoute = async ({ request, locals, url }) => {
  const env = locals.runtime?.env ?? ({} as Env);
  const gate = checkAgent(request, env);
  if (!gate.ok) return gate.response;

  const db = env.BOOKINGS;
  if (!db) return agentJson({ error: 'not_configured' }, 503);

  const locale = url.searchParams.get('locale') === 'en' ? 'en' : 'bg';
  const now = Date.now();
  const days = await availability(db, now, { limitDays: MAX_DAYS });

  if (days.length === 0) {
    return agentJson(
      {
        timezone: TIMEZONE,
        working_hours: describeHours(),
        days: [],
        // Изречение, което агентът може да каже дословно, вместо да съчинява
        // обяснение защо няма часове.
        speak:
          locale === 'en'
            ? 'There are no free slots in the next three weeks. I can take your details and Radoslav will get back to you.'
            : 'Няма свободни часове в следващите три седмици. Мога да запиша данните ти и Радослав ще се свърже.',
      },
      200,
    );
  }

  const shaped = days.map((day) => ({
    date: day.date,
    label: longDateLabel(day.slots[0].startUtc, TIMEZONE, locale),
    slots: day.slots.slice(0, MAX_PER_DAY).map((slot) => ({
      start_utc: slot.startUtc,
      time: zonedTimeLabel(slot.startUtc, TIMEZONE),
    })),
  }));

  const first = shaped[0];
  return agentJson(
    {
      timezone: TIMEZONE,
      working_hours: describeHours(),
      duration_minutes: 30,
      days: shaped,
      speak:
        locale === 'en'
          ? `The nearest free slots are on ${first.label}: ${first.slots.map((s) => s.time).join(', ')}.`
          : `Най-близките свободни часове са ${bgIn(first.label)} ${first.label}: ${first.slots.map((s) => s.time).join(', ')}.`,
    },
    200,
  );
};

export const ALL: APIRoute = () =>
  new Response('Method Not Allowed', { status: 405, headers: { allow: 'GET' } });
