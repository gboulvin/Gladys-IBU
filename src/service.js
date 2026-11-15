// -----------------------------------------------------------------------------
// Biathlon service: the integration's view of the IBU datacenter.
//
// One `refresh()` per refresh interval:
//   1. reads the seasons, the events and the races of the configured level;
//   2. fetches the results of the races that finished since the last refresh;
//   3. reads the overall standings (men and women);
//   4. reads the followed athletes (name, nation, season results);
//   5. returns the scene events this refresh revealed (a race about to start,
//      the results of a race, a followed athlete's result, a new leader).
//
// Everything the devices, widgets and scene actions show comes from the cache
// built here: a dashboard opening never triggers an IBU request, except the
// first read of a secondary standing (sprint, pursuit...), cached afterwards.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { IbuClient } from './ibu/client.js';
import {
  GENDERS,
  allResultsRows,
  athleteRow,
  cupIdFor,
  lastSeasonResult,
  normalizeBio,
  normalizeEvent,
  normalizeRace,
  normalizeResults,
  normalizeSearch,
  normalizeStandings,
  pickSeasons,
  placementOf,
  shootingStats,
  upcomingRaces,
} from './ibu/model.js';
import { rememberId } from './store.js';

const logger = createLogger({ name: 'service' });

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

// A race is checked for results from 30 min after its start, for 3 days.
const RESULTS_CHECK_DELAY = 30 * 60_000;
const RESULTS_CHECK_WINDOW = 3 * DAY;
// Results not flagged final are trusted 3 h after the start.
const RESULTS_TRUST_DELAY = 3 * HOUR;
// Events read per refresh: the running one and the next ones.
const UPCOMING_EVENTS = 4;
// Seasons and biographies change rarely.
const SEASONS_TTL = 12 * HOUR;
const ATHLETE_RESULTS_TTL = 6 * HOUR;

export const SCENE_EVENT_TYPES = {
  RACE_STARTING_SOON: 'race_starting_soon',
  RACE_RESULTS: 'race_results',
  ATHLETE_RESULT: 'athlete_result',
  LEADER_CHANGED: 'leader_changed',
};

export class BiathlonService {
  /**
   * @param {{ store: { load(): Promise<object>, save(m: object): Promise<void> },
   *           fetch?: typeof fetch, now?: () => Date }} options
   */
  constructor({ store, fetch: fetchImpl, now = () => new Date() }) {
    this.store = store;
    this.fetch = fetchImpl;
    this.now = now;
    this.memory = null;
    this.config = null;
    this.client = null;
    this.reset();
  }

  reset() {
    this.seasons = null;
    this.seasonsReadAt = 0;
    this.races = [];
    this.competitionsCache = new Map(); // eventId -> races of a past event
    this.lastResult = null; // { race, results } of the last finished race
    this.lastResults = new Map(); // gender -> { race, results }
    this.standings = new Map(); // `${gender}:${cupType}` -> { data, readAt }
    this.cups = null;
    this.athletes = new Map(); // ibuId -> athlete
    this.lastRefresh = null;
    this.lastError = null;
  }

  /** Apply a (new) configuration. A changed key or level drops the cache. */
  configure(config) {
    const changed =
      !this.config || this.config.api_key !== config.api_key || this.config.level !== config.level;
    this.config = config;
    this.client = new IbuClient({ apiKey: config.api_key, fetch: this.fetch });
    if (changed) {
      this.reset();
    }
    // Forget the athletes no longer followed.
    for (const ibuId of [...this.athletes.keys()]) {
      if (!config.athleteIds.includes(ibuId)) {
        this.athletes.delete(ibuId);
      }
    }
  }

  get isConfigured() {
    return Boolean(this.config?.api_key);
  }

  get hasData() {
    return this.lastRefresh !== null;
  }

  // --- Refresh ---------------------------------------------------------------

  /**
   * Refresh everything and return the scene events to publish.
   * @returns {Promise<Array<{ type: string, [key: string]: unknown }>>}
   */
  async refresh() {
    if (!this.isConfigured) {
      throw new Error('IBU API key missing');
    }
    if (!this.memory) {
      this.memory = await this.store.load();
    }
    const now = this.now();
    const events = [];
    try {
      await this.refreshSeasons(now);
      await this.refreshRaces(now);
      events.push(...(await this.checkFinishedRaces(now)));
      events.push(...this.checkReminders(now));
      events.push(...(await this.refreshStandings(now)));
      await this.refreshAthletes(
        now,
        events.some((e) => e.type === SCENE_EVENT_TYPES.RACE_RESULTS),
      );
      this.lastRefresh = now;
      this.lastError = null;
    } catch (err) {
      this.lastError = err;
      throw err;
    } finally {
      // The first successful refresh only learns the past: nothing it found
      // is "new" to the user.
      const firstRun = !this.memory.initialized;
      if (this.lastError === null) {
        this.memory.initialized = true;
      }
      await this.store.save(this.memory);
      if (firstRun) {
        events.length = 0;
      }
    }
    return events;
  }

  async refreshSeasons(now) {
    if (this.seasons && now - this.seasonsReadAt < SEASONS_TTL) {
      return;
    }
    this.seasons = pickSeasons(await this.client.seasons());
    this.seasonsReadAt = now.getTime();
    logger.debug(`Seasons: schedule ${this.seasons.schedule}, results ${this.seasons.results}`);
  }

  async readEvents(seasonId) {
    const raw = await this.client.events(seasonId, this.config.level);
    return (Array.isArray(raw) ? raw : []).map(normalizeEvent).filter((e) => e.eventId);
  }

  async refreshRaces(now) {
    const seasonIds = [...new Set([this.seasons.results, this.seasons.schedule].filter(Boolean))];
    const allEvents = (await Promise.all(seasonIds.map((id) => this.readEvents(id)))).flat();
    allEvents.sort((a, b) => (a.start ?? 0) - (b.start ?? 0));

    // The running and upcoming events, plus the last finished one (its races
    // carry the last results shown before the next event starts).
    const upcoming = allEvents
      .filter((e) => e.end && e.end.getTime() >= now.getTime() - DAY)
      .slice(0, UPCOMING_EVENTS);
    const past = allEvents.filter((e) => e.end && e.end.getTime() < now.getTime() - DAY);
    const selected = [...past.slice(-1), ...upcoming];

    const races = [];
    for (const event of selected) {
      const isPast = event.end.getTime() < now.getTime() - RESULTS_CHECK_WINDOW;
      if (isPast && this.competitionsCache.has(event.eventId)) {
        races.push(...this.competitionsCache.get(event.eventId));
        continue;
      }
      const raw = await this.client.competitions(event.eventId);
      const eventRaces = (Array.isArray(raw) ? raw : [])
        .map((competition) => normalizeRace(competition, event))
        .filter((race) => race.raceId && race.start);
      if (isPast) {
        this.competitionsCache.set(event.eventId, eventRaces);
      }
      races.push(...eventRaces);
    }
    this.races = races.sort((a, b) => a.start - b.start);
  }

  async checkFinishedRaces(now) {
    const events = [];
    const candidates = this.races.filter(
      (race) =>
        now - race.start >= RESULTS_CHECK_DELAY &&
        now - race.start <= RESULTS_CHECK_WINDOW &&
        !this.memory.finished.includes(race.raceId),
    );
    for (const race of candidates) {
      const results = normalizeResults(await this.client.results(race.raceId));
      const trusted = results.isFinal || now - race.start >= RESULTS_TRUST_DELAY;
      if (!results.hasWinner || !trusted) {
        continue;
      }
      rememberId(this.memory.finished, race.raceId);
      this.setLastResult(race, results);
      events.push(raceResultsEvent(race, results));
      for (const ibuId of this.config.athleteIds) {
        const row = athleteRow(results, ibuId);
        if (row) {
          events.push(athleteResultEvent(race, row));
        }
      }
    }

    // After a restart, show the last results even if they were announced
    // before: read the most recent past race of each gender once.
    const past = this.races.filter((race) => now - race.start >= RESULTS_CHECK_DELAY).reverse();
    for (const gender of Object.values(GENDERS)) {
      if (this.lastResults.has(gender)) continue;
      for (const race of past.filter((r) => r.gender === gender).slice(0, 2)) {
        const results = normalizeResults(await this.client.results(race.raceId));
        if (results.hasWinner) {
          this.setLastResult(race, results);
          break;
        }
      }
    }
    return events;
  }

  setLastResult(race, results) {
    const current = this.lastResults.get(race.gender);
    if (!current || current.race.start <= race.start) {
      this.lastResults.set(race.gender, { race, results });
    }
    if (!this.lastResult || this.lastResult.race.start <= race.start) {
      this.lastResult = { race, results };
    }
  }

  checkReminders(now) {
    const windowMs = this.config.reminder_minutes * 60_000;
    const events = [];
    for (const race of this.races) {
      const delay = race.start - now;
      if (delay > 0 && delay <= windowMs && !this.memory.reminded.includes(race.raceId)) {
        rememberId(this.memory.reminded, race.raceId);
        events.push({
          type: SCENE_EVENT_TYPES.RACE_STARTING_SOON,
          race,
          minutes: Math.max(0, Math.round(delay / 60_000)),
        });
      }
    }
    return events;
  }

  async refreshStandings(now) {
    this.standings.clear();
    this.cups = null;
    const events = [];
    for (const gender of [GENDERS.MEN, GENDERS.WOMEN]) {
      const standing = await this.readStandings(gender, 'overall', now);
      const leader = standing.rows[0];
      if (!leader) {
        continue;
      }
      const memoryKey = `${this.config.level}:${this.seasons.results}:${gender}`;
      const previous = this.memory.leaders[memoryKey];
      const leaderKey = leader.ibuId || leader.name;
      if (previous && previous.id !== leaderKey) {
        events.push({
          type: SCENE_EVENT_TYPES.LEADER_CHANGED,
          gender,
          leader,
          previousName: previous.name,
        });
      }
      this.memory.leaders[memoryKey] = { id: leaderKey, name: leader.name };
    }
    return events;
  }

  async readStandings(gender, cupType, now = this.now()) {
    const key = `${gender}:${cupType}`;
    const cached = this.standings.get(key);
    if (cached && now - cached.readAt < this.config.refresh_interval * 60_000) {
      return cached.data;
    }
    if (!this.cups) {
      try {
        this.cups = await this.client.cups(this.seasons.results);
      } catch (err) {
        // The composed cup ids still work without the list.
        logger.warn(`Cups list unavailable: ${err.message}`);
        this.cups = [];
      }
    }
    const cupId = cupIdFor({
      cups: this.cups,
      seasonId: this.seasons.results,
      level: this.config.level,
      gender,
      cupType,
    });
    const data = normalizeStandings(await this.client.cupResults(cupId));
    this.standings.set(key, { data, readAt: now.getTime() });
    return data;
  }

  /** Standings for a widget or a scene action (cached, read on demand). */
  async getStandings(gender, cupType = 'overall') {
    if (!this.seasons) {
      await this.refreshSeasons(this.now());
    }
    return this.readStandings(gender, cupType);
  }

  async refreshAthletes(now, raceFinished) {
    for (const ibuId of this.config.athleteIds) {
      const athlete = this.athletes.get(ibuId) ?? { ibuId, name: ibuId, nation: '' };
      try {
        if (!athlete.bioRead) {
          Object.assign(athlete, normalizeBio(await this.client.athleteBio(ibuId), ibuId));
          athlete.bioRead = true;
        }
        if (
          raceFinished ||
          !athlete.resultsReadAt ||
          now - athlete.resultsReadAt > ATHLETE_RESULTS_TTL
        ) {
          const rows = allResultsRows(await this.client.athleteResults(ibuId));
          athlete.stats = shootingStats(rows, this.seasons.results);
          athlete.lastResult = lastSeasonResult(rows, this.seasons.results);
          athlete.resultsReadAt = now.getTime();
        }
      } catch (err) {
        // One unknown athlete must not break the whole refresh.
        logger.warn(`Athlete ${ibuId} unavailable: ${err.message}`);
      }
      athlete.standing = this.findInOverall(ibuId);
      this.athletes.set(ibuId, athlete);
    }
  }

  findInOverall(ibuId) {
    for (const gender of [GENDERS.MEN, GENDERS.WOMEN]) {
      const row = this.standings.get(`${gender}:overall`)?.data.rows.find((r) => r.ibuId === ibuId);
      if (row) {
        return { gender, rank: row.rank, points: row.points };
      }
    }
    return null;
  }

  // --- Reads -------------------------------------------------------------------

  upcoming(gender = 'all') {
    return upcomingRaces(this.races, this.now()).filter(
      (race) => gender === 'all' || race.gender === gender,
    );
  }

  nextRace(gender = 'all') {
    return this.upcoming(gender).find((race) => !race.isRunning) ?? null;
  }

  latestResult(gender = 'all') {
    return gender === 'all' ? this.lastResult : (this.lastResults.get(gender) ?? null);
  }

  overall(gender) {
    return this.standings.get(`${gender}:overall`)?.data ?? null;
  }

  athlete(ibuId) {
    return this.athletes.get(ibuId) ?? null;
  }

  async searchAthletes(name) {
    const [family, ...given] = String(name).trim().split(/\s+/);
    return normalizeSearch(await this.client.searchAthletes(family, given.join(' ')));
  }

  async testConnection() {
    const seasons = await this.client.seasons();
    // Seasons is public: also read a protected endpoint to check the key.
    const picked = pickSeasons(seasons);
    await this.client.events(picked.schedule, this.config.level);
    return { count: Array.isArray(seasons) ? seasons.length : 0, label: picked.label };
  }
}

function raceResultsEvent(race, results) {
  const podium = results.rows.filter((row) => row.rank !== null && row.rank <= 3);
  return {
    type: SCENE_EVENT_TYPES.RACE_RESULTS,
    race,
    winner: results.winner,
    second: podium.find((row) => row.rank === 2) ?? null,
    third: podium.find((row) => row.rank === 3) ?? null,
  };
}

function athleteResultEvent(race, row) {
  return {
    type: SCENE_EVENT_TYPES.ATHLETE_RESULT,
    race,
    row,
    placement: placementOf(row.rank),
  };
}
