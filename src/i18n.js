// -----------------------------------------------------------------------------
// Internationalization.
//
// Every user-facing text is a multi-language object `{ en, fr, de, es }`: the
// Gladys core (manifest texts, widget contents, action messages, toasts) picks
// the language of the user itself, with `en` as the fallback. Device text
// states are plain strings (Gladys stores one value per feature): they are
// rendered in the language chosen in the configuration with `pick()`.
// -----------------------------------------------------------------------------

export const LANGUAGES = ['en', 'fr', 'de', 'es'];
export const DEFAULT_LANGUAGE = 'en';

const MESSAGES = {
  // --- Genders --------------------------------------------------------------
  gender_men: { en: 'Men', fr: 'Hommes', de: 'Herren', es: 'Hombres' },
  gender_women: { en: 'Women', fr: 'Femmes', de: 'Damen', es: 'Mujeres' },
  gender_mixed: { en: 'Mixed', fr: 'Mixte', de: 'Mixed', es: 'Mixto' },

  // --- Disciplines ----------------------------------------------------------
  discipline_sprint: { en: 'Sprint', fr: 'Sprint', de: 'Sprint', es: 'Sprint' },
  discipline_pursuit: { en: 'Pursuit', fr: 'Poursuite', de: 'Verfolgung', es: 'Persecución' },
  discipline_individual: {
    en: 'Individual',
    fr: 'Individuel',
    de: 'Einzel',
    es: 'Individual',
  },
  discipline_short_individual: {
    en: 'Short individual',
    fr: 'Individuel court',
    de: 'Verkürztes Einzel',
    es: 'Individual corto',
  },
  discipline_mass_start: {
    en: 'Mass start',
    fr: 'Mass start',
    de: 'Massenstart',
    es: 'Salida en masa',
  },
  discipline_relay: { en: 'Relay', fr: 'Relais', de: 'Staffel', es: 'Relevo' },
  discipline_single_mixed_relay: {
    en: 'Single mixed relay',
    fr: 'Relais mixte simple',
    de: 'Single-Mixed-Staffel',
    es: 'Relevo mixto simple',
  },
  discipline_mixed_relay: {
    en: 'Mixed relay',
    fr: 'Relais mixte',
    de: 'Mixed-Staffel',
    es: 'Relevo mixto',
  },
  discipline_other: { en: 'Other', fr: 'Autre', de: 'Andere', es: 'Otra' },

  // --- Cups -----------------------------------------------------------------
  cup_overall: { en: 'Overall', fr: 'Général', de: 'Gesamt', es: 'General' },
  cup_nations: { en: 'Nations', fr: 'Nations', de: 'Nationen', es: 'Naciones' },

  // --- Generic --------------------------------------------------------------
  none: { en: 'None', fr: 'Aucune', de: 'Keine', es: 'Ninguna' },
  no_upcoming_race: {
    en: 'No upcoming race',
    fr: 'Aucune course à venir',
    de: 'Kein bevorstehendes Rennen',
    es: 'Ninguna carrera próxima',
  },
  no_standings: {
    en: 'No standings available yet',
    fr: 'Aucun classement disponible pour le moment',
    de: 'Noch keine Wertung verfügbar',
    es: 'Aún no hay clasificación disponible',
  },
  no_results: {
    en: 'No results available yet',
    fr: 'Aucun résultat disponible pour le moment',
    de: 'Noch keine Ergebnisse verfügbar',
    es: 'Aún no hay resultados disponibles',
  },
  not_configured: {
    en: 'Enter your IBU API key in the configuration.',
    fr: "Saisissez votre clé d'API IBU dans la configuration.",
    de: 'Geben Sie Ihren IBU-API-Schlüssel in der Konfiguration ein.',
    es: 'Introduzca su clave de API de la IBU en la configuración.',
  },
  data_unavailable: {
    en: 'IBU data unavailable, check the integration logs.',
    fr: "Données IBU indisponibles, consultez les logs de l'intégration.",
    de: 'IBU-Daten nicht verfügbar, prüfen Sie die Integrationsprotokolle.',
    es: 'Datos de la IBU no disponibles, consulte los registros de la integración.',
  },
  unknown_athlete: {
    en: 'This athlete is not followed by the integration.',
    fr: "Cet athlète n'est pas suivi par l'intégration.",
    de: 'Dieser Athlet wird von der Integration nicht verfolgt.',
    es: 'La integración no sigue a este atleta.',
  },
  refreshed: {
    en: 'Biathlon data refreshed.',
    fr: 'Données biathlon actualisées.',
    de: 'Biathlon-Daten aktualisiert.',
    es: 'Datos de biatlón actualizados.',
  },
  connection_ok: {
    en: 'IBU API reachable: {seasons} seasons, current one {season}.',
    fr: 'API IBU joignable : {seasons} saisons, saison en cours {season}.',
    de: 'IBU-API erreichbar: {seasons} Saisons, aktuelle Saison {season}.',
    es: 'API de la IBU accesible: {seasons} temporadas, temporada actual {season}.',
  },
  connection_unauthorized: {
    en: 'The IBU API refused the key (401): check the API key.',
    fr: "L'API IBU a refusé la clé (401) : vérifiez la clé d'API.",
    de: 'Die IBU-API hat den Schlüssel abgelehnt (401): Prüfen Sie den API-Schlüssel.',
    es: 'La API de la IBU rechazó la clave (401): compruebe la clave de API.',
  },
  search_none: {
    en: 'No athlete found for "{name}".',
    fr: 'Aucun athlète trouvé pour « {name} ».',
    de: 'Kein Athlet für „{name}“ gefunden.',
    es: 'Ningún atleta encontrado para «{name}».',
  },
  search_found: {
    en: 'Copy the IBU ID into "Followed athletes": {list}',
    fr: "Copiez l'IBU ID dans « Athlètes suivis » : {list}",
    de: 'Kopieren Sie die IBU-ID in „Verfolgte Athleten“: {list}',
    es: 'Copie el IBU ID en «Atletas seguidos»: {list}',
  },

  // --- Device / widget labels ----------------------------------------------
  next_race: {
    en: 'Next race',
    fr: 'Prochaine course',
    de: 'Nächstes Rennen',
    es: 'Próxima carrera',
  },
  next_races: {
    en: 'Next races',
    fr: 'Prochaines courses',
    de: 'Nächste Rennen',
    es: 'Próximas carreras',
  },
  minutes_to_next_race: {
    en: 'Minutes to next race',
    fr: 'Minutes avant la prochaine course',
    de: 'Minuten bis zum nächsten Rennen',
    es: 'Minutos hasta la próxima carrera',
  },
  last_winner: {
    en: 'Last winner',
    fr: 'Dernier vainqueur',
    de: 'Letzter Sieger',
    es: 'Último ganador',
  },
  leader: { en: 'Leader', fr: 'Leader', de: 'Führender', es: 'Líder' },
  leader_points: {
    en: 'Leader points',
    fr: 'Points du leader',
    de: 'Punkte des Führenden',
    es: 'Puntos del líder',
  },
  rank: { en: 'Rank', fr: 'Classement', de: 'Platz', es: 'Puesto' },
  points: { en: 'Points', fr: 'Points', de: 'Punkte', es: 'Puntos' },
  shooting: { en: 'Shooting', fr: 'Tir', de: 'Schießen', es: 'Tiro' },
  prone: { en: 'Prone', fr: 'Couché', de: 'Liegend', es: 'Tendido' },
  standing: { en: 'Standing', fr: 'Debout', de: 'Stehend', es: 'De pie' },
  last_race: { en: 'Last race', fr: 'Dernière course', de: 'Letztes Rennen', es: 'Última carrera' },
  last_rank: {
    en: 'Last race rank',
    fr: 'Rang dernière course',
    de: 'Platz letztes Rennen',
    es: 'Puesto última carrera',
  },
  races: { en: 'Races', fr: 'Courses', de: 'Rennen', es: 'Carreras' },
  misses: { en: 'misses', fr: 'fautes', de: 'Fehler', es: 'fallos' },
  season: {
    en: 'Season {season}',
    fr: 'Saison {season}',
    de: 'Saison {season}',
    es: 'Temporada {season}',
  },
  season_as_of: {
    en: 'Season {season} — as of {date}',
    fr: 'Saison {season} — au {date}',
    de: 'Saison {season} — Stand {date}',
    es: 'Temporada {season} — a fecha de {date}',
  },
  podium_of: {
    en: 'Podium — {race}',
    fr: 'Podium — {race}',
    de: 'Podium — {race}',
    es: 'Podio — {race}',
  },
  live: { en: 'LIVE', fr: 'EN DIRECT', de: 'LIVE', es: 'EN DIRECTO' },
  in_minutes: {
    en: 'in {minutes} min',
    fr: 'dans {minutes} min',
    de: 'in {minutes} Min.',
    es: 'en {minutes} min',
  },
  refresh: { en: 'Refresh', fr: 'Actualiser', de: 'Aktualisieren', es: 'Actualizar' },
  calendar_device: {
    en: 'Biathlon calendar',
    fr: 'Calendrier biathlon',
    de: 'Biathlon-Kalender',
    es: 'Calendario de biatlón',
  },
  standings_device: {
    en: 'Biathlon standings — {gender}',
    fr: 'Classement biathlon — {gender}',
    de: 'Biathlon-Wertung — {gender}',
    es: 'Clasificación de biatlón — {gender}',
  },
  athlete_device: {
    en: 'Biathlete {name}',
    fr: 'Biathlète {name}',
    de: 'Biathlet {name}',
    es: 'Biatleta {name}',
  },
  shooting_accuracy: {
    en: 'Shooting accuracy',
    fr: 'Réussite au tir',
    de: 'Trefferquote',
    es: 'Precisión de tiro',
  },
  prone_accuracy: {
    en: 'Prone accuracy',
    fr: 'Réussite couché',
    de: 'Trefferquote liegend',
    es: 'Precisión tendido',
  },
  standing_accuracy: {
    en: 'Standing accuracy',
    fr: 'Réussite debout',
    de: 'Trefferquote stehend',
    es: 'Precisión de pie',
  },
  last_result: {
    en: 'Last result',
    fr: 'Dernier résultat',
    de: 'Letztes Ergebnis',
    es: 'Último resultado',
  },
  world_cup_rank: {
    en: 'Overall rank',
    fr: 'Rang au général',
    de: 'Gesamtplatz',
    es: 'Puesto en la general',
  },
  world_cup_points: {
    en: 'Overall points',
    fr: 'Points au général',
    de: 'Gesamtpunkte',
    es: 'Puntos en la general',
  },
};

/**
 * Multi-language object of a message, `{placeholders}` substituted. Values of
 * `vars` may themselves be multi-language objects (a discipline label inside a
 * sentence): each language takes its own translation.
 * @param {keyof MESSAGES} key
 * @param {Record<string, string | number | Record<string, string>>} [vars]
 * @returns {{ en: string, fr: string, de: string, es: string }}
 */
export function t(key, vars = {}) {
  const message = MESSAGES[key];
  if (!message) {
    throw new Error(`Unknown message key: ${key}`);
  }
  const result = {};
  for (const lang of LANGUAGES) {
    result[lang] = message[lang].replace(/\{(\w+)\}/g, (match, name) => {
      if (!(name in vars)) {
        return match;
      }
      const value = vars[name];
      return value !== null && typeof value === 'object' ? pick(value, lang) : String(value);
    });
  }
  return result;
}

/**
 * One language out of a multi-language object (or a plain string), with the
 * English fallback.
 */
export function pick(text, language = DEFAULT_LANGUAGE) {
  if (text === null || text === undefined) {
    return '';
  }
  if (typeof text !== 'object') {
    return String(text);
  }
  return text[normalizeLanguage(language)] ?? text.en ?? '';
}

/** `fr-FR` -> `fr`; an unsupported language falls back to English. */
export function normalizeLanguage(language) {
  const short = String(language ?? '')
    .slice(0, 2)
    .toLowerCase();
  return LANGUAGES.includes(short) ? short : DEFAULT_LANGUAGE;
}

/** BCP 47 locale used to format dates in a language. */
export function localeOf(language) {
  return { en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES' }[normalizeLanguage(language)];
}

/**
 * Format a date in a language and a time zone: "Sat 29 Nov, 10:15".
 * @param {Date | string} date
 */
export function formatDateTime(date, language, timeZone) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) {
    return '';
  }
  try {
    return new Intl.DateTimeFormat(localeOf(language), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone,
    }).format(value);
  } catch {
    // Unknown time zone in the configuration: fall back to UTC.
    return new Intl.DateTimeFormat(localeOf(language), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }).format(value);
  }
}

/** Same as formatDateTime, in every language. */
export function formatDateTimeAll(date, timeZone) {
  return Object.fromEntries(LANGUAGES.map((lang) => [lang, formatDateTime(date, lang, timeZone)]));
}

/** Short date "29 Nov 2026" in a language. */
export function formatDate(date, language, timeZone) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) {
    return '';
  }
  try {
    return new Intl.DateTimeFormat(localeOf(language), { dateStyle: 'medium', timeZone }).format(
      value,
    );
  } catch {
    return new Intl.DateTimeFormat(localeOf(language), {
      dateStyle: 'medium',
      timeZone: 'UTC',
    }).format(value);
  }
}
