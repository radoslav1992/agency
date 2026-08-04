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
// ⚠️ `Organization` НЕ влиза тук: LocalBusiness е негов подтип, не обратното.
// Включването му правеше метриката вярна за всеки сайт с Organization схема.
const LOCAL_BUSINESS_TYPES = new Set([
  'LocalBusiness', 'Restaurant', 'Bakery', 'CafeOrCoffeeShop', 'BarOrPub',
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

/* ------------------------------------------------------------------ */
/* Откриване на страници и роли (за многостраничното обхождане)         */
/* ------------------------------------------------------------------ */

export interface DiscoveredLink {
  url: string;
  role: PageRole;
  text: string;
}

export type PageRole = 'home' | 'contact' | 'about' | 'services' | 'pricing' | 'careers' | 'other';

const ROLE_RULES: { role: PageRole; re: RegExp }[] = [
  { role: 'contact', re: /(контакт|contact|kontakt|свържете|за\s*връзка)/i },
  { role: 'careers', re: /(кариер|career|jobs|свободни\s+позиции|вакансии|работа\s+при\s+нас|стани\s+част)/i },
  { role: 'pricing', re: /(цени|цена|price|pricing|тарифи|прайс)/i },
  { role: 'about', re: /(за\s*нас|about|za-nas|за\s*компанията|кои\s+сме|екип|team)/i },
  { role: 'services', re: /(услуги|services|продукт|products|каталог)/i },
];

/** Пътища, които никога не са ролева страница, колкото и да съвпада текстът. */
const NON_ROLE_PATH = /\/(blog|news|novini|article|post|category|tag)(\/|$)/i;

/**
 * Ролята се определя по URL пътя и по текста на връзката — но текстът се
 * гледа само ако е къс като навигационен етикет. Иначе анонс на статия
 * („…как работата се автоматизира…") вкарва блог постове в „кариери" и
 * оперативните сигнали се смятат върху грешната страница.
 */
export function classifyRole(url: string, text: string): PageRole {
  if (NON_ROLE_PATH.test(url)) return 'other';
  const label = text.trim();
  const hay = label.length > 0 && label.length <= 40 ? `${url} ${label}` : url;
  for (const { role, re } of ROLE_RULES) if (re.test(hay)) return role;
  return 'other';
}

/** Вътрешни връзки от началната страница + роля по URL/анкор текст. */
export function discoverInternalLinks(html: string, baseUrl: string): DiscoveredLink[] {
  let origin = '';
  try {
    origin = new URL(baseUrl).origin;
  } catch {
    return [];
  }
  const seen = new Set<string>();
  const out: DiscoveredLink[] = [];
  for (const m of html.matchAll(/<a[^>]+href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let abs: URL;
    try {
      abs = new URL(m[1], baseUrl);
    } catch {
      continue;
    }
    if (abs.origin !== origin) continue;
    if (/\.(pdf|docx?|xlsx?|zip|jpg|png|svg)$/i.test(abs.pathname)) continue;
    const clean = `${abs.origin}${abs.pathname}`.replace(/\/$/, '') || abs.origin;
    if (seen.has(clean)) continue;
    seen.add(clean);
    out.push({ url: clean + '/', role: classifyRole(abs.pathname, visibleText(m[2])), text: visibleText(m[2]).slice(0, 80) });
  }
  return out;
}

/** Шаблонни пътища, ако навигацията не даде нужната роля. */
export const ROLE_PATTERNS: Record<Exclude<PageRole, 'home' | 'other'>, string[]> = {
  contact: ['контакти', 'contact', 'kontakti', 'contacts'],
  about: ['за-нас', 'about', 'za-nas', 'about-us'],
  services: ['услуги', 'services', 'produkti', 'products'],
  pricing: ['цени', 'prices', 'pricing', 'ceni'],
  careers: ['кариери', 'careers', 'rabota', 'jobs', 'работа'],
};

/* ------------------------------------------------------------------ */
/* Стек и възраст                                                     */
/* ------------------------------------------------------------------ */

export interface StackSignals {
  cms: string;
  framework: string;
  is_spa: boolean;
}

export function detectStack(html: string, headers: Record<string, string>): StackSignals {
  const gen = html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? '';
  const powered = headers['x-powered-by'] ?? '';
  // Цялият HTML, не първите N знака: маркерите на框ворките често са в body
  // (`data-astro-cid-…`), а при голям <head> прозорец от 4 KB ги изпуска и
  // дава различен отговор за еднакви по същество сайтове.
  const hay = `${html} ${gen} ${powered}`.toLowerCase();

  // Рамка (как е построен сайтът) — отделно от CMS (с какво се управлява
  // съдържанието). Astro/Next/Nuxt не са CMS и не бива да попадат там.
  let framework = 'none';
  if (/_next\//.test(hay)) framework = 'Next.js';
  else if (/data-reactroot|__react|react-dom/.test(hay)) framework = 'React';
  else if (/__nuxt|nuxt/.test(hay)) framework = 'Nuxt';
  else if (/ng-version|angular/.test(hay)) framework = 'Angular';
  else if (/data-astro|astro-island/.test(hay)) framework = 'Astro';
  else if (/data-v-|vue\.js|__vue__/.test(hay)) framework = 'Vue';
  else if (/svelte/.test(hay)) framework = 'Svelte';

  /** Стойности в <meta generator>, които са рамка или билдър, а не CMS. */
  const GENERATOR_FRAMEWORKS = /^(astro|next|nuxt|gatsby|hugo|jekyll|eleventy|vite|svelte)/i;

  let cms = 'none';
  if (/wp-content|wordpress/.test(hay)) cms = 'WordPress';
  else if (/joomla/.test(hay)) cms = 'Joomla';
  else if (/drupal/.test(hay)) cms = 'Drupal';
  else if (/shopify/.test(hay)) cms = 'Shopify';
  else if (/wix\.com|wixstatic/.test(hay)) cms = 'Wix';
  else if (/squarespace/.test(hay)) cms = 'Squarespace';
  else if (/webflow/.test(hay)) cms = 'Webflow';
  else if (/cloudcart/.test(hay)) cms = 'CloudCart';
  else if (/lovable|gpteng/.test(hay)) cms = 'Lovable';
  else if (gen && !GENERATOR_FRAMEWORKS.test(gen)) cms = gen.split(' ')[0];

  // Generator-ът назовава рамката само ако не сме я разпознали по маркер.
  if (framework === 'none' && gen && GENERATOR_FRAMEWORKS.test(gen)) framework = gen.split(' ')[0];

  // SPA евристика: почти празно body + JS bundle + монтиращ възел.
  // JSON-LD не се брои за скрипт (иначе „application/ld+json" мами и броя,
  // и регекса за „app"), а монтиращият възел се търси прецизно по id.
  const bodyText = visibleText(html.match(/<body[\s\S]*<\/body>/i)?.[0] ?? html).length;
  const jsBundle = /<script[^>]+src\s*=/i.test(html);
  const mountNode = /id\s*=\s*["'](root|app|__next|__nuxt)["']|__NEXT_DATA__|window\.__NUXT__/i.test(html);
  const is_spa = bodyText < 400 && jsBundle && mountNode;

  return { cms, framework, is_spa };
}

/* ------------------------------------------------------------------ */
/* Оперативни сигнали по роля на страница                             */
/* ------------------------------------------------------------------ */

const ADMIN_ROLE_RE =
  /(администратор|оператор\s+(на\s+)?данни|data\s+entry|технически\s+сътрудник|офис\s+мениджър|бек\s*офис|back\s*office|деловодител|касиер)/i;

export interface CareerSignals {
  has_job_listings: boolean;
  hiring_admin_roles: boolean;
}

export function deriveCareers(html: string): CareerSignals {
  const text = visibleText(html);
  const hasListings = /(свободни\s+позиции|обяви\s+за\s+работа|apply|кандидатствай|търсим|назначаваме|we\s+are\s+hiring|вакансии)/i.test(
    text,
  );
  return { has_job_listings: hasListings, hiring_admin_roles: ADMIN_ROLE_RE.test(text) };
}

export interface CommerceSignals {
  ecommerce_platform: string;
  has_online_payment: boolean;
  courier_integration: string;
  product_count_estimate: number;
}

export function deriveCommerce(html: string): CommerceSignals {
  const hay = html.toLowerCase();
  let platform = 'none';
  if (/cloudcart/.test(hay)) platform = 'CloudCart';
  else if (/woocommerce|wc-/.test(hay)) platform = 'WooCommerce';
  else if (/prestashop/.test(hay)) platform = 'PrestaShop';
  else if (/shopify/.test(hay)) platform = 'Shopify';
  else if (/opencart/.test(hay)) platform = 'OpenCart';
  else if (/magento/.test(hay)) platform = 'Magento';

  const courier = /econt|еконт/.test(hay) ? 'Еконт' : /speedy|спиди/.test(hay) ? 'Спиди' : 'none';
  const payment = /(add\s*to\s*cart|добави\s+в\s+количк|stripe|paypal|mypos|borica|epay|заплащане\s+с\s+карта)/i.test(
    hay,
  );
  const products = (hay.match(/add[-_\s]?to[-_\s]?cart|добави\s+в\s+количк/gi) ?? []).length;

  return {
    ecommerce_platform: platform,
    has_online_payment: payment,
    courier_integration: courier,
    product_count_estimate: products,
  };
}

export interface LanguageSignals {
  languages: string[];
  has_english_version: boolean;
}

export function deriveLanguages(html: string): LanguageSignals {
  const langs = new Set<string>();
  /** `x-default` не е език, а резервен вариант — иначе излиза като „x-". */
  const addLang = (raw: string) => {
    const code = raw.slice(0, 2).toLowerCase();
    if (/^[a-z]{2}$/.test(code) && code !== 'x-') langs.add(code);
  };
  const htmlLang = html.match(/<html[^>]+lang\s*=\s*["']([a-z-]+)["']/i)?.[1];
  if (htmlLang) addLang(htmlLang);
  for (const m of html.matchAll(/hreflang\s*=\s*["']([a-z-]+)["']/gi)) addLang(m[1]);
  // Езикови превключватели по текст на връзките.
  if (/>\s*(EN|English|Английски)\s*</i.test(html)) langs.add('en');
  const list = [...langs];
  return { languages: list, has_english_version: list.includes('en') };
}

/** Груба оценка на брой хора на страница „екип/за нас". */
export function deriveTeamHeadcount(html: string): number {
  // Всеки „човек" обикновено е карта с име (два главни думи) + роля.
  const names = html.match(/>[\s]*[А-ЯA-Z][а-яa-z]+\s+[А-ЯA-Z][а-яa-z]+[\s]*</g) ?? [];
  return names.length;
}

/* ------------------------------------------------------------------ */
/* Достъпност (само механично проверимото, т. 6)                       */
/* ------------------------------------------------------------------ */

export interface A11ySignals {
  img_alt_coverage: number | null;
  form_label_coverage: number | null;
}

export function deriveA11y(html: string): A11ySignals {
  const imgs = html.match(/<img\b[^>]*>/gi) ?? [];
  const withAlt = imgs.filter((t) => /\balt\s*=\s*["'][^"']/.test(t)).length;
  const inputs = (html.match(/<input\b[^>]*>/gi) ?? []).filter(
    (t) => !/type\s*=\s*["'](hidden|submit|button|image)["']/i.test(t),
  );
  const labelled = inputs.filter(
    (t) => /\baria-label\s*=|\bid\s*=/.test(t), // грубо: има id (за <label for>) или aria-label
  ).length;
  return {
    img_alt_coverage: imgs.length ? Math.round((withAlt / imgs.length) * 100) / 100 : null,
    form_label_coverage: inputs.length ? Math.round((labelled / inputs.length) * 100) / 100 : null,
  };
}

/* ------------------------------------------------------------------ */
/* Свежест на съдържанието (от sitemap lastmod)                        */
/* ------------------------------------------------------------------ */

export interface FreshnessSignals {
  last_content_update: string | null;
  content_stale_months: number | null;
}

export function deriveFreshness(sitemapXml: string, nowMs: number): FreshnessSignals {
  const dates = [...sitemapXml.matchAll(/<lastmod>([^<]+)<\/lastmod>/gi)]
    .map((m) => Date.parse(m[1].trim()))
    .filter((n) => !Number.isNaN(n));
  if (!dates.length) return { last_content_update: null, content_stale_months: null };
  const latest = Math.max(...dates);
  const months = Math.max(0, Math.round((nowMs - latest) / (30 * 86_400_000)));
  return { last_content_update: new Date(latest).toISOString().slice(0, 10), content_stale_months: months };
}

/* ------------------------------------------------------------------ */
/* Производителност (от PageSpeed Insights JSON)                       */
/* ------------------------------------------------------------------ */

export interface PerfSignals {
  psi_performance_score: number | null;
  lcp_ms: number | null;
  cls: number | null;
  inp_ms: number | null;
  crux_data_available: boolean;
}

export function derivePerformance(psi: unknown): PerfSignals {
  const p = psi as {
    lighthouseResult?: { categories?: { performance?: { score?: number } }; audits?: Record<string, { numericValue?: number }> };
    loadingExperience?: { metrics?: Record<string, unknown> };
  };
  const lh = p?.lighthouseResult;
  const audits = lh?.audits ?? {};
  const crux = p?.loadingExperience?.metrics;
  return {
    psi_performance_score: lh?.categories?.performance?.score != null ? Math.round(lh.categories.performance.score * 100) : null,
    lcp_ms: audits['largest-contentful-paint']?.numericValue ?? null,
    cls: audits['cumulative-layout-shift']?.numericValue ?? null,
    inp_ms: audits['interaction-to-next-paint']?.numericValue ?? audits['max-potential-fid']?.numericValue ?? null,
    crux_data_available: Boolean(crux && Object.keys(crux).length),
  };
}
