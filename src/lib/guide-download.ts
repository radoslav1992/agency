/**
 * Подписаните връзки за сваляне.
 *
 * Файлът стои в частна кофа и няма собствен адрес. Единственият път до него е
 * `/api/guide-file?t=…`, а `t` е подпис, който казва три неща наведнъж: кой
 * наръчник, до кога и по коя покупка. Проверява се с ключ, който съществува
 * само в Worker-а.
 *
 * Защо подпис, а не запис в базата:
 *
 *   Проверката е чиста аритметика — нула заявки към D1 при всяко сваляне и
 *   нищо за чистене после. Изтеклата връзка спира да работи сама, защото
 *   срокът е ВЪТРЕ в подписаното, а не до него.
 *
 * Защо със срок:
 *
 *   Връзката пътува по пощата и се препраща. Срокът превръща изтеклия адрес
 *   в „поискай нова“ вместо във вечен публичен файл. Затова е дълъг колкото
 *   да не дразни (седмица), а не колкото да пази вечно — купувачът винаги
 *   може да си издаде нова от страницата след плащането.
 *
 * Срещу подправяне: подписът е HMAC-SHA256, а сравнението е побитово по
 * цялата дължина. Ранното излизане при първата различна буква издава колко
 * от подписа е познат — оттам се строи целият, буква по буква.
 */

const encoder = new TextEncoder();

/** Седем дни. Достатъчно за отпуска, недостатъчно за вечен публичен адрес. */
export const DOWNLOAD_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type DownloadClaim = {
  /** Кой наръчник. */
  guide: string;
  /** Коя покупка — за да се види в дневника кой е свалил. */
  purchase: string;
  /** До кога, в милисекунди. */
  expires: number;
};

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function key(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

/** Побитово сравнение по цялата дължина — без ранно излизане. */
function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * Издава връзка. Форматът е `<данни>.<подпис>`, и двете в base64url — един
 * параметър в адреса вместо три, които трябва да пътуват заедно.
 */
export async function signDownload(
  secret: string,
  claim: Omit<DownloadClaim, 'expires'> & { expires?: number },
): Promise<string> {
  const payload: DownloadClaim = {
    guide: claim.guide,
    purchase: claim.purchase,
    expires: claim.expires ?? Date.now() + DOWNLOAD_TTL_MS,
  };
  const body = base64url(encoder.encode(JSON.stringify(payload)));
  const mac = await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(body));
  return `${body}.${base64url(new Uint8Array(mac))}`;
}

/**
 * Проверява връзка. Връща `null` при всяка неизправност — подправен подпис,
 * изтекъл срок, счупен низ — и нарочно не казва коя от трите: който подава
 * подправени връзки, няма нужда от подсказки.
 */
export async function verifyDownload(
  secret: string,
  token: string,
): Promise<DownloadClaim | null> {
  const dot = token.indexOf('.');
  if (dot < 1) return null;

  const body = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  let given: Uint8Array;
  try {
    given = fromBase64url(signature);
  } catch {
    return null;
  }

  const expected = new Uint8Array(
    await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(body)),
  );
  if (!sameBytes(given, expected)) return null;

  try {
    const claim = JSON.parse(new TextDecoder().decode(fromBase64url(body))) as DownloadClaim;
    if (typeof claim?.guide !== 'string' || typeof claim?.expires !== 'number') return null;
    if (claim.expires < Date.now()) return null;
    return claim;
  } catch {
    return null;
  }
}
