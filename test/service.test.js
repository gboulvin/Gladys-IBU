import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCENE_EVENT_TYPES } from '../src/service.js';
import { IbuApiError } from '../src/ibu/client.js';
import { normalizeConfig } from '../src/config.js';
import { API_KEY, FOLLOWED, FOLLOWED_2, NOW } from './fixtures.js';
import { configured, createService } from './helpers.js';

const typesOf = (events) => events.map((event) => event.type).sort();

test('every IBU request carries the API key header', async () => {
  const { service, fetch } = createService();
  await service.refresh();
  assert.ok(fetch.calls.length > 0);
  for (const call of fetch.calls) {
    assert.equal(call.headers.apikey, API_KEY);
    // The key never travels in the URL.
    assert.ok(![...call.params.values()].includes(API_KEY));
  }
});

test('the first refresh learns the past and fires nothing', async () => {
  const { service, store } = createService();
  const events = await service.refresh();
  assert.deepEqual(events, []);
  assert.equal(store.memory.initialized, true);
  assert.ok(store.memory.finished.includes('BT2627SWRLCP02SMSP'));
  assert.ok(store.memory.reminded.includes('BT2627SWRLCP02SWPU'));
});

test('once initialized, a refresh fires results, athlete results, reminders and leader changes', async () => {
  const { service } = createService({
    memory: { initialized: true, leaders: { '1:2627:men': { id: 'BTXXX', name: 'Old Leader' } } },
  });
  const events = await service.refresh();
  assert.deepEqual(typesOf(events), [
    SCENE_EVENT_TYPES.ATHLETE_RESULT,
    SCENE_EVENT_TYPES.ATHLETE_RESULT,
    SCENE_EVENT_TYPES.LEADER_CHANGED,
    SCENE_EVENT_TYPES.RACE_RESULTS,
    SCENE_EVENT_TYPES.RACE_STARTING_SOON,
  ]);
  const results = events.find((e) => e.type === SCENE_EVENT_TYPES.RACE_RESULTS);
  assert.equal(results.race.raceId, 'BT2627SWRLCP02SMSP');
  assert.equal(results.winner.name, 'Johannes Dale-Skjevdal');
  const reminder = events.find((e) => e.type === SCENE_EVENT_TYPES.RACE_STARTING_SOON);
  assert.equal(reminder.race.raceId, 'BT2627SWRLCP02SWPU');
  assert.equal(reminder.minutes, 20);
  const leader = events.find((e) => e.type === SCENE_EVENT_TYPES.LEADER_CHANGED);
  assert.equal(leader.leader.ibuId, FOLLOWED_2);
  assert.equal(leader.previousName, 'Old Leader');
  const athlete = events.find(
    (e) => e.type === SCENE_EVENT_TYPES.ATHLETE_RESULT && e.row.ibuId === FOLLOWED,
  );
  assert.equal(athlete.placement, 'podium');
});

test('an event fires once, even across restarts', async () => {
  const first = createService({ memory: { initialized: true } });
  assert.ok((await first.service.refresh()).length > 0);
  assert.deepEqual(await first.service.refresh(), [], 'same process');

  const restarted = createService({ memory: first.store.memory });
  assert.deepEqual(await restarted.service.refresh(), [], 'after a restart');
});

test('a race without a winner yet is checked again later', async () => {
  let ready = false;
  const { service, setNow } = createService({
    memory: { initialized: true },
    overrides: {
      Results: (p) =>
        p.get('RaceId') === 'BT2627SWRLCP02SWPU' && ready
          ? {
              IsResult: true,
              Results: [{ Rank: '1', ResultOrder: 1, Name: 'Lou Jeanmonnot', Nat: 'FRA' }],
            }
          : { Results: [] },
    },
  });
  await service.refresh();
  setNow(new Date('2026-12-06T13:30:00Z'));
  assert.ok(
    !(await service.refresh()).some((e) => e.type === SCENE_EVENT_TYPES.RACE_RESULTS),
    'no results yet',
  );
  ready = true;
  const events = await service.refresh();
  const results = events.find((e) => e.type === SCENE_EVENT_TYPES.RACE_RESULTS);
  assert.equal(results?.winner.name, 'Lou Jeanmonnot');
  assert.equal(service.latestResult('women').race.raceId, 'BT2627SWRLCP02SWPU');
});

test('the cache: next races, standings, athletes', async () => {
  const { service } = createService();
  await service.refresh();
  assert.equal(service.nextRace().raceId, 'BT2627SWRLCP02SWPU');
  assert.equal(service.nextRace('men').raceId, 'BT2627SWRLCP02SMRL');
  assert.equal(service.overall('women').rows[0].name, 'Lou Jeanmonnot');

  const athlete = service.athlete(FOLLOWED);
  assert.equal(athlete.name, 'Emilien Jacquelin');
  assert.equal(athlete.nation, 'FRA');
  assert.deepEqual(athlete.standing, { gender: 'men', rank: 2, points: 170 });
  // Individual 0+1+0+1 and sprint 0+1, relay and last season left out: 30 shots, 3 misses.
  assert.equal(athlete.stats.races, 2);
  assert.equal(athlete.stats.accuracy, 90);
  assert.equal(athlete.lastResult.rank, 2);
  assert.equal(service.athlete(FOLLOWED_2).name, 'Sturla Holm Laegreid');

  const sprint = await service.getStandings('men', 'sprint');
  assert.equal(sprint.rows[0].ibuId, FOLLOWED);
});

test('a refused key is reported as unauthorized', async () => {
  const { service } = createService({ overrides: { Events: 401 } });
  await assert.rejects(service.refresh(), (err) => err instanceof IbuApiError && err.unauthorized);
  assert.equal(service.hasData, false);
});

test('one unknown athlete does not break the refresh', async () => {
  const { service } = createService({
    config: configured({ athletes: `${FOLLOWED}, BTXXX99999999999` }),
    overrides: { CISBios: (p) => (p.get('IBUId') === FOLLOWED ? { FullName: 'E. J.' } : null) },
  });
  await service.refresh();
  assert.equal(service.athlete(FOLLOWED).name, 'E. J.');
  assert.equal(service.athlete('BTXXX99999999999').name, 'BTXXX99999999999');
});

test('a new key or level drops the cache; unfollowed athletes are forgotten', async () => {
  const { service } = createService();
  await service.refresh();
  service.configure(configured({ athletes: FOLLOWED }));
  assert.equal(service.hasData, true, 'same key and level: cache kept');
  assert.equal(service.athlete(FOLLOWED_2), null);
  service.configure(configured({ level: '2' }));
  assert.equal(service.hasData, false);
});

test('without a key, refresh refuses to run', async () => {
  const { service } = createService({ config: normalizeConfig({}) });
  assert.equal(service.isConfigured, false);
  await assert.rejects(service.refresh(), /API key missing/);
});

test('searchAthletes and testConnection', async () => {
  const { service } = createService();
  assert.deepEqual(await service.searchAthletes('Jacquelin'), [
    { ibuId: FOLLOWED, name: 'Emilien Jacquelin', nation: 'FRA' },
  ]);
  assert.deepEqual(await service.testConnection(), { count: 3, label: '2026/2027' });
  void NOW;
});
