/**
 * Известията около запазен разговор.
 *
 * Двете посоки НЕ са симетрични и това е ограничение на инфраструктурата, не
 * избор: връзката `send_email` на Cloudflare доставя само до адрес, потвърден
 * като получател в акаунта. Тоест до студиото — да; до случаен посетител —
 * не. Затова:
 *
 *   към студиото → имейл (веднага, с всичко, което е попълнено)
 *   към посетителя → файл за календара и страница с потвърждение
 *
 * Тук е и шевът, ако някой ден се добави истински доставчик (Resend и
 * подобни): `notifyVisitor` вече се вика от `/api/book`, само че днес не
 * прави нищо. Тогава остава да се напълни само тя.
 */

import type { Booking } from './booking.ts';
import { TIMEZONE } from '../data/booking.mjs';
import { longDateLabel, zonedTimeLabel } from './time.ts';

function headerSafe(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

/** Същото кодиране като в контактната форма — иначе кирилицата пристига като въпросителни. */
function toBase64Body(text: string): string {
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

/**
 * Праща известие до студиото.
 *
 * Не хвърля. Запазването вече е в базата, когато тази функция се вика —
 * пропаднал имейл не бива да развали час, който човекът вече е получил на
 * екрана си. Провалът се пише в дневника, часът остава в панела.
 */
export async function notifyStudio(env: Env, booking: Booking, cancelled = false): Promise<void> {
  const to = env.CONTACT_TO;
  const from = env.CONTACT_FROM;
  if (!env.SEND_EMAIL || !to || !from) {
    console.warn('Няма връзка за поща — известието за запазен час е пропуснато.');
    return;
  }

  try {
    const [{ EmailMessage }, { createMimeMessage, Mailbox }] = await Promise.all([
      import('cloudflare:email'),
      import('mimetext/browser'),
    ]);

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
    // се прегледа, преди да разчиташ на адреса.
    if (booking.source === 'agent') {
      lines.splice(1, 0, '', 'Записано по телефона — провери имейла, преди да пишеш на него.');
    }

    const msg = createMimeMessage();
    msg.setSender({ name: 'Кова студио', addr: from });
    msg.setRecipient(to);
    msg.setSubject(
      headerSafe(
        `${cancelled ? 'Отказан' : 'Запазен'} разговор — ${whenLabel(booking)} — ${name}`,
      ),
    );
    if (booking.email) {
      msg.setHeader('Reply-To', new Mailbox({ name, addr: booking.email }));
    }
    msg.addMessage({
      contentType: 'text/plain',
      encoding: 'base64',
      data: toBase64Body(lines.join('\r\n')),
    });

    await env.SEND_EMAIL.send(new EmailMessage(from, to, msg.asRaw()));
  } catch (error) {
    console.error('Известието за запазен час не тръгна', error);
  }
}

/**
 * Известие до посетителя.
 *
 * Днес не прави нищо — виж бележката най-горе. Извиква се въпреки това, за да
 * е ясно откъде минава пътят и да не се търси мястото по-късно.
 */
export async function notifyVisitor(_env: Env, _booking: Booking): Promise<void> {
  // Нарочно празно. Посетителят получава потвърждение на екрана и файл за
  // календара; имейл до него изисква доставчик извън Cloudflare Email Routing.
}
