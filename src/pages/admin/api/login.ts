import type { APIRoute } from 'astro';
import { cookieHeader, issueCookie, safeEqual } from '../../../lib/admin-auth.ts';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime?.env ?? ({} as Env);
  const form = await request.formData().catch(() => null);
  const password = String(form?.get('password') ?? '');

  if (!env.ADMIN_PASSWORD) {
    return new Response(null, { status: 303, headers: { location: '/admin/' } });
  }

  if (!safeEqual(password, env.ADMIN_PASSWORD)) {
    /*
     * Малко забавяне при грешна парола. Не спира сериозен опит за налучкване
     * — за него пази дължината на самата парола — но прави подпитването скъпо
     * и гаси разликата във времето между „няма такъв секрет“ и „грешен“.
     */
    await new Promise((resolve) => setTimeout(resolve, 400));
    return new Response(null, {
      status: 303,
      headers: { location: `/admin/?error=${encodeURIComponent('Грешна парола.')}` },
    });
  }

  return new Response(null, {
    status: 303,
    headers: {
      location: '/admin/',
      'set-cookie': cookieHeader(await issueCookie(env.ADMIN_PASSWORD, Date.now())),
    },
  });
};

export const ALL: APIRoute = () =>
  new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
