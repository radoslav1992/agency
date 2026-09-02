-- Кой чака наръчник.
--
-- Отделна таблица от `bookings`: това не е час, а обещание за едно писмо.
-- Смесването им би значело, че всяко запитване „кога излиза“ се появява в
-- панела с предстоящите разговори.

CREATE TABLE IF NOT EXISTS guide_signups (
  id          TEXT PRIMARY KEY,
  -- `slug` от `src/data/guides.ts`. Пази се, за да не се известяват хора за
  -- наръчник, за който не са се записвали.
  guide       TEXT NOT NULL,
  email       TEXT NOT NULL,
  created_utc INTEGER NOT NULL
);

-- Двойното натискане на бутона не бива да прави два записа. Уникалният
-- индекс го решава в базата; приложението превежда отказа на „вече си в
-- списъка“, което за човека отсреща е същото като успех.
CREATE UNIQUE INDEX IF NOT EXISTS guide_signups_unique
  ON guide_signups (guide, email);

CREATE INDEX IF NOT EXISTS guide_signups_created ON guide_signups (created_utc);
