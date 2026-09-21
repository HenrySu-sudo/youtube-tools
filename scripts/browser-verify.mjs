#!/usr/bin/env node
// Captures the timedtext request issued by YouTube's player after enabling CC.
// Use a fresh Chrome --user-data-dir; never point this at a personal profile.
const port = process.argv[2] || '9222';
const videoIds = process.argv.slice(3);
if (!videoIds.length) throw new Error('Usage: node scripts/browser-verify.mjs <port> <video-id>...');

const target = await (await fetch(`http://127.0.0.1:${port}/json/new`, { method: 'PUT' })).json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let nextId = 0;
const pending = new Map();
const events = [];
socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.id) {
    const resolve = pending.get(message.id);
    if (resolve) { pending.delete(message.id); resolve(message); }
  } else if (message.method) events.push(message);
};
const call = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId;
  const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 30_000);
  pending.set(id, (message) => { clearTimeout(timeout); resolve(message); });
  socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const response = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (response.error) throw new Error(response.error.message);
  if (response.result.exceptionDetails) throw new Error(response.result.exceptionDetails.exception?.description || response.result.exceptionDetails.text);
  return response.result.result.value;
};
await call('Network.enable', { maxResourceBufferSize: 10_000_000, maxTotalBufferSize: 50_000_000 });
await call('Page.enable');

const output = [];
for (const videoId of videoIds) {
  events.length = 0;
  await call('Page.navigate', { url: `https://www.youtube.com/watch?v=${videoId}` });
  await new Promise((resolve) => setTimeout(resolve, 8000));
  const player = await evaluate(`(async () => {
    const deadline = Date.now() + 12000;
    let p;
    while (!(p = document.querySelector('#movie_player')) && Date.now() < deadline) await new Promise(r => setTimeout(r, 100));
    if (!p) return { error: 'movie_player unavailable' };
    p.playVideo?.();
    p.toggleSubtitles?.();
    await new Promise(r => setTimeout(r, 6000));
    const response = p.getPlayerResponse?.() || window.ytInitialPlayerResponse;
    const tracks = response?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    return {
      videoId: response?.videoDetails?.videoId,
      title: response?.videoDetails?.title,
      tracks: tracks.filter(t => /^en(?:-|$)/i.test(t.languageCode)).map(t => ({ languageCode: t.languageCode, kind: t.kind || 'manual', baseUrl: t.baseUrl })),
      currentTime: p.getCurrentTime?.(),
      captionText: [...document.querySelectorAll('.ytp-caption-segment')].map(n => n.textContent.trim()).filter(Boolean).join(' '),
    };
  })()`);
  const received = events.filter((event) => event.method === 'Network.responseReceived' && /\/api\/timedtext(?:[?]|$)/.test(event.params.response.url));
  const timedtext = [];
  for (const event of received) {
    const body = await call('Network.getResponseBody', { requestId: event.params.requestId });
    timedtext.push({
      url: event.params.response.url,
      status: event.params.response.status,
      mimeType: event.params.response.mimeType,
      bodyBytes: body.result?.body?.length ?? null,
      bodyPreview: body.result?.body?.slice(0, 180) ?? null,
    });
  }
  output.push({ player, timedtext });
}
console.log(JSON.stringify(output, null, 2));
socket.close();
