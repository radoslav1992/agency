/// <reference types="astro/client" />

interface Env {
  /** Resend API key. Set with `wrangler secret put RESEND_API_KEY`. */
  RESEND_API_KEY?: string;
  /** Inbox that receives contact-form submissions. */
  CONTACT_TO?: string;
  /** Verified "from" address, e.g. `Кова студио <hi@kova.studio>`. */
  CONTACT_FROM?: string;
}

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}
