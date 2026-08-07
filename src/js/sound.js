/**
 * Sound.
 *
 * Browsers block audio until the page has been interacted with, and a hover is
 * not an interaction. So playback stays locked until `unlock()` is called from
 * inside a real click or tap — which is what the "tap to open" gate on the ask
 * page is for. Without that gate the sound would essentially never fire on
 * desktop, because there is nothing to click except Yes, and Yes ends the page.
 */

const SRC = '../assets/dodge.mp3';

/**
 * Minimum gap between plays. The clip runs about 1.8s but a chase produces
 * dodges far faster than that, so it retriggers from the start rather than
 * waiting — this only stops it machine-gunning.
 */
const COOLDOWN = 420;

/** Left of full so it's a surprise, not an assault. */
const VOLUME = 0.55;

/**
 * A small pool of identical elements. One element retriggered rapidly clicks
 * audibly on some browsers; rotating through a few avoids that and lets two
 * plays overlap slightly, which sounds better during a fast chase.
 */
const POOL_SIZE = 3;

let pool = [];
let next = 0;
let unlocked = false;
let muted = false;
let lastPlayed = 0;

/* -------------------------------------------------------------------------- */

export function preload() {
  pool = Array.from({ length: POOL_SIZE }, () => {
    const audio = new Audio(SRC);
    audio.preload = 'auto';
    audio.volume = VOLUME;
    return audio;
  });
}

/**
 * Must be called synchronously from inside a genuine user gesture. Playing and
 * immediately pausing each element while muted is the standard way to satisfy
 * the autoplay policy without the visitor hearing anything.
 */
export function unlock() {
  if (unlocked || !pool.length) return;
  unlocked = true;

  for (const audio of pool) {
    audio.muted = true;
    audio
      .play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
      })
      .catch(() => {
        audio.muted = false;
      });
  }
}

export function play() {
  if (!unlocked || muted || !pool.length) return;

  const now = performance.now();
  if (now - lastPlayed < COOLDOWN) return;
  lastPlayed = now;

  const audio = pool[next];
  next = (next + 1) % pool.length;

  audio.currentTime = 0;
  // Autoplay rejections are expected in some contexts and aren't worth
  // surfacing — the page works fine silently.
  audio.play().catch(() => {});
}

export function setMuted(value) {
  muted = value;
  if (value) {
    for (const audio of pool) audio.pause();
  }
}

export function isMuted() {
  return muted;
}
