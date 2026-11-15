// -----------------------------------------------------------------------------
// Devices published to Gladys (Discovery tab).
//
//   - "Biathlon calendar": next race (text), minutes to the next race, last
//     winner (text);
//   - "Biathlon standings — Men" / "— Women": overall leader and points;
//   - one "Biathlete <name>" per followed athlete: overall rank and points,
//     shooting accuracy (total, prone, standing) over the season, last race
//     rank and result.
//
// The data is pulled by the integration itself at the configured refresh
// interval (src/service.js), then pushed with publishChangedStates: the devices
// declare no `poll_frequency`, Gladys never polls them.
//
// External ids are forever: they are built from stable keys (the gender, the
// IBU ID of the athlete), never from a label.
// -----------------------------------------------------------------------------

import {
  DEVICE_FEATURE_CATEGORIES,
  DEVICE_FEATURE_TYPES,
  DEVICE_FEATURE_UNITS,
} from '@gladysassistant/integration-sdk';
import { formatDateTime, pick, t } from './i18n.js';
import { GENDERS, raceLabel } from './ibu/model.js';

const TYPE = { CALENDAR: 'calendar', STANDINGS: 'standings', ATHLETE: 'athlete' };

export const FEATURES = {
  NEXT_RACE: 'next-race',
  MINUTES_TO_NEXT_RACE: 'minutes-to-next-race',
  LAST_WINNER: 'last-winner',
  LEADER: 'leader',
  LEADER_POINTS: 'leader-points',
  RANK: 'rank',
  POINTS: 'points',
  SHOOTING: 'shooting-accuracy',
  PRONE: 'prone-accuracy',
  STANDING: 'standing-accuracy',
  LAST_RANK: 'last-rank',
  LAST_RESULT: 'last-result',
};

// Re-publish unchanged values every 6 hours, so a device never looks stale.
const HEARTBEAT_MS = 6 * 3_600_000;
// Gladys text states are short.
const MAX_TEXT = 250;

export const calendarIds = (gladys) => gladys.externalIds(TYPE.CALENDAR, 'ibu');
export const standingsIds = (gladys, gender) => gladys.externalIds(TYPE.STANDINGS, gender);
export const athleteIds = (gladys, ibuId) => gladys.externalIds(TYPE.ATHLETE, ibuId.toLowerCase());

/** IBU ID of an athlete device external id (null when it is not one). */
export function ibuIdOfDevice(gladys, externalId) {
  const prefix = athleteIds(gladys, 'x').device.slice(0, -1);
  if (typeof externalId !== 'string' || !externalId.startsWith(prefix)) {
    return null;
  }
  return externalId.slice(prefix.length).toUpperCase();
}

const textFeature = (name, externalId) => ({
  name,
  external_id: externalId,
  category: DEVICE_FEATURE_CATEGORIES.TEXT,
  type: DEVICE_FEATURE_TYPES.TEXT.TEXT,
  read_only: true,
  has_feedback: false,
  keep_history: false,
});

const counterFeature = (name, externalId, { max = 100_000, unit, decimal = false } = {}) => ({
  name,
  external_id: externalId,
  category: DEVICE_FEATURE_CATEGORIES.COUNTER_SENSOR,
  type: decimal ? DEVICE_FEATURE_TYPES.SENSOR.DECIMAL : DEVICE_FEATURE_TYPES.SENSOR.INTEGER,
  ...(unit ? { unit } : {}),
  min: 0,
  max,
  read_only: true,
  has_feedback: false,
  keep_history: true,
});

export function buildCalendarDevice(gladys, config) {
  const ids = calendarIds(gladys);
  const lang = config.language;
  return {
    name: pick(t('calendar_device'), lang),
    external_id: ids.device,
    features: [
      textFeature(pick(t('next_race'), lang), ids.feature(FEATURES.NEXT_RACE)),
      {
        name: pick(t('minutes_to_next_race'), lang),
        external_id: ids.feature(FEATURES.MINUTES_TO_NEXT_RACE),
        category: DEVICE_FEATURE_CATEGORIES.DURATION,
        type: DEVICE_FEATURE_TYPES.DURATION.INTEGER,
        unit: DEVICE_FEATURE_UNITS.MINUTES,
        min: 0,
        max: 525_600,
        read_only: true,
        has_feedback: false,
        keep_history: false,
      },
      textFeature(pick(t('last_winner'), lang), ids.feature(FEATURES.LAST_WINNER)),
    ],
  };
}

export function buildStandingsDevice(gladys, config, gender) {
  const ids = standingsIds(gladys, gender);
  const lang = config.language;
  return {
    name: pick(t('standings_device', { gender: t(`gender_${gender}`) }), lang),
    external_id: ids.device,
    features: [
      textFeature(pick(t('leader'), lang), ids.feature(FEATURES.LEADER)),
      counterFeature(pick(t('leader_points'), lang), ids.feature(FEATURES.LEADER_POINTS), {
        max: 10_000,
      }),
    ],
  };
}

export function buildAthleteDevice(gladys, config, ibuId, athlete) {
  const ids = athleteIds(gladys, ibuId);
  const lang = config.language;
  const percent = { max: 100, unit: DEVICE_FEATURE_UNITS.PERCENT, decimal: true };
  return {
    name: pick(t('athlete_device', { name: athlete?.name ?? ibuId }), lang),
    external_id: ids.device,
    features: [
      counterFeature(pick(t('world_cup_rank'), lang), ids.feature(FEATURES.RANK), { max: 500 }),
      counterFeature(pick(t('world_cup_points'), lang), ids.feature(FEATURES.POINTS), {
        max: 10_000,
      }),
      counterFeature(pick(t('shooting_accuracy'), lang), ids.feature(FEATURES.SHOOTING), percent),
      counterFeature(pick(t('prone_accuracy'), lang), ids.feature(FEATURES.PRONE), percent),
      counterFeature(pick(t('standing_accuracy'), lang), ids.feature(FEATURES.STANDING), percent),
      counterFeature(pick(t('last_rank'), lang), ids.feature(FEATURES.LAST_RANK), { max: 500 }),
      textFeature(pick(t('last_result'), lang), ids.feature(FEATURES.LAST_RESULT)),
    ],
  };
}

/** The discovery payload: every device, built from the current cache. */
export function buildDevices(gladys, config, service) {
  return [
    buildCalendarDevice(gladys, config),
    buildStandingsDevice(gladys, config, GENDERS.MEN),
    buildStandingsDevice(gladys, config, GENDERS.WOMEN),
    ...config.athleteIds.map((ibuId) =>
      buildAthleteDevice(gladys, config, ibuId, service?.athlete(ibuId)),
    ),
  ];
}

const clip = (text) => (text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT - 1)}…` : text);

/** "Sprint 10 km — Men, Kontiolahti, Sat 29 Nov, 10:15" in the config language. */
export function describeRace(race, config) {
  if (!race) {
    return pick(t('no_upcoming_race'), config.language);
  }
  const when = formatDateTime(race.start, config.language, config.timezone);
  return clip(`${pick(raceLabel(race), config.language)}, ${race.location}, ${when}`);
}

/** "Name (NAT)". */
export const personLabel = (row) => (row.nation ? `${row.name} (${row.nation})` : row.name);

/** The states of every device, from the service cache. */
export function buildStates(gladys, config, service) {
  const states = [];
  const text = (externalId, value) =>
    states.push({ device_feature_external_id: externalId, text: clip(value) });
  const number = (externalId, value) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      states.push({ device_feature_external_id: externalId, state: value });
    }
  };

  const calendar = calendarIds(gladys);
  const next = service.nextRace();
  text(calendar.feature(FEATURES.NEXT_RACE), describeRace(next, config));
  if (next) {
    number(
      calendar.feature(FEATURES.MINUTES_TO_NEXT_RACE),
      Math.max(0, Math.round((next.start - service.now()) / 60_000)),
    );
  }
  if (service.lastResult?.results.winner) {
    const { race, results } = service.lastResult;
    text(
      calendar.feature(FEATURES.LAST_WINNER),
      `${personLabel(results.winner)} — ${pick(raceLabel(race), config.language)}, ${race.location}`,
    );
  }

  for (const gender of [GENDERS.MEN, GENDERS.WOMEN]) {
    const leader = service.overall(gender)?.rows[0];
    if (leader) {
      const ids = standingsIds(gladys, gender);
      text(ids.feature(FEATURES.LEADER), personLabel(leader));
      number(ids.feature(FEATURES.LEADER_POINTS), leader.points);
    }
  }

  for (const ibuId of config.athleteIds) {
    const athlete = service.athlete(ibuId);
    if (!athlete) continue;
    const ids = athleteIds(gladys, ibuId);
    number(ids.feature(FEATURES.RANK), athlete.standing?.rank);
    number(ids.feature(FEATURES.POINTS), athlete.standing?.points);
    number(ids.feature(FEATURES.SHOOTING), athlete.stats?.accuracy);
    number(ids.feature(FEATURES.PRONE), athlete.stats?.prone);
    number(ids.feature(FEATURES.STANDING), athlete.stats?.standing);
    if (athlete.lastResult) {
      number(ids.feature(FEATURES.LAST_RANK), athlete.lastResult.rank);
      const shooting = athlete.lastResult.shootings ? ` (${athlete.lastResult.shootings})` : '';
      text(
        ids.feature(FEATURES.LAST_RESULT),
        `${athlete.lastResult.rank ?? '-'} — ${athlete.lastResult.description}${shooting}`,
      );
    }
  }
  return states;
}

export async function publishStates(gladys, config, service) {
  return gladys.publishChangedStates(buildStates(gladys, config, service), {
    heartbeat: HEARTBEAT_MS,
  });
}
