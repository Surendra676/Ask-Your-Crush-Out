/**
 * Link encoding.
 *
 * The only module that knows how an ask travels from the builder to the
 * recipient. Right now the whole ask rides inside the URL, so there is no
 * server and nothing is stored anywhere.
 *
 * If this ever grows a backend, `encode` becomes "POST it, get an id back" and
 * `decode` becomes "fetch it by id". Nothing outside this file would change.
 */

/** Query parameter carrying the payload. */
const PARAM = 'd';

/* -------------------------------------------------------------------------- */
/* base64url                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Standard base64 uses `+`, `/` and `=` — all of which need escaping in a URL.
 * base64url swaps them so the link survives being pasted anywhere.
 *
 * TextEncoder rather than the older `unescape(encodeURIComponent(...))` trick,
 * because asks contain emoji and the old trick mangles them.
 */
function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(encoded) {
  let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/* -------------------------------------------------------------------------- */
/* Phone numbers                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Normalise whatever was typed into something `sms:` and `wa.me` both accept.
 * People write numbers a dozen ways; messaging apps accept roughly one.
 *
 * A missing country code is left alone rather than guessed — guessing wrong
 * sends the reply to a stranger.
 */
export function normalisePhone(input) {
  const trimmed = String(input || '').trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  const hadPlus = trimmed.startsWith('+') || trimmed.startsWith('00');
  return hadPlus ? `+${digits.replace(/^0+/, '')}` : digits;
}

/** Looks dialable internationally. Used for a soft warning, never to block. */
export function hasCountryCode(phone) {
  return phone.startsWith('+') && phone.length >= 11;
}

/* -------------------------------------------------------------------------- */
/* Encode / decode                                                            */
/* -------------------------------------------------------------------------- */

/**
 * @typedef {Object} Ask
 * @property {string} to     Who's being asked
 * @property {string} q      The question
 * @property {string} phone  Sender's number
 */

/** @param {Ask} ask */
export function encode(ask) {
  return toBase64Url(JSON.stringify({ to: ask.to, q: ask.q, p: ask.phone }));
}

/**
 * Returns null for anything malformed rather than throwing — chat apps truncate
 * long links, and the ask page needs to show a friendly message rather than a
 * blank screen.
 *
 * @returns {Ask|null}
 */
export function decode(payload) {
  if (!payload) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(payload));
    if (!parsed || typeof parsed.q !== 'string' || !parsed.q.trim()) return null;
    return {
      to: String(parsed.to || '').slice(0, 60),
      q: String(parsed.q).slice(0, 200),
      phone: normalisePhone(parsed.p),
    };
  } catch {
    return null;
  }
}

/**
 * Resolved against wherever the builder is served from, so the same code works
 * on localhost, on a github.io subpath, and on a custom domain with no config.
 */
export function buildUrl(ask) {
  const url = new URL('./ask/', window.location.href);
  url.searchParams.set(PARAM, encode(ask));
  return url.toString();
}

export function readUrl() {
  return decode(new URLSearchParams(window.location.search).get(PARAM));
}
