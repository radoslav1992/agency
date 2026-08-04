/**
 * @kova/shared-audit — чисти функции над вече свален HTML/robots/schema.
 *
 * Нула мрежа тук: всичко приема суровини (HTML низ, robots.txt текст) и връща
 * стойност. Затова се ползва и от анализатора на сайта, и от derive-фазата на
 * crawler-а, без да носи runtime зависимости (Cloudflare, fetch, Playwright).
 *
 * NB: на етап 4 от плана (пълният derive) тук се консолидират и по-тежките
 * проверки от `src/lib/analyzer.ts`. Засега покриваме метриките, изводими от
 * началната страница.
 */

/* ------------------------------------------------------------------ */
/* Помощни низови операции                                            */
/* ------------------------------------------------------------------ */

/** Груб, но стабилен видим текст: маха script/style и таговете. */
export function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return m ? m[1] : null;
}

/* ------------------------------------------------------------------ */
/* Технически SEO                                                     */
/* ------------------------------------------------------------------ */

export interface SeoSignals {
  title_present: boolean;
  title_length: number;
  meta_desc_present: boolean;
  meta_desc_length: number;
  h1_count: number;
  canonical_present: boolean;
  canonical_self: boolean;
  viewport_meta: boolean;
  html_lang_present: boolean;
}

export function deriveSeo(html: string, pageUrl: string): SeoSignals {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? '';
  const metaDesc =
    html
      .match(/<meta[^>]+name\s*=\s*["']description["'][^>]*>/i)?.[0]
      ?.match(/content\s*=\s*["']([^"']*)["']/i)?.[1]
      ?.trim() ?? '';
  const canonical = html
    .match(/<link[^>]+rel\s*=\s*["']canonical["'][^>]*>/i)?.[0]
    ?.match(/href\s*=\s*["']([^"']*)["']/i)?.[1];

  let canonicalSelf = false;
  if (canonical) {
    try {
      canonicalSelf = new URL(canonical, pageUrl).href.replace(/\/$/, '') === pageUrl.replace(/\/$/, '');
    } catch {
      canonicalSelf = false;
    }
  }

  return {
    title_present: title.length > 0,
    title_length: title.length,
    meta_desc_present: metaDesc.length > 0,
    meta_desc_length: metaDesc.length,
    h1_count: (html.match(/<h1[\s>]/gi) ?? []).length,
    canonical_present: Boolean(canonical),
    canonical_self: canonicalSelf,
    viewport_meta: /<meta[^>]+name\s*=\s*["']viewport["']/i.test(html),
    html_lang_present: /<html[^>]+lang\s*=\s*["'][^"']+["']/i.test(html),
  };
}

/* ------------------------------------------------------------------ */
/* Достъп за AI ботове (robots.txt)                                   */
/* ------------------------------------------------------------------ */

export const AI_BOTS = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'CCBot'] as const;
export type AiBot = (typeof AI_BOTS)[number];

/**
 * Дали `bot` е допуснат от robots.txt. Правилото за конкретния бот има
 * приоритет пред `*`. Липсващ/празен robots.txt значи разрешено.
 */
export function botAllowed(robotsTxt: string, bot: string): boolean {
  if (!robotsTxt.trim()) return true;

  const groups: { agents: string[]; disallowAll: boolean }[] = [];
  let current: { agents: string[]; disallowAll: boolean } | null = null;

  for (const raw of robotsTxt.split('\n')) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const [keyRaw, ...rest] = line.split(':');
    const key = keyRaw.toLowerCase().trim();
    const value = rest.join(':').trim();

    if (key === 'user-agent') {
      if (current && current.agents.length && !groups.includes(current)) groups.push(current);
      if (!current || current.agents.length === 0 || groups.includes(current)) {
        current = { agents: [], disallowAll: false };
      }
      current.agents.push(value.toLowerCase());
    } else if (current && key === 'disallow') {
      if (value === '/') current.disallowAll = true;
    } else if (current && key === 'allow') {
      if (value === '/') current.disallowAll = false;
    }
  }
  if (current && !groups.includes(current)) groups.push(current);

  const forBot = groups.find((g) => g.agents.includes(bot.toLowerCase()));
  if (forBot) return !forBot.disallowAll;
  const star = groups.find((g) => g.agents.includes('*'));
  return star ? !star.disallowAll : true;
}

export function deriveRobotsAi(robotsTxt: string): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const bot of AI_BOTS) out[`robots_${bot.toLowerCase()}`] = botAllowed(robotsTxt, bot);
  return out;
}

/* ------------------------------------------------------------------ */
/* Структурирани данни (schema.org)                                   */
/* ------------------------------------------------------------------ */

export interface SchemaSignals {
  schema_types: string[];
  schema_valid: boolean;
  has_localbusiness_schema: boolean;
}

export function deriveSchema(html: string): SchemaSignals {
  const blocks = html.match(
    /<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  const types = new Set<string>();
  let valid = blocks ? blocks.length > 0 : false;

  for (const block of blocks ?? []) {
    const json = block.replace(/^[\s\S]*?>/, '').replace(/<\/script>$/i, '').trim();
    try {
      const parsed = JSON.parse(json);
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) collectTypes(node, types);
    } catch {
      valid = false;
    }
  }

  const list = [...types];
  return { schema_types: list, schema_valid: valid, has_localbusiness_schema: list.some(isLocalBusinessType) };
}

/**
 * LocalBusiness и десетките му подтипа в schema.org (Bakery, Restaurant,
 * Store, Dentist…). Изброяването е невъзможно, затова: явен списък от честите
 * за български МСП + суфикси, които почти винаги са LocalBusiness подтип.
 */
const LOCAL_BUSINESS_TYPES = new Set([
  'LocalBusiness', 'Organization', 'Restaurant', 'Bakery', 'CafeOrCoffeeShop', 'BarOrPub',
  'FoodEstablishment', 'ProfessionalService', 'Dentist', 'Physician', 'MedicalClinic',
  'HairSalon', 'BeautySalon', 'DaySpa', 'AutoRepair', 'AutoDealer', 'GasStation',
  'LegalService', 'Notary', 'Attorney', 'AccountingService', 'RealEstateAgent',
  'TravelAgency', 'Hotel', 'Lodging', 'ChildCare', 'Pharmacy', 'Florist',
]);

function isLocalBusinessType(t: string): boolean {
  if (LOCAL_BUSINESS_TYPES.has(t)) return true;
  return /(?:Store|Shop|Salon|Service|Business|Establishment|Dealer|Market|Clinic|Agency)$/.test(t);
}

function collectTypes(node: unknown, into: Set<string>): void {
  if (!node || typeof node !== 'object') return;
  const record = node as Record<string, unknown>;
  const type = record['@type'];
  if (typeof type === 'string') into.add(type);
  else if (Array.isArray(type)) for (const t of type) if (typeof t === 'string') into.add(t);
  const graph = record['@graph'];
  if (Array.isArray(graph)) for (const g of graph) collectTypes(g, into);
}

/* ------------------------------------------------------------------ */
/* Оперативни сигнали — заявки, документи, контакт                    */
/* ------------------------------------------------------------------ */

export interface ContactSignals {
  has_contact_form: boolean;
  contact_form_field_count: number;
  contact_only_email: boolean;
  order_by_email_text: boolean;
  facebook_as_primary_contact: boolean;
  has_live_chat: boolean;
}

const ORDER_BY_EMAIL_RE =
  /(попълнете?\s+и\s+(го\s+)?изпратете|заявка\s+на\s+имейл|изпратете\s+(ни\s+)?на\s+(имейл|мейл|e-?mail)|поръчка\s+по\s+(имейл|мейл))/i;

export function deriveContactSignals(html: string): ContactSignals {
  const forms = html.match(/<form[\s\S]*?<\/form>/gi) ?? [];
  const contactForm = forms.find((f) => /email|имейл|съобщение|message|name|име|телефон|phone/i.test(f));
  const fieldCount = contactForm
    ? (contactForm.match(/<(input|textarea|select)[\s>]/gi) ?? []).filter(
        (t) => !/type\s*=\s*["'](hidden|submit|button)["']/i.test(t),
      ).length
    : 0;

  const mailto = /href\s*=\s*["']mailto:/i.test(html);
  const liveChat = /(tawk\.to|livechatinc|crisp\.chat|intercom|tidio|facebook\.com\/plugins\/customer_chat|messenger)/i.test(
    html,
  );
  const fbPrimary =
    /href\s*=\s*["'][^"']*(facebook\.com|m\.me)[^"']*["']/i.test(html) && !contactForm && !mailto;

  return {
    has_contact_form: Boolean(contactForm),
    contact_form_field_count: fieldCount,
    contact_only_email: mailto && !contactForm,
    order_by_email_text: ORDER_BY_EMAIL_RE.test(visibleText(html)),
    facebook_as_primary_contact: fbPrimary,
    has_live_chat: liveChat,
  };
}

export interface DocumentSignals {
  downloadable_form_count: number;
  downloadable_form_types: string[];
  price_list_is_pdf: boolean;
  catalog_is_pdf: boolean;
}

/** Връзки към сваляеми документи + евристики за ценоразпис/каталог като PDF. */
export function deriveDocumentSignals(html: string, pageUrl: string): DocumentSignals {
  const links = [...html.matchAll(/<a[^>]+href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const types = new Set<string>();
  let formCount = 0;
  let priceListPdf = false;
  let catalogPdf = false;

  for (const [, href, inner] of links) {
    const ext = href.split(/[?#]/)[0].match(/\.(pdf|docx?|xlsx?)$/i)?.[1]?.toLowerCase();
    if (!ext) continue;
    types.add(ext);
    const label = (visibleText(inner) + ' ' + href).toLowerCase();
    if (/(формуляр|бланка|заявление|заявка|образец|form|application)/i.test(label)) formCount++;
    if (/(цен|price|прайс|тарифа)/i.test(label)) priceListPdf = priceListPdf || ext === 'pdf';
    if (/(каталог|catalog|брошура|продукт)/i.test(label)) catalogPdf = catalogPdf || ext === 'pdf';
  }

  void pageUrl;
  return {
    downloadable_form_count: formCount,
    downloadable_form_types: [...types],
    price_list_is_pdf: priceListPdf,
    catalog_is_pdf: catalogPdf,
  };
}

/* ------------------------------------------------------------------ */
/* AI четимост — JS зависимост и cloaking по UA                       */
/* ------------------------------------------------------------------ */

export interface RenderSignals {
  renders_without_js: boolean;
  text_ratio_raw_rendered: number;
}

/**
 * Колко от видимия текст присъства още в суровия HTML спрямо рендирания.
 * < 0.6 обикновено значи, че съдържанието идва от JS — проблем за ботове,
 * които не изпълняват скриптове.
 */
export function deriveRenderability(rawHtml: string, renderedHtml: string): RenderSignals {
  const rawLen = visibleText(rawHtml).length;
  const renderedLen = visibleText(renderedHtml).length;
  const ratio = renderedLen === 0 ? 1 : Math.min(1, rawLen / renderedLen);
  return {
    renders_without_js: ratio >= 0.6,
    text_ratio_raw_rendered: Math.round(ratio * 100) / 100,
  };
}

/** Различава ли се съдържанието според това кой UA пита (cloaking). */
export function contentDiffersByUa(htmlA: string, htmlB: string): boolean {
  const a = visibleText(htmlA);
  const b = visibleText(htmlB);
  if (!a.length && !b.length) return false;
  const longer = Math.max(a.length, b.length);
  const diff = Math.abs(a.length - b.length);
  return diff / longer > 0.15;
}

/* ------------------------------------------------------------------ */
/* Поща (MX) → доставчик                                              */
/* ------------------------------------------------------------------ */

export function deriveMxProvider(mxHosts: string[]): string {
  const joined = mxHosts.join(' ').toLowerCase();
  if (/google|googlemail|aspmx/.test(joined)) return 'Google Workspace';
  if (/outlook|microsoft|office365|protection\.outlook/.test(joined)) return 'Microsoft 365';
  if (/zoho/.test(joined)) return 'Zoho';
  if (/mailgun|sendgrid|mandrill/.test(joined)) return 'ESP';
  if (mxHosts.length === 0) return 'none';
  return 'hosting';
}
