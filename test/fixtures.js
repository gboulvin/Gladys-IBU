// -----------------------------------------------------------------------------
// IBU datacenter fixtures and a fake `fetch`: the tests never touch the network.
//
// Scenario, seen from NOW (Sunday 6 Dec 2026, 12:00 UTC), World Cup:
//   - stage 1 (Kontiolahti, past): men individual;
//   - stage 2 (Hochfilzen, running): men sprint yesterday (results final),
//     women pursuit in 20 min, men relay tomorrow;
//   - stage 3 (Annecy, next week): women sprint.
// -----------------------------------------------------------------------------

export const NOW = new Date('2026-12-06T12:00:00Z');
export const API_KEY = 'test-key';
export const FOLLOWED = 'BTFRA21503199701';
export const FOLLOWED_2 = 'BTNOR11605199301';

const seasons = [
  { SeasonId: '2728', Description: '2027/2028', IsCurrent: false },
  {
    SeasonId: '2627',
    Description: '2026/2027',
    IsCurrent: true,
    IsCurrentScheduled: true,
    IsCurrentResults: true,
  },
  { SeasonId: '2526', Description: '2025/2026', IsCurrent: false },
];

const events = [
  {
    EventId: 'BT2526SWRLCP09',
    ShortDescription: 'Oslo Holmenkollen',
    Description: 'BMW IBU World Cup Biathlon Oslo Holmenkollen',
    Nat: 'NOR',
    StartDate: '2026-03-19T00:00:00',
    EndDate: '2026-03-22T00:00:00',
  },
  {
    EventId: 'BT2627SWRLCP01',
    ShortDescription: 'Kontiolahti',
    Description: 'BMW IBU World Cup Biathlon Kontiolahti',
    Nat: 'FIN',
    StartDate: '2026-11-28T00:00:00',
    EndDate: '2026-12-01T00:00:00',
  },
  {
    EventId: 'BT2627SWRLCP02',
    ShortDescription: 'Hochfilzen',
    Description: 'BMW IBU World Cup Biathlon Hochfilzen',
    Nat: 'AUT',
    StartDate: '2026-12-04T00:00:00',
    EndDate: '2026-12-07T00:00:00',
  },
  {
    EventId: 'BT2627SWRLCP03',
    ShortDescription: 'Annecy-Le Grand Bornand',
    Description: 'BMW IBU World Cup Biathlon Annecy',
    Nat: 'FRA',
    StartDate: '2026-12-11T00:00:00',
    EndDate: '2026-12-14T00:00:00',
  },
];

const competitions = {
  BT2627SWRLCP01: [
    {
      RaceId: 'BT2627SWRLCP01SMIN',
      catId: 'SM',
      DisciplineId: 'IN',
      km: '20',
      Description: 'Men 20 km Individual',
      StartTime: '2026-11-29T12:00:00Z',
      StatusText: 'Official Results',
    },
  ],
  BT2627SWRLCP02: [
    {
      RaceId: 'BT2627SWRLCP02SMSP',
      catId: 'SM',
      DisciplineId: 'SP',
      km: '10',
      Description: 'Men 10 km Sprint',
      StartTime: '2026-12-05T13:15:00Z',
      StatusText: 'Official Results',
    },
    {
      RaceId: 'BT2627SWRLCP02SWPU',
      catId: 'SW',
      DisciplineId: 'PU',
      km: '10',
      Description: 'Women 10 km Pursuit',
      StartTime: '2026-12-06T12:20:00Z',
      StatusText: 'Start List',
    },
    {
      RaceId: 'BT2627SWRLCP02SMRL',
      catId: 'SM',
      DisciplineId: 'RL',
      km: '4x7.5',
      Description: 'Men 4x7.5 km Relay',
      StartTime: '2026-12-07T10:00:00Z',
      StatusText: '',
    },
  ],
  BT2627SWRLCP03: [
    {
      RaceId: 'BT2627SWRLCP03SWSP',
      catId: 'SW',
      DisciplineId: 'SP',
      km: '7.5',
      Description: 'Women 7.5 km Sprint',
      StartTime: '2026-12-12T13:15:00Z',
      StatusText: '',
    },
  ],
};

const row = (rank, ibuId, name, nat, shootings, misses, extra = {}) => ({
  Rank: String(rank),
  ResultOrder: rank,
  IBUId: ibuId,
  Name: name,
  ShortName: name,
  Nat: nat,
  Shootings: shootings,
  ShootingTotal: String(misses),
  TotalTime: '23:45.6',
  Behind: rank === 1 ? '0.0' : `+${rank * 5}.0`,
  ...extra,
});

const results = {
  BT2627SWRLCP02SMSP: {
    IsResult: true,
    Competition: { RaceId: 'BT2627SWRLCP02SMSP', StatusText: 'Official Results' },
    Results: [
      row(1, 'BTNOR22007199801', 'Johannes Dale-Skjevdal', 'NOR', '0+0', 0),
      row(2, FOLLOWED, 'Emilien Jacquelin', 'FRA', '0+1', 1),
      row(3, 'BTSWE10311199601', 'Sebastian Samuelsson', 'SWE', '0+0', 0),
      row(4, FOLLOWED_2, 'Sturla Holm Laegreid', 'NOR', '1+0', 1),
    ],
  },
  BT2627SWRLCP01SMIN: {
    IsResult: true,
    Competition: { StatusText: 'Official Results' },
    Results: [
      row(1, FOLLOWED_2, 'Sturla Holm Laegreid', 'NOR', '0+0+0+0', 0),
      row(2, 'BTNOR22007199801', 'Johannes Dale-Skjevdal', 'NOR', '0+1+0+0', 1),
    ],
  },
  BT2627SWRLCP02SWPU: { Competition: { StatusText: 'Start List' }, Results: [] },
};

const cups = [
  { CupId: 'BT2627SWRLCP__SMTS', Description: 'World Cup Total Score Men' },
  { CupId: 'BT2627SWRLCP__SWTS', Description: 'World Cup Total Score Women' },
  { CupId: 'BT2627SWRLCP__SMSP', Description: 'World Cup Sprint Score Men' },
  { CupId: 'BT2627SIBUCP__SMTS', Description: 'IBU Cup Total Score Men' },
];

const standing = (rows) => ({
  AsOf: '2026-12-05T16:00:00Z',
  CupName: 'World Cup',
  Rows: rows.map(([rank, ibuId, name, nat, score]) => ({
    Rank: String(rank),
    IBUId: ibuId,
    Name: name,
    ShortName: name,
    Nat: nat,
    Score: String(score),
  })),
});

const cupResults = {
  BT2627SWRLCP__SMTS: standing([
    [1, FOLLOWED_2, 'Sturla Holm Laegreid', 'NOR', 190],
    [2, FOLLOWED, 'Emilien Jacquelin', 'FRA', 170],
    [3, 'BTNOR22007199801', 'Johannes Dale-Skjevdal', 'NOR', 155],
  ]),
  BT2627SWRLCP__SWTS: standing([
    [1, 'BTFRA20304199801', 'Lou Jeanmonnot', 'FRA', 200],
    [2, 'BTGER20104199401', 'Franziska Preuss', 'GER', 180],
  ]),
  BT2627SWRLCP__SMSP: standing([[1, FOLLOWED, 'Emilien Jacquelin', 'FRA', 54]]),
};

const bios = {
  [FOLLOWED]: { FullName: 'Emilien Jacquelin', NAT: 'FRA', GivenName: 'Emilien' },
  [FOLLOWED_2]: { FamilyName: 'Laegreid', GivenName: 'Sturla Holm', NAT: 'NOR' },
};

const allResults = {
  [FOLLOWED]: {
    Results: [
      {
        RaceId: 'BT2627SWRLCP01SMIN',
        Comp: 'Individual',
        Rank: '5',
        Shootings: '0+1+0+1',
        ShootingTotal: '2',
      },
      {
        RaceId: 'BT2627SWRLCP02SMSP',
        Comp: 'Sprint',
        Rank: '2',
        Shootings: '0+1',
        ShootingTotal: '1',
      },
      { RaceId: 'BT2627SWRLCP01MXRL', Comp: 'Mixed relay', Rank: '1', Shootings: '0+1 0+2' },
      { RaceId: 'BT2526SWRLCP09SMMS', Comp: 'Mass start', Rank: '1', Shootings: '0+0+0+0' },
      { RaceId: 'BT2627SIBUCP01SMSP', Comp: 'IBU Cup sprint', Rank: '1', Shootings: '0+0' },
      { RaceId: 'BT2627SWRLCP02SMPU', Comp: 'Pursuit', Rank: '', Shootings: '0+0' },
    ],
  },
  [FOLLOWED_2]: {
    Results: [
      { RaceId: 'BT2627SWRLCP01SMIN', Comp: 'Individual', Rank: '1', Shootings: '0+0+0+0' },
      { RaceId: 'BT2627SWRLCP02SMSP', Comp: 'Sprint', Rank: '4', Shootings: '1+0' },
    ],
  },
};

const athletes = {
  Jacquelin: {
    Athletes: [{ IBUId: FOLLOWED, GivenName: 'Emilien', FamilyName: 'Jacquelin', NAT: 'FRA' }],
  },
};

/**
 * Build a fake `fetch` over the fixtures. `overrides` replaces the body of an
 * endpoint (a function of the URL search params, or a number for an HTTP
 * error status). `calls` records every request.
 */
export function createFakeFetch(overrides = {}) {
  const calls = [];
  const handlers = {
    Seasons: () => seasons,
    Events: (p) => events.filter((e) => e.EventId.slice(2, 6) === p.get('SeasonId')),
    Competitions: (p) => competitions[p.get('EventId')] ?? [],
    Results: (p) => results[p.get('RaceId')] ?? { Results: [] },
    Cups: () => cups,
    CupResults: (p) => cupResults[p.get('CupId')] ?? { Rows: [] },
    CISBios: (p) => bios[p.get('IBUId')] ?? {},
    AllResults: (p) => allResults[p.get('IBUId')] ?? { Results: [] },
    Athletes: (p) => athletes[p.get('FamilyName')] ?? { Athletes: [] },
    ...overrides,
  };
  async function fetchImpl(url, options = {}) {
    const parsed = new URL(url);
    const endpoint = parsed.pathname.split('/').pop();
    calls.push({ endpoint, params: parsed.searchParams, headers: options.headers ?? {} });
    const handler = handlers[endpoint];
    if (typeof handler === 'number') {
      return new Response('', { status: handler });
    }
    if (!handler) {
      return new Response('', { status: 404 });
    }
    return new Response(JSON.stringify(handler(parsed.searchParams)), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
  fetchImpl.calls = calls;
  return fetchImpl;
}
