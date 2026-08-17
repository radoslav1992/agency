-- Календарът за запазване на разговор.
--
-- Всичко се пази в UTC милисекунди. Местното време е представяне, не данни:
-- в момента, в който в базата влезе „10:00 софийско време“, записът става
-- неразбираем при смяна на лятното часово време и невъзможен за сравняване
-- с обажданията на агента, който говори с хора в друга зона.

CREATE TABLE IF NOT EXISTS bookings (
  id          TEXT PRIMARY KEY,
  -- Началото на разговора, UTC милисекунди от епохата.
  start_utc   INTEGER NOT NULL,
  -- Продължителност в минути. Пази се на записа, а не се чете от
  -- конфигурацията, защото конфигурацията се променя, а вече запазените
  -- разговори не бива да се разместват заедно с нея.
  minutes     INTEGER NOT NULL,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL DEFAULT '',
  phone       TEXT NOT NULL DEFAULT '',
  note        TEXT NOT NULL DEFAULT '',
  -- 'web' | 'agent' | 'admin' — откъде е дошло запазването. Не е украса:
  -- гласовият агент бърка имейли и когато нещо не се връзва, първото, което
  -- искаш да знаеш, е дали часът е записан от човек, или от агент.
  source      TEXT NOT NULL DEFAULT 'web',
  -- 'confirmed' | 'cancelled'. Отказаните остават — записът кой е искал час
  -- и се е отказал е полезен, а изтриването скрива злоупотреба.
  status      TEXT NOT NULL DEFAULT 'confirmed',
  -- Таен низ за връзката „откажи“ и за файла за календара. Позволява на
  -- посетителя да работи със запазването си, без да има вход и парола.
  token       TEXT NOT NULL,
  locale      TEXT NOT NULL DEFAULT 'bg',
  created_utc INTEGER NOT NULL,
  cancelled_utc INTEGER
);

-- Това е цялата защита срещу двойно запазване.
--
-- Проверка „свободен ли е часът“, последвана от вмъкване, е състезание:
-- между двете заявки друг може да е запазил същия час. Уникалният индекс
-- премества решението в базата, където е атомично — второто вмъкване се
-- проваля с грешка за нарушено ограничение и я връщаме като „часът току-що
-- беше зает“.
--
-- Индексът е частичен, за да може отказан час веднага да се освободи.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_slot_unique
  ON bookings (start_utc)
  WHERE status = 'confirmed';

CREATE INDEX IF NOT EXISTS bookings_start ON bookings (start_utc);
CREATE INDEX IF NOT EXISTS bookings_token ON bookings (token);

-- Ръчно затворено време: отпуска, лекар, вече зает следобед.
--
-- Отделна таблица, а не запазване без име: блокировките са интервали с
-- произволна дължина, а запазванията са слотове с фиксирана мрежа. Слагането
-- им в една таблица значи или блокировка, накъсана на слотове, или запазване
-- с край, който никой не чете.
CREATE TABLE IF NOT EXISTS blocks (
  id          TEXT PRIMARY KEY,
  start_utc   INTEGER NOT NULL,
  end_utc     INTEGER NOT NULL,
  reason      TEXT NOT NULL DEFAULT '',
  created_utc INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS blocks_range ON blocks (start_utc, end_utc);
