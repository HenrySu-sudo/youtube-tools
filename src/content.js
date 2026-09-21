import { openDatabase } from './storage.js';
import { lookupWord, normalizeWord } from './dictionary.js';

const ROOT_ID = 'youtube-english-extractor-panel';
let panelRoot = null;
let currentVideoId = null;
let navigationTimer = null;
let dictionaryPopup = null;

function isWatchPage() {
  return location.hostname.endsWith('youtube.com') && location.pathname === '/watch' && Boolean(new URLSearchParams(location.search).get('v'));
}

function videoId() {
  return new URLSearchParams(location.search).get('v');
}

function removePanel() {
  document.getElementById(ROOT_ID)?.remove();
  panelRoot = null;
  currentVideoId = null;
}

function createPanel() {
  const secondary = document.querySelector('#secondary');
  if (!secondary) return false;
  removePanel();
  const host = document.createElement('aside');
  host.id = ROOT_ID;
  host.style.cssText = 'display:block; width:100%; margin:0 0 16px;';
  panelRoot = host.attachShadow({ mode: 'open' });
  panelRoot.innerHTML = `
    <style>
      :host { all: initial; }
      .panel { box-sizing:border-box; width:100%; min-width:220px; max-width:100%; resize:horizontal; overflow:auto; background:#fff; border:1px solid #d9d9d9; border-radius:8px; color:#0f0f0f; font:14px/1.4 Arial,sans-serif; }
      .header { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:10px 12px; border-bottom:1px solid #eee; cursor:grab; user-select:none; }
      .title { font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      button { border:0; background:transparent; color:#606060; cursor:pointer; font-size:18px; line-height:1; padding:2px 4px; }
      button:hover { color:#0f0f0f; }
      .body { padding:18px 12px; color:#606060; min-height:58px; }
      .collapsed .body { display:none; }
      .dictionary { position:fixed; z-index:2147483647; width:260px; padding:12px; background:#fff; border:1px solid #d4d4d4; border-radius:8px; box-shadow:0 4px 18px #0003; color:#0f0f0f; font:14px/1.45 Arial,sans-serif; }
      .dictionary[hidden] { display:none; } .dictionary-word { font-size:18px; font-weight:700; } .dictionary-phonetic,.dictionary-meta,.dictionary-empty { color:#606060; } .dictionary button { margin-top:8px; border:1px solid #ddd; border-radius:4px; font-size:13px; color:#333; }
    </style>
    <section class="panel" aria-label="English subtitles panel">
      <header class="header"><span class="title">English subtitles</span><button type="button" aria-label="Collapse panel" aria-expanded="true">−</button></header>
      <div class="body">Subtitles loading... Select one word in a subtitle to look it up offline.</div>
    </section>`;
  dictionaryPopup = document.createElement('div');
  dictionaryPopup.className = 'dictionary';
  dictionaryPopup.hidden = true;
  panelRoot.append(dictionaryPopup);
  const panel = panelRoot.querySelector('.panel');
  const button = panelRoot.querySelector('button');
  button.addEventListener('click', () => {
    const collapsed = panel.classList.toggle('collapsed');
    button.textContent = collapsed ? '+' : '−';
    button.setAttribute('aria-expanded', String(!collapsed));
  });
  secondary.prepend(host);
  return true;
}

function showDictionaryPopup(text, position) {
  if (!dictionaryPopup) return;
  const normalized = normalizeWord(text);
  if (!normalized || /\s/.test(text.trim())) {
    dictionaryPopup.innerHTML = '<div class="dictionary-empty">短语和整句暂不提供词典释义。</div><button type="button">收藏</button>';
  } else {
    const entry = lookupWord(normalized);
    dictionaryPopup.innerHTML = entry
      ? `<div><span class="dictionary-word">${entry.word}</span> <span class="dictionary-phonetic">/${entry.phonetic}/</span></div><div class="dictionary-meta">${entry.partOfSpeech}${entry.inflected ? ` · 原形：${entry.lemma}` : ''}</div><div>${entry.definition}</div><button type="button">收藏</button>`
      : `<div class="dictionary-empty">未收录“${normalized}”，请尝试其他单词。</div><button type="button">收藏</button>`;
  }
  dictionaryPopup.style.left = `${Math.max(8, Math.min(position.x, window.innerWidth - 280))}px`;
  dictionaryPopup.style.top = `${Math.max(8, Math.min(position.y + 12, window.innerHeight - 160))}px`;
  dictionaryPopup.hidden = false;
}
document.addEventListener('mouseup', (event) => { const selection = window.getSelection()?.toString().trim(); if (selection) showDictionaryPopup(selection, { x: event.clientX, y: event.clientY }); });
document.addEventListener('mousedown', (event) => { if (dictionaryPopup && !dictionaryPopup.contains(event.target)) dictionaryPopup.hidden = true; }, true);

function initialize() {
  if (!isWatchPage()) return removePanel();
  const id = videoId();
  if (id === currentVideoId && document.getElementById(ROOT_ID)) return;
  currentVideoId = id;
  if (!createPanel()) {
    clearTimeout(navigationTimer);
    navigationTimer = setTimeout(initialize, 500);
  }
}

function onNavigation() {
  clearTimeout(navigationTimer);
  navigationTimer = setTimeout(initialize, 0);
}

document.addEventListener('yt-navigate-finish', onNavigation);
window.addEventListener('popstate', onNavigation);
initialize();

// Opening the database here creates both stores on first install without requiring UI actions.
openDatabase().catch(() => {});
