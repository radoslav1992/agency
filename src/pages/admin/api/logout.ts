import type { APIRoute } from 'astro';
import { clearCookieHeader } from '../../../lib/admin-auth.ts';

export const prerender = false;

export const POST: APIRoute = () =>
  new Response(null, {
    status: 303,
    headers: { location: '/admin/', 'set-cookie': clearCookieHeader },
  });

export const ALL: APIRoute = () =>
  new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
