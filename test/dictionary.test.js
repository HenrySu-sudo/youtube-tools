import test from 'node:test';
import assert from 'node:assert/strict';
import { dictionaryStats, lemmatize, lookupWord } from '../src/dictionary.js';
test('looks up a common indexed local word', () => assert.equal(lookupWord('English').definition, '英语；英国的'));
test('resolves required inflected forms', () => { assert.equal(lemmatize('running'), 'run'); assert.equal(lemmatize('better'), 'good'); assert.equal(lemmatize('studies'), 'study'); });
test('reports unknown words and keeps data compact', () => { assert.equal(lookupWord('unfindableword'), null); assert.ok(dictionaryStats().bytes < 16 * 1024); });
