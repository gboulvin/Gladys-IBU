// -----------------------------------------------------------------------------
// Scene actions (manifest `scene_actions`, Gladys 5.1+).
//
// Each handler receives the RESOLVED `fields` and returns the declared scalar
// `outputs`, readable by the following actions of the scene (e.g. a message
// "Next race: {{output.race}} {{output.start_time_local}}"). "Nothing found" is
// an output (`found: false`), never a failure: a scene action is never a
// condition, the scene author gates on the output.
//
// Texts are rendered in the language of the configuration. No action fires a
// scene event: a scene bound to that event would loop through the integration.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { formatDateTime, pick } from './i18n.js';
import { raceLabel } from './ibu/model.js';
import { ibuIdOfDevice } from './devices.js';

const logger = createLogger({ name: 'scenes' });

const STANDING_GENDERS = ['men', 'women'];

export const SCENE_ACTIONS = {
  async get_next_race(gladys, { fields, config, service }) {
    const gender = ['men', 'women', 'mixed'].includes(fields.gender) ? fields.gender : 'all';
    const race = service.nextRace(gender);
    if (!race) {
      return { found: false };
    }
    return {
      found: true,
      race: pick(raceLabel(race), config.language),
      location: race.location,
      start_time: race.start.toISOString(),
      start_time_local: formatDateTime(race.start, config.language, config.timezone),
      minutes_until: Math.max(0, Math.round((race.start - service.now()) / 60_000)),
    };
  },

  async get_athlete_stats(gladys, { fields, service }) {
    const ibuId = ibuIdOfDevice(gladys, fields.athlete);
    const athlete = ibuId ? service.athlete(ibuId) : null;
    if (!athlete) {
      return { found: false };
    }
    return {
      found: true,
      name: athlete.name,
      nation: athlete.nation || null,
      rank: athlete.standing?.rank ?? null,
      points: athlete.standing?.points ?? null,
      shooting_accuracy: athlete.stats?.accuracy ?? null,
      prone_accuracy: athlete.stats?.prone ?? null,
      standing_accuracy: athlete.stats?.standing ?? null,
      last_rank: athlete.lastResult?.rank ?? null,
      last_race: athlete.lastResult?.description ?? null,
    };
  },

  async get_standings_leader(gladys, { fields, service }) {
    const gender = STANDING_GENDERS.includes(fields.gender) ? fields.gender : 'men';
    const standings = await service.getStandings(gender, fields.cup || 'overall');
    const [leader, second] = standings.rows;
    if (!leader) {
      return { found: false };
    }
    return {
      found: true,
      leader: leader.name,
      nation: leader.nation || null,
      points: leader.points,
      second: second?.name ?? null,
      gap: second ? leader.points - second.points : null,
    };
  },

  async refresh_data(gladys, { refresh }) {
    try {
      await refresh();
      return { success: true };
    } catch (err) {
      logger.warn(`Scene refresh failed: ${err.message}`);
      return { success: false };
    }
  },
};
