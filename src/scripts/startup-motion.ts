/** Aleric Startup Agency motion adapted to native browser APIs.
 * Content is visible before JS; effects respect reduced motion and fine-pointer input.
 */
const root = document.querySelector<HTMLElement>(".startup-home");
if (root) {
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  const toggle = root.querySelector<HTMLButtonElement>("[data-sa-motion]");
  toggle?.addEventListener("click", () => {
    const paused = root.classList.toggle("sa-motion-paused");
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.setAttribute(
      "aria-label",
      document.documentElement.lang === "en"
        ? paused
          ? "Resume decorative motion"
          : "Pause decorative motion"
        : paused
          ? "Пусни декоративните анимации"
          : "Спри декоративните анимации",
    );
    const icon = toggle.querySelector("span");
    if (icon) icon.textContent = paused ? "▷" : "Ⅱ";
  });
  const animated = new Set<Animation>();
  const animate = (
    el: HTMLElement,
    frames: Keyframe[],
    options: KeyframeAnimationOptions,
  ) => {
    if (motion.matches) return;
    const animation = el.animate(frames, options);
    animated.add(animation);
    animation.finished
      .then(() => animated.delete(animation))
      .catch(() => animated.delete(animation));
  };
  const revealTargets = root.querySelectorAll<HTMLElement>(
    "[data-sa-reveal], .about .figure, .about .copy, .work, .proof__head, .cta .panel__copy",
  );
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animate(
          entry.target as HTMLElement,
          [
            { opacity: 0, transform: "translateY(40px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration: 750, easing: "cubic-bezier(.22,1,.36,1)" },
        );
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.08 },
  );
  revealTargets.forEach((el) => observer.observe(el));

  const portrait = root.querySelector<HTMLElement>("[data-sa-tilt]");
  let tiltFrame = 0;
  portrait?.addEventListener("pointermove", (event) => {
    if (motion.matches || !finePointer.matches) return;
    cancelAnimationFrame(tiltFrame);
    tiltFrame = requestAnimationFrame(() => {
      const rect = portrait.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      portrait.style.transform = `perspective(1000px) rotateX(${-y * 9}deg) rotateY(${x * 9}deg)`;
    });
  });
  const resetTilt = () => {
    cancelAnimationFrame(tiltFrame);
    if (portrait) portrait.style.transform = "";
  };
  portrait?.addEventListener("pointerleave", resetTilt);
  portrait?.addEventListener("pointercancel", resetTilt);

  const track = root.querySelector<HTMLElement>(".sa-service-track");
  const buttons = root.querySelectorAll<HTMLButtonElement>("[data-sa-slide]");
  const progress = root.querySelector<HTMLElement>(".sa-service-progress");
  const updateSlider = () => {
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    progress?.style.setProperty(
      "--progress",
      `${max > 0 ? (track.scrollLeft / max) * 100 : 0}%`,
    );
    buttons.forEach((button) => {
      button.disabled =
        Number(button.dataset.saSlide) < 0
          ? track.scrollLeft < 4
          : track.scrollLeft >= max - 4;
    });
  };
  buttons.forEach((button) =>
    button.addEventListener("click", () => {
      if (!track) return;
      const card = track.querySelector<HTMLElement>(".sa-service-card");
      track.scrollBy({
        left:
          Number(button.dataset.saSlide) * ((card?.offsetWidth ?? 330) + 22),
        behavior: motion.matches ? "instant" : "smooth",
      });
    }),
  );
  track?.addEventListener("scroll", updateSlider, { passive: true });
  if (track) new ResizeObserver(updateSlider).observe(track);
  updateSlider();

  const ink = root.querySelectorAll<HTMLElement>("[data-sa-ink]");
  const back = document.createElement("button");
  back.className = "sa-backtop";
  back.type = "button";
  back.textContent = "↑";
  back.setAttribute(
    "aria-label",
    document.documentElement.lang === "en" ? "Back to top" : "Към началото",
  );
  back.hidden = true;
  document.body.append(back);
  back.addEventListener("click", () =>
    window.scrollTo({
      top: 0,
      behavior: motion.matches ? "instant" : "smooth",
    }),
  );
  let scrollFrame = 0;
  const renderScroll = () => {
    scrollFrame = 0;
    ink.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const p = motion.matches
        ? 1
        : Math.max(
            0,
            Math.min(1, (innerHeight * 0.9 - rect.top) / (innerHeight * 0.4)),
          );
      el.style.setProperty("--ink-progress", `${100 - p * 100}%`);
    });
    back.hidden = window.scrollY < 700;
  };
  const scheduleScroll = () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(renderScroll);
  };
  window.addEventListener("scroll", scheduleScroll, { passive: true });
  window.addEventListener("resize", scheduleScroll, { passive: true });
  motion.addEventListener("change", () => {
    resetTilt();
    if (motion.matches) animated.forEach((a) => a.finish());
    renderScroll();
  });
  renderScroll();
}
