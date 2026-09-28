import type { APIRoute } from 'astro';
import { NEEDS as NEEDS_BG } from '../../data/content.ts';
import { NEEDS as NEEDS_EN } from '../../data/content.en.ts';
import { href, type Locale } from '../../i18n/index.ts';
import { UI } from '../../i18n/ui.ts';

/** The only route that is not prerendered — it runs on the Cloudflare Worker. */
export const prerender = false;

type Submission = {
  name: string;
  email: string;
  message: string;
  needs: string[];
  website: string;
  /** Текстовият отчет от анализатора — празен при обикновено запитване. */
  report: string;
  /** Езикът на формата. Анализаторът не го праща и остава на български. */
  lang: Locale;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Отметките, които формата предлага на всеки език. Английската форма праща
 * английските надписи — сверени с българския списък, те изпадаха всичките.
 */
const NEEDS: Record<Locale, readonly string[]> = { bg: NEEDS_BG, en: NEEDS_EN };

const errorsFor = (lang: Locale) => UI[lang].form.errors;

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function readSubmission(request: Request): Promise<{ data: Submission; isJson: boolean }> {
  const contentType = request.headers.get('content-type') ?? '';
  let raw: Record<string, unknown> = {};
  let needs: string[] = [];
  let isJson = false;

  if (contentType.includes('application/json')) {
    isJson = true;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    raw = body;
    needs = Array.isArray(body.needs) ? body.needs.map((n) => String(n)) : [];
  } else {
    const form = await request.formData();
    raw = Object.fromEntries(form.entries());
    needs = form.getAll('needs').map(String);
  }

  const lang: Locale = raw.lang === 'en' ? 'en' : 'bg';
  const options = NEEDS[lang];

  return {
    isJson,
    data: {
      name: clean(raw.name, 120),
      email: clean(raw.email, 180),
      message: clean(raw.message, 4000),
      website: clean(raw.website, 100),
      report: clean(raw.report, 28000),
      // Only keep options the form actually offers in that language.
      needs: needs.filter((need) => options.includes(need)).slice(0, options.length),
      lang,
    },
  };
}

function validate(data: Submission): string | null {
  const errors = errorsFor(data.lang);
  if (data.name.length < 2) return errors.name;
  if (!EMAIL_RE.test(data.email)) return errors.email;
  if (data.message.length < 10) return errors.message;
  return null;
}

/**
 * Headers must not carry raw newlines — a name or subject containing one could
 * otherwise inject extra headers into the message.
 */
function headerSafe(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

/**
 * mimetext labels the transfer encoding but does not apply it, and its default
 * of `7bit` would mislabel a Cyrillic body as ASCII. Encode it ourselves,
 * wrapped at the 76 characters RFC 2045 allows per line.
 */
function toBase64Body(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return (btoa(binary).match(/.{1,76}/g) ?? []).join('\r\n');
}

/**
 * Sends through Cloudflare Email Routing's `send_email` binding.
 *
 * The binding only delivers to addresses verified as destinations on the
 * account, which is exactly what a contact form needs — everything lands in
 * the studio inbox. `cloudflare:email` exists only in the Workers runtime, so
 * it is imported lazily to keep `astro dev` and `astro build` running on Node.
 */
async function sendEmail(env: Env, data: Submission): Promise<void> {
  const to = env.CONTACT_TO;
  const from = env.CONTACT_FROM;
  if (!env.SEND_EMAIL || !to || !from) throw new Error('send_email binding is not configured');

  // `mimetext/browser` is the build without Node built-ins — smaller on the edge.
  const [{ EmailMessage }, { createMimeMessage, Mailbox }] = await Promise.all([
    import('cloudflare:email'),
    import('mimetext/browser'),
  ]);

  const needs = data.needs.length > 0 ? data.needs.join(', ') : '—';
  const name = headerSafe(data.name);
  const isReview = data.report.length > 0;

  const bodyLines = [`Име: ${data.name}`, `Имейл: ${data.email}`, `Нужди: ${needs}`];
  // Отговорът трябва да е на езика, на който човекът е писал.
  if (data.lang === 'en') bodyLines.push('Език: английски (от /en/contact/)');
  bodyLines.push('', data.message);
  if (isReview) {
    bodyLines.push('', '--- Отчет от анализатора ---', '', data.report.replace(/\r?\n/g, '\r\n'));
  }

  const msg = createMimeMessage();
  msg.setSender({ name: 'Кова студио', addr: from });
  msg.setRecipient(to);
  msg.setSubject(
    headerSafe(
      isReview
        ? `Отчет за личен преглед от ${name}`
        : `Запитване от ${name}${data.needs.length ? ` — ${needs}` : ''}`,
    ),
  );
  // Lets you hit reply and answer the person directly. A Mailbox (not a plain
  // string) is required here — it also base64-encodes the Cyrillic display name.
  msg.setHeader('Reply-To', new Mailbox({ name, addr: data.email }));
  msg.addMessage({
    contentType: 'text/plain',
    encoding: 'base64',
    data: toBase64Body(bodyLines.join('\r\n')),
  });

  await env.SEND_EMAIL.send(new EmailMessage(from, to, msg.asRaw()));
}

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  let submission: Awaited<ReturnType<typeof readSubmission>>;
  try {
    submission = await readSubmission(request);
  } catch {
    return Response.json({ ok: false, error: errorsFor('bg').badRequest }, { status: 400 });
  }

  const { data, isJson } = submission;
  const ERRORS = errorsFor(data.lang);

  const respond = (ok: boolean, error?: string, status = 200) => {
    if (isJson) {
      return Response.json(ok ? { ok: true } : { ok: false, error }, { status });
    }
    // No-JS fallback: bounce back to the form, in its own language, with a readable message.
    const back = href('/contact/', data.lang);
    return redirect(
      ok ? `${back}?sent=1` : `${back}?error=${encodeURIComponent(error ?? ERRORS.send)}`,
      303,
    );
  };

  // Honeypot filled in → pretend everything is fine, drop the message.
  if (data.website) return respond(true);

  const invalid = validate(data);
  if (invalid) return respond(false, invalid, 422);

  const env = locals.runtime?.env ?? ({} as Env);

  if (!env.SEND_EMAIL || !env.CONTACT_TO || !env.CONTACT_FROM) {
    console.warn('Contact form is not configured: missing SEND_EMAIL, CONTACT_TO or CONTACT_FROM.');
    return respond(false, ERRORS.notConfigured, 503);
  }

  try {
    await sendEmail(env, data);
    return respond(true);
  } catch (error) {
    console.error('Contact form failed', error);
    return respond(false, ERRORS.send, 502);
  }
};

/** Anything other than POST on this route. */
export const ALL: APIRoute = () =>
  new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
