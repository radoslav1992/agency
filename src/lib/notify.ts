/**
 * Известията около запазен разговор.
 *
 * Две посоки, две отделни връзки към пощата, и разликата между тях е нарочна:
 *
 *   `SEND_EMAIL`      → само до студиото. Вързана е с `destination_address`,
 *                       тоест не може да пише на никой друг, дори при грешка в
 *                       кода. Изпращането до потвърден адрес е безплатно и не
 *                       влиза в месечната сметка.
 *
 *   `SEND_TO_VISITOR` → до когото трябва. Без ограничение в настройката.
 *                       Изисква включено Email Sending (Cloudflare Email
 *                       Service, публична бета) и Workers Paid.
 *
 * Разделянето не е педантизъм. Ограничената връзка е доказана и върши работа
 * от контактната форма насам; новата е бета и зависи от настройка в таблото.
 * Ако бетата не е включена или спре, писмата до посетителя се провалят и се
 * записват в дневника — а известието до теб продължава да пристига. Една обща
 * връзка би вързала двете съдби заедно.
 *
 * Никоя от функциите тук НЕ хвърля. Часът вече е в базата, когато се викат;
 * пропаднало писмо не бива да разваля запазване, което човекът вече е видял
 * на екрана си.
 */

import type { Booking } from './booking.ts';
import { buildIcs } from './ics.ts';
import { TIMEZONE } from '../data/booking.mjs';
import { SITE } from '../data/site.mjs';
import { longDateLabel, zonedDateKey, zonedTimeLabel } from './time.ts';

function headerSafe(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

/** Кирилица в тялото минава през base64, иначе пристига като въпросителни. */
function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return (btoa(binary).match(/.{1,76}/g) ?? []).join('\r\n');
}

/** Кога е разговорът, изписано за човек. */
export function whenLabel(booking: Booking, locale: 'bg' | 'en' = 'bg'): string {
  const day = longDateLabel(booking.start_utc, TIMEZONE, locale);
  const time = zonedTimeLabel(booking.start_utc, TIMEZONE);
  return `${day}, ${time}`;
}

const localeOf = (booking: Booking): 'bg' | 'en' => (booking.locale === 'en' ? 'en' : 'bg');

async function mime() {
  const [{ EmailMessage }, { createMimeMessage, Mailbox }] = await Promise.all([
    import('cloudflare:email'),
    import('mimetext/browser'),
  ]);
  return { EmailMessage, createMimeMessage, Mailbox };
}

/* ------------------------------------------------------------------ */
/* към студиото                                                        */
/* ------------------------------------------------------------------ */

export async function notifyStudio(env: Env, booking: Booking, cancelled = false): Promise<void> {
  const to = env.CONTACT_TO;
  const from = env.CONTACT_FROM;
  if (!env.SEND_EMAIL || !to || !from) {
    console.warn('Няма връзка за поща — известието към студиото е пропуснато.');
    return;
  }

  try {
    const { EmailMessage, createMimeMessage, Mailbox } = await mime();
    const name = headerSafe(booking.name);

    const lines = [
      cancelled ? 'ОТКАЗАН РАЗГОВОР' : 'Нов запазен разговор',
      '',
      `Кога: ${whenLabel(booking)} (${TIMEZONE})`,
      `Име: ${booking.name}`,
      `Имейл: ${booking.email || '—'}`,
      `Телефон: ${booking.phone || '—'}`,
      `Откъде: ${booking.source === 'agent' ? 'гласовия агент' : booking.source === 'admin' ? 'панела' : 'сайта'}`,
      '',
      booking.note ? `Бележка:\n${booking.note}` : 'Без бележка.',
    ];

    // Часът от агента заслужава ред отгоре: гласът бърка имейли и е добре да
    // се погледне, преди да разчиташ на адреса.
    if (booking.source === 'agent') {
      lines.splice(1, 0, '', 'Записано по телефона — провери имейла, преди да пишеш на него.');
    }

    const msg = createMimeMessage();
    msg.setSender({ name: 'Кова студио', addr: from });
    msg.setRecipient(to);
    msg.setSubject(
      headerSafe(`${cancelled ? 'Отказан' : 'Запазен'} разговор — ${whenLabel(booking)} — ${name}`),
    );
    if (booking.email) msg.setHeader('Reply-To', new Mailbox({ name, addr: booking.email }));
    msg.addMessage({ contentType: 'text/plain', encoding: 'base64', data: toBase64(lines.join('\r\n')) });

    await env.SEND_EMAIL.send(new EmailMessage(from, to, msg.asRaw()));
  } catch (error) {
    console.error('Известието към студиото не тръгна', error);
  }
}

/* ------------------------------------------------------------------ */
/* към посетителя                                                      */
/* ------------------------------------------------------------------ */

function confirmationBody(booking: Booking, manageUrl: string): { subject: string; body: string } {
  const when = whenLabel(booking, localeOf(booking));
  if (localeOf(booking) === 'en') {
    return {
      subject: `Booked: ${when} (Bulgarian time)`,
      body: [
        `Hi ${booking.name},`,
        '',
        `Your call with Kova Studio is booked for ${when}, Bulgarian time (${TIMEZONE}).`,
        `It lasts ${booking.minutes} minutes and costs nothing.`,
        '',
        'The calendar file is attached — open it once and the slot lands in your calendar with a reminder.',
        '',
        `If something comes up, cancel here: ${manageUrl}`,
        '',
        'See you then,',
        'Radoslav Dodnikov',
        SITE.url,
      ].join('\r\n'),
    };
  }
  return {
    subject: `Запазен час: ${when} (българско време)`,
    body: [
      `Здравей, ${booking.name},`,
      '',
      `Разговорът ти с Кова студио е запазен за ${when} българско време (${TIMEZONE}).`,
      `Продължава ${booking.minutes} минути и е безплатен.`,
      '',
      'Прикачил съм файл за календара — отвори го веднъж и часът влиза при теб, с напомняне преди началото.',
      '',
      `Ако се наложи да го отмениш: ${manageUrl}`,
      '',
      'До скоро,',
      'Радослав Додников',
      SITE.url,
    ].join('\r\n'),
  };
}

function cancellationBody(booking: Booking, bookingUrl: string): { subject: string; body: string } {
  const when = whenLabel(booking, localeOf(booking));
  if (localeOf(booking) === 'en') {
    return {
      subject: `Cancelled: ${when}`,
      body: [
        `Hi ${booking.name},`,
        '',
        `I had to cancel our call on ${when}. Sorry for the change.`,
        '',
        `You can pick another slot here: ${bookingUrl}`,
        '',
        'Radoslav Dodnikov',
        SITE.url,
      ].join('\r\n'),
    };
  }
  return {
    subject: `Отменен час: ${when}`,
    body: [
      `Здравей, ${booking.name},`,
      '',
      `Наложи се да отменя разговора ни на ${when}. Извинявам се за промяната.`,
      '',
      `Може да избереш друг час оттук: ${bookingUrl}`,
      '',
      'Радослав Додников',
      SITE.url,
    ].join('\r\n'),
  };
}

/**
 * Пише на посетителя.
 *
 * `origin` идва от заявката, а не от `SITE.url`, за да работят връзките и при
 * местна разработка, и на предварителен адрес.
 */
export async function notifyVisitor(
  env: Env,
  booking: Booking,
  origin: string,
  kind: 'confirmed' | 'cancelled' = 'confirmed',
): Promise<void> {
  const from = env.BOOKING_FROM ?? env.CONTACT_FROM;

  if (!booking.email) return; // Часовете по телефона често нямат имейл — това е нормално.
  if (!env.SEND_TO_VISITOR || !from) {
    console.warn(
      'Няма връзка SEND_TO_VISITOR — потвърждението до посетителя е пропуснато. ' +
        'Изисква включено Email Sending в Cloudflare.',
    );
    return;
  }

  const locale = localeOf(booking);
  const base = locale === 'en' ? '/en/booking/' : '/booking/';
  const manageUrl = new URL(`${base}?done=${booking.token}`, origin).toString();
  const bookingUrl = new URL(base, origin).toString();

  try {
    const { EmailMessage, createMimeMessage, Mailbox } = await mime();
    const { subject, body } =
      kind === 'confirmed'
        ? confirmationBody(booking, manageUrl)
        : cancellationBody(booking, bookingUrl);

    const msg = createMimeMessage();
    msg.setSender({ name: locale === 'en' ? 'Kova Studio' : 'Кова студио', addr: from });
    msg.setRecipient(booking.email);
    msg.setSubject(headerSafe(subject));
    // Отговорът отива при човека, не в кутията на формата.
    msg.setHeader('Reply-To', new Mailbox({ name: 'Радослав Додников', addr: SITE.email }));
    msg.addMessage({ contentType: 'text/plain', encoding: 'base64', data: toBase64(body) });

    if (kind === 'confirmed') {
      const ics = buildIcs({
        uid: `${booking.id}@kova.bg`,
        startUtc: booking.start_utc,
        endUtc: booking.start_utc + booking.minutes * 60_000,
        title: locale === 'en' ? 'Call with Kova Studio' : 'Разговор с Кова студио',
        description:
          locale === 'en'
            ? `A ${booking.minutes}-minute call with Radoslav Dodnikov.\n\nManage or cancel: ${manageUrl}`
            : `${booking.minutes}-минутен разговор с Радослав Додников.\n\nПромяна или отказ: ${manageUrl}`,
        organiserName: locale === 'en' ? 'Kova Studio' : 'Кова студио',
        organiserEmail: SITE.email,
        url: manageUrl,
        createdUtc: booking.created_utc,
      });

      msg.addAttachment({
        filename: `kova-${zonedDateKey(booking.start_utc, TIMEZONE)}-${zonedTimeLabel(booking.start_utc, TIMEZONE).replace(':', '')}.ics`,
        // `text/calendar` без `method=REQUEST`: това е файл за прибиране в
        // календара, а не покана, на която се отговаря с „приемам/отказвам“.
        // С `method=REQUEST` пощенските клиенти рисуват бутони, които после
        // не пращат отговор наникъде, защото насреща няма кой да го получи.
        contentType: 'text/calendar; charset="utf-8"',
        encoding: 'base64',
        data: toBase64(ics),
      });
    }

    await env.SEND_TO_VISITOR.send(new EmailMessage(from, booking.email, msg.asRaw()));
  } catch (error) {
    console.error('Писмото до посетителя не тръгна', error);
  }
}
