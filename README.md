# YouTube captions extraction spike

This is a minimal Manifest V3 extension for validating YouTube's caption
transport. It deliberately has no UI. On a `youtube.com/watch` page it reads
the player response, selects the first English track, fetches its signed
`timedtext` URL as `json3` **from the page's main world**, and downloads a JSON
file containing `{ start, duration, text }` cues. It also logs the same object
under `[caption-spike]` in DevTools.

## Run the browser test

1. Open `chrome://extensions`, enable Developer mode, then choose **Load unpacked** and select this repository.
2. Open a YouTube watch page and wait up to five seconds. The JSON download is
   the result. If no English track exists, the console reports the reason.
3. Repeat with: (a) a manual-English-subtitle video, (b) an English-ASR-only
   video, and (c) a video with captions visually disabled. Keep the downloaded
   files as the acceptance evidence. The visual CC setting does not remove
   advertised tracks, so case (c) should produce the same full list.

## Browser validation result (2026-09-21)

An actual Chrome 150.0.7871.47 headless session with this directory supplied by
`--load-extension` navigated to three watch pages and ran the same extraction
logic in the YouTube page's main world through CDP. The player response exposed
the advertised tracks, but every `fetch(track.baseUrl + "&fmt=json3")`
returned HTTP 200 with an empty body. This was true for manual and `asr` tracks.
Thus the signed URL as currently supplied needs an additional, unavailable
validation token/session state; moving the request from Node to the page world
does **not** solve it on its own. No cue samples are reported because none were
actually received.

| Video | Page-world tracks tested | HTTP/body result |
| --- | --- | --- |
| `dQw4w9WgXcQ` | `en` manual, `en` ASR | both 200 / 0 bytes |
| `jNQXAC9IVRw` | `en` manual | 200 / 0 bytes |
| `M7lc1UVf-VE` | `en` manual, `en` ASR | both 200 / 0 bytes |

`scripts/browser-verify.mjs` is the reproducible CDP harness. Start Chrome with
a temporary user profile, `--remote-debugging-port=9222`, and
`--load-extension=<repo>`, then run:

```bash
node scripts/browser-verify.mjs 9222 dQw4w9WgXcQ jNQXAC9IVRw M7lc1UVf-VE
```

The CC visual preference is not represented in `captionTracks`, so turning CC
off does not change track discovery; it also cannot make the failed timedtext
reply usable.

## Track discovery validation

The player response exposed tracks for these three public videos when checked
on 2026-09-21:

| Video | Observed English tracks | Category |
| --- | --- | --- |
| `dQw4w9WgXcQ` | manual + `asr` | manual and auto available |
| `jNQXAC9IVRw` | manual | manual |
| `M7lc1UVf-VE` | manual + `asr` | manual and auto available |

The supplied `node scripts/verify-captions.mjs <id>` independently reads the
watch-page player response and reports the available tracks. It too receives an
HTTP 200 empty response from the signed timedtext URL.

## Decision and fallback

Do **not** use the signed `captionTracks[].baseUrl` + `fmt=json3` route as the
MVP primary path yet. It is theoretically the only route that can expose a
complete timestamped list before playback, but the browser experiment shows that
the current URL is insufficient under this Chrome session. A follow-up spike is
needed to identify the required YouTube validation token/session parameter.

DOM scraping (`.ytp-caption-segment`) is only a fallback: it yields text visible
at the current playback position, normally lacks canonical start/duration data,
and requires playing through the whole video to accumulate a transcript. That
prevents preloaded transcript browsing and makes it unsuitable as the MVP's
normal path.

## Verification performed

`node --check content.js`, `node --check page-extractor.js`, `node --check
scripts/verify-captions.mjs`, and `node --check scripts/browser-verify.mjs`
pass. The page-world experiment above is browser evidence, not a claimed cue
success; its empty replies are the key feasibility finding.
