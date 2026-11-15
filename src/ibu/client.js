// -----------------------------------------------------------------------------
// HTTP client of the IBU datacenter API (the API behind biathlonresults.com).
//
// Every request carries the user's key in the `apikey` header. The key is a
// secret of the configuration: it is never logged, never put in a URL and never
// sent anywhere but to the IBU host below.
//
// Node 22+ ships `fetch`: no HTTP dependency. Tests inject their own `fetch`
// and never touch the network.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';

const logger = createLogger({ name: 'ibu-api' });

export const IBU_API_BASE_URL = 'https://biathlonresults.com/modules/sportapi/api/';
const REQUEST_TIMEOUT_MS = 15_000;

/** Error of an IBU request, carrying the HTTP status (0 = network error). */
export class IbuApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'IbuApiError';
    this.status = status;
  }

  get unauthorized() {
    return this.status === 401 || this.status === 403;
  }
}

export class IbuClient {
  /**
   * @param {{ apiKey?: string, fetch?: typeof fetch, baseUrl?: string }} options
   */
  constructor({
    apiKey = '',
    fetch: fetchImpl = globalThis.fetch,
    baseUrl = IBU_API_BASE_URL,
  } = {}) {
    this.apiKey = apiKey;
    this.fetch = fetchImpl;
    this.baseUrl = baseUrl;
  }

  get hasKey() {
    return this.apiKey.length > 0;
  }

  /**
   * GET one endpoint and parse its JSON body.
   * @param {string} endpoint e.g. 'Events'
   * @param {Record<string, string | number>} [params]
   */
  async get(endpoint, params = {}) {
    const url = new URL(endpoint, this.baseUrl);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
    const headers = { accept: 'application/json' };
    if (this.hasKey) {
      headers.apikey = this.apiKey;
    }
    logger.debug(`GET ${url.pathname}${url.search}`);
    let response;
    try {
      response = await this.fetch(url, {
        headers,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      throw new IbuApiError(`IBU ${endpoint}: ${err.message}`, 0);
    }
    if (!response.ok) {
      throw new IbuApiError(`IBU ${endpoint}: HTTP ${response.status}`, response.status);
    }
    const text = await response.text();
    if (text.length === 0) {
      return null;
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new IbuApiError(`IBU ${endpoint}: invalid JSON`, response.status);
    }
  }

  // --- Endpoints -------------------------------------------------------------
  // Public (no key needed today, but the key is sent anyway).

  seasons() {
    return this.get('Seasons');
  }

  // Need the key.

  events(seasonId, level) {
    return this.get('Events', { SeasonId: seasonId, Level: level });
  }

  competitions(eventId) {
    return this.get('Competitions', { EventId: eventId });
  }

  results(raceId) {
    return this.get('Results', { RaceId: raceId });
  }

  cups(seasonId) {
    return this.get('Cups', { SeasonId: seasonId });
  }

  cupResults(cupId) {
    return this.get('CupResults', { CupId: cupId });
  }

  athleteBio(ibuId) {
    return this.get('CISBios', { IBUId: ibuId });
  }

  athleteResults(ibuId) {
    return this.get('AllResults', { IBUId: ibuId });
  }

  searchAthletes(familyName, givenName = '') {
    return this.get('Athletes', { FamilyName: familyName, GivenName: givenName });
  }
}
