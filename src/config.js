// -----------------------------------------------------------------------------
// Integration configuration.
//
// Filled in by the user from the `config_schema` of
// `gladys-assistant-integration.json`; the SDK fetches it (`getConfig()`) and
// notifies every change (`onConfigUpdated()`). This module provides the
// defaults and normalizes the received object, so the rest of the code never
// deals with `undefined` or with numbers typed as strings.
// -----------------------------------------------------------------------------

import { normalizeLanguage } from './i18n.js';

// Defaults: they MUST stay consistent with the `default` values declared in the
// `config_schema` of the manifest (checked by test/manifest.test.js).
export const DEFAULT_CONFIG = {
  // Sent as the `apikey` header of every IBU request. Never logged.
  api_key: '',
  // Comma / space separated IBU IDs, e.g. "BTFRA21503199701, BTNOR11605199301".
  athletes: '',
  // 1 = World Cup / World Championships, 2 = IBU Cup / European Championships,
  // 3 = Junior.
  level: '1',
  // Language of the device text states (widgets and messages follow the
  // language of each Gladys user on their own).
  language: 'en',
  // IANA time zone the race start times are displayed in.
  timezone: 'Europe/Paris',
  // Minutes between two refreshes of the IBU data.
  refresh_interval: 15,
  // Minutes before a race start at which `race_starting_soon` fires.
  reminder_minutes: 30,
};

export const LEVELS = ['1', '2', '3'];

// Gladys can only be asked for one refresh every 5 minutes at the fastest: the
// IBU datacenter is a shared public service, be gentle with it.
export const MIN_REFRESH_MINUTES = 5;
export const MAX_REFRESH_MINUTES = 240;

const IBU_ID_PATTERN = /^[A-Z]{2}[A-Z]{3}\d{8,14}$/;

/**
 * Parse the "followed athletes" field: IBU IDs separated by commas, semicolons,
 * spaces or new lines. Invalid entries are dropped, duplicates removed.
 */
export function parseAthleteIds(raw) {
  const ids = String(raw ?? '')
    .toUpperCase()
    .split(/[\s,;]+/)
    .map((id) => id.trim())
    .filter((id) => IBU_ID_PATTERN.test(id));
  return [...new Set(ids)].slice(0, 20);
}

/**
 * The key is copied by hand from the browser developer tools: accept what
 * comes along with it — the header name ("apikey: ..."), quotes, spaces or a
 * line break — and keep only the value.
 */
export function cleanApiKey(raw) {
  return String(raw ?? '')
    .trim()
    .replace(/^apikey\s*[:=]\s*/i, '')
    .replace(/^["'\s]+|["'\s]+$/g, '')
    .replace(/\s+/g, '');
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(number)));
}

function isValidTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat('en', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Merge the user config with the defaults.
 * @param {Record<string, unknown>} raw config returned by the SDK
 */
export function normalizeConfig(raw = {}) {
  const level = String(raw.level ?? DEFAULT_CONFIG.level);
  const timezone = String(raw.timezone ?? '').trim() || DEFAULT_CONFIG.timezone;
  return {
    ...DEFAULT_CONFIG,
    ...raw,
    api_key: cleanApiKey(raw.api_key),
    athletes: String(raw.athletes ?? ''),
    athleteIds: parseAthleteIds(raw.athletes),
    level: LEVELS.includes(level) ? level : DEFAULT_CONFIG.level,
    language: normalizeLanguage(raw.language ?? DEFAULT_CONFIG.language),
    timezone: isValidTimeZone(timezone) ? timezone : DEFAULT_CONFIG.timezone,
    refresh_interval: clampNumber(
      raw.refresh_interval,
      DEFAULT_CONFIG.refresh_interval,
      MIN_REFRESH_MINUTES,
      MAX_REFRESH_MINUTES,
    ),
    reminder_minutes: clampNumber(raw.reminder_minutes, DEFAULT_CONFIG.reminder_minutes, 1, 1440),
  };
}
