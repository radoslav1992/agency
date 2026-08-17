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

interface Env {
  /** Bound in wrangler.jsonc → `send_email`. Delivers to verified destinations. */
  SEND_EMAIL?: SendEmailBinding;
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
