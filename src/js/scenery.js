/**
 * Scenery.
 *
 * Builds the decorative layer at runtime so the two pages don't have to carry
 * fifty lines of duplicated SVG each. Nothing here is interactive — the whole
 * layer is pointer-events: none and sits behind the content.
 */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Kept low deliberately. Atmosphere, not a screensaver. */
const HEART_COUNT = 9;

/* -------------------------------------------------------------------------- */
/* Pieces                                                                     */
/* -------------------------------------------------------------------------- */

function sun() {
  return `
    <svg class="sun" viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <radialGradient id="sun-glow">
          <stop offset="42%" stop-color="#ffd66b" stop-opacity="0.55" />
          <stop offset="100%" stop-color="#ffd66b" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="sun-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffe9a8" />
          <stop offset="100%" stop-color="#ffc94d" />
        </linearGradient>
      </defs>

      <circle cx="100" cy="100" r="96" fill="url(#sun-glow)" />
      <circle cx="100" cy="100" r="54" fill="url(#sun-face)" />

      <!-- Eyes and a small smile. Kept minimal: two dots and an arc read as
           friendly, while anything more detailed starts to look like clip art. -->
      <circle cx="84" cy="92" r="4.6" fill="#c98a1e" />
      <circle cx="116" cy="92" r="4.6" fill="#c98a1e" />
      <path d="M85 112 Q100 124 115 112" stroke="#c98a1e" stroke-width="4.4"
            stroke-linecap="round" fill="none" />
      <circle cx="74" cy="107" r="6.5" fill="#ffab7d" opacity="0.5" />
      <circle cx="126" cy="107" r="6.5" fill="#ffab7d" opacity="0.5" />
    </svg>
  `;
}

function rainbow() {
  const bands = [
    ['#ff8fa8', 300],
    ['#ffb27d', 274],
    ['#ffd66b', 248],
    ['#a8dcb4', 222],
    ['#8fc7f0', 196],
    ['#c3a8e8', 170],
  ];

  const arcs = bands
    .map(
      ([color, r]) =>
        `<path d="M ${350 - r} 320 A ${r} ${r} 0 0 1 ${350 + r} 320"
               stroke="${color}" stroke-width="22" fill="none" stroke-linecap="round" />`
    )
    .join('');

  return `
    <svg class="rainbow" viewBox="0 0 700 340" aria-hidden="true">
      <g filter="url(#rainbow-soft)">${arcs}</g>
      <defs>
        <filter id="rainbow-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
    </svg>
  `;
}

/**
 * Grain via SVG turbulence. Cheaper and sharper than a tiled PNG, and it scales
 * to any screen without a second asset to ship.
 */
function grain() {
  return `
    <svg class="grain" aria-hidden="true">
      <filter id="grain-noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="3" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain-noise)" />
    </svg>
  `;
}

/**
 * Hearts get randomised inline so they never fall into a visible rhythm.
 * Each one carries its own duration, delay, drift and peak opacity.
 */
function hearts() {
  return Array.from({ length: HEART_COUNT }, () => {
    const size = 11 + Math.random() * 17;
    const left = Math.random() * 100;
    const duration = 17 + Math.random() * 16;
    const delay = -Math.random() * duration; // negative: mid-flight on load
    const sway = `${Math.random() * 90 - 45}px`;
    const peak = (0.16 + Math.random() * 0.24).toFixed(2);

    return `
      <svg class="heart" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"
           style="left:${left}%; width:${size}px; animation-duration:${duration}s;
                  animation-delay:${delay}s; --heart-sway:${sway}; --heart-peak:${peak}">
        <path d="M12 21s-7.5-4.7-9.6-9.2C.7 8.2 2.6 4.6 6.1 4.1c2-.3 3.9.6 4.9 2.2
                 1-1.6 2.9-2.5 4.9-2.2 3.5.5 5.4 4.1 3.7 7.7C19.5 16.3 12 21 12 21z" />
      </svg>
    `;
  }).join('');
}

/* -------------------------------------------------------------------------- */
/* Mount                                                                      */
/* -------------------------------------------------------------------------- */

export function mountScenery() {
  const layer = document.createElement('div');
  layer.className = 'scenery';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = sun() + rainbow() + (reducedMotion ? '' : hearts()) + grain();
  document.body.prepend(layer);
}
