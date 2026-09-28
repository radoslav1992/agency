# Technology logos

The falling badges in `TemplateHome.astro` use local assets under `public/design/technologies/`.

User-supplied artwork: ElevenLabs, Stripe, Lovable, n8n, Astro, OpenAI, and the Lovable Certified Partner 2026 badge. Uploaded PNGs are preserved as supplied. CSS compensates for the OpenAI image's transparent padding and keeps wide wordmarks proportional.

Additional sources:
- Java: https://github.com/devicons/devicon/blob/master/icons/java/java-original.svg
- Python: https://www.python.org/community/logos/ — the two-snakes SVG, with an intrinsic-size viewBox added for reliable scaling.
- Gemini: https://gemini.google/about/ — the colored symbol from the site's inline header SVG; symbol paths, masks and gradients retained.
- Anthropic: https://github.com/simple-icons/simple-icons/blob/develop/icons/anthropic.svg

The light outlined partner badge is displayed near the homepage introduction; the dark version is used in the shared footer. Its accessible text names Radoslav and the 2026 certification in the active language.

Physics scene height adapts to the badge count and available width. The same falling and dragging behavior remains, with the existing static fallback for reduced motion.
