import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { LANGUAGES, formatDateTime, normalizeLanguage, pick, t } from '../src/i18n.js';

const manifest = JSON.parse(
  await readFile(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
);

// Walk the manifest and yield every multi-language object.
function* texts(node, path = '') {
  if (Array.isArray(node)) {
    for (const [index, item] of node.entries()) yield* texts(item, `${path}[${index}]`);
  } else if (node && typeof node === 'object') {
    if (typeof node.en === 'string') {
      yield [path, node];
      return;
    }
    for (const [key, value] of Object.entries(node)) yield* texts(value, `${path}.${key}`);
  }
}

test('every manifest text exists in English, French, German and Spanish', () => {
  let count = 0;
  for (const [path, text] of texts(manifest)) {
    count += 1;
    assert.deepEqual(Object.keys(text).sort(), [...LANGUAGES].sort(), path);
    for (const lang of LANGUAGES) {
      assert.ok(text[lang].trim().length > 0, `${path}.${lang} is empty`);
    }
  }
  assert.ok(count > 100);
});

test('t() substitutes placeholders, including translated ones', () => {
  const message = t('standings_device', { gender: t('gender_women') });
  assert.deepEqual(message, {
    en: 'Biathlon standings — Women',
    fr: 'Classement biathlon — Femmes',
    de: 'Biathlon-Wertung — Damen',
    es: 'Clasificación de biatlón — Mujeres',
  });
  assert.throws(() => t('nope'), /Unknown message key/);
});

test('pick and normalizeLanguage fall back to English', () => {
  assert.equal(pick({ en: 'a', fr: 'b' }, 'fr'), 'b');
  assert.equal(pick({ en: 'a', fr: 'b' }, 'ja'), 'a');
  assert.equal(pick('plain', 'fr'), 'plain');
  assert.equal(pick(null), '');
  assert.equal(normalizeLanguage('es-ES'), 'es');
});

test('dates are formatted in the language and the time zone', () => {
  const date = new Date('2026-12-06T12:20:00Z');
  assert.match(formatDateTime(date, 'fr', 'Europe/Paris'), /13:20/);
  assert.match(formatDateTime(date, 'en', 'America/New_York'), /07:20/);
  assert.match(formatDateTime(date, 'de', 'Invalid/Zone'), /12:20/);
  assert.equal(formatDateTime('nope', 'en', 'UTC'), '');
});
