/**
 * Превръщане между местно софийско време и UTC.
 *
 * Без библиотека. `Intl` в workerd носи пълните данни за часовите зони —
 * проверено с проба на самия runtime: 15 януари дава GMT+2, 15 юли GMT+3, а
 * `Intl.supportedValuesOf('timeZone')` връща 418 зони. Библиотека като
 * date-fns-tz би добавила килобайти, за да чете същата тази таблица.
 *
 * Правилото на целия календар: в базата и по мрежата се движат UTC
 * милисекунди. Местното време съществува само в двата края — в правилата за
 * работното време, които човек пише на ръка, и на екрана, който човек чете.
 */

/**
 * Отместването на зоната спрямо UTC в даден момент, в милисекунди.
 *
 * Работи, като пита `Intl` колко е часът в зоната за този момент и вади
 * разликата. `en-CA` дава `ГГГГ-ММ-ДД`, което се чете еднозначно —
 * американският формат би объркал деня с месеца.
 */
function offsetAt(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  // При `hour12: false` полунощ излиза като „24“ в някои версии на ICU.
  const hour = get('hour') % 24;

  const asIfUtc = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'));
  return asIfUtc - utcMs;
}

/**
 * Местно време в зоната → UTC милисекунди.
 *
 * Двустъпков, защото отместването зависи от момента, който тепърва търсим.
 * Първо приемаме, че въведеното е UTC, питаме какво е отместването там и се
 * коригираме. Ако корекцията ни е прехвърлила през смяната на часовото
 * време, отместването на новия момент е различно и минаваме още веднъж.
 *
 * Несъществуващи и двойни местни часове (последната неделя на март и на
 * октомври) се разрешават към съседното отместване. За този календар случаят
 * е теоретичен — смяната е в 03:00 през нощта, а разговори се предлагат от
 * 10:00 — но алгоритъмът не бива да зависи от работното време, за да е верен.
 */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): number {
  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let utc = asIfUtc - offsetAt(asIfUtc, timeZone);
  const refined = asIfUtc - offsetAt(utc, timeZone);
  if (refined !== utc) utc = refined;
  return utc;
}

/** Частите на местното време в зоната за даден UTC момент. */
export function utcToZonedParts(
  utcMs: number,
  timeZone: string,
): { year: number; month: number; day: number; hour: number; minute: number; weekday: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(utcMs));

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  const year = get('year');
  const month = get('month');
  const day = get('day');

  return {
    year,
    month,
    day,
    hour: get('hour') % 24,
    minute: get('minute'),
    // Денят от седмицата на местната дата. Смята се от самата дата, а не от
    // `new Date(utcMs).getUTCDay()`, който за 23:30 софийско време в понеделник
    // все още връща понеделник по UTC, но за 01:30 във вторник връща понеделник.
    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
  };
}

/** `ГГГГ-ММ-ДД` за местната дата на даден UTC момент. */
export function zonedDateKey(utcMs: number, timeZone: string): string {
  const { year, month, day } = utcToZonedParts(utcMs, timeZone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** `ЧЧ:ММ` местно време. */
export function zonedTimeLabel(utcMs: number, timeZone: string): string {
  const { hour, minute } = utcToZonedParts(utcMs, timeZone);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** Разбира `ГГГГ-ММ-ДД`; връща `null` при какъвто и да е друг вид низ. */
export function parseDateKey(key: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Отсява 31 февруари: пресмятаме датата и я сравняваме обратно.
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return null;
  return { year, month, day };
}

/** Дълга дата за четене — „понеделник, 3 март“. */
export function longDateLabel(utcMs: number, timeZone: string, locale: 'bg' | 'en'): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'bg-BG', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(utcMs));
}

/**
 * „в“ или „във“ пред дадена дума.
 *
 * Предлогът се удължава пред в- и ф-: „във вторник“, „във февруари“. Агентът
 * ИЗГОВАРЯ тези изречения — „в вторник“ се чува веднага и разваля усещането,
 * че отсреща има някой, който говори български.
 */
export function bgIn(word: string, capital = false): string {
  const preposition = /^[вВфФ]/.test(word.trim()) ? 'във' : 'в';
  return capital ? preposition[0].toUpperCase() + preposition.slice(1) : preposition;
}

/** Кратката етикетка на зоната за момента — „EET“ / „EEST“. */
export function zoneAbbreviation(utcMs: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, timeZoneName: 'short' }).formatToParts(
    new Date(utcMs),
  );
  return parts.find((part) => part.type === 'timeZoneName')?.value ?? timeZone;
}
