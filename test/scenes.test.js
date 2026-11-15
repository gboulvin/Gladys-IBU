import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { SCENE_ACTIONS } from '../src/scenes.js';
import { publishSceneEvents, toSceneEvent } from '../src/triggers.js';
import { athleteIds } from '../src/devices.js';
import { FOLLOWED } from './fixtures.js';
import { createService } from './helpers.js';

const manifest = JSON.parse(
  await readFile(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
);
const declarationOf = (list, key) => manifest[list].find((entry) => entry.key === key);
const keysOf = (list) => (list ?? []).map((entry) => entry.key);

// A refresh that fires every kind of trigger.
async function firingRefresh() {
  const context = createService({
    memory: { initialized: true, leaders: { '1:2627:men': { id: 'X', name: 'Old Leader' } } },
  });
  context.events = await context.service.refresh();
  return context;
}

test('every scene event only carries declared, primitive keys', async () => {
  const gladys = createFakeGladys();
  const { events, config } = await firingRefresh();
  const fired = new Set();
  for (const event of events) {
    const { key, data } = toSceneEvent(gladys, event, config);
    fired.add(key);
    const trigger = declarationOf('scene_triggers', key);
    assert.ok(trigger, `trigger ${key} is not declared`);
    const declared = [...keysOf(trigger.fields), ...keysOf(trigger.variables)];
    assert.ok(Object.keys(data).length <= 30);
    for (const [name, value] of Object.entries(data)) {
      assert.ok(declared.includes(name), `${key}: data.${name} is not declared`);
      assert.ok(
        value === null || typeof value !== 'object',
        `${key}: data.${name} is not primitive`,
      );
    }
    // Filter values must be among the declared options.
    for (const field of trigger.fields) {
      if (field.options && data[field.key] !== undefined) {
        assert.ok(
          field.options.some((option) => option.value === data[field.key]),
          `${key}: ${field.key}=${data[field.key]} is not an option`,
        );
      }
    }
  }
  assert.deepEqual([...fired].sort(), keysOf(manifest.scene_triggers).sort());
});

test('the athlete_result event targets the athlete device', async () => {
  const gladys = createFakeGladys();
  const { events, config } = await firingRefresh();
  const event = events.find((e) => e.type === 'athlete_result' && e.row.ibuId === FOLLOWED);
  const { data } = toSceneEvent(gladys, event, config);
  assert.equal(data.athlete, athleteIds(gladys, FOLLOWED).device);
  assert.equal(data.rank, 2);
  assert.equal(data.shootings, '0+1');
  assert.equal(data.placement, 'podium');
});

test('scene events reach Gladys', async () => {
  const gladys = createFakeGladys();
  const { events, config } = await firingRefresh();
  await publishSceneEvents(gladys, events, config);
  assert.equal(gladys.fake.sceneEvents.length, events.length);
});

test('scene action outputs are declared, and "not found" is an output', async () => {
  const gladys = createFakeGladys();
  const context = await firingRefresh();
  const cases = {
    get_next_race: [{ gender: 'all' }, { gender: 'mixed' }],
    get_athlete_stats: [{ athlete: athleteIds(gladys, FOLLOWED).device }, { athlete: 'nope' }],
    get_standings_leader: [
      { gender: 'women', cup: 'overall' },
      { gender: 'men', cup: 'pursuit' },
    ],
    refresh_data: [{}],
  };
  assert.deepEqual(Object.keys(cases).sort(), keysOf(manifest.scene_actions).sort());
  for (const [key, fieldSets] of Object.entries(cases)) {
    const declared = keysOf(declarationOf('scene_actions', key).outputs);
    for (const fields of fieldSets) {
      const outputs = await SCENE_ACTIONS[key](gladys, {
        fields,
        config: context.config,
        service: context.service,
        refresh: () => context.service.refresh(),
      });
      for (const [name, value] of Object.entries(outputs)) {
        assert.ok(declared.includes(name), `${key}: output ${name} is not declared`);
        assert.ok(value === null || typeof value !== 'object', `${key}: ${name} is not a scalar`);
      }
    }
  }
});

test('get_next_race returns the next race in the configured language', async () => {
  const gladys = createFakeGladys();
  const context = await firingRefresh();
  const outputs = await SCENE_ACTIONS.get_next_race(gladys, {
    fields: { gender: 'women' },
    config: { ...context.config, language: 'fr' },
    service: context.service,
  });
  assert.equal(outputs.found, true);
  assert.equal(outputs.race, 'Poursuite 10 km — Femmes');
  assert.equal(outputs.location, 'Hochfilzen');
  assert.equal(outputs.minutes_until, 20);
  assert.match(outputs.start_time_local, /13:20/, 'Europe/Paris');
  const none = await SCENE_ACTIONS.get_next_race(gladys, {
    fields: { gender: 'mixed' },
    config: context.config,
    service: context.service,
  });
  assert.deepEqual(none, { found: false });
});

test('get_standings_leader gives the leader and the gap', async () => {
  const gladys = createFakeGladys();
  const context = await firingRefresh();
  const outputs = await SCENE_ACTIONS.get_standings_leader(gladys, {
    fields: { gender: 'men', cup: 'overall' },
    service: context.service,
  });
  assert.equal(outputs.leader, 'Sturla Holm Laegreid');
  assert.equal(outputs.gap, 20);
});

test('refresh_data reports a failure through its output', async () => {
  const outputs = await SCENE_ACTIONS.refresh_data(null, {
    refresh: async () => {
      throw new Error('down');
    },
  });
  assert.deepEqual(outputs, { success: false });
});
