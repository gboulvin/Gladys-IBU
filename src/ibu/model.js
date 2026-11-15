// -----------------------------------------------------------------------------
// Normalization of the IBU datacenter payloads.
//
// The raw API speaks PascalCase, mixes strings and numbers ("Rank": "1") and
// evolves without notice: every reader below is defensive (several field
// names, typed fallbacks) and returns a small, stable shape the rest of the
// integration relies on. Pure functions only, unit-tested on fixtures.
// -----------------------------------------------------------------------------

import { t } from '../i18n.js';

export const GENDERS = { MEN: 'men', WOMEN: 'women', MIXED: 'mixed' };

export const DISCIPLINES = {
  SPRINT: 'sprint',
  PURSUIT: 'pursuit',
  INDIVIDUAL: 'individual',
  SHORT_INDIVIDUAL: 'short_individual',
  MASS_START: 'mass_start',
  RELAY: 'relay',
  SINGLE_MIXED_RELAY: 'single_mixed_relay',
  MIXED_RELAY: 'mixed_relay',
  OTHER: 'other',
};

// IBU discipline codes -> our keys.
const DISCIPLINE_CODES = {
  SP: DISCIPLINES.SPRINT,
  PU: DISCIPLINES.PURSUIT,
  IN: DISCIPLINES.INDIVIDUAL,
  SI: DISCIPLINES.SHORT_INDIVIDUAL,
  MS: DISCIPLINES.MASS_START,
  RL: DISCIPLINES.RELAY,
  SR: DISCIPLINES.SINGLE_MIXED_RELAY,
};

// Order of the shooting stages per discipline: P = prone, S = standing.
const SHOOTING_ORDER = {
  [DISCIPLINES.SPRINT]: 'PS',
  [DISCIPLINES.PURSUIT]: 'PPSS',
  [DISCIPLINES.INDIVIDUAL]: 'PSPS',
  [DISCIPLINES.SHORT_INDIVIDUAL]: 'PSPS',
  [DISCIPLINES.MASS_START]: 'PPSS',
};

// Level -> token of the IBU ids (BT2627SWRLCP01SMSP, BT2627SWRLCP__SMTS).
const LEVEL_TOKENS = { 1: 'WRLCP', 2: 'IBUCP', 3: 'JUNCP' };

// Cup types of the standings, as the suffix of the IBU cup ids.
export const CUP_TYPES = {
  overall: 'TS',
  sprint: 'SP',
  pursuit: 'PU',
  individual: 'IN',
  mass_start: 'MS',
  nations: 'NC',
};

const str = (value) => (value === null || value === undefined ? '' : String(value).trim());

/** Integer out of "1", 1, "=3" or "" (null when there is none). */
export function toInt(value) {
  const match = str(value).match(/-?\d+/);
  return match ? Number.parseInt(match[0], 10) : null;
}

/** Number out of "1234", 12.5 or "" (null when there is none). */
export function toNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const number = Number.parseFloat(str(value).replace(',', '.'));
  return Number.isFinite(number) ? number : null;
}

/** ISO date, assuming UTC when the API omits the zone. Null when invalid. */
export function toDate(value) {
  const text = str(value);
  if (!text) {
    return null;
  }
  const withZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(text) || !text.includes('T') ? text : `${text}Z`;
  const date = new Date(withZone);
  return Number.isNaN(date.getTime()) ? null : date;
}

// --- Seasons -----------------------------------------------------------------

/**
 * Pick the seasons to use: `schedule` for the calendar (the season being
 * scheduled), `results` for the standings and statistics (the season whose
 * results are current — the previous one before the first race of a season).
 */
export function pickSeasons(seasons) {
  const list = Array.isArray(seasons) ? seasons : [];
  const current = list.find((s) => s.IsCurrent) ?? list[0];
  const schedule = list.find((s) => s.IsCurrentScheduled) ?? current;
  const results = list.find((s) => s.IsCurrentResults) ?? current;
  return {
    schedule: str(schedule?.SeasonId),
    results: str(results?.SeasonId),
    label: str(current?.Description),
  };
}

// --- Races -------------------------------------------------------------------

/** Gender of a race, from its category ('SM', 'SW', 'MX'...) or its id. */
export function genderOf(catId, raceId = '') {
  const cat = str(catId) || str(raceId).slice(-4, -2);
  const marker = cat.slice(-1).toUpperCase();
  if (marker === 'M') return GENDERS.MEN;
  if (marker === 'W') return GENDERS.WOMEN;
  return GENDERS.MIXED;
}

/** Discipline key of a race, from its DisciplineId or its id. */
export function disciplineOf(disciplineId, raceId = '', gender = undefined) {
  const code = (str(disciplineId) || str(raceId).slice(-2)).toUpperCase().slice(0, 2);
  const discipline = DISCIPLINE_CODES[code] ?? DISCIPLINES.OTHER;
  if (discipline === DISCIPLINES.RELAY && (gender ?? genderOf('', raceId)) === GENDERS.MIXED) {
    return DISCIPLINES.MIXED_RELAY;
  }
  return discipline;
}

export function isRelay(discipline) {
  return [DISCIPLINES.RELAY, DISCIPLINES.SINGLE_MIXED_RELAY, DISCIPLINES.MIXED_RELAY].includes(
    discipline,
  );
}

/** Season id ('2627') a race or cup id belongs to. */
export function seasonOfId(id) {
  return str(id).slice(2, 6);
}

/**
 * Normalize an event (a stage of the tour: one venue, one week).
 */
export function normalizeEvent(raw) {
  return {
    eventId: str(raw.EventId),
    location: str(raw.ShortDescription) || str(raw.Organizer) || str(raw.Description),
    description: str(raw.Description),
    nation: str(raw.Nat),
    start: toDate(raw.StartDate),
    end: toDate(raw.EndDate),
  };
}

/**
 * Normalize a competition (a race) with the event it belongs to.
 */
export function normalizeRace(raw, event) {
  const raceId = str(raw.RaceId);
  const gender = genderOf(raw.catId ?? raw.CatId, raceId);
  const discipline = disciplineOf(raw.DisciplineId, raceId, gender);
  const status = str(raw.StatusText);
  return {
    raceId,
    eventId: event?.eventId ?? '',
    location: event?.location ?? str(raw.Location),
    nation: event?.nation ?? '',
    description: str(raw.Description) || str(raw.ShortDescription) || raceId,
    shortDescription: str(raw.ShortDescription) || str(raw.Description) || raceId,
    km: str(raw.km),
    gender,
    discipline,
    start: toDate(raw.StartTime),
    status,
    isLive: raw.IsLive === true || raw.HasLiveData === true,
    isFinished: /official|final|finish|result/i.test(status),
  };
}

/**
 * Upcoming races, soonest first. A race whose start is past but younger than
 * `liveWindowMs` stays in the list, flagged as running.
 */
export function upcomingRaces(races, now = new Date(), liveWindowMs = 90 * 60_000) {
  return races
    .filter((race) => race.start && race.start.getTime() > now.getTime() - liveWindowMs)
    .filter((race) => !race.isFinished || race.start.getTime() > now.getTime())
    .sort((a, b) => a.start - b.start)
    .map((race) => ({ ...race, isRunning: race.start.getTime() <= now.getTime() }));
}

/** Label of a race in every language: "Sprint 10 km — Men". */
export function raceLabel(race) {
  const discipline = t(`discipline_${race.discipline}`);
  const gender = t(`gender_${race.gender}`);
  const out = {};
  for (const lang of Object.keys(discipline)) {
    const km = race.km ? ` ${race.km} km` : '';
    out[lang] = `${discipline[lang]}${km} — ${gender[lang]}`;
  }
  return out;
}

// --- Results -----------------------------------------------------------------

/**
 * Normalize the Results payload of a race: the individual (or team) rows in
 * finishing order, and whether the results are final.
 */
export function normalizeResults(raw) {
  const rows = Array.isArray(raw?.Results) ? raw.Results : [];
  const competition = raw?.Competition ?? {};
  // In relays, the API lists the team rows (IsTeam) followed by the legs: the
  // ranking is the one of the teams.
  const hasTeams = rows.some((row) => row.IsTeam === true);
  const ranked = rows
    .filter((row) => (hasTeams ? row.IsTeam === true : true))
    .map((row) => ({
      ibuId: str(row.IBUId),
      name: str(row.Name) || str(row.ShortName),
      shortName: str(row.ShortName) || str(row.Name),
      nation: str(row.Nat),
      rank: toInt(row.Rank),
      order: toInt(row.ResultOrder),
      bib: toInt(row.Bib),
      shootings: str(row.Shootings),
      misses: toInt(row.ShootingTotal),
      totalTime: str(row.TotalTime) || str(row.Result),
      behind: str(row.Behind),
      irm: str(row.IRM),
    }))
    .sort((a, b) => (a.order ?? a.rank ?? 9999) - (b.order ?? b.rank ?? 9999));
  const status = str(competition.StatusText);
  const winner = ranked.find((row) => row.rank === 1) ?? null;
  return {
    rows: ranked,
    // Legs of a relay, for the followed athletes.
    legs: hasTeams ? rows.filter((row) => row.IsTeam !== true) : [],
    winner,
    isFinal: raw?.IsResult === true || /official|final/i.test(status),
    hasWinner: winner !== null,
  };
}

/** The row of an athlete in a race (individual race or relay leg). */
export function athleteRow(results, ibuId) {
  const direct = results.rows.find((row) => row.ibuId === ibuId);
  if (direct) {
    return direct;
  }
  const leg = results.legs.find((row) => str(row.IBUId) === ibuId);
  if (!leg) {
    return null;
  }
  return {
    ibuId,
    name: str(leg.Name),
    shortName: str(leg.ShortName) || str(leg.Name),
    nation: str(leg.Nat),
    // A relay leg ranks with its team.
    rank: results.rows.find((team) => team.nation === str(leg.Nat))?.rank ?? toInt(leg.Rank),
    shootings: str(leg.Shootings),
    misses: toInt(leg.ShootingTotal),
    totalTime: str(leg.TotalTime),
    behind: str(leg.Behind),
    irm: str(leg.IRM),
  };
}

/** Placement bucket of a rank, for the athlete_result trigger filter. */
export function placementOf(rank) {
  if (rank === 1) return 'win';
  if (rank !== null && rank <= 3) return 'podium';
  if (rank !== null && rank <= 10) return 'top10';
  if (rank !== null && rank <= 40) return 'points';
  return 'other';
}

// --- Standings ---------------------------------------------------------------

/** Cup category of a gender at a level: SM / SW for seniors, JM / JW juniors. */
function cupCategory(gender, level) {
  const prefix = String(level) === '3' ? 'J' : 'S';
  return `${prefix}${gender === GENDERS.WOMEN ? 'W' : 'M'}`;
}

/**
 * Id of the cup of a standing. Looked up in the season's cup list when there
 * is one (ids differ between levels and seasons), composed otherwise.
 */
export function cupIdFor({ cups, seasonId, level, gender, cupType }) {
  const suffix = `__${cupCategory(gender, level)}${CUP_TYPES[cupType] ?? CUP_TYPES.overall}`;
  const token = LEVEL_TOKENS[level] ?? LEVEL_TOKENS[1];
  const ids = (Array.isArray(cups) ? cups : []).map((cup) => str(cup.CupId));
  const candidates = ids.filter((id) => id.endsWith(suffix));
  return (
    candidates.find((id) => id.includes(token)) ??
    candidates[0] ??
    `BT${seasonId}S${token}${suffix}`
  );
}

/** Normalize a CupResults payload. */
export function normalizeStandings(raw) {
  const rows = Array.isArray(raw?.Rows) ? raw.Rows : [];
  return {
    asOf: toDate(raw?.AsOf),
    name: str(raw?.CupName) || str(raw?.Description),
    rows: rows
      .map((row) => ({
        ibuId: str(row.IBUId),
        name: str(row.Name) || str(row.ShortName) || str(row.Nat),
        shortName: str(row.ShortName) || str(row.Name) || str(row.Nat),
        nation: str(row.Nat),
        rank: toInt(row.Rank),
        points: toNumber(row.Score) ?? 0,
      }))
      .filter((row) => row.rank !== null)
      .sort((a, b) => a.rank - b.rank),
  };
}

// --- Athletes ----------------------------------------------------------------

/** Normalize a CISBios payload (name and nation of an athlete). */
export function normalizeBio(raw, ibuId) {
  const given = str(raw?.GivenName);
  const family = str(raw?.FamilyName);
  return {
    ibuId,
    name: str(raw?.FullName) || [given, family].filter(Boolean).join(' ') || ibuId,
    nation: str(raw?.NAT) || str(raw?.Nat),
  };
}

/** Normalize an Athletes search payload. */
export function normalizeSearch(raw) {
  const list = Array.isArray(raw?.Athletes) ? raw.Athletes : Array.isArray(raw) ? raw : [];
  return list
    .map((athlete) => ({
      ibuId: str(athlete.IBUId),
      name:
        str(athlete.FullName) ||
        [str(athlete.GivenName), str(athlete.FamilyName)].filter(Boolean).join(' '),
      nation: str(athlete.NAT) || str(athlete.Nat),
    }))
    .filter((athlete) => athlete.ibuId);
}

/**
 * Parse the "Shootings" string of an individual result ("0+1+0+2") into the
 * misses per stage. Null when the format is not the individual one (relays
 * write "0+1 0+3", penalties + spare rounds per stage).
 */
export function parseShootings(text) {
  const value = str(text);
  if (!/^\d+(\+\d+)*$/.test(value)) {
    return null;
  }
  return value.split('+').map((misses) => Number.parseInt(misses, 10));
}

/**
 * Shooting statistics of an athlete over a list of AllResults rows: the
 * individual races of `seasonId` only (relays use spare rounds and do not
 * compare). 5 targets per stage.
 */
export function shootingStats(results, seasonId) {
  const stats = {
    races: 0,
    shots: 0,
    hits: 0,
    proneShots: 0,
    proneHits: 0,
    standShots: 0,
    standHits: 0,
  };
  for (const row of results) {
    const raceId = str(row.RaceId);
    if (seasonId && seasonOfId(raceId) !== seasonId) continue;
    const discipline = disciplineOf('', raceId);
    if (isRelay(discipline)) continue;
    const stages = parseShootings(row.Shootings);
    if (!stages) continue;
    const order = SHOOTING_ORDER[discipline] ?? '';
    stats.races += 1;
    stages.forEach((misses, index) => {
      const hits = Math.max(0, 5 - Math.min(5, misses));
      stats.shots += 5;
      stats.hits += hits;
      if (order[index] === 'P') {
        stats.proneShots += 5;
        stats.proneHits += hits;
      } else if (order[index] === 'S') {
        stats.standShots += 5;
        stats.standHits += hits;
      }
    });
  }
  const pct = (hits, shots) => (shots > 0 ? Math.round((hits / shots) * 1000) / 10 : null);
  return {
    races: stats.races,
    shots: stats.shots,
    hits: stats.hits,
    accuracy: pct(stats.hits, stats.shots),
    prone: pct(stats.proneHits, stats.proneShots),
    standing: pct(stats.standHits, stats.standShots),
  };
}

/**
 * Most recent individual result of a season in an AllResults list: the
 * highest race id (event numbers grow along the season).
 */
export function lastSeasonResult(results, seasonId) {
  const rows = results
    .filter((row) => !seasonId || seasonOfId(row.RaceId) === seasonId)
    .filter((row) => toInt(row.Rank ?? row.Place) !== null);
  rows.sort((a, b) => str(b.RaceId).localeCompare(str(a.RaceId)));
  const last = rows[0];
  if (!last) {
    return null;
  }
  return {
    raceId: str(last.RaceId),
    description: str(last.Comp) || str(last.RaceId),
    rank: toInt(last.Rank ?? last.Place),
    shootings: str(last.Shootings),
  };
}

/** Rows of an AllResults payload. */
export function allResultsRows(raw) {
  return Array.isArray(raw?.Results) ? raw.Results : Array.isArray(raw) ? raw : [];
}
