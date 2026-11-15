import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, cleanApiKey, normalizeConfig, parseAthleteIds } from '../src/config.js';
import { CONFIG_ACTIONS } from '../src/actions.js';
import { FOLLOWED } from './fixtures.js';
import { createService } from './helpers.js';
import { normalizeConfig as normalize } from '../src/config.js';

test('defaults apply to an empty config', () => {
  const config = normalizeConfig();
  assert.equal(config.api_key, '');
  assert.deepEqual(config.athleteIds, []);
  assert.equal(config.level, DEFAULT_CONFIG.level);
  assert.equal(config.refresh_interval, 15);
});

test('values typed as strings are normalized and clamped', () => {
  const config = normalizeConfig({
    api_key: '  key  ',
    level: 2,
    language: 'fr-FR',
    refresh_interval: '1',
    reminder_minutes: 'abc',
    timezone: 'Not/AZone',
  });
  assert.equal(config.api_key, 'key');
  assert.equal(config.level, '2');
  assert.equal(config.language, 'fr');
  assert.equal(config.refresh_interval, 5);
  assert.equal(config.reminder_minutes, 30);
  assert.equal(config.timezone, 'Europe/Paris');
  assert.equal(normalizeConfig({ language: 'it' }).language, 'en');
  assert.equal(normalizeConfig({ level: '9' }).level, '1');
});

test('athlete IDs: any separator, upper-cased, deduplicated, invalid ones dropped', () => {
  assert.deepEqual(
    parseAthleteIds(`${FOLLOWED.toLowerCase()}; ${FOLLOWED}\nfoo, BTNOR11605199301`),
    [FOLLOWED, 'BTNOR11605199301'],
  );
  assert.deepEqual(parseAthleteIds(undefined), []);
});

test('configuration buttons answer in the four languages', async () => {
  const { service, config } = createService();
  const ok = await CONFIG_ACTIONS.test_connection({ service, config });
  assert.match(ok.en, /IBU API reachable: 3 seasons, current one 2026\/2027/);
  assert.ok(ok.fr && ok.de && ok.es);

  const found = await CONFIG_ACTIONS.search_athlete({ fields: { name: 'Jacquelin' }, service });
  assert.match(found.fr, new RegExp(`Emilien Jacquelin \\(FRA\\) = ${FOLLOWED}`));
  const none = await CONFIG_ACTIONS.search_athlete({ fields: { name: 'Nobody' }, service });
  assert.match(none.de, /Nobody/);

  const refreshed = await CONFIG_ACTIONS.refresh_now({ refresh: async () => {} });
  assert.equal(refreshed.es, 'Datos de biatlón actualizados.');
});

test('configuration buttons explain a missing or refused key', async () => {
  const missing = createService({ config: normalize({}) });
  const answer = await CONFIG_ACTIONS.test_connection(missing);
  assert.match(answer.en, /Enter your IBU API key/);

  const refused = createService({ overrides: { Events: 401 } });
  const refusal = await CONFIG_ACTIONS.test_connection(refused);
  assert.match(refusal.fr, /401/);
});

test('the API key keeps only its value when pasted with its header or quotes', () => {
  const key = '0a1b2c3d-1111-2222-3333-444455556666';
  for (const pasted of [
    key,
    ` ${key}\n`,
    `apikey: ${key}`,
    `APIKEY:${key}`,
    `"${key}"`,
    `'${key}'`,
  ]) {
    assert.equal(cleanApiKey(pasted), key, JSON.stringify(pasted));
  }
  assert.equal(cleanApiKey(undefined), '');
});
