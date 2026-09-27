# Kova — Startup Agency light design

Adapted from the supplied Aleric `index-startup-agency-light.html` template.

- Warm apricot hero (`#f6cba9`) with Kova's existing orange accent (`#e2542b`) and unchanged logo.
- Split hero, circular portrait with pointer tilt, line entrances, geometric ornaments, moving dark text band, horizontal service cards, dark three-step process, staggered project gallery, technology tiles and large closing CTA.
- Template service SVGs, decorative shapes, process ring and Clash Display fonts live in `public/design/aleric`. English headings use Clash Display; Bulgarian uses the existing self-hosted Onest font for Cyrillic support.
- `StartupHome.astro` is shared by both locales. Existing service details, pricing, agent catalog, booking/contact routes, SEO metadata and consent controls remain in their original components/routes.
- `startup-motion.ts` adapts the template's fades, text reveal and Atropos-style tilt to browser APIs. No template demo scripts or unrelated dependencies are loaded. Animation respects reduced-motion preferences, touch devices retain native scrolling, and content stays visible without JavaScript.
- Shared styling is in `startup.css`. The full theme archive, demo photography placeholders and unused theme assets are not deployed.
