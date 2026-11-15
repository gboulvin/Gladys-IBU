import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { WIDGETS, WIDGET_KEYS, handleWidgetAction, refreshWidgets } from '../src/widgets.js';
import { athleteIds, calendarIds } from '../src/devices.js';
import { normalizeConfig } from '../src/config.js';
import { FOLLOWED } from './fixtures.js';
import { createService, refreshedService } from './helpers.js';

const gladys = createFakeGladys();

const getContent = (key, context, settings = {}, language = 'en') =>
  WIDGETS[key].get(gladys, {
    settings,
    language,
    units: 'metric',
    config: context.config,
    service: context.service,
  });

// Every setting combination worth rendering.
const CASES = [
  [WIDGET_KEYS.NEXT_RACES, {}],
  [WIDGET_KEYS.NEXT_RACES, { gender: 'men', count: 8 }],
  [WIDGET_KEYS.NEXT_RACES, { gender: 'mixed' }],
  [WIDGET_KEYS.STANDINGS, {}],
  [WIDGET_KEYS.STANDINGS, { gender: 'women', cup: 'overall', count: 3 }],
  [WIDGET_KEYS.STANDINGS, { gender: 'men', cup: 'sprint' }],
  [WIDGET_KEYS.STANDINGS, { gender: 'men', cup: 'nations' }],
  [WIDGET_KEYS.ATHLETE, { athlete: athleteIds(gladys, FOLLOWED).device }],
  [WIDGET_KEYS.ATHLETE, { athlete: calendarIds(gladys).device }],
  [WIDGET_KEYS.LAST_RESULTS, {}],
  [WIDGET_KEYS.LAST_RESULTS, { gender: 'women' }],
];

test('every widget content is rendered exactly as sent', async () => {
  const context = await refreshedService();
  for (const [key, settings] of CASES) {
    for (const language of ['en', 'fr', 'de', 'es']) {
      const content = await getContent(key, context, settings, language);
      assert.deepEqual(
        validateWidgetContent(content),
        [],
        `${key} ${JSON.stringify(settings)} ${language}`,
      );
    }
  }
});

test('widgets explain what is missing before the first refresh', async () => {
  const unconfigured = createService({ config: normalizeConfig({}) });
  const notRefreshed = createService();
  for (const key of Object.values(WIDGET_KEYS)) {
    const content = await getContent(key, unconfigured);
    assert.deepEqual(validateWidgetContent(content), []);
    assert.match(content.components[0].text.en, /API key/);
    const waiting = await getContent(key, notRefreshed);
    assert.match(waiting.components[0].text.en, /unavailable/);
  }
});

test('the next races widget lists the races with their date and a badge', async () => {
  const context = await refreshedService();
  const content = await getContent(WIDGET_KEYS.NEXT_RACES, context);
  const list = content.components.find((c) => c.type === 'card-list');
  assert.equal(list.items[0].title.fr, 'Poursuite 10 km — Femmes');
  assert.equal(list.items[0].date, '2026-12-06T12:20:00.000Z');
  assert.equal(list.items[0].badge.text.en, 'in 20 min');
  assert.equal(content.ttl_seconds, 60, 'a race is close: refresh faster');
});

test('the standings widget highlights the followed athletes', async () => {
  const context = await refreshedService();
  const content = await getContent(WIDGET_KEYS.STANDINGS, context, { gender: 'men' });
  const status = content.components.find((c) => c.type === 'status');
  assert.equal(status.items[0].label, '1. Sturla Holm Laegreid (NOR)');
  assert.equal(status.items[1].color, 'success');
});

test('the athlete widget shows rank, points and shooting', async () => {
  const context = await refreshedService();
  const content = await getContent(WIDGET_KEYS.ATHLETE, context, {
    athlete: athleteIds(gladys, FOLLOWED).device,
  });
  const gauge = content.components.find((c) => c.type === 'gauge');
  assert.equal(gauge.value, 90);
  const rank = content.components.find((c) => c.type === 'value');
  assert.equal(rank.value, 2);
});

test('the refresh button refreshes and answers a short toast', async () => {
  let refreshed = 0;
  const message = await handleWidgetAction('refresh', {
    refresh: async () => {
      refreshed += 1;
    },
  });
  assert.equal(refreshed, 1);
  assert.ok(message.en.length <= 200 && message.fr && message.de && message.es);
  await assert.rejects(handleWidgetAction('unknown', { refresh: async () => {} }), /Unknown/);
});

test('refreshWidgets nudges every widget', () => {
  const fresh = createFakeGladys();
  refreshWidgets(fresh);
  assert.deepEqual(fresh.fake.widgetRefreshes, Object.keys(WIDGETS));
});
