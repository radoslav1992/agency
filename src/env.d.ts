/// <reference types="astro/client" />

/** Cloudflare Email Routing `send_email` binding. */
interface SendEmailBinding {
  send(message: unknown): Promise<void>;
}

interface Env {
  /** Bound in wrangler.jsonc → `send_email`. Delivers to verified destinations. */
  SEND_EMAIL?: SendEmailBinding;
  /** Inbox that receives contact-form submissions (a verified destination). */
  CONTACT_TO?: string;
  /** Sender address on a zone with Email Routing enabled, e.g. `hi@kova.bg`. */
  CONTACT_FROM?: string;
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
