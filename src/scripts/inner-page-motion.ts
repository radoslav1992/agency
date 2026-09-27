/** Progressive Aleric-style entrances for inner pages; no form or calendar state is changed. */
const page = document.querySelector<HTMLElement>("[data-inner-page]");
if (page) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const animations = new Set<Animation>();
  const targets = page.querySelectorAll<HTMLElement>(
    ".service, .plan, .step, .agent__top, .project, .post, .row__link, .pillar, .panel__copy, .panel__actions, .next__card, .hero__art",
  );
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting) return;
        if (!reduced.matches) {
          const animation = target.animate(
            [
              { opacity: 0, transform: "translateY(28px)" },
              { opacity: 1, transform: "none" },
            ],
            { duration: 650, easing: "cubic-bezier(.22,1,.36,1)" },
          );
          animations.add(animation);
          animation.finished
            .then(() => animations.delete(animation))
            .catch(() => animations.delete(animation));
        }
        observer.unobserve(target);
      });
    },
    { threshold: 0.08 },
  );
  targets.forEach((target) => observer.observe(target));
  reduced.addEventListener("change", () => {
    if (reduced.matches) animations.forEach((animation) => animation.finish());
  });
}
