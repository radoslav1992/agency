import type { APIRoute } from 'astro';
import { NEEDS } from '../../data/content.ts';

/** The only route that is not prerendered — it runs on the Cloudflare Worker. */
export const prerender = false;

type Submission = {
  name: string;
  email: string;
  message: string;
  needs: string[];
  website: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const ERRORS = {
  badRequest: 'Невалидно запитване.',
  name: 'Моля, попълни името си.',
  email: 'Моля, попълни валиден имейл адрес.',
  message: 'Моля, разкажи накратко за проекта.',
  notConfigured: 'Формата още не е свързана с имейл. Пиши ми директно на имейла отдолу.',
  send: 'Не успях да изпратя запитването. Пиши ми директно на имейла отдолу.',
} as const;

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

  return {
    isJson,
    data: {
      name: clean(raw.name, 120),
      email: clean(raw.email, 180),
      message: clean(raw.message, 4000),
      website: clean(raw.website, 100),
      // Only keep options the form actually offers.
      needs: needs.filter((need) => NEEDS.includes(need)).slice(0, NEEDS.length),
    },
  };
}

function validate(data: Submission): string | null {
  if (data.name.length < 2) return ERRORS.name;
  if (!EMAIL_RE.test(data.email)) return ERRORS.email;
  if (data.message.length < 10) return ERRORS.message;
  return null;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] as string,
  );
}

async function sendEmail(env: Env, data: Submission): Promise<boolean> {
  const to = env.CONTACT_TO;
  const from = env.CONTACT_FROM ?? 'Кова студио <onboarding@resend.dev>';
  if (!env.RESEND_API_KEY || !to) return false;

  const needs = data.needs.length > 0 ? data.needs.join(', ') : '—';
  const html = `
    <h2>Ново запитване от сайта</h2>
    <p><strong>Име:</strong> ${escapeHtml(data.name)}</p>
    <p><strong>Имейл:</strong> ${escapeHtml(data.email)}</p>
    <p><strong>Нужди:</strong> ${escapeHtml(needs)}</p>
    <p><strong>Съобщение:</strong></p>
    <p style="white-space:pre-wrap">${escapeHtml(data.message)}</p>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: data.email,
      subject: `Запитване от ${data.name}${data.needs.length ? ` — ${needs}` : ''}`,
      html,
    }),
  });

  if (!response.ok) {
    console.error('Resend error', response.status, await response.text().catch(() => ''));
    return false;
  }

  return true;
}

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  let submission: Awaited<ReturnType<typeof readSubmission>>;
  try {
    submission = await readSubmission(request);
  } catch {
    return Response.json({ ok: false, error: ERRORS.badRequest }, { status: 400 });
  }

  const { data, isJson } = submission;

  const respond = (ok: boolean, error?: string, status = 200) => {
    if (isJson) {
      return Response.json(ok ? { ok: true } : { ok: false, error }, { status });
    }
    // No-JS fallback: bounce back to the form with a readable message.
    return redirect(
      ok ? '/contact/?sent=1' : `/contact/?error=${encodeURIComponent(error ?? ERRORS.send)}`,
      303,
    );
  };

  // Honeypot filled in → pretend everything is fine, drop the message.
  if (data.website) return respond(true);

  const invalid = validate(data);
  if (invalid) return respond(false, invalid, 422);

  const env = locals.runtime?.env ?? ({} as Env);

  if (!env.RESEND_API_KEY || !env.CONTACT_TO) {
    console.warn('Contact form is not configured: missing RESEND_API_KEY or CONTACT_TO.');
    return respond(false, ERRORS.notConfigured, 503);
  }

  try {
    const sent = await sendEmail(env, data);
    return sent ? respond(true) : respond(false, ERRORS.send, 502);
  } catch (error) {
    console.error('Contact form failed', error);
    return respond(false, ERRORS.send, 502);
  }
};

/** Anything other than POST on this route. */
export const ALL: APIRoute = () =>
  new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
