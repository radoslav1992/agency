import type { APIRoute } from 'astro';
import { availability, describeHours, type Slot } from '../../../lib/booking.ts';
import { agentJson, checkAgent } from '../../../lib/agent-auth.ts';
import { HORIZON_DAYS, TIMEZONE } from '../../../data/booking.mjs';
import {
  bgIn,
  longDateLabel,
  parseDateKey,
  utcToZonedParts,
  zonedDateKey,
  zonedTimeLabel,
} from '../../../lib/time.ts';

/**
 * „Кога е свободен Радослав?“ — инструментът, който агентът вика, преди да
 * предложи час.
 *
 * Отговорът е нарочно КРАТЪК. Агентът трябва да го изговори, а не да го
 * прочете: двайсет часа, изредени на глас, са неразбираеми. Затова по
 * подразбиране се връщат три дни по най-много четири часа.
 *
 * Но разговорът не върви само напред. Човекът отсреща казва „а другата
 * седмица?“, „може ли на 28-ми?“, „предпочитам следобед“ — и ако инструментът
 * умее само „най-близките три дни“, агентът или отказва, или си измисля час.
 * Затова приема и:
 *
 *   `date`  точно този ден
 *   `from`  оттук нататък
 *   `part`  само преди или само след обед
 *
 * Празният отговор е забранен по замисъл. Поиска ли се ден без свободни
 * часове, се връщат най-близките други плюс готово изречение — иначе агентът
 * стига до задънена улица насред обаждането.
 */
export const prerender = false;

const MAX_DAYS = 3;
const MAX_PER_DAY = 4;
/** Границата между „преди обед“ и „следобед“, в местни часове. */
const NOON = 13;

type Part = 'morning' | 'afternoon' | null;

const inPart = (slot: Slot, part: Part) => {
  if (!part) return true;
  const { hour } = utcToZonedParts(slot.startUtc, TIMEZONE);
  return part === 'morning' ? hour < NOON : hour >= NOON;
};

export const GET: APIRoute = async ({ request, locals, url }) => {
  const env = locals.runtime?.env ?? ({} as Env);
  const gate = checkAgent(request, env);
  if (!gate.ok) return gate.response;

  const db = env.BOOKINGS;
  if (!db) return agentJson({ error: 'not_configured' }, 503);

  const en = url.searchParams.get('locale') === 'en';
  const now = Date.now();
  const today = zonedDateKey(now, TIMEZONE);

  const partRaw = url.searchParams.get('part');
  const part: Part = partRaw === 'morning' || partRaw === 'afternoon' ? partRaw : null;
  const wantDate = url.searchParams.get('date');
  const wantFrom = url.searchParams.get('from');

  /**
   * Идва във ВСЕКИ отговор.
   *
   * Моделът не знае надеждно коя дата е днес — „утре“ и „другия вторник“ са
   * догадка, ако не му я кажем. Оттук нататък може да си я пресметне и да
   * подаде `date`, вместо да гадае.
   */
  const base = {
    timezone: TIMEZONE,
    today,
    horizon_days: HORIZON_DAYS,
    duration_minutes: 30,
    working_hours: describeHours(),
  };

  const shape = (days: { date: string; slots: Slot[] }[]) =>
    days.map((day) => ({
      date: day.date,
      label: longDateLabel(day.slots[0].startUtc, TIMEZONE, en ? 'en' : 'bg'),
      slots: day.slots.slice(0, MAX_PER_DAY).map((slot) => ({
        start_utc: slot.startUtc,
        time: zonedTimeLabel(slot.startUtc, TIMEZONE),
      })),
    }));

  const sentence = (days: ReturnType<typeof shape>) => {
    const first = days[0];
    const times = first.slots.map((s) => s.time).join(', ');
    return en
      ? `On ${first.label} I have ${times}.`
      : `${bgIn(first.label, true)} ${first.label} са свободни ${times}.`;
  };

  // Всички дни със свободни часове в прозореца; филтрирането е отдолу.
  const all = (await availability(db, now)).map((day) => ({
    date: day.date,
    slots: day.slots.filter((slot) => inPart(slot, part)),
  })).filter((day) => day.slots.length > 0);

  const partWord = en
    ? part === 'morning' ? ' in the morning' : part === 'afternoon' ? ' in the afternoon' : ''
    : part === 'morning' ? ' преди обед' : part === 'afternoon' ? ' следобед' : '';

  /* ---------- поискан е конкретен ден ---------- */

  if (wantDate) {
    if (!parseDateKey(wantDate)) {
      return agentJson(
        { ...base, days: [], error: 'bad_date', speak: en ? 'I did not catch which day you mean.' : 'Не разбрах за кой ден става дума.' },
        422,
      );
    }

    const day = all.find((entry) => entry.date === wantDate);
    if (day) {
      const shaped = shape([day]);
      return agentJson({ ...base, requested: wantDate, days: shaped, speak: sentence(shaped) }, 200);
    }

    // Денят е зает или изобщо не се работи. Не оставяме агента без отговор —
    // веднага му даваме какво да предложи вместо него.
    const near = shape(all.slice(0, 2));
    const past = wantDate < today;
    const beyond = wantDate > zonedDateKey(now + HORIZON_DAYS * 86_400_000, TIMEZONE);

    const why = past
      ? en ? 'That day has already passed.' : 'Този ден вече е минал.'
      : beyond
        ? en
          ? `I can only book ${HORIZON_DAYS} days ahead.`
          : `Мога да запазя най-много ${HORIZON_DAYS} дни напред.`
        : en
          ? `There is nothing free${partWord} that day.`
          : `Няма свободно${partWord} в този ден.`;

    return agentJson(
      {
        ...base,
        requested: wantDate,
        days: [],
        alternatives: near,
        speak: near.length > 0 ? `${why} ${sentence(near)}` : why,
      },
      200,
    );
  }

  /* ---------- поискано е „оттук нататък“ ---------- */

  const from = wantFrom && parseDateKey(wantFrom) ? wantFrom : null;
  const window = from ? all.filter((day) => day.date >= from) : all;

  if (window.length === 0) {
    const why = from
      ? en
        ? `I have nothing free${partWord} from ${from} onwards, within the next ${HORIZON_DAYS} days.`
        : `Няма свободно${partWord} след ${from} в следващите ${HORIZON_DAYS} дни.`
      : en
        ? `There are no free slots${partWord} in the next ${HORIZON_DAYS} days. I can take your details and Radoslav will get back to you.`
        : `Няма свободни часове${partWord} в следващите ${HORIZON_DAYS} дни. Мога да запиша данните ти и Радослав ще се свърже.`;

    // При филтър по част от деня показваме и какво остава без него — иначе
    // „няма следобед“ звучи като „няма нищо“.
    const anyway = part ? shape((await availability(db, now)).slice(0, 2)) : [];
    return agentJson(
      {
        ...base,
        days: [],
        ...(anyway.length > 0 ? { alternatives: anyway } : {}),
        speak: anyway.length > 0 ? `${why} ${sentence(anyway)}` : why,
      },
      200,
    );
  }

  const shaped = shape(window.slice(0, MAX_DAYS));
  return agentJson(
    {
      ...base,
      ...(from ? { from } : {}),
      days: shaped,
      speak: from || part ? sentence(shaped) : en
        ? `The nearest free slots are on ${shaped[0].label}: ${shaped[0].slots.map((s) => s.time).join(', ')}.`
        : `Най-близките свободни часове са ${bgIn(shaped[0].label)} ${shaped[0].label}: ${shaped[0].slots.map((s) => s.time).join(', ')}.`,
    },
    200,
  );
};

export const ALL: APIRoute = () =>
  new Response('Method Not Allowed', { status: 405, headers: { allow: 'GET' } });
