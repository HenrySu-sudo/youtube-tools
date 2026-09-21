#!/usr/bin/env node
// Read-only verifier for the same player-response -> timedtext path as the extension.
const videoId = process.argv[2];
if (!videoId) throw new Error("Usage: node scripts/verify-captions.mjs <YouTube video id>");

const page = await (await fetch(`https://www.youtube.com/watch?v=${videoId}`)).text();
const match = page.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});(?:var |<\/script)/s);
if (!match) throw new Error("Could not locate ytInitialPlayerResponse");
const response = JSON.parse(match[1]);
const tracks = response.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
const track = tracks.find(({ languageCode }) => /^en(?:-|$)/i.test(languageCode));
console.log(JSON.stringify({
  videoId,
  title: response.videoDetails?.title,
  availableTracks: tracks.map((item) => ({ languageCode: item.languageCode, kind: item.kind || "manual" })),
}, null, 2));
if (!track) process.exit(2);

const url = new URL(track.baseUrl);
url.searchParams.set("fmt", "json3");
const result = await fetch(url, {
  headers: {
    // Deliberately mirrors a watch-page navigation. This is still not a browser
    // context, so an empty reply is a useful validation of the signed-URL risk.
    Referer: `https://www.youtube.com/watch?v=${videoId}`,
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",
    Accept: "application/json,text/plain,*/*",
  },
});
const body = await result.text();
if (!result.ok || !body) {
  console.log(JSON.stringify({
    timedtext: { status: result.status, contentType: result.headers.get("content-type"), bodyBytes: body.length },
    conclusion: "Direct non-browser request was rejected or empty; test the extension's page-world fetch instead.",
  }, null, 2));
  process.exit(3);
}
const json = JSON.parse(body);
const cues = (json.events || []).filter((event) => event.segs).map((event) => ({
  start: event.tStartMs / 1000,
  duration: event.dDurationMs / 1000,
  text: event.segs.map((segment) => segment.utf8 || "").join("").replace(/\n/g, " "),
}));
console.log(JSON.stringify({ track: { languageCode: track.languageCode, kind: track.kind || "manual" }, cueCount: cues.length, samples: cues.slice(0, 3) }, null, 2));
