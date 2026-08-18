/**
 * Файл за календара на посетителя.
 *
 * Ползва се на две места: като файл за сваляне от екрана с потвърждение и
 * като притурка към писмото до посетителя.
 *
 * Свалянето остава дори след като писмата тръгнаха. Часовете по телефона
 * често нямат имейл, а и писмо, което е попаднало в спам, не е получено —
 * бутонът на екрана е единственият път, който не зависи от чужд сървър.
 */

/** UTC момент → `20260114T080000Z`, единственият формат без часова зона. */
function stamp(utcMs: number): string {
  return new Date(utcMs).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Екранира текст според RFC 5545. Обратната наклонена черта е първа нарочно —
 * иначе би екранирала наклонените, които самата тя добавя.
 */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Сгъва реда на 75 октета, както изисква стандартът.
 *
 * Мери се в БАЙТОВЕ, не в знаци. На кирилица всеки знак е два байта в UTF-8 и
 * броенето на знаци би дало редове от 150 байта — Outlook ги отрязва, а
 * заглавието стига до получателя наполовина.
 */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;

  const out: string[] = [];
  let current = '';
  let currentBytes = 0;
  // Продълженията започват с интервал, който също влиза в лимита.
  let limit = 75;

  for (const char of line) {
    const size = new TextEncoder().encode(char).length;
    if (currentBytes + size > limit) {
      out.push(current);
      current = '';
      currentBytes = 0;
      limit = 74;
    }
    current += char;
    currentBytes += size;
  }
  if (current) out.push(current);
  return out.join('\r\n ');
}

export type CalendarEvent = {
  uid: string;
  startUtc: number;
  endUtc: number;
  title: string;
  description: string;
  organiserName: string;
  organiserEmail: string;
  url?: string;
  createdUtc: number;
};

export function buildIcs(event: CalendarEvent): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kova Studio//Booking//BG',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${stamp(event.createdUtc)}`,
    `DTSTART:${stamp(event.startUtc)}`,
    `DTEND:${stamp(event.endUtc)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    `ORGANIZER;CN=${escapeText(event.organiserName)}:mailto:${event.organiserEmail}`,
    ...(event.url ? [`URL:${escapeText(event.url)}`] : []),
    'STATUS:CONFIRMED',
    // Напомняне 30 минути преди началото. Часът е безплатен разговор — човек,
    // който го е запазил преди две седмици, го е забравил.
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Разговор с Кова студио',
    'TRIGGER:-PT30M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  // Стандартът иска CRLF; \n сам по себе си чупи вноса в част от календарите.
  return lines.map(fold).join('\r\n') + '\r\n';
}
