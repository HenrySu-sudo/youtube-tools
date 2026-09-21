# YouTube English Extractor

Chrome MV3 extension skeleton for a local English subtitle panel on YouTube.

## Timedtext capture spike

YouTube's current timedtext endpoint requires a video-bound PoToken. The
extension therefore does not construct its own URL or solve BotGuard. Its
main-world script observes player-issued timedtext resources and only retries a
URL that already contains `pot`, preserving `c=WEB`; it converts a successful
`json3` body into real `{ start, duration, text }` cues and sends them to the
content script. This is necessarily post-load: it cannot provide the full
transcript before the player has requested a caption resource.

`scripts/browser-verify.mjs` enables captions, checks visible
`.ytp-caption-segment` text, and records player timedtext response metadata.
Run it against a Chrome started with a fresh profile after completing the normal
consent flow; it must not use a personal Chrome profile:

```bash
node scripts/browser-verify.mjs 9222 dQw4w9WgXcQ jNQXAC9IVRw M7lc1UVf-VE
```

No cue samples are claimed by this repository: the automated Chrome session in
this environment failed TLS handshakes to YouTube, so it could not establish
whether the player itself displayed captions. The harness covers manual, ASR,
and captions-disabled cases; a successful run must retain its real output as
acceptance evidence.

## Build and verify

```bash
npm ci
npm run check
npm run build
```

The build writes a loadable `dist/` directory. Load it from
`chrome://extensions`, then open a YouTube watch page; the panel appears at
the top of the right sidebar. Panel styling is isolated in Shadow DOM and the
local IndexedDB schema contains `videos` and `items` stores.
