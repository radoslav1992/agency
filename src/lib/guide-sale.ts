/**
 * Какво се случва, след като някой плати.
 *
 * Двата пътя стигат дотук — страницата, на която Stripe връща купувача, и
 * webhook-ът, който идва при мен независимо от браузъра. Логиката е обща
 * нарочно: доставката не бива да зависи от това дали човекът е изчакал
 * страницата да се зареди, или е затворил раздела веднага след плащането.
 *
 * Записът се прави по идентификатора на сесията, който е първичен ключ. Кой
 * от двата пътя стигне пръв, е без значение — вторият вижда, че редът вече
 * съществува, и не праща второ писмо.
 */

import { GUIDES, type Guide } from '../data/guides.ts';
import { signDownload } from './guide-download.ts';
import { SITE } from '../data/site.mjs';
import type { CheckoutSession } from './stripe.ts';
import { buyerEmail, sessionItemIds } from './stripe.ts';

export type Sale = {
  sessionId: string;
  guide: Guide;
  email: string;
  amountTotal: number | null;
  currency: string | null;
};

function headerSafe(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return (btoa(binary).match(/.{1,76}/g) ?? []).join('\r\n');
}

/** Покупката като редове за човек: „39,00 EUR“. */
export function saleAmount(sale: Sale): string {
  if (sale.amountTotal == null || !sale.currency) return '—';
  return `${(sale.amountTotal / 100).toFixed(2)} ${sale.currency.toUpperCase()}`;
}

/**
 * Кой наръчник е платен в тази сесия.
 *
 * Два пътя, в този ред:
 *
 *   1. `metadata.guide` — ако линкът е правен през API и метаданните ги има.
 *   2. Купеният продукт или цена, сверени със `stripeIds` в данните.
 *
 * Вторият е истинският при линкове от таблото: то не дава поле за метаданни.
 * Той е и по-надеждният — метаданни се забравят при всеки нов линк, а
 * продуктът е самото нещо, което купувачът плаща.
 *
 * `null` значи „не знам“, а не „вземи първия“. Грешен файл на платил човек е
 * по-лошо от никакъв файл: никаквият се оправя с едно писмо, грешният вече е
 * у някого.
 */
export async function guideOfSession(
  env: Env,
  session: CheckoutSession,
): Promise<Guide | null> {
  const bySlug = GUIDES.find((guide) => guide.slug === session.metadata?.guide);
  if (bySlug) return bySlug;

  if (!env.STRIPE_SECRET_KEY) {
    console.error('Няма STRIPE_SECRET_KEY — артикулите на сесията не могат да се проверят.');
    return null;
  }

  const ids = await sessionItemIds(env.STRIPE_SECRET_KEY, session.id);
  if (ids.length === 0) return null;

  return GUIDES.find((guide) => guide.stripeIds?.some((id) => ids.includes(id))) ?? null;
}

/** Сесията, преведена на покупка. `null`, ако не става за доставка. */
export function saleFrom(session: CheckoutSession, guide: Guide): Sale | null {
  const email = buyerEmail(session);
  if (!email) return null;
  return {
    sessionId: session.id,
    guide,
    email,
    amountTotal: session.amount_total ?? null,
    currency: session.currency ?? null,
  };
}

/**
 * Записва покупката. Връща `true`, ако редът е НОВ — тоест ако този път е
 * стигнал пръв и на него се пада да прати писмата.
 *
 * Няма база → `true`, за да не изяде тишината доставката: по-добре второ
 * писмо, отколкото нула.
 */
export async function recordSale(db: D1Database | undefined, sale: Sale): Promise<boolean> {
  if (!db) {
    console.warn('Няма D1 — покупката не е записана, писмото се праща въпреки това.');
    return true;
  }
  try {
    await db
      .prepare(
        `INSERT INTO guide_purchases (session_id, guide, email, amount_total, currency, created_utc)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
      )
      .bind(
        sale.sessionId,
        sale.guide.slug,
        sale.email.toLowerCase(),
        sale.amountTotal,
        sale.currency,
        Date.now(),
      )
      .run();
    return true;
  } catch (error) {
    const message = String((error as Error)?.message ?? '');
    // Другият път е стигнал пръв. Това е нормалният случай, не грешка.
    if (/UNIQUE|constraint/i.test(message)) return false;
    console.error('Покупката не се записа', error);
    // Записът се провали по друга причина; доставката е по-важна от дневника.
    return true;
  }
}

/** Отбелязва, че писмото е тръгнало — за да се види кое е останало без. */
export async function markMailed(db: D1Database | undefined, sessionId: string): Promise<void> {
  if (!db) return;
  try {
    await db
      .prepare('UPDATE guide_purchases SET mailed_utc = ?2 WHERE session_id = ?1')
      .bind(sessionId, Date.now())
      .run();
  } catch (error) {
    console.error('Отбелязването на изпратеното писмо се провали', error);
  }
}

/** Пълният адрес за сваляне, подписан и със срок. */
export async function downloadUrl(secret: string, sale: Sale, origin: string): Promise<string> {
  const token = await signDownload(secret, { guide: sale.guide.slug, purchase: sale.sessionId });
  return new URL(`/api/guide-file?t=${encodeURIComponent(token)}`, origin).toString();
}

async function mime() {
  const [{ EmailMessage }, { createMimeMessage, Mailbox }] = await Promise.all([
    import('cloudflare:email'),
    import('mimetext/browser'),
  ]);
  return { EmailMessage, createMimeMessage, Mailbox };
}

/**
 * Писмото до купувача — с връзката, а не с файла.
 *
 * Прикачен файл от 7 MB се отблъсква от част от пощенските сървъри и минава
 * през филтрите по-зле от текст с адрес. Връзката пък може да се издаде
 * наново, ако изтече, докато веднъж изпратен файл живее в кутията завинаги.
 */
export async function mailBuyer(env: Env, sale: Sale, link: string): Promise<boolean> {
  const from = env.GUIDE_FROM ?? env.BOOKING_FROM ?? env.CONTACT_FROM;
  if (!env.SEND_TO_VISITOR || !from) {
    console.warn('Няма връзка SEND_TO_VISITOR — писмото с наръчника е пропуснато.');
    return false;
  }

  try {
    const { EmailMessage, createMimeMessage, Mailbox } = await mime();
    const body = [
      'Здравей,',
      '',
      `Благодаря за покупката. Ето „${sale.guide.title}“:`,
      '',
      link,
      '',
      'Връзката е валидна една седмица. Изтече ли, отвори страницата, на',
      'която Stripe те върна след плащането — тя издава нова.',
      '',
      `${sale.guide.pages} страници, PDF. Може да го четеш и печаташ на всичките си устройства;`,
      'споделянето и препродаването не са разрешени.',
      '',
      'Ако нещо не се отвори или имаш въпрос по някоя глава — пиши ми на',
      `този адрес и ще ти отговоря лично.`,
      '',
      'Радослав Додников',
      SITE.url,
    ].join('\r\n');

    const msg = createMimeMessage();
    msg.setSender({ name: 'Кова студио', addr: from });
    msg.setRecipient(sale.email);
    msg.setSubject(headerSafe(`Наръчникът ти: ${sale.guide.title}`));
    msg.setHeader('Reply-To', new Mailbox({ name: 'Радослав Додников', addr: SITE.email }));
    msg.addMessage({ contentType: 'text/plain', encoding: 'base64', data: toBase64(body) });

    await env.SEND_TO_VISITOR.send(new EmailMessage(from, sale.email, msg.asRaw()));
    return true;
  } catch (error) {
    console.error('Писмото с наръчника не тръгна', error);
    return false;
  }
}

/** И едно до студиото — продажбата е новина. */
export async function mailStudio(env: Env, sale: Sale): Promise<void> {
  const to = env.CONTACT_TO;
  const from = env.CONTACT_FROM;
  if (!env.SEND_EMAIL || !to || !from) return;

  try {
    const { EmailMessage, createMimeMessage } = await mime();
    const body = [
      `Продаден наръчник: ${sale.guide.title}`,
      '',
      `Купувач: ${sale.email}`,
      `Сума: ${saleAmount(sale)}`,
      `Сесия: ${sale.sessionId}`,
    ].join('\r\n');

    const msg = createMimeMessage();
    msg.setSender({ name: 'Кова студио', addr: from });
    msg.setRecipient(to);
    msg.setSubject(headerSafe(`Продажба — ${sale.guide.title} — ${saleAmount(sale)}`));
    msg.addMessage({ contentType: 'text/plain', encoding: 'base64', data: toBase64(body) });

    await env.SEND_EMAIL.send(new EmailMessage(from, to, msg.asRaw()));
  } catch (error) {
    console.error('Известието за продажба не тръгна', error);
  }
}

/**
 * Целият път след плащане: записва, издава връзка, праща писма при първото
 * минаване. Връща връзката, за да я покаже страницата.
 *
 * Не хвърля. Парите вече са взети; провалено писмо не бива да се превръща в
 * страница с грешка пред човек, който току-що е платил.
 */
export async function fulfil(
  env: Env,
  sale: Sale,
  origin: string,
  waitUntil?: (promise: Promise<unknown>) => void,
): Promise<string | null> {
  const secret = env.DOWNLOAD_SECRET;
  if (!secret) {
    console.error('Липсва DOWNLOAD_SECRET — връзка за сваляне не може да се издаде.');
    return null;
  }

  const link = await downloadUrl(secret, sale, origin);
  const fresh = await recordSale(env.BOOKINGS, sale);

  if (fresh) {
    const letters = (async () => {
      const sent = await mailBuyer(env, sale, link);
      if (sent) await markMailed(env.BOOKINGS, sale.sessionId);
      await mailStudio(env, sale);
    })();
    if (waitUntil) waitUntil(letters);
    else await letters;
  }

  return link;
}
