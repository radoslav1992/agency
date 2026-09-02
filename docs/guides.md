# Продажбата на наръчници

Купувачът плаща в Stripe, файлът стои в частна кофа R2 и се подава само срещу
подписана връзка. Няма магазин, няма регистрация и няма чужда платформа с
процент от всяка продажба — Stripe взима таксата за картата и толкова.

## Какво къде стои

| Файл | За какво отговаря |
| --- | --- |
| `src/data/guides.ts` | Наръчниците: текстове, цена, адрес за плащане, ключ на файла. **Единственото място, което се редактира при нов наръчник.** |
| `src/pages/guides/index.astro` | Рафтът — списъкът на всички. |
| `src/pages/guides/[slug]/index.astro` | Страницата на един наръчник. |
| `src/pages/guides/[slug]/download.astro` | Страницата след плащането. Проверява сесията в Stripe и издава връзка. |
| `src/pages/api/stripe-webhook.ts` | Сигурният път за доставка — идва при мен и при затворен браузър. |
| `src/pages/api/guide-file.ts` | Единствената врата към файла. |
| `src/lib/stripe.ts` | Проверка на сесия и на подписа на webhook-а. Без библиотека. |
| `src/lib/guide-download.ts` | Подписаните връзки със срок. |
| `src/lib/guide-sale.ts` | Какво става след плащане: запис, връзка, писма. |
| `migrations/0003_guide_purchases.sql` | Кой какво е купил. |

**Файлът на наръчника НЕ Е в хранилището и не бива да влиза.** Хранилището е
публично: каквото влезе в `public/`, се качва като статичен ресурс и се тегли
от всеки, който познае адреса. Продукт на публичен адрес е безплатен продукт.

## Пускане на наръчник за продажба

### 1. Кофата и файлът — от таблото

Cloudflare → R2 → **Create bucket** → име `kova-guides`. Без публичен достъп
(по подразбиране е така — не пипай „Public access“).

После **Upload** и ключът трябва да съвпада с `file.key` от `guides.ts`:

    ai-receptionist/v1.1.pdf

Ако папката не се появи сама: качи файла и го преименувай на пълния път с
наклонена черта — R2 няма истински папки, наклонената черта е част от името.

От команден ред същото е:

```sh
wrangler r2 object put kova-guides/ai-receptionist/v1.1.pdf \
  --file ~/път/до/наръчника.pdf --content-type application/pdf
```

### 2. Таблицата за покупките

Cloudflare → D1 → `kova-bookings` → Console, и пусни съдържанието на
`migrations/0003_guide_purchases.sql`.

### 3. Продуктът в Stripe

Stripe → Product catalogue → **Add product**: име, цена, еднократно плащане.
После **Payment links** → нов линк за този продукт, и в него:

| Настройка | Стойност |
| --- | --- |
| Metadata | ключ `guide`, стойност `ai-receptionist` |
| After payment | Redirect to a page → `https://kova.bg/guides/ai-receptionist/download/?session_id={CHECKOUT_SESSION_ID}` |

**Метаданните не са дребна работа.** По тях се разбира кой наръчник е платен.
Липсват ли, webhook-ът отказва да гадае и не праща файл — по-добре ръчно
писмо, отколкото грешен файл на грешен човек.

Фигурните скоби в адреса се пишат буквално — Stripe ги замества с истинския
идентификатор на сесията.

### 4. Webhook-ът

Stripe → Developers → Webhooks → **Add endpoint**:

| | |
| --- | --- |
| Адрес | `https://kova.bg/api/stripe-webhook` |
| Събития | `checkout.session.completed` и `checkout.session.async_payment_succeeded` |

Втората е за методите, при които банката потвърждава по-късно. Без нея такова
плащане никога не стига до доставка.

### 5. Секретите — от таблото

Workers & Pages → **agency** → Settings → Variables → Secrets:

| Име | Откъде |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys → Secret key (`sk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | от страницата на webhook-а, „Signing secret“ (`whsec_…`) |
| `DOWNLOAD_SECRET` | твой, дълъг и случаен: `openssl rand -hex 32` |

`DOWNLOAD_SECRET` е отделен от ключовете на Stripe нарочно. Смениш ли го,
всички издадени връзки за сваляне умират наведнъж, без това да пипне
плащанията — полезно, ако някоя връзка изтече в интернет.

### 6. Данните

В `src/data/guides.ts`, при наръчника:

```ts
status: 'available',
price: { amount: 39, currency: 'EUR' },
buyUrl: 'https://buy.stripe.com/…',   // адресът на Payment Link-а
```

И трите заедно. Липсва ли едно, страницата остава на „скоро“ — „в продажба“
без адрес е бутон за никъде.

## Как тече една покупка

1. Купувачът натиска „Купи“ и отива в Stripe. Картата му не минава през този
   сайт и никога не го докосва.
2. Stripe го връща на `/guides/<slug>/download/?session_id=…`. Страницата пита
   Stripe платена ли е сесията — стойността от адреса не доказва нищо — и при
   „да“ издава подписана връзка веднага.
3. Независимо от това Stripe чука на `/api/stripe-webhook`. Оттам тръгва
   писмото с връзката. **Това е истинската доставка**: работи и когато човекът
   затвори раздела, преди страницата да се зареди.
4. И двата пътя пишат по един ред в `guide_purchases` с ключ идентификатора на
   сесията. Който стигне втори, вижда, че редът съществува, и не праща второ
   писмо.
5. Връзката е валидна седмица. Изтече ли, купувачът отваря пак адреса, на
   който Stripe го е върнал — сесията в Stripe не изтича и издава нова връзка.
   Без регистрация и без „забравена парола“.

## Ако нещо не работи

| Симптом | Причина |
| --- | --- |
| „Плащането мина, доставката се бави“ | Липсва `STRIPE_SECRET_KEY` или `DOWNLOAD_SECRET` в Worker-а. Парите са взети, покупката е записана — пусни писмото ръчно и добави секрета. |
| Свалянето връща 503 | Липсва `DOWNLOAD_SECRET` или връзката `GUIDE_FILES`. |
| Свалянето връща 404 | Файлът не е в кофата под ключа от `guides.ts`. Провери за разлика в пътя. |
| Свалянето връща 403 | Изтекла или подправена връзка. Купувачът отваря пак страницата след плащането. |
| Webhook-ът е червен в Stripe с 400 | Подписът не съвпада — `STRIPE_WEBHOOK_SECRET` е от друг endpoint или е стар. |
| Webhook-ът връща „unknown guide“ | Payment Link-ът няма `metadata.guide` или в него пише друг `slug`. |
| Няма писмо, но има ред в базата | `SEND_TO_VISITOR` иска включено Email Sending (Cloudflare Email Service) и Workers Paid. Виж `mailed_utc` — `NULL` значи, че писмото не е тръгнало. |

Кой какво е купил:

```sql
SELECT datetime(created_utc / 1000, 'unixepoch') AS кога, guide, email,
       amount_total / 100.0 AS сума, currency,
       CASE WHEN mailed_utc IS NULL THEN 'НЕ' ELSE 'да' END AS писмо
FROM guide_purchases ORDER BY created_utc DESC;
```

## Нов наръчник

1. Запис в `GUIDES` в `src/data/guides.ts` — заглавие, части, за кого е и за
   кого не, `cover`, `file`, `pages`.
2. Корицата в `src/assets/guides/<cover>.png` (или webp/jpg — все едно).
3. Файлът в кофата под `file.key`.
4. Продукт и Payment Link в Stripe с `metadata.guide` = новия `slug`.

Страница не се пипа. Адресът, рафтът, sitemap-ът и `llms.txt` тръгват сами.
