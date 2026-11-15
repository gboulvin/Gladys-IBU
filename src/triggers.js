// -----------------------------------------------------------------------------
// Scene triggers (manifest `scene_triggers`, Gladys 5.1+).
//
// The service (src/service.js) detects what happened during a refresh; this
// module turns each detection into ONE scene event with flat `data`: the keys
// declared as `fields` (the filters of the scene editor) and `variables`
// (readable as {{triggerEvent.data.<key>}}). One event per transition: a race
// is announced once, its results once, a leader change once (the service
// remembers what it already fired, across restarts).
//
// Text variables are rendered in the language of the configuration: a scene
// event has no viewer, its texts end up in the messages the scene sends.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { formatDateTime, pick } from './i18n.js';
import { raceLabel } from './ibu/model.js';
import { SCENE_EVENT_TYPES } from './service.js';
import { athleteIds, personLabel } from './devices.js';

const logger = createLogger({ name: 'triggers' });

// Keys are forever: scenes store them.
export const SCENE_TRIGGER_KEYS = Object.values(SCENE_EVENT_TYPES);

const raceData = (race, config) => ({
  gender: race.gender,
  discipline: race.discipline,
  race: pick(raceLabel(race), config.language),
  location: race.location,
  start_time: race.start.toISOString(),
  start_time_local: formatDateTime(race.start, config.language, config.timezone),
});

/** Build the `publishSceneEvent` payload of a detection. */
export function toSceneEvent(gladys, event, config) {
  switch (event.type) {
    case SCENE_EVENT_TYPES.RACE_STARTING_SOON:
      return {
        key: event.type,
        data: { ...raceData(event.race, config), minutes: event.minutes },
      };
    case SCENE_EVENT_TYPES.RACE_RESULTS:
      return {
        key: event.type,
        data: {
          ...raceData(event.race, config),
          winner: event.winner?.name ?? null,
          winner_nation: event.winner?.nation ?? null,
          second: event.second ? personLabel(event.second) : null,
          third: event.third ? personLabel(event.third) : null,
        },
      };
    case SCENE_EVENT_TYPES.ATHLETE_RESULT:
      return {
        key: event.type,
        data: {
          athlete: athleteIds(gladys, event.row.ibuId).device,
          placement: event.placement,
          athlete_name: event.row.name,
          rank: event.row.rank,
          shootings: event.row.shootings || null,
          misses: event.row.misses,
          behind: event.row.behind || null,
          race: pick(raceLabel(event.race), config.language),
          location: event.race.location,
        },
      };
    case SCENE_EVENT_TYPES.LEADER_CHANGED:
      return {
        key: event.type,
        data: {
          gender: event.gender,
          leader: event.leader.name,
          leader_nation: event.leader.nation || null,
          points: event.leader.points,
          previous_leader: event.previousName ?? null,
        },
      };
    default:
      return null;
  }
}

/** Publish the scene events of a refresh, one after the other. */
export async function publishSceneEvents(gladys, events, config) {
  for (const event of events) {
    const sceneEvent = toSceneEvent(gladys, event, config);
    if (!sceneEvent) continue;
    try {
      await gladys.publishSceneEvent(sceneEvent.key, sceneEvent.data);
      logger.info(`Scene event ${sceneEvent.key} published`);
    } catch (err) {
      logger.error(`Scene event ${sceneEvent.key} refused`, err);
    }
  }
}
