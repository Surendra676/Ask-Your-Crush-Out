# Ask Your Crush Out

A link where the No button doesn't work.

Fill in three fields, get a link, send it. When they open it the question is
waiting with two buttons — and No slides away from every cursor and every
finger that goes near it. Yes doesn't move.

**[Try it →](https://YOUR-Surendra676.github.io/ask-your-crush-out/)**

---

## Run it locally

```bash
python3 -m http.server 8000      # Windows: py -m http.server 8000
```

Then open <http://localhost:8000>. Opening the HTML file directly won't work —
it uses ES modules, which browsers only load over `http://`.

No npm, no build step, no dependencies.

---

## How it works

There's no server. The whole ask is packed into the link itself:

```
/ask/?d=eyJ0byI6Ik5hbmN5IiwicSI6Indhbm5hIGdvIG91dCBzb21ldGltZT8i...
```

That's the ask as JSON, base64url-encoded. Everyone downloads the same page —
the address bar is the only thing that's different. Which means it's free to
host, and nothing about anyone gets stored anywhere.

**The dodge** doesn't jump to random spots. The button is simulated: the
pointer shoves it, a weak spring pulls it home, walls bounce it back. That's
why it curves instead of snapping, never jitters, and wanders back when you
leave it alone.

**The sound** needs the "tap to open" screen. Browsers won't play audio until
you've actually clicked something, and hovering doesn't count — so without that
first tap it would never fire on desktop.

---

## Files

index.html          the form
ask/index.html      what they open
src/css/tokens.css  every colour and size — change the look here
src/js/dodge.js     the No button
src/js/link.js      packing the ask into the URL


Built with vanilla JS. Hosted on GitHub Pages.