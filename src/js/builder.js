/**
 * Builder — turns three fields into a shareable link.
 */

import { SUGGESTIONS, COPY } from './config.js';
import { buildUrl, normalisePhone, hasCountryCode } from './link.js';
import { mountScenery } from './scenery.js';

const $ = (id) => document.getElementById(id);

const els = {
  recipient: $('recipient'),
  question: $('question'),
  suggestions: $('suggestions'),
  phone: $('phone'),
  phoneHint: $('phone-hint'),
  makeLink: $('make-link'),
  builder: $('builder'),
  result: $('result'),
  linkOutput: $('link-output'),
  copyLink: $('copy-link'),
  shareLink: $('share-link'),
  previewLink: $('preview-link'),
  editAgain: $('edit-again'),
};

const PHONE_HINT = 'So they can text you back. It only ever lives in the link.';
const PHONE_WARN = 'Add your country code (+1, +44, +91…) or the reply may not send.';

/* -------------------------------------------------------------------------- */
/* Suggestions                                                                */
/* -------------------------------------------------------------------------- */

let activeSuggestion = -1;

function matching() {
  const typed = els.question.value.trim().toLowerCase();
  if (!typed) return SUGGESTIONS;
  return SUGGESTIONS.filter(
    (s) => s.toLowerCase().includes(typed) && s.toLowerCase() !== typed
  );
}

function openSuggestions() {
  const matches = matching();
  if (!matches.length) return closeSuggestions();

  activeSuggestion = -1;
  els.suggestions.replaceChildren(
    ...matches.map((text) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'suggestion';
      button.textContent = text;
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', 'false');
      // mousedown fires before the input's blur, so the click isn't swallowed
      button.addEventListener('mousedown', (event) => {
        event.preventDefault();
        choose(text);
      });
      item.append(button);
      return item;
    })
  );

  els.suggestions.hidden = false;
  els.question.setAttribute('aria-expanded', 'true');
}

function closeSuggestions() {
  els.suggestions.hidden = true;
  els.question.setAttribute('aria-expanded', 'false');
  activeSuggestion = -1;
}

function choose(text) {
  els.question.value = text;
  closeSuggestions();
  validate();
  els.question.focus();
}

function move(delta) {
  const options = [...els.suggestions.querySelectorAll('.suggestion')];
  if (!options.length) return;

  activeSuggestion = (activeSuggestion + delta + options.length) % options.length;
  options.forEach((option, index) =>
    option.setAttribute('aria-selected', String(index === activeSuggestion))
  );
  options[activeSuggestion].scrollIntoView({ block: 'nearest' });
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

function validate() {
  const hasQuestion = els.question.value.trim().length > 0;
  const phone = normalisePhone(els.phone.value);
  els.makeLink.disabled = !(hasQuestion && phone.length >= 7);

  // Missing country code is a warning, never a blocker — plenty of valid
  // numbers look unusual, and guessing a country risks texting a stranger.
  const missingCode = phone.length >= 7 && !hasCountryCode(phone);
  els.phoneHint.classList.toggle('field__hint--warn', missingCode);
  els.phoneHint.textContent = missingCode ? PHONE_WARN : PHONE_HINT;
}

/* -------------------------------------------------------------------------- */
/* Result                                                                     */
/* -------------------------------------------------------------------------- */

function showResult() {
  const url = buildUrl({
    to: els.recipient.value.trim(),
    q: els.question.value.trim(),
    phone: normalisePhone(els.phone.value),
  });

  els.linkOutput.textContent = url;
  els.previewLink.href = url;
  els.builder.hidden = true;
  els.result.hidden = false;
  els.result.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function flash(button, message) {
  const original = button.dataset.label || button.textContent;
  button.dataset.label = original;
  button.textContent = message;
  setTimeout(() => {
    button.textContent = original;
  }, 1600);
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(els.linkOutput.textContent);
    flash(els.copyLink, 'Copied ✓');
  } catch {
    // Clipboard access is blocked outside secure contexts, so select the text
    // and let them copy it themselves.
    const range = document.createRange();
    range.selectNodeContents(els.linkOutput);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    flash(els.copyLink, 'Press ⌘C');
  }
}

/* -------------------------------------------------------------------------- */
/* Wiring                                                                     */
/* -------------------------------------------------------------------------- */

mountScenery();
els.question.placeholder = COPY.placeholder;
validate();

els.question.addEventListener('focus', openSuggestions);
els.question.addEventListener('input', () => {
  openSuggestions();
  validate();
});
els.question.addEventListener('blur', () => setTimeout(closeSuggestions, 120));
els.question.addEventListener('keydown', (event) => {
  if (els.suggestions.hidden) return;
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    move(event.key === 'ArrowDown' ? 1 : -1);
  } else if (event.key === 'Enter' && activeSuggestion > -1) {
    event.preventDefault();
    choose(els.suggestions.querySelectorAll('.suggestion')[activeSuggestion].textContent);
  } else if (event.key === 'Escape') {
    closeSuggestions();
  }
});

els.recipient.addEventListener('input', validate);
els.phone.addEventListener('input', validate);
els.makeLink.addEventListener('click', showResult);
els.copyLink.addEventListener('click', copyLink);

els.editAgain.addEventListener('click', () => {
  els.result.hidden = true;
  els.builder.hidden = false;
  els.builder.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

// navigator.share is phone-only, which is where this gets used anyway.
if (navigator.share) {
  els.shareLink.hidden = false;
  els.shareLink.addEventListener('click', async () => {
    try {
      await navigator.share({ url: els.linkOutput.textContent });
    } catch {
      /* share sheet dismissed */
    }
  });
}
