import type { APIRoute } from 'astro';
import { GUIDES } from '../../data/guides.ts';
import { FLAGS } from '../../data/flags.mjs';

/**
 * Записване за известие, когато наръчник излезе.
 *
 * Страницата е „скоро“ и без това е задънена улица: човек, който я е прочел
 * докрай, е точно този, който би купил — а няма какво да натисне. Оттук и
 * тази форма.
 *
 * Обещанието е ЕДНО писмо, не списък. Затова тук няма нищо повече от адрес и
 * кой наръчник; всичко останало би било събиране на данни за после.
 */
export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  if (!FLAGS.guides) return new Response('Not Found', { status: 404 });

  const form = await request.formData().catch(() => null);
  if (!form) return new Response('Bad Request', { status: 400 });

  const email = String(form.get('email') ?? '').trim().slice(0, 180);
  const guide = String(form.get('guide') ?? '').trim();

  /* Само наръчник, който наистина съществува — иначе списъкът се пълни с
     произволни низове от подправени заявки. Проверява се ПРЕДИ адреса,
     защото от него се строи обратният път: препращане към `/guides/<нещо>/`
     по непроверен низ е отворено пренасочване. */
  if (!GUIDES.some((g) => g.slug === guide)) return redirect('/guides/', 303);

  /* Назад към страницата на самия наръчник, не към списъка — там е формата,
     която показва потвърждението, и там човекът е бил преди малко. */
  const back = (state: string) => redirect(`/guides/${guide}/?${state}#notify`, 303);

  // Примамката е попълнена → бот. Преструваме се, че всичко е наред.
  if (String(form.get('website') ?? '').trim()) return back('notified=1');

  if (!EMAIL_RE.test(email)) return back('error=1');

  const env = locals.runtime?.env ?? ({} as Env);
  const db = env.BOOKINGS;
  if (!db) {
    console.warn('Няма връзка към D1 — записването за наръчник е пропуснато.');
    return back('error=1');
  }

  let fresh = true;
  try {
    await db
      .prepare('INSERT INTO guide_signups (id, guide, email, created_utc) VALUES (?1, ?2, ?3, ?4)')
      .bind(crypto.randomUUID(), guide, email.toLowerCase(), Date.now())
      .run();
  } catch (error) {
    const message = String((error as Error)?.message ?? '');
    // Вече е в списъка. За човека отсреща това е същото като успех — да му
    // покажем грешка би значело да натисне пак и пак.
    if (!/UNIQUE|constraint/i.test(message)) {
      console.error('Записването за наръчник се провали', error);
      return back('error=1');
    }
    fresh = false;
  }

  // Известие до студиото — само при НОВ адрес, иначе повторните натискания
  // пълнят кутията с едно и също.
  if (fresh && env.SEND_EMAIL && env.CONTACT_TO && env.CONTACT_FROM) {
    const notice = (async () => {
      try {
        const [{ EmailMessage }, { createMimeMessage }] = await Promise.all([
          import('cloudflare:email'),
          import('mimetext/browser'),
        ]);
        const bytes = new TextEncoder().encode(
          `Нов записан за наръчника „${guide}“:\r\n\r\n${email}`,
        );
        let binary = '';
        for (const byte of bytes) binary += String.fromCharCode(byte);

        const msg = createMimeMessage();
        msg.setSender({ name: 'Кова студио', addr: env.CONTACT_FROM! });
        msg.setRecipient(env.CONTACT_TO!);
        msg.setSubject(`Записан за наръчник — ${guide}`);
        msg.addMessage({
          contentType: 'text/plain',
          encoding: 'base64',
          data: (btoa(binary).match(/.{1,76}/g) ?? []).join('\r\n'),
        });
        await env.SEND_EMAIL!.send(new EmailMessage(env.CONTACT_FROM!, env.CONTACT_TO!, msg.asRaw()));
      } catch (error) {
        // Адресът вече е в базата; пропаднало известие не бива да го губи.
        console.error('Известието за записан наръчник не тръгна', error);
      }
    })();

    const ctx = locals.runtime?.ctx;
    if (ctx?.waitUntil) ctx.waitUntil(notice);
    else await notice;
  }

  return back('notified=1');
};

export const ALL: APIRoute = () =>
  new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
