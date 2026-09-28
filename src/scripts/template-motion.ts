import { initTechnologyPhysics } from './template-physics';

/** The supplied Aleric GSAP/ScrollTrigger runtime, with Kova-specific selectors.
 * No smooth-scroll wrapper: keyboard, anchor and form navigation stays native. */
function initTemplateMotion() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const runtime = window as Window & {
    gsap?: any;
    ScrollTrigger?: any;
    Swiper?: any;
    SplitText?: any;
    Matter?: any;
  };
  const gsap = runtime.gsap;
  if (gsap && runtime.ScrollTrigger) {
    gsap.registerPlugin(runtime.ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const cleanup: Array<() => void> = [];
      document
        .querySelectorAll(
          '[data-al-reveal]:not(.tp-portfolio-sa-item), [data-inner-page] :is(.service, .plan, .agent, .project, .post, .row__link, .pillar)',
        )
        .forEach((el) => {
          const from = el.getAttribute('data-al-from') || 'bottom';
          const offset = Number(el.getAttribute('data-al-offset') || 40);
          gsap.from(el, {
            x: from === 'left' ? -offset : from === 'right' ? offset : 0,
            y: from === 'top' ? -offset : from === 'bottom' ? offset : 0,
            opacity: 0,
            duration: 0.75,
            delay: Number(el.getAttribute('data-al-delay') || 0.15),
            ease: el.getAttribute('data-al-ease') || 'power2.out',
            scrollTrigger: { trigger: el, start: 'top 85%', once: true },
          });
        });
      // Split each heading independently, like the source template. Re-split when
      // its width changes so the wipe follows the actual lines on mobile too.
      document
        .querySelectorAll<HTMLElement>('[data-al-ink], [data-al-rotate-text]')
        .forEach((el) => {
          if (!runtime.SplitText) return;
          const label = el.getAttribute('aria-label');
          el.setAttribute(
            'aria-label',
            el.innerText.trim().replace(/\s+/g, ' '),
          );
          let split: any;
          let context: any;
          let width = el.clientWidth;
          let timer: ReturnType<typeof setTimeout>;
          const setup = () => {
            context?.revert();
            split?.revert();
            const rotate = el.hasAttribute('data-al-rotate-text');
            split = new runtime.SplitText(el, {
              type: rotate ? 'words,chars' : 'lines',
              linesClass: 'al-ink-line',
            });
            Array.from(el.children).forEach((child) =>
              child.setAttribute('aria-hidden', 'true'),
            );
            context = gsap.context(() => {
              if (rotate) {
                gsap.from(split.chars, {
                  rotation: 20,
                  opacity: 0,
                  duration: 1,
                  stagger: 0.1,
                  ease: 'back.out',
                  scrollTrigger: { trigger: el, start: 'top 80%', once: true },
                });
              } else {
                split.lines.forEach((line: HTMLElement) =>
                  gsap.fromTo(
                    line,
                    { backgroundPositionX: '100%' },
                    {
                      backgroundPositionX: '0%',
                      ease: 'none',
                      scrollTrigger: {
                        trigger: line,
                        start: 'top 85%',
                        end: 'bottom center',
                        scrub: 1,
                      },
                    },
                  ),
                );
              }
            });
          };
          setup();
          const observer = new ResizeObserver(() => {
            if (width === el.clientWidth) return;
            width = el.clientWidth;
            clearTimeout(timer);
            timer = setTimeout(() => {
              setup();
              runtime.ScrollTrigger.refresh();
            }, 150);
          });
          observer.observe(el);
          cleanup.push(() => {
            clearTimeout(timer);
            observer.disconnect();
            context?.revert();
            split?.revert();
            if (label === null) el.removeAttribute('aria-label');
            else el.setAttribute('aria-label', label);
          });
        });
      // Separate image transforms from wrapper entrances and pointer tilt.
      document
        .querySelectorAll<HTMLElement>('[data-al-parallax]')
        .forEach((el) => {
          // Keep the top of people's heads in frame throughout the scroll.
          // Top-anchored lateral movement preserves motion without an upward crop.
          const face = el.dataset.alParallax === 'face';
          gsap.fromTo(
            el,
            face
              ? { xPercent: -2, yPercent: 0, scale: 1.15, transformOrigin: el.closest('.al-about-stage') ? '32% top' : '60% top' }
              : { yPercent: -6, scale: 1.15 },
            {
              xPercent: face ? 2 : 0,
              yPercent: face ? 0 : 6,
              scale: 1.15,
              ease: 'none',
              scrollTrigger: {
                trigger: el.parentElement,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 0.6,
              },
            },
          );
        });
      if (runtime.Matter) cleanup.push(initTechnologyPhysics(runtime.Matter));
      document
        .querySelectorAll('.al-portfolio-grid > article')
        .forEach((el) => {
          gsap.fromTo(
            el,
            {
              opacity: 0.7,
              rotationX: 90,
              scale: 0.5,
              transformPerspective: 4000,
            },
            {
              opacity: 1,
              rotationX: 0,
              scale: 1,
              duration: 1.5,
              scrollTrigger: {
                trigger: el,
                scrub: 2,
                start: 'top bottom+=100',
                end: 'bottom center',
              },
            },
          );
        });
      if (matchMedia('(min-width: 992px)').matches) {
        document
          .querySelectorAll<HTMLElement>('[data-al-work-title]')
          .forEach((el) => {
            const area = el.closest('.portfolio__area');
            // Original Startup Agency portfolio title: pinned scale and fade.
            const timeline = gsap.timeline({
              scrollTrigger: {
                trigger: area,
                start: 'top center-=200',
                pin: el,
                end: 'bottom bottom+=10',
                pinSpacing: false,
                scrub: 1,
              },
            });
            timeline
              .to(el, { scale: 3, duration: 1 })
              .to(el, { scale: 3, duration: 1 })
              .to(el, { scale: 1, duration: 1 }, '+=2');
            gsap.to(el, {
              opacity: 0,
              scrollTrigger: {
                trigger: area,
                start: 'top center-=100',
                end: 'bottom bottom+=10',
                scrub: 1,
              },
            });
          });
      }
      return () => cleanup.forEach((fn) => fn());
    });
    // Font and image dimensions must be final before calculating scroll ranges.
    document.querySelectorAll('img').forEach((img) => {
      if (!img.complete)
        img.addEventListener('load', () => runtime.ScrollTrigger.refresh(), {
          once: true,
        });
    });
  }
  document
    .querySelectorAll<HTMLDetailsElement>('.agent__details')
    .forEach((details) => {
      details.addEventListener('toggle', () =>
        runtime.ScrollTrigger?.refresh(),
      );
    });
  const coarse = matchMedia('(pointer: coarse)');
  document
    .querySelectorAll<HTMLElement>('[data-al-tilt], [data-al-magnetic]')
    .forEach((el) => {
      el.addEventListener('pointermove', (event) => {
        if (reduced.matches || coarse.matches) return;
        const box = el.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width - 0.5;
        const y = (event.clientY - box.top) / box.height - 0.5;
        el.style.transform = el.hasAttribute('data-al-tilt')
          ? `perspective(900px) rotateX(${-y * 9}deg) rotateY(${x * 9}deg)`
          : `translate(${x * 22}px,${y * 22}px)`;
      });
      el.addEventListener('pointerleave', () => (el.style.transform = ''));
      reduced.addEventListener('change', () => {
        el.style.transform = '';
      });
    });
  document
    .querySelectorAll<HTMLElement>('[data-al-slider]')
    .forEach((track) => {
      if (!runtime.Swiper) return;
      const slider = new runtime.Swiper(track, {
        slidesPerView: 1,
        speed: reduced.matches ? 0 : 1000,
        spaceBetween: 24,
        loop: true,
        pagination: {
          el: track.parentElement?.querySelector('.al-slider-dots'),
          clickable: true,
        },
        keyboard: { enabled: true, onlyInViewport: true },
        a11y: {
          enabled: true,
          prevSlideMessage:
            document.documentElement.lang === 'bg'
              ? 'Предишна услуга'
              : 'Previous service',
          nextSlideMessage:
            document.documentElement.lang === 'bg'
              ? 'Следваща услуга'
              : 'Next service',
        },
        breakpoints: { 768: { slidesPerView: 2 }, 1200: { slidesPerView: 3 } },
      });
      reduced.addEventListener('change', () => {
        slider.params.speed = reduced.matches ? 0 : 1000;
      });
    });
}
const start = () => {
  void document.fonts.ready.then(initTemplateMotion);
};
if (
  document.readyState !== 'loading' &&
  (window as Window & { gsap?: any }).gsap
)
  start();
else window.addEventListener('DOMContentLoaded', start, { once: true });
