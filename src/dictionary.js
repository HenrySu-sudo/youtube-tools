import { DICTIONARY_ENTRIES } from './dictionary-data.js';

const irregularForms = new Map(Object.entries({
  am: 'be', are: 'be', is: 'be', was: 'be', were: 'be', been: 'be',
  better: 'good', best: 'good', worse: 'bad', worst: 'bad', ran: 'run', running: 'run',
  gone: 'go', went: 'go', did: 'do', done: 'do', had: 'have', has: 'have',
  studies: 'study', studied: 'study', studying: 'study', tries: 'try', tried: 'try'
}));
const index = new Map(DICTIONARY_ENTRIES.map(([word, phonetic, partOfSpeech, definition]) => [word, { word, phonetic, partOfSpeech, definition }]));

export function normalizeWord(value) { return String(value).trim().toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, ''); }
export function lemmatize(value) {
  const word = normalizeWord(value);
  if (!word || index.has(word)) return word;
  if (irregularForms.has(word)) return irregularForms.get(word);
  const candidates = [];
  if (word.endsWith('ies')) candidates.push(`${word.slice(0, -3)}y`);
  if (word.endsWith('ing')) { candidates.push(word.slice(0, -3), `${word.slice(0, -3)}e`); if (/([b-df-hj-np-tv-z])\1$/.test(word.slice(0, -3))) candidates.push(word.slice(0, -4)); }
  if (word.endsWith('ed')) candidates.push(word.slice(0, -2), `${word.slice(0, -2)}e`);
  if (word.endsWith('es')) candidates.push(word.slice(0, -2), word.slice(0, -1));
  if (word.endsWith('s')) candidates.push(word.slice(0, -1));
  return candidates.find((candidate) => index.has(candidate)) || word;
}
export function lookupWord(value) {
  const lemma = lemmatize(value); const entry = index.get(lemma);
  return entry ? { ...entry, lemma, inflected: normalizeWord(value) !== lemma } : null;
}
export function dictionaryStats() { return { entries: index.size, bytes: new TextEncoder().encode(JSON.stringify(DICTIONARY_ENTRIES)).length }; }
