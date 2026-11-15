// -----------------------------------------------------------------------------
// Dashboard widgets (manifest `widgets`, Gladys 5.1+).
//
//   - next_races   : the next races (date, time, venue), a LIVE badge while a
//                    race runs;
//   - standings    : a World Cup / IBU Cup standing (overall, sprint, pursuit,
//                    individual, mass start, nations), followed athletes
//                    highlighted;
//   - athlete      : one followed athlete: rank, points, shooting accuracy
//                    (total, prone, standing), last race;
//   - last_results : the podium of the last race, and where the followed
//                    athletes finished.
//
// The contents are declarative (the core renders them with its theme, dark
// mode and translations): texts are multi-language objects `{ en, fr, de, es }`
// the core picks from, dates are formatted in the language of the viewer.
// Everything comes from the service cache: opening a dashboard costs no IBU
// request (except the first read of a secondary standing).
// -----------------------------------------------------------------------------

import { createLogger, WIDGET_COLORS } from '@gladysassistant/integration-sdk';
import { LANGUAGES, formatDate, pick, t } from './i18n.js';
import { CUP_TYPES, raceLabel } from './ibu/model.js';
import { ibuIdOfDevice, personLabel } from './devices.js';

const logger = createLogger({ name: 'widgets' });

export const WIDGET_KEYS = {
  NEXT_RACES: 'next_races',
  STANDINGS: 'standings',
  ATHLETE: 'athlete',
  LAST_RESULTS: 'last_results',
};

const ACTIONS = { REFRESH: 'refresh' };
const TTL_SECONDS = 300;

const clip = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/** Clip every language of a multi-language text. */
const clipAll = (text, max) =>
  Object.fromEntries(Object.entries(text).map(([lang, value]) => [lang, clip(value, max)]));

const messageContent = (message) => ({
  ttl_seconds: 60,
  components: [{ type: 'text', text: message, variant: 'body' }],
});

const refreshButton = () => ({
  type: 'button',
  label: t('refresh'),
  icon: 'refresh-cw',
  style: 'secondary',
  action: { key: ACTIONS.REFRESH },
});

/** Content shown while the integration has nothing to show. */
function unavailable(service) {
  if (!service.isConfigured) {
    return messageContent(t('not_configured'));
  }
  if (!service.hasData) {
    return messageContent(t('data_unavailable'));
  }
  return null;
}

function cupLabel(cupType) {
  if (cupType === 'overall') return t('cup_overall');
  if (cupType === 'nations') return t('cup_nations');
  return t(`discipline_${cupType}`);
}

function badgeOf(race, now) {
  if (race.isRunning) {
    return { text: t('live'), color: WIDGET_COLORS.DANGER };
  }
  const minutes = Math.round((race.start - now) / 60_000);
  if (minutes <= 180) {
    return { text: t('in_minutes', { minutes }), color: WIDGET_COLORS.WARNING };
  }
  return undefined;
}

export const WIDGETS = {
  [WIDGET_KEYS.NEXT_RACES]: {
    async get(gladys, { settings = {}, service }) {
      const empty = unavailable(service);
      if (empty) return empty;
      const count = Math.min(8, Math.max(1, Number(settings.count) || 5));
      const races = service.upcoming(settings.gender || 'all').slice(0, count);
      if (races.length === 0) {
        return {
          ttl_seconds: TTL_SECONDS,
          components: [{ type: 'text', text: t('no_upcoming_race') }],
        };
      }
      const now = service.now();
      return {
        ttl_seconds: races.some((race) => race.isRunning || race.start - now < 3_600_000)
          ? 60
          : TTL_SECONDS,
        components: [
          {
            type: 'card-list',
            display: 'list',
            items: races.map((race) => {
              const badge = badgeOf(race, now);
              return {
                title: clipAll(raceLabel(race), 60),
                subtitle: clip(
                  race.nation ? `${race.location} (${race.nation})` : race.location,
                  60,
                ),
                date: race.start.toISOString(),
                ...(badge ? { badge } : {}),
              };
            }),
          },
          refreshButton(),
        ],
      };
    },
  },

  [WIDGET_KEYS.STANDINGS]: {
    async get(gladys, { settings = {}, service, config }) {
      const empty = unavailable(service);
      if (empty) return empty;
      const gender = settings.gender === 'women' ? 'women' : 'men';
      const cupType = settings.cup in CUP_TYPES ? settings.cup : 'overall';
      const count = Math.min(10, Math.max(1, Number(settings.count) || 10));
      let standings;
      try {
        standings = await service.getStandings(gender, cupType);
      } catch (err) {
        logger.warn(`Standings ${gender}/${cupType} unavailable: ${err.message}`);
        return messageContent(t('data_unavailable'));
      }
      const heading = {};
      const cup = cupLabel(cupType);
      const genderLabel = t(`gender_${gender}`);
      for (const lang of LANGUAGES) {
        heading[lang] = clip(`${cup[lang]} — ${genderLabel[lang]}`, 40);
      }
      if (standings.rows.length === 0) {
        return {
          ttl_seconds: TTL_SECONDS,
          components: [
            { type: 'text', text: heading, variant: 'heading' },
            { type: 'text', text: t('no_standings') },
          ],
        };
      }
      const followed = new Set(config.athleteIds);
      const components = [
        { type: 'text', text: heading, variant: 'heading' },
        {
          type: 'status',
          items: standings.rows.slice(0, count).map((row) => ({
            label: clip(`${row.rank}. ${personLabel(row)}`, 40),
            value: row.points,
            color:
              row.rank === 1
                ? WIDGET_COLORS.WARNING
                : followed.has(row.ibuId)
                  ? WIDGET_COLORS.SUCCESS
                  : WIDGET_COLORS.NEUTRAL,
          })),
        },
      ];
      if (standings.asOf) {
        const asOf = {};
        for (const lang of LANGUAGES) {
          asOf[lang] = pick(
            t('as_of', { date: formatDate(standings.asOf, lang, config.timezone) }),
            lang,
          );
        }
        components.push({ type: 'text', text: asOf, variant: 'caption' });
      }
      return { ttl_seconds: TTL_SECONDS, components };
    },
  },

  [WIDGET_KEYS.ATHLETE]: {
    async get(gladys, { settings = {}, service }) {
      const empty = unavailable(service);
      if (empty) return empty;
      const ibuId = ibuIdOfDevice(gladys, settings.athlete);
      const athlete = ibuId ? service.athlete(ibuId) : null;
      if (!athlete) {
        return messageContent(t('unknown_athlete'));
      }
      const components = [
        {
          type: 'text',
          text: clip(athlete.nation ? `${athlete.name} (${athlete.nation})` : athlete.name, 40),
          variant: 'heading',
        },
        {
          type: 'value',
          label: t('rank'),
          icon: 'award',
          value: athlete.standing?.rank ?? '-',
          color: athlete.standing?.rank <= 3 ? WIDGET_COLORS.WARNING : WIDGET_COLORS.PRIMARY,
        },
        {
          type: 'value',
          label: t('points'),
          icon: 'trending-up',
          value: athlete.standing?.points ?? 0,
        },
      ];
      if (athlete.stats?.accuracy !== null && athlete.stats?.accuracy !== undefined) {
        components.push({
          type: 'gauge',
          label: t('shooting'),
          value: athlete.stats.accuracy,
          min: 0,
          max: 100,
          unit: '%',
          color: athlete.stats.accuracy >= 90 ? WIDGET_COLORS.SUCCESS : WIDGET_COLORS.WARNING,
        });
      }
      const items = [];
      if (athlete.stats?.prone !== null && athlete.stats?.prone !== undefined) {
        items.push({ label: t('prone'), icon: 'target', value: `${athlete.stats.prone} %` });
      }
      if (athlete.stats?.standing !== null && athlete.stats?.standing !== undefined) {
        items.push({
          label: t('standing'),
          icon: 'crosshair',
          value: `${athlete.stats.standing} %`,
        });
      }
      if (athlete.stats?.races) {
        items.push({ label: t('races'), icon: 'flag', value: athlete.stats.races });
      }
      if (athlete.lastResult) {
        items.push({
          label: t('last_race'),
          icon: 'clock',
          value: clip(
            `${athlete.lastResult.rank ?? '-'}. ${athlete.lastResult.shootings || ''}`.trim(),
            40,
          ),
          color: athlete.lastResult.rank <= 3 ? WIDGET_COLORS.SUCCESS : WIDGET_COLORS.NEUTRAL,
        });
      }
      if (items.length > 0) {
        components.push({ type: 'status', items });
      }
      return { ttl_seconds: TTL_SECONDS, components };
    },
  },

  [WIDGET_KEYS.LAST_RESULTS]: {
    async get(gladys, { settings = {}, service, config }) {
      const empty = unavailable(service);
      if (empty) return empty;
      const latest = service.latestResult(settings.gender || 'all');
      if (!latest) {
        return { ttl_seconds: TTL_SECONDS, components: [{ type: 'text', text: t('no_results') }] };
      }
      const { race, results } = latest;
      const heading = clipAll(t('podium_of', { race: raceLabel(race) }), 40);
      const followed = new Set(config.athleteIds);
      const podium = results.rows.filter((row) => row.rank !== null && row.rank <= 3);
      const followedRows = results.rows.filter(
        (row) => followed.has(row.ibuId) && (row.rank === null || row.rank > 3),
      );
      const medalColor = {
        1: WIDGET_COLORS.WARNING,
        2: WIDGET_COLORS.NEUTRAL,
        3: WIDGET_COLORS.DANGER,
      };
      const items = [...podium, ...followedRows].slice(0, 10).map((row) => ({
        label: clip(`${row.rank ?? row.irm ?? '-'}. ${personLabel(row)}`, 40),
        value: clip(
          [row.rank === 1 ? row.totalTime : row.behind, row.shootings]
            .filter(Boolean)
            .join(' · ') || '-',
          40,
        ),
        color: followed.has(row.ibuId) ? WIDGET_COLORS.SUCCESS : medalColor[row.rank],
      }));
      const subtitle = {};
      for (const lang of LANGUAGES) {
        subtitle[lang] = clip(
          `${race.location} — ${formatDate(race.start, lang, config.timezone)}`,
          80,
        );
      }
      return {
        ttl_seconds: TTL_SECONDS,
        components: [
          { type: 'text', text: heading, variant: 'heading' },
          { type: 'status', items },
          { type: 'text', text: subtitle, variant: 'caption' },
        ],
      };
    },
  },
};

/** Buttons of every widget: only "refresh" today. */
export async function handleWidgetAction(actionKey, { refresh }) {
  if (actionKey === ACTIONS.REFRESH) {
    await refresh();
    return t('refreshed');
  }
  // Throwing acks the action as failed: the message reaches the user.
  throw new Error(`Unknown widget action: ${actionKey}`);
}

/**
 * Ask the core to re-pull every widget now (after a refresh, a config change
 * or a reconnection) instead of waiting for the content TTL. Fire-and-forget,
 * rate-limited core-side to 1 per 10 s per widget.
 */
export function refreshWidgets(gladys) {
  for (const key of Object.keys(WIDGETS)) {
    gladys.requestWidgetRefresh(key);
  }
}
