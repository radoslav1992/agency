/**
 * Толкова Stripe, колкото трябва — и нито ред повече.
 *
 * Официалната библиотека тежи мегабайти и носи цялото API; тук се ползват два
 * куки от него. `fetch` и WebCrypto вършат същото, стартират мигновено и не
 * добавят зависимост, която после трябва да се обновява заради части, които
 * не пипаме.
 */

const STRIPE_API = 'https://api.stripe.com/v1';

export type CheckoutSession = {
  id: string;
  /** `paid`, `unpaid` или `no_payment_required`. Само първото значи покупка. */
  payment_status?: string;
  status?: string;
  amount_total?: number | null;
  currency?: string | null;
  customer_details?: { email?: string | null; name?: string | null } | null;
  customer_email?: string | null;
  metadata?: Record<string, string> | null;
};

/**
 * Взима сесията от Stripe. Тук е и проверката дали е платена — стойността,
 * дошла от браузъра, е само идентификатор и не доказва нищо.
 */
export async function retrieveSession(
  secretKey: string,
  sessionId: string,
): Promise<CheckoutSession | null> {
  // Идентификаторът идва от адреса. Влиза в пътя на заявка, значи се проверява
  // по форма, преди да тръгне — не по доверие.
  if (!/^cs_[A-Za-z0-9_]{10,80}$/.test(sessionId)) return null;

  const response = await fetch(`${STRIPE_API}/checkout/sessions/${sessionId}`, {
    headers: { authorization: `Bearer ${secretKey}` },
  });
  if (!response.ok) {
    console.error(`Stripe отказа сесията ${sessionId}: ${response.status}`);
    return null;
  }
  return (await response.json()) as CheckoutSession;
}

/**
 * Кои артикули е платил купувачът — идентификаторите на цената и на продукта.
 *
 * Отделна заявка, защото събитието от webhook-а НЕ носи артикулите: сесията
 * там е без `line_items` и никакво разчоплюване на тялото няма да ги извади.
 *
 * Оттук се разбира кой наръчник е купен, когато липсват метаданни. Таблото на
 * Stripe не дава поле за метаданни при създаване на Payment Link — те се
 * слагат само през API. Продуктът обаче го има винаги.
 */
export async function sessionItemIds(secretKey: string, sessionId: string): Promise<string[]> {
  if (!/^cs_[A-Za-z0-9_]{10,80}$/.test(sessionId)) return [];

  const response = await fetch(
    `${STRIPE_API}/checkout/sessions/${sessionId}/line_items?limit=20`,
    { headers: { authorization: `Bearer ${secretKey}` } },
  );
  if (!response.ok) {
    console.error(`Stripe отказа артикулите на ${sessionId}: ${response.status}`);
    return [];
  }

  const body = (await response.json()) as {
    data?: { price?: { id?: string; product?: string } | null }[];
  };

  const ids: string[] = [];
  for (const item of body.data ?? []) {
    if (item.price?.id) ids.push(item.price.id);
    // `product` е низ, освен ако не е поискано разгъване — тук не е.
    if (typeof item.price?.product === 'string') ids.push(item.price.product);
  }
  return ids;
}

/** Платена ли е сесията наистина. */
export const isPaid = (session: CheckoutSession | null): boolean =>
  session?.payment_status === 'paid' || session?.payment_status === 'no_payment_required';

/** Имейлът на купувача, откъдето и да е попълнен. */
export const buyerEmail = (session: CheckoutSession): string | null =>
  session.customer_details?.email ?? session.customer_email ?? null;

/* ------------------------------------------------------------------ */
/* webhook                                                             */
/* ------------------------------------------------------------------ */

const encoder = new TextEncoder();

/**
 * Проверява подписа на Stripe върху ТЯЛОТО, както е дошло.
 *
 * Заглавието изглежда така: `t=1699999999,v1=<hex>,v1=<hex>`. Подписаното е
 * `<t>.<тялото>`, с ключа `whsec_…`. Повече от един `v1` се среща при смяна на
 * тайната — тогава важи всеки, който съвпада.
 *
 * Тялото ТРЯБВА да е точният низ от заявката. Мине ли през `JSON.parse` и
 * обратно, подписът пада — редът на полетата и интервалите се променят.
 */
export async function verifyWebhook(
  payload: string,
  header: string | null,
  secret: string,
  toleranceSeconds = 300,
): Promise<boolean> {
  if (!header) return false;

  let timestamp = '';
  const signatures: string[] = [];
  for (const part of header.split(',')) {
    const [name, value] = part.split('=', 2);
    if (name?.trim() === 't') timestamp = value?.trim() ?? '';
    else if (name?.trim() === 'v1' && value) signatures.push(value.trim());
  }
  if (!timestamp || signatures.length === 0) return false;

  /* Отдавнашна заявка се отхвърля: подписът си остава верен завинаги, значи
     презаписана стара заявка би минала пак. Часовата разлика е в секунди. */
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${payload}`)),
  );
  const expected = [...mac].map((byte) => byte.toString(16).padStart(2, '0')).join('');

  // Сравнението е по цялата дължина — ранното излизане издава подписа буква
  // по буква на този, който мери времето на отговора.
  return signatures.some((candidate) => {
    if (candidate.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= candidate.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0;
  });
}
