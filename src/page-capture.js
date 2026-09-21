(() => {
  const eventName = 'youtube-english-extractor:cues';
  const seen = new Set();

  function parseCues(body) {
    const events = JSON.parse(body).events || [];
    return events.filter((event) => event.segs && event.tStartMs != null && event.dDurationMs != null)
      .map((event) => ({
        start: event.tStartMs / 1000,
        duration: event.dDurationMs / 1000,
        text: event.segs.map((segment) => segment.utf8 || '').join('').trim(),
      })).filter((cue) => cue.text);
  }

  async function capture(url) {
    const source = new URL(url, location.href);
    if (!/\/api\/timedtext$/.test(source.pathname) || !source.searchParams.has('pot')) return;
    const key = source.toString();
    if (seen.has(key)) return;
    seen.add(key);
    source.searchParams.set('fmt', 'json3');
    try {
      const reply = await fetch(source, { credentials: 'include' });
      const body = await reply.text();
      const cues = reply.ok && body ? parseCues(body) : [];
      if (!cues.length) return;
      const videoId = new URLSearchParams(location.search).get('v');
      window.dispatchEvent(new CustomEvent(eventName, { detail: { videoId, url: source.toString(), cues } }));
    } catch (error) {
      console.debug('[youtube-english-extractor] timedtext capture failed', error);
    }
  }

  function inspect(url) { void capture(url); }
  for (const entry of performance.getEntriesByType('resource')) inspect(entry.name);
  new PerformanceObserver((list) => list.getEntries().forEach((entry) => inspect(entry.name)))
    .observe({ type: 'resource', buffered: true });
})();
