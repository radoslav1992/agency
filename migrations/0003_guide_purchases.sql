-- Кой е купил наръчник.
--
-- Ключът е идентификаторът на сесията в Stripe, а не собствен UUID. Така
-- двата пътя за доставка — страницата след плащането и webhook-ът — пишат по
-- един и същи ред за една и съща покупка, независимо кой стигне пръв.
-- Плащането е един път, редът е един път.
--
-- Парите тук са само копие за справка. Истината за тях е в Stripe; това е,
-- за да се види кой какво чака, без да се влиза в друго табло.

CREATE TABLE IF NOT EXISTS guide_purchases (
  -- `cs_live_…` / `cs_test_…` от Stripe.
  session_id   TEXT PRIMARY KEY,
  -- `slug` от `src/data/guides.ts` — кой наръчник е купен.
  guide        TEXT NOT NULL,
  email        TEXT NOT NULL,
  amount_total INTEGER,
  currency     TEXT,
  -- Кога е тръгнало писмото с връзката. NULL значи „още не е“ — така
  -- повторното отваряне на страницата не праща второ писмо, а провалено
  -- писмо може да се пусне пак.
  mailed_utc   INTEGER,
  created_utc  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS guide_purchases_created ON guide_purchases (created_utc);
CREATE INDEX IF NOT EXISTS guide_purchases_email ON guide_purchases (email);
