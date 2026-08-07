/**
 * Ask — reads the link, shows the question, handles the answer.
 */

import { COPY } from './config.js';
import { readUrl } from './link.js';
import { smsUrl, whatsappUrl } from './reply.js';
import { mountScenery } from './scenery.js';
import { initDodge } from './dodge.js';
import * as sound from './sound.js';

const $ = (id) => document.getElementById(id);

const els = {
  gate: $('gate'),
  gateTo: $('gate-to'),
  gateOpen: $('gate-open'),
  mute: $('mute'),
  prompt: $('prompt'),
  promptTo: $('prompt-to'),
  question: $('question'),
  yes: $('yes'),
  no: $('no'),
  win: $('win'),
  winTitle: $('win-title'),
  winBody: $('win-body'),
  confetti: $('confetti'),
  sms: $('sms'),
  whatsapp: $('whatsapp'),
  broken: $('broken'),
  announcer: $('announcer'),
};

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

mountScenery();

const ask = readUrl();

if (!ask) {
  els.broken.hidden = false;
} else {
  start(ask);
}

/* -------------------------------------------------------------------------- */
/* Setup                                                                      */
/* -------------------------------------------------------------------------- */

function start(ask) {
  document.title = ask.to ? `${ask.to} — someone's asking` : "someone's asking";

  if (ask.to) {
    els.gateTo.textContent = `for ${ask.to}`;
    els.gateTo.hidden = false;
    els.promptTo.textContent = `for ${ask.to}`;
    els.promptTo.hidden = false;
  }
  els.question.textContent = ask.q;

  els.yes.addEventListener('click', () => pressYes(ask));

  sound.preload();
  els.gate.hidden = false;

  // unlock() has to run synchronously inside the gesture, so it goes first.
  els.gateOpen.addEventListener('click', () => {
    sound.unlock();
    openAsk();
  });

  els.mute.addEventListener('click', () => {
    const next = !sound.isMuted();
    sound.setMuted(next);
    els.mute.setAttribute('aria-pressed', String(next));
  });
}

function openAsk() {
  els.gate.hidden = true;
  els.prompt.hidden = false;
  els.mute.hidden = false;

  if (reducedMotion) {
    // Chasing a moving target isn't possible for everyone. When motion is
    // turned down, No simply stops responding — still no text, still no joke
    // spelled out, but nothing to chase either.
    els.no.setAttribute('aria-hidden', 'true');
    els.no.setAttribute('tabindex', '-1');
    els.no.addEventListener('click', (event) => event.preventDefault());
    return;
  }

  // Wait for layout and webfonts before measuring, or the resting position is
  // read from a page that hasn't settled yet.
  const begin = () => initDodge(els.no, els.yes, { onDodge: sound.play });
  if (document.fonts?.ready) {
    document.fonts.ready.then(begin);
  } else {
    requestAnimationFrame(begin);
  }
}

/* -------------------------------------------------------------------------- */
/* Yes                                                                        */
/* -------------------------------------------------------------------------- */

function pressYes(ask) {
  els.prompt.hidden = true;
  els.win.hidden = false;
  els.mute.hidden = true;

  els.winTitle.textContent = COPY.winTitle;
  els.winBody.textContent = COPY.winBody;
  els.announcer.textContent = COPY.winTitle;

  if (ask.phone) {
    els.sms.href = smsUrl(ask.phone, COPY.reply);
    els.whatsapp.href = whatsappUrl(ask.phone, COPY.reply);
  } else {
    // No number in the link, so there's nothing to hand off to.
    els.sms.hidden = true;
    els.whatsapp.hidden = true;
  }

  throwConfetti();
}

/**
 * Thirty pieces thrown outward from the middle. Direction, spin and delay are
 * randomised per piece; the motion itself is CSS.
 */
function throwConfetti() {
  if (reducedMotion) return;

  const colors = [
    'var(--rose)',
    'var(--rose-light)',
    'var(--peach)',
    'var(--butter)',
    'var(--butter-light)',
  ];

  els.confetti.replaceChildren(
    ...Array.from({ length: 30 }, (_, index) => {
      const piece = document.createElement('i');
      piece.className = 'confetti__piece';

      const angle = (index / 30) * Math.PI * 2 + Math.random() * 0.5;
      const distance = 100 + Math.random() * 200;

      piece.style.setProperty('--piece-color', colors[index % colors.length]);
      piece.style.setProperty('--piece-x', `${Math.cos(angle) * distance}px`);
      piece.style.setProperty('--piece-y', `${Math.sin(angle) * distance + 180}px`);
      piece.style.setProperty('--piece-spin', `${Math.random() * 900 - 450}deg`);
      piece.style.setProperty('--piece-delay', `${Math.random() * 0.28}s`);
      return piece;
    })
  );

  setTimeout(() => els.confetti.replaceChildren(), 2400);
}
