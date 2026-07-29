# Кова студио — сайт

Сайтът на Кова студио: Astro 5, статично генериран, деплой към **Cloudflare Workers** (Pages вече е слят с Workers, така че целият сайт се качва като Worker static assets, а само `/api/*` минава през Worker-а).

- Език: български (`lang="bg"`)
- Шрифтове: Unbounded (заглавия) + Onest (текст), самостоятелно хоствани през Fontsource — без външни заявки
- Изображения: оптимизирани при build (`astro:assets` + sharp → WebP)

## Бърз старт

```bash
npm install
npm run dev          # http://localhost:4321 — Astro dev сървър
npm run build        # → dist/
npm run preview      # wrangler dev — истинската Workers среда върху dist/
npm run check        # astro check (типове + шаблони)
```

## Структура

```
src/
├── assets/                 снимки (оптимизират се при build)
├── components/             секциите на сайта, всяка със собствен scoped CSS
├── content/blog/           публикациите като Markdown
├── content.config.ts       схема на блог колекцията
├── data/
│   ├── site.mjs            име, домейн, контакти, навигация
│   ├── content.ts          услуги, процес, „за мен“, пакети, опции във формата
│   ├── projects.ts         ⭐ портфолиото — един масив, захранва и двете места
│   └── testimonials.ts     ⭐ отзивите — тук се сменят с реалните
├── layouts/BaseLayout.astro  <head>, SEO, Open Graph, header/footer
├── lib/posts.ts            четене и подредба на публикациите
├── pages/
│   ├── index.astro         начална страница
│   ├── projects.astro      всички проекти
│   ├── blog/               списък + страница на публикация
│   ├── contact.astro       контакти + форма
│   ├── 404.astro
│   ├── rss.xml.ts
│   └── api/contact.ts      ЕДИНСТВЕНИЯТ сървърен route (`prerender = false`)
└── styles/global.css       цветове, типография, бутони, карти
```

## Какво се сменя най-често

| Какво | Къде |
| --- | --- |
| Проекти в портфолиото | `src/data/projects.ts` (виж по-долу) |
| Отзиви | `src/data/testimonials.ts` (виж по-долу) |
| Услуги, процес, пакети, „за мен“ | `src/data/content.ts` |
| Имейл, LinkedIn, домейн, навигация | `src/data/site.mjs` |
| „Свободен за N проекта“ | `SITE.availability` (`null` го скрива) |
| Линк за резервация на час | `SITE.bookingUrl` |
| Скриване на секцията с цени | `SHOW_PRICING` в `src/pages/index.astro` |
| Нова публикация | нов `.md` файл в `src/content/blog/` |

### Проекти

`src/data/projects.ts` е единственият източник — от него се пълни и секцията на началната страница, и `/projects/`. Нов проект = нов обект в масива `PROJECTS`:

```ts
{
  name: 'Име на проекта',
  url: 'https://example.com/',
  tagline: 'Едно изречение: какво прави и за кого.',
  tags: ['Уеб приложение', 'AI'],
  year: '2026',              // по желание
}
```

Редът в масива е редът на страницата. Началната страница показва първите `PROJECTS_ON_HOME` (по подразбиране 6) и линкът „Всички N проекта →“ води към пълния списък.

> ⚠️ Описанията на текущите проекти са писани без достъп до самите сайтове (средата, в която беше построен сайтът, няма изход към интернет). Прегледай `tagline` и `tags` на всеки и ги поправи.

### Отзиви

`src/data/testimonials.ts` съдържа примерните текстове от дизайна. Когато сложиш реалните:

1. Замени обектите в `TESTIMONIALS`.
2. Смени `PLACEHOLDER_TESTIMONIALS` на `false` — бележката „Примерни текстове“ изчезва.
3. По желание добави `project: { name, url, result }` — името на проекта се показва под клиента и става линк, ако има `url`.

### Нова публикация в блога

Създай `src/content/blog/име-на-статията.md`. Името на файла става адрес (`/blog/име-на-статията/`).

```markdown
---
title: 'Заглавие'
excerpt: 'Едно изречение за списъка и за Google.'
tag: 'AI агенти'
pubDate: 2026-08-01
readMinutes: 5
draft: false      # true = вижда се само в dev
---

Текст в Markdown.
```

Публикациите се подреждат по `pubDate` (най-новата отгоре) и автоматично влизат в началната страница, `/blog/`, `rss.xml` и sitemap-а.

## Формата за контакт

`POST /api/contact` е единственият сървърен route. Работи и със, и без JavaScript (без JS браузърът праща обикновен form POST и се връща на `/contact/?sent=1`).

Защити: honeypot поле, валидация на сървъра, ограничение на дължините, CSRF проверка на `Origin` (вградена в Astro).

Изпращането минава през **Cloudflare Email Routing** (`send_email` binding) — без външна услуга и без API ключ. Без настроен binding формата не се преструва, че е изпратила — връща „Пиши ми директно на имейла отдолу“.

### Настройка (веднъж, в Cloudflare Dashboard)

1. **Email → Email Routing** за зоната (напр. `kova.bg`) → Enable.
2. **Destination addresses** → добави личния си имейл и потвърди линка, който идва по пощата. Binding-ът може да праща **само** до потвърден адрес — това е и цялата защита срещу превръщане на формата в spam relay.
3. По желание **Routing rules**: `hi@kova.bg` → личния имейл (това е „redirect email“ частта).
4. В `wrangler.jsonc` сложи същия адрес и на двете места:
   - `send_email[0].destination_address` — единственият получател, разрешен на Worker-а
   - `vars.CONTACT_TO` — адресът, до който route-ът пише
5. `vars.CONTACT_FROM` трябва да е адрес **от зона в същия акаунт** с включен Email Routing (напр. `forma@kova.bg`). Не е нужно да съществува като пощенска кутия.

Локално `wrangler dev` не праща истински имейл — записва `.eml` файл в `.wrangler/tmp/email/` и изписва пътя в конзолата. Удобно за проверка на съдържанието.

Кирилицата минава коректно: заглавието и имената са `=?utf-8?B?…?=`, а тялото е base64 (mimetext само надписва Content-Transfer-Encoding, затова кодирането се прави в `contact.ts`).

## Деплой към Cloudflare

Целият сайт е статичен и се качва като Worker static assets; `dist/_worker.js` обслужва само `/api/*` (виж `dist/_routes.json`).

### Първоначална настройка (веднъж)

1. **Смени домейна** в `src/data/site.mjs` (`SITE.url`) и в `public/robots.txt`.
2. **Име на Worker-а** — `name` в `wrangler.jsonc` (по подразбиране `kova-studio`).
3. **API токен в Cloudflare** — Dashboard → My Profile → API Tokens → Create Token → шаблон **Edit Cloudflare Workers**.
4. **GitHub secrets** — в repo → Settings → Secrets and variables → Actions:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID` (Dashboard → Workers & Pages → Account ID)
5. **Домейн** — Cloudflare Dashboard → Workers & Pages → `kova-studio` → Settings → Domains & Routes → Add custom domain.

### Автоматичен деплой

`.github/workflows/deploy.yml`:

- **pull request към `main`** → build + `astro check` (без деплой)
- **push към `main`** → build, после `wrangler deploy`

### Ръчен деплой

```bash
npx wrangler login
npm run deploy
```

## Бележки

- `public/_headers` задава кеширане и сигурностни хедъри. `/_astro/*` се кешира завинаги (файловете са с хеш в името).
- `public/.assetsignore` пази `_worker.js` да не се качи като публичен файл.
- Sitemap (`/sitemap-index.xml`) и RSS (`/rss.xml`) се генерират автоматично.
- OG изображението (`public/og.png`) е статично — ако сменяш заглавието на сайта, пресъздай и него.
