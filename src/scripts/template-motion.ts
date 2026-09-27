/** The supplied Aleric GSAP/ScrollTrigger runtime, with Kova-specific selectors.
 * No smooth-scroll wrapper: keyboard, anchor and form navigation stays native. */
function initTemplateMotion() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const runtime = window as Window & { gsap?: any; ScrollTrigger?: any; Swiper?: any };
  const gsap = runtime.gsap;
  if (gsap && runtime.ScrollTrigger) {
    gsap.registerPlugin(runtime.ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      document
        .querySelectorAll(
          '[data-al-reveal]:not(.tp-portfolio-sa-item), [data-inner-page] :is(.service, .plan, .agent, .project, .post, .row__link, .pillar)',
        )
        .forEach((el) => {
          gsap.from(el, {
            y: 60,
            opacity: 0,
            duration: 1,
            ease: 'power2.out',
            scrollTrigger: { trigger: el, start: 'top 92%', once: true },
          });
        });
      document.querySelectorAll<HTMLElement>('[data-al-ink]').forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0.25 },
          {
            opacity: 1,
            ease: 'none',
            scrollTrigger: { trigger: el, start: 'top 85%', end: 'bottom 45%', scrub: true },
          },
        );
      });
      document.querySelectorAll('.al-portfolio-grid > article').forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0.7, rotationX: 90, scale: 0.5, transformPerspective: 4000 },
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
        document.querySelectorAll<HTMLElement>('[data-al-work-title]').forEach((el) => {
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
    });
  }
  const coarse = matchMedia('(pointer: coarse)');
  document.querySelectorAll<HTMLElement>('[data-al-tilt], [data-al-magnetic]').forEach((el) => {
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
  document.querySelectorAll<HTMLElement>('[data-al-slider]').forEach((track) => {
    if (!runtime.Swiper) return;
    const slider = new runtime.Swiper(track, {
      slidesPerView: 1,
      speed: reduced.matches ? 0 : 1000,
      spaceBetween: 24,
      loop: true,
      pagination: { el: track.parentElement?.querySelector('.al-slider-dots'), clickable: true },
      keyboard: { enabled: true, onlyInViewport: true },
      a11y: {
        enabled: true,
        prevSlideMessage:
          document.documentElement.lang === 'bg' ? 'Предишна услуга' : 'Previous service',
        nextSlideMessage:
          document.documentElement.lang === 'bg' ? 'Следваща услуга' : 'Next service',
      },
      breakpoints: { 768: { slidesPerView: 2 }, 1200: { slidesPerView: 3 } },
    });
    reduced.addEventListener('change', () => {
      slider.params.speed = reduced.matches ? 0 : 1000;
    });
  });
}
if (document.readyState !== 'loading' && (window as Window & { gsap?: any }).gsap)
  initTemplateMotion();
else window.addEventListener('DOMContentLoaded', initTemplateMotion, { once: true });
