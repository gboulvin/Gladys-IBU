import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DISCIPLINES,
  GENDERS,
  cupIdFor,
  disciplineOf,
  genderOf,
  lastSeasonResult,
  normalizeResults,
  normalizeStandings,
  parseShootings,
  pickSeasons,
  placementOf,
  raceLabel,
  shootingStats,
  toDate,
  upcomingRaces,
} from '../src/ibu/model.js';

test('gender and discipline come from the category or the race id', () => {
  assert.equal(genderOf('SM'), GENDERS.MEN);
  assert.equal(genderOf('SW'), GENDERS.WOMEN);
  assert.equal(genderOf('MX'), GENDERS.MIXED);
  assert.equal(genderOf(undefined, 'BT2627SWRLCP02SWPU'), GENDERS.WOMEN);
  assert.equal(disciplineOf('SP'), DISCIPLINES.SPRINT);
  assert.equal(disciplineOf('', 'BT2627SWRLCP02SMMS'), DISCIPLINES.MASS_START);
  assert.equal(disciplineOf('RL', 'BT2627SWRLCP02MXRL'), DISCIPLINES.MIXED_RELAY);
  assert.equal(disciplineOf('RL', 'BT2627SWRLCP02SMRL'), DISCIPLINES.RELAY);
  assert.equal(disciplineOf('SR', 'BT2627SWRLCP02MXSR'), DISCIPLINES.SINGLE_MIXED_RELAY);
  assert.equal(disciplineOf('ZZ'), DISCIPLINES.OTHER);
});

test('dates without a zone are read as UTC', () => {
  assert.equal(toDate('2026-12-05T13:15:00').toISOString(), '2026-12-05T13:15:00.000Z');
  assert.equal(toDate('2026-12-05T13:15:00+01:00').toISOString(), '2026-12-05T12:15:00.000Z');
  assert.equal(toDate(''), null);
  assert.equal(toDate('garbage'), null);
});

test('pickSeasons separates the scheduled season from the results season', () => {
  const picked = pickSeasons([
    { SeasonId: '2627', Description: '2026/2027', IsCurrent: true, IsCurrentScheduled: true },
    { SeasonId: '2526', Description: '2025/2026', IsCurrentResults: true },
  ]);
  assert.deepEqual(picked, { schedule: '2627', results: '2526', label: '2026/2027' });
  assert.deepEqual(pickSeasons(null), { schedule: '', results: '', label: '' });
});

test('shooting strings: individual format only', () => {
  assert.deepEqual(parseShootings('0+1+0+2'), [0, 1, 0, 2]);
  assert.equal(parseShootings('0+1 0+3'), null, 'relay format');
  assert.equal(parseShootings(''), null);
});

test('shooting statistics split prone and standing per discipline, season only', () => {
  const stats = shootingStats(
    [
      { RaceId: 'BT2627SWRLCP01SMSP', Shootings: '0+1' }, // P S
      { RaceId: 'BT2627SWRLCP01SMPU', Shootings: '1+0+2+0' }, // P P S S
      { RaceId: 'BT2627SWRLCP01SMIN', Shootings: '0+0+1+0' }, // P S P S
      { RaceId: 'BT2627SWRLCP01MXRL', Shootings: '0+1 0+2' }, // relay: ignored
      { RaceId: 'BT2526SWRLCP01SMSP', Shootings: '5+5' }, // other season: ignored
    ],
    '2627',
  );
  assert.equal(stats.races, 3);
  assert.equal(stats.shots, 50);
  assert.equal(stats.hits, 45);
  assert.equal(stats.accuracy, 90);
  // Prone: 0 + 1,0 + 0,1 misses over 25 shots -> 23/25.
  assert.equal(stats.prone, 92);
  // Standing: 1 + 2,0 + 0,0 misses over 25 shots -> 22/25.
  assert.equal(stats.standing, 88);
  assert.equal(shootingStats([], '2627').accuracy, null);
});

test('relay results rank the teams and keep the legs', () => {
  const results = normalizeResults({
    IsResult: true,
    Results: [
      { IsTeam: true, Rank: '1', ResultOrder: 1, Name: 'Norway', Nat: 'NOR' },
      { IsTeam: true, Rank: '2', ResultOrder: 2, Name: 'France', Nat: 'FRA' },
      { IsTeam: false, Leg: 1, IBUId: 'BTFRA1', Name: 'A', Nat: 'FRA', Shootings: '0+1 0+0' },
    ],
  });
  assert.equal(results.rows.length, 2);
  assert.equal(results.winner.name, 'Norway');
  assert.equal(results.legs.length, 1);
  assert.equal(results.isFinal, true);
});

test('placement buckets', () => {
  assert.equal(placementOf(1), 'win');
  assert.equal(placementOf(3), 'podium');
  assert.equal(placementOf(7), 'top10');
  assert.equal(placementOf(25), 'points');
  assert.equal(placementOf(70), 'other');
  assert.equal(placementOf(null), 'other');
});

test('cup ids are looked up in the cup list, composed otherwise', () => {
  const cups = [{ CupId: 'BT2627SWRLCP__SMTS' }, { CupId: 'BT2627SIBUCP__SMTS' }];
  const base = { cups, seasonId: '2627', gender: 'men', cupType: 'overall' };
  assert.equal(cupIdFor({ ...base, level: '1' }), 'BT2627SWRLCP__SMTS');
  assert.equal(cupIdFor({ ...base, level: '2' }), 'BT2627SIBUCP__SMTS');
  assert.equal(
    cupIdFor({ cups: [], seasonId: '2627', level: '1', gender: 'women', cupType: 'sprint' }),
    'BT2627SWRLCP__SWSP',
  );
});

test('standings are sorted and typed', () => {
  const standings = normalizeStandings({
    Rows: [
      { Rank: '2', Name: 'B', Score: '10' },
      { Rank: '1', Name: 'A', Score: '20' },
      { Rank: '', Name: 'unranked' },
    ],
  });
  assert.deepEqual(
    standings.rows.map((r) => [r.rank, r.name, r.points]),
    [
      [1, 'A', 20],
      [2, 'B', 10],
    ],
  );
});

test('upcoming races keep a running race and drop finished ones', () => {
  const now = new Date('2026-12-06T12:00:00Z');
  const race = (id, start, isFinished = false) => ({
    raceId: id,
    start: new Date(start),
    isFinished,
  });
  const list = upcomingRaces(
    [
      race('later', '2026-12-07T10:00:00Z'),
      race('running', '2026-12-06T11:30:00Z'),
      race('done', '2026-12-06T11:00:00Z', true),
      race('old', '2026-12-05T10:00:00Z'),
    ],
    now,
  );
  assert.deepEqual(
    list.map((r) => [r.raceId, r.isRunning]),
    [
      ['running', true],
      ['later', false],
    ],
  );
});

test('race labels exist in the four languages', () => {
  const label = raceLabel({ discipline: 'pursuit', gender: 'women', km: '10' });
  assert.deepEqual(label, {
    en: 'Pursuit 10 km — Women',
    fr: 'Poursuite 10 km — Femmes',
    de: 'Verfolgung 10 km — Damen',
    es: 'Persecución 10 km — Mujeres',
  });
});

test('the last result of a season is the most recent race', () => {
  const last = lastSeasonResult(
    [
      { RaceId: 'BT2627SWRLCP01SMIN', Comp: 'Individual', Rank: '5' },
      { RaceId: 'BT2627SWRLCP02SMSP', Comp: 'Sprint', Rank: '2', Shootings: '0+1' },
      { RaceId: 'BT2526SWRLCP09SMMS', Comp: 'Mass start', Rank: '1' },
    ],
    '2627',
  );
  assert.deepEqual(last, {
    raceId: 'BT2627SWRLCP02SMSP',
    description: 'Sprint',
    rank: 2,
    shootings: '0+1',
  });
});
