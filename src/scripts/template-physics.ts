/** Aleric's falling/throwable technology badges, using its bundled Matter runtime.
 * Native pointer handling preserves page scrolling on touch devices. */
export function initTechnologyPhysics(Matter: any) {
  const cleanups: Array<() => void> = [];
  document
    .querySelectorAll<HTMLElement>('[data-al-physics]')
    .forEach((scene) => {
      const chips = Array.from(
        scene.querySelectorAll<HTMLElement>('[data-al-chip]'),
      );
      const engine = Matter.Engine.create({ enableSleeping: true });
      engine.gravity.y = 0.8;
      const runner = Matter.Runner.create();
      let bodies: any[] = [];
      let visible = false;
      let started = false;
      let dragging: any = null;
      let activePointer: number | null = null;
      let resizeTimer: ReturnType<typeof setTimeout>;
      let width = 0;

      const stopDrag = () => {
        if (dragging) Matter.Composite.remove(engine.world, dragging);
        dragging = null;
        if (activePointer !== null && scene.hasPointerCapture(activePointer))
          scene.releasePointerCapture(activePointer);
        activePointer = null;
        scene.classList.remove('is-dragging');
      };
      const draw = () => {
        bodies.forEach((body, i) => {
          chips[i].style.transform =
            `translate(${body.position.x}px, ${body.position.y}px) translate(-50%, -50%) rotate(${body.angle}rad)`;
        });
      };
      const build = () => {
        stopDrag();
        Matter.Composite.clear(engine.world, false);
        scene.classList.add('al-physics-active');
        width = scene.clientWidth;
        const height = scene.clientHeight;
        const wall = { isStatic: true };
        Matter.Composite.add(engine.world, [
          Matter.Bodies.rectangle(
            width / 2,
            height + 100,
            width + 400,
            200,
            wall,
          ),
          Matter.Bodies.rectangle(-100, height / 2, 200, height * 6, wall),
          Matter.Bodies.rectangle(
            width + 100,
            height / 2,
            200,
            height * 6,
            wall,
          ),
        ]);
        bodies = chips.map((chip, i) => {
          const size = chip.offsetWidth;
          return Matter.Bodies.circle(
            size / 2 + ((i % 3) / 2) * (width - size),
            -size - i * (size + 10),
            size / 2,
            {
              restitution: 0.3,
              friction: 0.15,
              angle: (i % 2 ? 1 : -1) * 0.15,
            },
          );
        });
        Matter.Composite.add(engine.world, bodies);
        draw();
      };
      const start = () => {
        if (!started) {
          build();
          started = true;
        }
        Matter.Runner.stop(runner);
        Matter.Runner.run(runner, engine);
        scene.dataset.motionState = 'running';
      };
      const pause = () => {
        stopDrag();
        Matter.Runner.stop(runner);
        scene.dataset.motionState = 'paused';
      };
      const observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !document.hidden) start();
        else pause();
      });
      observer.observe(scene);
      Matter.Events.on(engine, 'afterUpdate', draw);
      const position = (event: PointerEvent) => {
        const rect = scene.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
      };
      const down = (event: PointerEvent) => {
        if (event.pointerType !== 'mouse' || event.button !== 0 || !started)
          return;
        const point = position(event);
        const body = Matter.Query.point(bodies, point)[0];
        if (!body) return;
        Matter.Sleeping.set(body, false);
        dragging = Matter.Constraint.create({
          pointA: point,
          bodyB: body,
          pointB: Matter.Vector.rotate(
            Matter.Vector.sub(point, body.position),
            -body.angle,
          ),
          stiffness: 0.2,
          damping: 0.1,
          length: 0,
        });
        Matter.Composite.add(engine.world, dragging);
        activePointer = event.pointerId;
        scene.setPointerCapture(event.pointerId);
        scene.classList.add('is-dragging');
      };
      const move = (event: PointerEvent) => {
        if (dragging) dragging.pointA = position(event);
      };
      const resize = new ResizeObserver(() => {
        if (!started || Math.abs(width - scene.clientWidth) < 1) return;
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          build();
          if (visible && !document.hidden) start();
        }, 150);
      });
      resize.observe(scene);
      const visibility = () => {
        if (visible && !document.hidden) start();
        else pause();
      };
      scene.addEventListener('pointerdown', down);
      scene.addEventListener('pointermove', move);
      scene.addEventListener('pointerup', stopDrag);
      scene.addEventListener('pointercancel', stopDrag);
      document.addEventListener('visibilitychange', visibility);
      cleanups.push(() => {
        pause();
        observer.disconnect();
        resize.disconnect();
        clearTimeout(resizeTimer);
        Matter.Events.off(engine, 'afterUpdate', draw);
        Matter.Composite.clear(engine.world, false);
        Matter.Engine.clear(engine);
        scene.removeEventListener('pointerdown', down);
        scene.removeEventListener('pointermove', move);
        scene.removeEventListener('pointerup', stopDrag);
        scene.removeEventListener('pointercancel', stopDrag);
        document.removeEventListener('visibilitychange', visibility);
        scene.classList.remove('al-physics-active');
        delete scene.dataset.motionState;
        chips.forEach((chip) => chip.style.removeProperty('transform'));
      });
    });
  return () => cleanups.forEach((cleanup) => cleanup());
}
