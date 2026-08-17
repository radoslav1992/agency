/**
 * Свободните часове и запазването им.
 *
 * Един двигател за трите входа — страницата, гласовият агент и панелът. Ако
 * всеки си смяташе слотовете, агентът щеше да предлага часове, които сайтът
 * вече не показва, и обратното. Разминаване, което се вижда чак когато някой
 * дойде на разговор, за който не си знаел.
 */

import {
  BUFFER_MINUTES,
  DURATION_MINUTES,
  HOLIDAYS,
  HORIZON_DAYS,
  HOURS,
  MIN_LEAD_HOURS,
  TIMEZONE,
} from '../data/booking.mjs';
import { parseDateKey, utcToZonedParts, zonedDateKey, zonedTimeToUtc } from './time.ts';

export type Slot = { startUtc: number; endUtc: number };

export type Booking = {
  id: string;
  start_utc: number;
  minutes: number;
  name: string;
  email: string;
  phone: string;
  note: string;
  source: string;
  status: string;
  token: string;
  locale: string;
  created_utc: number;
  cancelled_utc: number | null;
};

/** Крачката на мрежата: разговорът плюс почивката след него. */
export const STEP_MINUTES = DURATION_MINUTES + BUFFER_MINUTES;

const MINUTE = 60_000;
const DAY = 86_400_000;

/** `'14:30'` → 870 минути от полунощ. Хвърля при нечетлив запис в правилата. */
function minutesOfDay(label: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(label);
  if (!match) throw new Error(`Невалиден час в HOURS: ${label}`);
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Всички начала на разговор за една местна дата, независимо дали са свободни.
 *
 * Часовете се смятат в местно време и чак тогава се превръщат в UTC — точно
 * обратното на изкушението да се работи в UTC и да се добавят два часа. През
 * лятото разликата е три и „10:00“ би станало 11:00 или 09:00 половин година.
 */
export function slotGrid(dateKey: string): Slot[] {
  const date = parseDateKey(dateKey);
  if (!date) return [];
  if (HOLIDAYS.includes(dateKey)) return [];

  const weekday = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
  const ranges = (HOURS as Record<number, readonly (readonly string[])[]>)[weekday];
  if (!ranges) return [];

  const slots: Slot[] = [];
  for (const [from, to] of ranges) {
    const open = minutesOfDay(from);
    const close = minutesOfDay(to);
    // `+ DURATION_MINUTES <= close`: разговорът трябва да свърши вътре в
    // интервала, а не само да започне в него.
    for (let minute = open; minute + DURATION_MINUTES <= close; minute += STEP_MINUTES) {
      const startUtc = zonedTimeToUtc(
        date.year,
        date.month,
        date.day,
        Math.floor(minute / 60),
        minute % 60,
        TIMEZONE,
      );
      slots.push({ startUtc, endUtc: startUtc + DURATION_MINUTES * MINUTE });
    }
  }
  return slots.sort((a, b) => a.startUtc - b.startUtc);
}

/** Първият момент, за който изобщо приемаме запазване. */
export function earliestStart(now: number): number {
  return now + MIN_LEAD_HOURS * 3_600_000;
}

/** Последният. */
export function latestStart(now: number): number {
  return now + HORIZON_DAYS * DAY;
}

/** Местните дати в прозореца, по ред. */
export function datesInWindow(now: number): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  // Крачка от 12 часа, за да не пропусне ден заради смяната на часовото време.
  for (let ms = now; ms <= latestStart(now); ms += DAY / 2) {
    const key = zonedDateKey(ms, TIMEZONE);
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }
  return keys;
}

type Busy = { start: number; end: number };

/**
 * Заетото време в прозореца: потвърдените разговори и ръчните блокировки.
 *
 * Една заявка за двете таблици вместо две обръщения — D1 плаща по обръщане и
 * страницата чака и двете, преди да покаже каквото и да е.
 */
export async function busyIn(db: D1Database, fromUtc: number, toUtc: number): Promise<Busy[]> {
  const [bookings, blocks] = await db.batch<{ start_utc: number; end_utc: number }>([
    db
      .prepare(
        `SELECT start_utc, start_utc + minutes * 60000 AS end_utc
           FROM bookings
          WHERE status = 'confirmed' AND start_utc < ?2 AND start_utc + minutes * 60000 > ?1`,
      )
      .bind(fromUtc, toUtc),
    db
      .prepare(
        `SELECT start_utc, end_utc FROM blocks WHERE start_utc < ?2 AND end_utc > ?1`,
      )
      .bind(fromUtc, toUtc),
  ]);

  return [...bookings.results, ...blocks.results].map((row) => ({
    start: Number(row.start_utc),
    end: Number(row.end_utc),
  }));
}

const overlaps = (slot: Slot, busy: Busy) => slot.startUtc < busy.end && slot.endUtc > busy.start;

/**
 * Свободните часове, групирани по местна дата.
 *
 * Дни без свободен час изобщо не се връщат — списък с дати, половината от
 * които при натискане казват „няма нищо“, е по-лош от по-къс списък.
 */
export async function availability(
  db: D1Database,
  now: number,
  options: { onlyDate?: string; limitDays?: number } = {},
): Promise<{ date: string; slots: Slot[] }[]> {
  const from = earliestStart(now);
  const to = latestStart(now);
  const busy = await busyIn(db, from, to + DURATION_MINUTES * MINUTE);

  const dates = options.onlyDate ? [options.onlyDate] : datesInWindow(now);
  const days: { date: string; slots: Slot[] }[] = [];

  for (const date of dates) {
    const slots = slotGrid(date).filter(
      (slot) =>
        slot.startUtc >= from &&
        slot.startUtc <= to &&
        !busy.some((interval) => overlaps(slot, interval)),
    );
    if (slots.length > 0) days.push({ date, slots });
    if (options.limitDays && days.length >= options.limitDays) break;
  }

  return days;
}

/** Дали точно този момент е валидно начало на свободен разговор. */
export async function isBookable(db: D1Database, startUtc: number, now: number): Promise<boolean> {
  if (startUtc < earliestStart(now) || startUtc > latestStart(now)) return false;
  const date = zonedDateKey(startUtc, TIMEZONE);
  // Трябва да е точно върху мрежата — иначе агент, който е чул „към три“,
  // може да запази 15:07 и да разкъса деня.
  if (!slotGrid(date).some((slot) => slot.startUtc === startUtc)) return false;
  const busy = await busyIn(db, startUtc, startUtc + DURATION_MINUTES * MINUTE);
  return !busy.some((interval) => overlaps({ startUtc, endUtc: startUtc + DURATION_MINUTES * MINUTE }, interval));
}

export type NewBooking = {
  startUtc: number;
  name: string;
  email: string;
  phone: string;
  note: string;
  source: 'web' | 'agent' | 'admin';
  locale: string;
};

export type BookResult =
  | { ok: true; booking: Booking }
  | { ok: false; reason: 'taken' | 'invalid' };

/**
 * Записва разговора.
 *
 * Проверката преди вмъкването е за добро съобщение, не за коректност:
 * истинската защита е уникалният индекс в схемата. Между `isBookable` и
 * `INSERT` може да мине чуждо запазване и точно тогава базата отказва
 * второто вмъкване, а ние го превеждаме на „часът току-що беше зает“.
 */
export async function createBooking(
  db: D1Database,
  input: NewBooking,
  now: number,
): Promise<BookResult> {
  if (!(await isBookable(db, input.startUtc, now))) return { ok: false, reason: 'taken' };

  const booking: Booking = {
    id: crypto.randomUUID(),
    start_utc: input.startUtc,
    minutes: DURATION_MINUTES,
    name: input.name,
    email: input.email,
    phone: input.phone,
    note: input.note,
    source: input.source,
    status: 'confirmed',
    token: crypto.randomUUID().replace(/-/g, ''),
    locale: input.locale,
    created_utc: now,
    cancelled_utc: null,
  };

  try {
    await db
      .prepare(
        `INSERT INTO bookings
           (id, start_utc, minutes, name, email, phone, note, source, status, token, locale, created_utc)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'confirmed', ?9, ?10, ?11)`,
      )
      .bind(
        booking.id,
        booking.start_utc,
        booking.minutes,
        booking.name,
        booking.email,
        booking.phone,
        booking.note,
        booking.source,
        booking.token,
        booking.locale,
        booking.created_utc,
      )
      .run();
  } catch (error) {
    // D1 връща текста на SQLite. Само нарушеното ограничение значи „зает“;
    // всичко останало е истинска грешка и не бива да се маскира като зает час.
    const message = String((error as Error)?.message ?? '');
    if (/UNIQUE|constraint/i.test(message)) return { ok: false, reason: 'taken' };
    throw error;
  }

  return { ok: true, booking };
}

export async function bookingByToken(db: D1Database, token: string): Promise<Booking | null> {
  if (!/^[a-f0-9]{32}$/.test(token)) return null;
  return db.prepare('SELECT * FROM bookings WHERE token = ?1').bind(token).first<Booking>();
}

export async function cancelBooking(db: D1Database, id: string, now: number): Promise<void> {
  await db
    .prepare(
      `UPDATE bookings SET status = 'cancelled', cancelled_utc = ?2
        WHERE id = ?1 AND status = 'confirmed'`,
    )
    .bind(id, now)
    .run();
}

export async function upcomingBookings(db: D1Database, now: number): Promise<Booking[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM bookings
        WHERE start_utc > ?1 AND status = 'confirmed'
        ORDER BY start_utc ASC LIMIT 200`,
    )
    .bind(now - DAY)
    .all<Booking>();
  return results;
}

export async function addBlock(
  db: D1Database,
  startUtc: number,
  endUtc: number,
  reason: string,
  now: number,
): Promise<void> {
  await db
    .prepare('INSERT INTO blocks (id, start_utc, end_utc, reason, created_utc) VALUES (?1, ?2, ?3, ?4, ?5)')
    .bind(crypto.randomUUID(), startUtc, endUtc, reason, now)
    .run();
}

export async function listBlocks(db: D1Database, now: number) {
  const { results } = await db
    .prepare('SELECT * FROM blocks WHERE end_utc > ?1 ORDER BY start_utc ASC LIMIT 100')
    .bind(now)
    .all<{ id: string; start_utc: number; end_utc: number; reason: string }>();
  return results;
}

export async function removeBlock(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM blocks WHERE id = ?1').bind(id).run();
}

/** Работното време като изречение — за описанието на инструмента на агента. */
export function describeHours(): string {
  const names = ['неделя', 'понеделник', 'вторник', 'сряда', 'четвъртък', 'петък', 'събота'];
  return Object.entries(HOURS)
    .map(([day, ranges]) => `${names[Number(day)]}: ${ranges.map(([a, b]) => `${a}–${b}`).join(', ')}`)
    .join('; ');
}

export { DURATION_MINUTES, TIMEZONE, utcToZonedParts };
