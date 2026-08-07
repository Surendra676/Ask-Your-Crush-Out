/**
 * Sound.
 *
 * Browsers block audio until the page has been genuinely interacted with, and
 * a hover is not an interaction. So playback stays locked until `unlock()` is
 * called from inside a real click or tap — which is what the "tap to open"
 * gate on the ask page is for. Without it the dodge sound would never fire on
 * desktop, because there's nothing to click except Yes, and Yes ends the page.
 */

/**
 * Every clip in the project.
 *
 * `pool` is how many copies to keep. More than one lets rapid retriggers
 * overlap instead of cutting each other off, which matters for the dodge and
 * not at all for the others.
 *
 * `cooldown` is the minimum gap between plays, in ms.
 */
const CLIPS = {
  dodge: { src: '../assets/dodge.mp3', volume: 0.55, pool: 3, cooldown: 420 },
  yes: { src: '../assets/yes.mp3', volume: 0.7, pool: 1, cooldown: 0 },
  celebrate: { src: '../assets/celebrate.mp3', volume: 0.5, pool: 1, cooldown: 0 },
};

/** @type {Record<string, {audios: HTMLAudioElement[], next: number, last: number}>} */
const clips = {};

let unlocked = false;
let muted = false;

/* -------------------------------------------------------------------------- */

export function preload() {
  for (const [name, config] of Object.entries(CLIPS)) {
    clips[name] = {
      audios: Array.from({ length: config.pool }, () => {
        const audio = new Audio(config.src);
        // The long celebration track shouldn't hold up the first paint, so it
        // only gets metadata up front and fills in while she's reading.
        audio.preload = config.src.includes('celebrate') ? 'metadata' : 'auto';
        audio.volume = config.volume;
        return audio;
      }),
      next: 0,
      last: 0,
    };
  }
}

/**
 * Must run synchronously inside a genuine user gesture. Playing then pausing
 * each element while muted is the standard way to satisfy the autoplay policy
 * without the visitor hearing anything.
 */
export function unlock() {
  if (unlocked) return;
  unlocked = true;

  for (const clip of Object.values(clips)) {
    for (const audio of clip.audios) {
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
}

/** @param {keyof CLIPS} name */
export function play(name) {
  const clip = clips[name];
  if (!unlocked || muted || !clip) return;

  const now = performance.now();
  if (now - clip.last < CLIPS[name].cooldown) return;
  clip.last = now;

  const audio = clip.audios[clip.next];
  clip.next = (clip.next + 1) % clip.audios.length;

  audio.currentTime = 0;
  // Autoplay rejections are expected in some contexts and aren't worth
  // surfacing — the page works fine silently.
  audio.play().catch(() => {});
}

/** Convenience for the dodge callback, which takes no arguments. */
export const playDodge = () => play('dodge');

export function stopAll() {
  for (const clip of Object.values(clips)) {
    for (const audio of clip.audios) {
      audio.pause();
      audio.currentTime = 0;
    }
  }
}

export function setMuted(value) {
  muted = value;
  if (value) stopAll();
}

export function isMuted() {
  return muted;
}
