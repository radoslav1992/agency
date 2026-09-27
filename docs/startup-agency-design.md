# Kova — Aleric Startup Agency Light

The active home pages use `TemplateHome.astro` and `TemplateHero.astro`, ported from the supplied `index-startup-agency-light.html`. This supersedes the initial adaptation that reused the old home components.

## Template structure

- Integrated apricot header/hero, vertical social links, right-aligned subtitle, oversized three-line heading, circular founder portrait, original geometric icons and divided measurements.
- Dark technology strip, three-column service carousel, offset about collage, circular action buttons, dark process section, staggered portfolio and circular technology tiles.
- Editorial journal, oversized centered closing section and rebuilt dark footer. Kova's own content replaces demo claims, stock placeholders, fictitious customers and testimonials.
- Inner pages use white editorial title areas, divided columns, portfolio/agent galleries, centered contact form, journal rows and the same typography and footer. Existing booking, analyzer, legal, guide and admin functionality remains intact.

## Styles and assets

`aleric-source.css` contains the used Bootstrap, spacing and component rules from the supplied archive, scoped to `.al-template`. `aleric-kova.css` supplies the brand colors, content adjustments and responsive layouts. Primary green becomes apricot (`#f6b784`); the secondary accent is Kova orange. The existing logo is retained.

English headings use the original template's Space Grotesk, self-hosted with its OFL license. Bulgarian retains the self-hosted Onest font for Cyrillic support. All project screenshots and founder photographs are Kova's; the original archive's placeholder images are not published.

Rech BG is included in Bulgarian and English using the user's supplied homepage screenshot. Its description is based on the current `rech-bg/src/Landing.tsx`: Bulgarian audio, two-voice podcasts, talking avatars and captioned video exports.

## Motion

`public/design/aleric/motion.js` and `swiper.js` are the archive's original GSAP/ScrollTrigger bundle and Swiper library, retaining their license headers. `template-motion.ts` adapts the original reveal, scrubbed text, pinned portfolio-title scale/fade, perspective project reveals and 1/2/3-slide carousel settings to Astro components. Circular buttons respond to the pointer and the portrait tilts.

Reduced-motion preferences disable the scroll animations and reduce slider transition time, including when the preference changes live. Native document scrolling, keyboard navigation, anchors and forms are preserved. Core content remains readable if JavaScript is unavailable. No external template demo scripts, forms or tracking endpoints are used.

## Validation

- Production build and Astro type check.
- All 28 generated HTML routes at desktop, tablet and 320px widths; one main heading, mobile navigation and no unintended horizontal overflow.
- Contact selection/submission and analyzer failure handling with mocked responses; no messages sent.
- Bulgarian and English booking date/time selection through to the confirmation form against local D1; no booking created.
- Admin and download fallback states; local GSAP and Swiper loading, carousel navigation, pointer interactions and live reduced-motion changes.
- Rech BG links and supplied image on the home, Bulgarian project and English project pages.

External voice, payment and message-delivery providers were not exercised end to end.
