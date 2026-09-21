# youtube-tools
A utility tool that identifies dialogue from YouTube videos to generate transcripts and features the ability to collect and organize similar words and expressions.
# YouTube English Extractor

Chrome MV3 extension skeleton for a local English subtitle panel on YouTube.

## Build

```bash
npm install
npm run build
```

The build writes a loadable `dist/` directory. The extension currently includes the panel shell and local storage schema; subtitle extraction and collection UI are intentionally left for later work.

## Offline dictionary

Selecting a single English word displays an isolated Shadow DOM dictionary popup. It is entirely local: no request or external API is used. The bundled data is a deliberately curated ECDICT-compatible common-word subset (about 100 entries; under 16 KB serialized) rather than full ECDICT, keeping the initial extension small. Entries are indexed once with a `Map`, so lookup is O(1). The morphology table and rules resolve `running → run`, `better → good`, and `studies → study`. Phrases and sentences deliberately skip dictionary lookup and show only the 收藏 entry point. `npm test` enforces the payload ceiling and these inflection cases.

## Load in Chrome

1. Open `chrome://extensions` and enable **Developer mode**.
2. Choose **Load unpacked** and select this repository's `dist/` directory.
3. Open a YouTube video (`youtube.com/watch?v=...`). The panel appears at the top of the right sidebar.

The content script removes the panel when leaving a watch page and reinitializes it on YouTube SPA navigation. Styling is isolated in Shadow DOM. IndexedDB creates `videos` and `items` object stores on first run.

## Verify

```bash
npm run check
npm test
npm run build
```
