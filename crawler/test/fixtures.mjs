/**
 * Известни отговори за екстракторите.
 *
 * Всеки случай е ЗАПИСАН HTML, не жив сайт. Живите сайтове се променят и
 * тестът почва да пада без причина; освен това чуждите сайтове не бива да се
 * дърпат при всяко пускане на тестовете.
 *
 * ➜ Как да добавиш реален сайт (напр. nickmasch.bg):
 *      curl -sL https://nickmasch.bg/ > crawler/test/fixtures/nickmasch.html
 *   после добави случай тук с `file: 'nickmasch.html'` и очакваните
 *   стойности, проверени на ръка.
 *
 * Случаите отдолу възпроизвеждат провалите, открити при ръчната проверка:
 * съдържание само от JS, canonical към чужд адрес и липсващ canonical.
 */

export const CASES = [
  {
    name: 'JS-only съдържание (празно body, монтиращ възел)',
    html: `<!doctype html><html lang="bg"><head><title>Приложение</title>
<meta name="description" content="Кратко описание на приложението, което е достатъчно дълго за проверката.">
<link rel="canonical" href="https://example.bg/"></head>
<body><div id="root"></div><script src="/assets/app.js"></script></body></html>`,
    rendered: `<!doctype html><html lang="bg"><body><div id="root"><h1>Заглавие</h1><p>${'съдържание '.repeat(80)}</p></div></body></html>`,
    url: 'https://example.bg/',
    expect: {
      renders_without_js: false,
      is_spa: true,
      canonical_present: true,
      canonical_self: true,
    },
  },
  {
    name: 'canonical сочи към друг домейн (dev адрес)',
    html: `<!doctype html><html lang="bg"><head><title>Фирма</title>
<link rel="canonical" href="https://friendly-otter-123.replit.dev/"></head>
<body><main><h1>Фирма</h1><p>${'текст '.repeat(60)}</p></main></body></html>`,
    url: 'https://nickmasch.bg/',
    expect: { canonical_present: true, canonical_self: false, renders_without_js: true },
  },
  {
    name: 'липсващ canonical',
    html: `<!doctype html><html lang="bg"><head><title>Магазин</title></head>
<body><main><h1>Магазин</h1><p>${'текст '.repeat(60)}</p></main></body></html>`,
    url: 'https://oudobrinishte.com/',
    expect: { canonical_present: false, viewport_meta: false },
  },
  {
    name: 'WordPress с LocalBusiness схема и PDF ценоразпис',
    html: `<!doctype html><html lang="bg"><head><title>Пекарна</title>
<link rel="stylesheet" href="/wp-content/themes/x/style.css">
<script type="application/ld+json">{"@type":"Bakery","name":"Пекарна"}</script></head>
<body><main><h1>Пекарна</h1>
<a href="/ceni.pdf">Ценоразпис</a>
<form><input name="name"><input name="email"><textarea name="msg"></textarea></form>
</main></body></html>`,
    url: 'https://example-bakery.bg/',
    expect: {
      cms: 'WordPress',
      has_localbusiness_schema: true,
      price_list_is_pdf: true,
      has_contact_form: true,
    },
  },
  {
    name: 'Organization без LocalBusiness — НЕ е локален бизнес',
    html: `<!doctype html><html lang="bg"><head><title>Продукт</title>
<script type="application/ld+json">{"@type":"Organization","name":"X"}</script>
<script type="application/ld+json">{"@type":"ItemList"}</script></head>
<body><main><h1>Продукт</h1></main></body></html>`,
    url: 'https://example-saas.com/',
    expect: { has_localbusiness_schema: false },
  },
];

/**
 * Реални сайтове с проверени на ръка отговори.
 *
 * Файловете НЕ се теглят при всяко пускане на тестовете — записват се
 * веднъж и се комитват:
 *
 *   npm run snapshot -w @kova/crawler
 *
 * Докато файлът липсва, случаят се пропуска с предупреждение, вместо да
 * проваля тестовете. `renders_without_js` изисква и рендиран вариант
 * (браузър), затова тук се проверяват само стойностите от суровия HTML;
 * очакваната стойност е записана за справка.
 */
export const REAL_CASES = [
  {
    domain: 'nickmasch.bg',
    file: 'nickmasch.html',
    expect: { canonical_present: true, canonical_self: false },
    expectRendered: { renders_without_js: false },
  },
  {
    domain: 'oudobrinishte.com',
    file: 'oudobrinishte.html',
    expect: { canonical_present: false },
    expectRendered: { renders_without_js: false },
  },
  {
    domain: 'mezzanine.bg',
    file: 'mezzanine.html',
    expect: { canonical_present: false },
    expectRendered: { renders_without_js: false },
  },
  {
    domain: 'powertec.bg',
    file: 'powertec.html',
    expect: { canonical_present: true, canonical_self: false },
    expectRendered: { renders_without_js: false },
  },
  {
    domain: 'daporasnem.com',
    file: 'daporasnem.html',
    expect: { canonical_present: true, canonical_self: true },
    expectRendered: { renders_without_js: false },
  },
  {
    domain: 'speedguardbg.app',
    file: 'speedguardbg.html',
    expect: { canonical_present: true, canonical_self: true },
    expectRendered: { renders_without_js: true },
  },
];

/** Роли на страници — блог постовете не са „кариери". */
export const ROLE_CASES = [
  { url: '/blog/sait-za-kvartalen-biznes/', text: 'Сайт за квартален бизнес — как работата се автоматизира', expect: 'other' },
  { url: '/kontakti/', text: 'Контакти', expect: 'contact' },
  { url: '/za-vruzka/', text: 'Свържете се с нас', expect: 'contact' },
  { url: '/careers/', text: 'Кариери', expect: 'careers' },
  { url: '/rabota-pri-nas/', text: 'Работа при нас', expect: 'careers' },
  { url: '/ceni/', text: 'Цени', expect: 'pricing' },
  { url: '/za-nas/', text: 'За нас', expect: 'about' },
];
