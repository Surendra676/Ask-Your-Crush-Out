/**
 * The dodge.
 *
 * The No button is never allowed to be clicked. Rather than teleporting it to
 * random coordinates — which reads as a glitch — it's simulated: a light body
 * that gets shoved away from the pointer, drifts back toward its resting spot,
 * and bounces off the edges of the screen.
 *
 * Everything good about how it feels falls out of that choice. Continuous
 * velocity is what makes it curve when it changes direction instead of turning
 * a corner. Damping is what stops it jittering. A weak spring home is what
 * gives it the bit of personality — it wanders back once you leave it alone.
 */

/* --- Tuning --------------------------------------------------------------- */

/** Pointer distance at which it starts to care, in px. */
const AWARE_RADIUS = 95;

/** Shove strength. Scales with how close the pointer is. */
const PUSH = 4500;

/** How hard it wants to be back home. Low, so it drifts rather than snaps. */
const SPRING = 1.5;

/** Velocity retained per 60fps frame. Lower is more syrupy. */
const DAMPING = 0.93;

/** Bounce energy kept when it hits a wall. */
const BOUNCE = 0.8;

/** Keep-out distance around the Yes button. */
const YES_CLEARANCE = 28;

/** Gap kept from the viewport edge. */
const MARGIN = 14;

/** A single tap gets this much impulse — there's no approach to react to. */
const TAP_IMPULSE = 900;

/** Below this speed, with no pointer nearby, the loop parks itself. */
const SLEEP_SPEED = 4;

/**
 * The pointer has to retreat past this before another approach counts as new.
 * Without the hysteresis a cursor hovering right at the boundary would trigger
 * over and over.
 */
const DISENGAGE_RADIUS = AWARE_RADIUS * 1.6;

/**
 * Silence at the start.
 *
 * The question appears wherever the pointer already is — she just clicked "tap
 * to open" in the middle of the screen, and the buttons land right there. That
 * first contact isn't her going after the button, so the sound would fire
 * before she'd done anything. The button still slides away; it just does it
 * quietly.
 */
const GRACE_MS = 500;

/* -------------------------------------------------------------------------- */

/**
 * @param {HTMLElement} noButton
 * @param {HTMLElement} yesButton  Treated as an obstacle; never moved.
 * @param {{ onDodge?: () => void }} [options]
 *        onDodge fires once per approach — when the pointer first gets close,
 *        or on each tap — rather than on every frame it happens to be moving.
 */
export function initDodge(noButton, yesButton, options = {}) {
  const onDodge = options.onDodge || (() => {});

  /** Offset from the button's laid-out position. */
  let x = 0;
  let y = 0;
  let vx = 0;
  let vy = 0;

  /** True while the pointer is inside the awareness radius. */
  let engaged = false;

  /** When the simulation started, for the opening grace period. */
  const startedAt = performance.now();

  /** Where the pointer is, or null when it's nowhere near. */
  let pointer = null;

  let home = null;
  let yesBox = null;
  let half = { w: 0, h: 0 };

  let frame = null;
  let lastTime = 0;

  /* --- Geometry ---------------------------------------------------------- */

  /**
   * Measure the resting position with the transform removed, so the offset is
   * always relative to where layout actually puts the button.
   */
  function measure() {
    const previous = noButton.style.transform;
    noButton.style.transform = 'none';
    const box = noButton.getBoundingClientRect();
    noButton.style.transform = previous;

    home = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    half = { w: box.width / 2, h: box.height / 2 };

    const yes = yesButton.getBoundingClientRect();
    yesBox = {
      x: yes.left + yes.width / 2,
      y: yes.top + yes.height / 2,
      halfW: yes.width / 2 + YES_CLEARANCE,
      halfH: yes.height / 2 + YES_CLEARANCE,
    };
  }

  /* --- Simulation -------------------------------------------------------- */

  function step(time) {
    // Clamp dt so a backgrounded tab doesn't resume with one enormous jump.
    const dt = Math.min((time - lastTime) / 1000, 0.05) || 0.016;
    lastTime = time;

    const centreX = home.x + x;
    const centreY = home.y + y;

    let fx = 0;
    let fy = 0;

    // Shove away from the pointer, strongest at contact and easing to nothing
    // at the edge of awareness. Squaring the falloff makes the last few pixels
    // feel urgent, which is what sells the near-miss.
    if (pointer) {
      const dx = centreX - pointer.x;
      const dy = centreY - pointer.y;
      const distance = Math.hypot(dx, dy) || 0.001;

      if (distance < AWARE_RADIUS) {
        const strength = (1 - distance / AWARE_RADIUS) ** 2;
        fx += (dx / distance) * PUSH * strength;
        fy += (dy / distance) * PUSH * strength;

        if (!engaged) {
          engaged = true;
          // Inside the grace window this is the pointer happening to be where
          // the button spawned, not a real attempt. Mark it engaged so it
          // doesn't fire the moment she twitches, but stay quiet.
          if (time - startedAt > GRACE_MS) onDodge();
        }
      } else if (engaged && distance > DISENGAGE_RADIUS) {
        engaged = false;
      }
    } else {
      engaged = false;
    }

    // Drift back to where it belongs.
    fx += -x * SPRING;
    fy += -y * SPRING;

    // Treat Yes as solid so the two never overlap.
    const yesDx = centreX - yesBox.x;
    const yesDy = centreY - yesBox.y;
    const overlapX = yesBox.halfW + half.w - Math.abs(yesDx);
    const overlapY = yesBox.halfH + half.h - Math.abs(yesDy);

    if (overlapX > 0 && overlapY > 0) {
      // Push out along whichever axis needs the least movement.
      if (overlapX < overlapY) {
        fx += Math.sign(yesDx || 1) * overlapX * 42;
      } else {
        fy += Math.sign(yesDy || 1) * overlapY * 42;
      }
    }

    vx = (vx + fx * dt) * DAMPING ** (dt * 60);
    vy = (vy + fy * dt) * DAMPING ** (dt * 60);

    x += vx * dt;
    y += vy * dt;

    // Walls. Reflecting rather than clamping is what stops it burying itself in
    // a corner and vibrating there.
    const minX = MARGIN + half.w - home.x;
    const maxX = window.innerWidth - MARGIN - half.w - home.x;
    const minY = MARGIN + half.h - home.y;
    const maxY = window.innerHeight - MARGIN - half.h - home.y;

    if (x < minX) {
      x = minX;
      vx = Math.abs(vx) * BOUNCE;
    } else if (x > maxX) {
      x = maxX;
      vx = -Math.abs(vx) * BOUNCE;
    }

    if (y < minY) {
      y = minY;
      vy = Math.abs(vy) * BOUNCE;
    } else if (y > maxY) {
      y = maxY;
      vy = -Math.abs(vy) * BOUNCE;
    }

    noButton.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;

    // Park the loop once it's settled and nothing is near, so an idle page
    // isn't burning a frame every 16ms.
    const speed = Math.hypot(vx, vy);
    const displaced = Math.hypot(x, y);
    if (!pointer && speed < SLEEP_SPEED && displaced < 0.6) {
      noButton.style.transform = 'translate3d(0, 0, 0)';
      x = y = vx = vy = 0;
      frame = null;
      return;
    }

    frame = requestAnimationFrame(step);
  }

  function wake() {
    if (frame !== null) return;
    lastTime = performance.now();
    frame = requestAnimationFrame(step);
  }

  /* --- Input ------------------------------------------------------------- */

  function onPointerMove(event) {
    if (event.pointerType === 'touch') return; // handled on contact instead
    pointer = { x: event.clientX, y: event.clientY };
    wake();
  }

  function onPointerLeave() {
    pointer = null;
    wake();
  }

  /**
   * Touch has no approach phase — the finger simply arrives. So the shove
   * happens on contact, and the default is prevented so the touch never
   * becomes a click.
   */
  function onPointerDown(event) {
    if (event.pointerType === 'mouse') return;
    event.preventDefault();

    const centreX = home.x + x;
    const centreY = home.y + y;
    const dx = centreX - event.clientX;
    const dy = centreY - event.clientY;
    const distance = Math.hypot(dx, dy) || 0.001;

    vx += (dx / distance) * TAP_IMPULSE;
    vy += (dy / distance) * TAP_IMPULSE;
    if (performance.now() - startedAt > GRACE_MS) onDodge();
    wake();
  }

  /** Safety net: if a click ever does land, it does nothing at all. */
  function onClick(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  function onResize() {
    measure();
    wake();
  }

  /* --- Wiring ------------------------------------------------------------ */

  measure();

  document.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerleave', onPointerLeave, { passive: true });
  noButton.addEventListener('pointerdown', onPointerDown);
  noButton.addEventListener('click', onClick);
  window.addEventListener('resize', onResize, { passive: true });

  // The button is decorative once it can't be pressed. Hiding it from assistive
  // tech is kinder than offering a control that will never do anything.
  noButton.setAttribute('aria-hidden', 'true');
  noButton.setAttribute('tabindex', '-1');
  noButton.style.touchAction = 'none';

  /**
   * Shut it down.
   *
   * The pointer listeners live on `document`, not on the button, so hiding the
   * button isn't enough — the simulation would keep running against stale
   * coordinates and keep firing onDodge. Anything that takes the question off
   * screen has to call this.
   */
  return function destroy() {
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerleave', onPointerLeave);
    noButton.removeEventListener('pointerdown', onPointerDown);
    noButton.removeEventListener('click', onClick);
    window.removeEventListener('resize', onResize);

    if (frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
    pointer = null;
    engaged = false;
  };
}
