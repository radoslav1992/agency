import type { APIRoute } from 'astro';
import { removeBlock } from '../../../lib/booking.ts';
import { guardAdmin } from '../../../lib/admin-auth.ts';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const env = locals.runtime?.env ?? ({} as Env);
  const gate = await guardAdmin(request.headers.get('cookie') ?? undefined, env);
  if (!gate.ok) return redirect(`/admin/?error=${encodeURIComponent('Сесията изтече. Влез пак.')}`, 303);

  const db = env.BOOKINGS;
  const form = await request.formData().catch(() => null);
  const id = String(form?.get('id') ?? '');
  if (db && id) await removeBlock(db, id);

  return redirect('/admin/', 303);
};

export const ALL: APIRoute = () =>
  new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
