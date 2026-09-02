/// <reference types="astro/client" />

/** Cloudflare Email Routing `send_email` binding. */
interface SendEmailBinding {
  send(message: unknown): Promise<void>;
}

/** Static-assets binding (wrangler.jsonc → `assets.binding`). */
interface AssetsBinding {
  fetch(request: Request): Promise<Response>;
}

/**
 * Само това, което календарът ползва от D1.
 *
 * Ръчна декларация вместо `@cloudflare/workers-types`, по същата причина,
 * поради която `SendEmailBinding` и `AssetsBinding` са ръчни: пакетът тежи
 * мегабайти дефиниции заради петте метода отдолу и внася глобални типове,
 * които се разминават с тези на Astro.
 */
interface D1Result<T> {
  results: T[];
  success: boolean;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<{ success: boolean }>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

/**
 * Само това, което свалянето ползва от R2 — по същата причина, поради която
 * D1 е ръчно деклариран: пълните типове тежат мегабайти заради два метода.
 */
interface R2Object {
  body: ReadableStream;
  size: number;
  httpEtag: string;
  httpMetadata?: { contentType?: string };
}

interface R2Bucket {
  get(key: string): Promise<R2Object | null>;
  head(key: string): Promise<Omit<R2Object, 'body'> | null>;
}

interface Env {
  /**
   * Вързана с `destination_address` — пише САМО в кутията на студиото и не
   * може да пише другаде, дори при грешка в кода. Безплатна е и не влиза в
   * месечната сметка, защото получателят е потвърден адрес в акаунта.
   */
  SEND_EMAIL?: SendEmailBinding;
  /**
   * Без ограничение за получател — с нея тръгват потвържденията до
   * посетителите. Изисква включено Email Sending (Cloudflare Email Service,
   * публична бета) и Workers Paid. Липсва ли, потвържденията се пропускат и
   * се записват в дневника; всичко останало продължава да работи.
   */
  SEND_TO_VISITOR?: SendEmailBinding;
  /** Подателят на писмата за часове. По подразбиране `CONTACT_FROM`. */
  BOOKING_FROM?: string;
  /** Inbox that receives contact-form submissions (a verified destination). */
  CONTACT_TO?: string;
  /** Sender address on a zone with Email Routing enabled, e.g. `hi@kova.bg`. */
  CONTACT_FROM?: string;
  /** The site's static build — lets the Worker serve its own pages to the analyzer. */
  ASSETS?: AssetsBinding;
  /** Календарът. Bound in wrangler.jsonc → `d1_databases`. */
  BOOKINGS?: D1Database;
  /**
   * Споделената тайна, с която ElevenLabs се представя на `/api/agent/*`.
   * Без нея тези пътища връщат 503 и не приемат запазвания.
   */
  AGENT_TOKEN?: string;
  /** Паролата за `/admin/`. Без нея панелът не се отваря — връща 503. */
  ADMIN_PASSWORD?: string;

  /* --- продажбата на наръчници --- */

  /** Частната кофа с файловете. Без нея свалянето връща 503. */
  GUIDE_FILES?: R2Bucket;
  /**
   * Тайният ключ на Stripe (`sk_live_…`). С него се проверява дали сесията
   * наистина е платена. Липсва ли, страницата след плащането отказва да
   * издаде връзка — по-добре ядосан купувач, който ще получи файла по поща,
   * отколкото файл, раздаван на непроверени.
   */
  STRIPE_SECRET_KEY?: string;
  /** Подписът на Stripe за webhook-а (`whsec_…`). Без него webhook връща 503. */
  STRIPE_WEBHOOK_SECRET?: string;
  /**
   * Собствената тайна, с която се подписват връзките за сваляне. Различна от
   * ключовете на Stripe нарочно: смяната ѝ обезсилва всички издадени връзки,
   * без да пипа плащанията.
   */
  DOWNLOAD_SECRET?: string;
  /** Подателят на писмата с връзка за сваляне. По подразбиране `BOOKING_FROM`. */
  GUIDE_FROM?: string;
}

declare module 'cloudflare:email' {
  export class EmailMessage {
    constructor(from: string, to: string, raw: ReadableStream | string);
  }
}

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}
