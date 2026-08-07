/**
 * Handing the reply off to the recipient's own messaging app.
 *
 * No website can send a message on someone's behalf — that's an OS-level
 * protection with no way around it. What we can do is open their messaging app
 * with the recipient and the text already filled in, so replying is one tap.
 */

/**
 * iOS and Android disagree about how to attach a body to an `sms:` link.
 * iOS wants `&body=`, Android wants `?body=`. Getting this wrong silently
 * produces an empty message on one of the two platforms.
 *
 * The `MacIntel` check catches iPads, which report themselves as desktop Macs
 * but behave like phones.
 */
function isAppleMobile() {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

/**
 * @param {string} phone  Normalised number, `+` prefix optional
 * @param {string} text   Message to pre-type
 * @returns {string}
 */
export function smsUrl(phone, text) {
  const separator = isAppleMobile() ? '&' : '?';
  return `sms:${phone}${separator}body=${encodeURIComponent(text)}`;
}

/**
 * WhatsApp's `wa.me` shortlink. Note it wants bare digits — a leading `+`
 * breaks it, which is the opposite of what `sms:` expects.
 *
 * @param {string} phone
 * @param {string} text
 * @returns {string}
 */
export function whatsappUrl(phone, text) {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}
