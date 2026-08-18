/**
 * Входът в панела.
 *
 * Парола в секрет и подписана бисквитка. Cloudflare Access върши същото
 * по-добре — с еднократни кодове по поща и без парола за помнене — но се
 * настройва в таблото и мълчи, ако забравиш да го включиш. Мълчаливата
 * грешка там значи публичен административен панел.
 *
 * Тази проверка се проваля затворено: няма ли `ADMIN_PASSWORD`, панелът
 * отговаря 503 и не се отваря на никого. Access отгоре е добра втора ключалка,
 * но не е единствената.
 */

const COOKIE = 'kova_admin';
/** Осем часа — работен ден. Достатъчно да не се вписваш постоянно. */
const TTL_SECONDS = 8 * 60 * 60;

function bytesToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Ключът за подписа се извежда от паролата — един секрет за помнене. */
async function keyFor(password: string): Promise<CryptoKey> {
  const material = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  return crypto.subtle.importKey('raw', material, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

async function sign(value: string, password: string): Promise<string> {
  const key = await keyFor(password);
  return bytesToHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Стойността на бисквитката: срок на валидност плюс подпис върху него. */
export async function issueCookie(password: string, now: number): Promise<string> {
  const expires = String(now + TTL_SECONDS * 1000);
  const signature = await sign(expires, password);
  return `${expires}.${signature}`;
}

export async function verifyCookie(
  value: string | undefined,
  password: string,
  now: number,
): Promise<boolean> {
  if (!value) return false;
  const [expires, signature] = value.split('.');
  if (!expires || !signature) return false;
  // Срокът се проверява СЛЕД подписа — иначе изтеклостта се чете от стойност,
  // на която още не сме проверили автентичността.
  const expected = await sign(expires, password);
  if (!safeEqual(signature, expected)) return false;
  return Number(expires) > now;
}

export function cookieHeader(value: string): string {
  return [
    `${COOKIE}=${value}`,
    /*
     * `Path=/admin` е и причината действията на панела да живеят на
     * `/admin/api/*`, а не на `/api/admin/*`. Браузърът праща бисквитката
     * само за пътища под нейния `Path`; при `/api/admin/…` тя не тръгва и
     * всеки бутон в панела мълчи, все едно нищо не се е случило.
     * Ако адресите се местят, да се мести и този ред.
     */
    'Path=/admin',
    'HttpOnly',
    'Secure',
    // `Strict`, а не `Lax`: панелът няма нищо, до което да се стига по връзка
    // отвън, и точно затова не бива да носи бисквитката при такова идване.
    'SameSite=Strict',
    `Max-Age=${TTL_SECONDS}`,
  ].join('; ');
}

export const clearCookieHeader = `${COOKIE}=; Path=/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export const COOKIE_NAME = COOKIE;

export type AdminGate =
  | { ok: true }
  | { ok: false; reason: 'not_configured' | 'signed_out' };

/** Пази `/admin/*`. Викa се първо във всяка страница на панела. */
export async function guardAdmin(cookies: string | undefined, env: Env): Promise<AdminGate> {
  if (!env.ADMIN_PASSWORD) return { ok: false, reason: 'not_configured' };
  const value = cookies
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  return (await verifyCookie(value, env.ADMIN_PASSWORD, Date.now()))
    ? { ok: true }
    : { ok: false, reason: 'signed_out' };
}

export { safeEqual };
