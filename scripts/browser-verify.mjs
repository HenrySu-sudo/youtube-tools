#!/usr/bin/env node
// Connects to an already-started Chrome DevTools endpoint and validates the
// exact player-response -> page-world timedtext flow used by page-extractor.js.
const port = process.argv[2] || "9222";
const videoIds = process.argv.slice(3);
if (!videoIds.length) throw new Error("Usage: node scripts/browser-verify.mjs <port> <video-id>...");

const target = await (await fetch(`http://127.0.0.1:${port}/json/new`, { method: "PUT" })).json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let nextId = 0;
const pending = new Map();
socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  const resolve = pending.get(message.id);
  if (resolve) { pending.delete(message.id); resolve(message); }
};
const call = (method, params = {}) => new Promise((resolve) => {
  const id = ++nextId; pending.set(id, resolve); socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const response = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (response.result.exceptionDetails) {
    const details = response.result.exceptionDetails;
    throw new Error(details.exception?.description || details.text);
  }
  return response.result.result.value;
};

const extract = `
  (async () => {
    const response = document.querySelector('#movie_player')?.getPlayerResponse?.() || window.ytInitialPlayerResponse;
    const tracks = response?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    const english = tracks.filter((track) => /^en(?:-|$)/i.test(track.languageCode));
    const results = [];
    for (const track of english) {
      const url = new URL(track.baseUrl); url.searchParams.set('fmt', 'json3');
      const reply = await fetch(url, { credentials: 'include' });
      const body = await reply.text();
      const parsed = body ? JSON.parse(body) : {};
      const cues = (parsed.events || []).filter((event) => event.segs && event.tStartMs != null && event.dDurationMs != null).map((event) => ({
        start: event.tStartMs / 1000, duration: event.dDurationMs / 1000,
        text: event.segs.map((segment) => segment.utf8 || '').join('').trim(),
      })).filter((cue) => cue.text);
      results.push({ languageCode: track.languageCode, kind: track.kind || 'manual', httpStatus: reply.status, bodyBytes: body.length, cueCount: cues.length, samples: cues.slice(0, 3) });
    }
    return { videoId: response?.videoDetails?.videoId, title: response?.videoDetails?.title, results };
  })()
`;

const output = [];
for (const videoId of videoIds) {
  await call("Page.navigate", { url: `https://www.youtube.com/watch?v=${videoId}` });
  await new Promise((resolve) => setTimeout(resolve, 7000));
  output.push(await evaluate(extract));
}
console.log(JSON.stringify(output, null, 2));
socket.close();
