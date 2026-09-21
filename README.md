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

## What the code validates

The player response exposed tracks for these three public videos when checked
on 2026-09-21:

| Video | Observed English tracks | Category |
| --- | --- | --- |
| `dQw4w9WgXcQ` | manual + `asr` | manual and auto available |
| `jNQXAC9IVRw` | manual | manual |
| `M7lc1UVf-VE` | manual + `asr` | manual and auto available |

The supplied `node scripts/verify-captions.mjs <id>` independently reads the
watch-page player response and reports the available tracks. It intentionally
also demonstrates the risk this spike addresses: when run outside a browser it
received HTTP 200 with an empty HTML response from the signed timedtext URL,
even with a YouTube referer and browser-like user agent. Therefore the
recommended MVP implementation is the page-world fetch in `page-extractor.js`,
not a background/service-worker request or direct server request.

## Decision and fallback

Use the signed `captionTracks[].baseUrl` + `fmt=json3` route as the primary
path. It is the only route that exposes a complete, timestamped cue list before
playback. The URL is ephemeral and must be taken fresh from each player
response; handle missing tracks and failed fetches explicitly.

DOM scraping (`.ytp-caption-segment`) is only a fallback: it yields text visible
at the current playback position, normally lacks canonical start/duration data,
and requires playing through the whole video to accumulate a transcript. That
prevents preloaded transcript browsing and makes it unsuitable as the MVP's
normal path.

## Verification performed

`node --check content.js`, `node --check page-extractor.js`, and `node --check
scripts/verify-captions.mjs` pass. The command-line verifier confirmed the
three public pages above advertise their listed tracks, but cannot constitute a
browser page-world fetch test: its timedtext replies were empty in this runtime.
The repository contains the unpacked extension required to run that final
browser-only check; no cue samples are claimed until a browser download exists.
