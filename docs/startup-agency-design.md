# Kova — Startup Agency light design

Adapted from the supplied Aleric `index-startup-agency-light.html` template.

- Warm apricot hero (`#f6cba9`) with Kova's existing orange accent (`#e2542b`) and unchanged logo.
- Split hero, circular portrait with pointer tilt, line entrances, geometric ornaments, moving dark text band, horizontal service cards, dark three-step process, staggered project gallery, technology tiles and large closing CTA.
- Template service SVGs, decorative shapes, process ring and Clash Display fonts live in `public/design/aleric`. English headings use Clash Display; Bulgarian uses the existing self-hosted Onest font for Cyrillic support.
- `StartupHome.astro` is shared by both locales. Existing service details, pricing, agent catalog, booking/contact routes, SEO metadata and consent controls remain in their original components/routes.
- `startup-motion.ts` adapts the template's fades, text reveal and Atropos-style tilt to browser APIs. No template demo scripts or unrelated dependencies are loaded. Animation respects reduced-motion preferences, touch devices retain native scrolling, and content stays visible without JavaScript.
- Shared styling is in `startup.css`. The full theme archive, demo photography placeholders and unused theme assets are not deployed.

## Inner pages

- `PageHero.astro` shares the apricot title area and localized breadcrumbs across service, agent, project, contact, booking, analyzer, journal, guide shelf, research and legal pages. Article titles use the same component; guide product pages retain their split cover hero.
- `inner-pages.css` extends the template typography, geometric service icons, square cards, dark process sections, cream pricing, orange accents and closing calls to action to every public route in both available languages, including download and 404 states. The admin layout uses the same branding without marketing scripts.
- `inner-page-motion.ts` progressively animates cards and image panels on entry, respects reduced motion, and never changes form or calendar state.
- Existing text, prices, URLs, form names/actions, booking logic, consent controls and server endpoints are preserved.

Validation: production build and Astro type check; all 28 generated HTML routes at 1440, 768 and 320 pixels; mobile navigation, contact selection and mocked submission, analyzer error handling, and the Bulgarian/English booking calendar through date/time selection to the confirmation form against local D1. Admin and download fallback views were also checked. No bookings, messages or purchases were created. External voice and payment services were not exercised end to end.
