// This runs in the extension's isolated world.  The injected file deliberately
// runs in YouTube's main world, where player data and its signed caption URL are
// available and fetch has YouTube's normal origin/cookies.
window.addEventListener("youtube-caption-spike-result", ({ detail }) => {
  if (detail?.error) {
    console.warn("[caption-spike] extraction failed:", detail.error);
    return;
  }

  console.log("[caption-spike] English caption cues", detail);
  const blob = new Blob([JSON.stringify(detail, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `youtube-captions-${location.pathname.slice(7)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
});

const script = document.createElement("script");
script.src = chrome.runtime.getURL("page-extractor.js");
script.onload = () => script.remove();
(document.documentElement || document.head).append(script);
