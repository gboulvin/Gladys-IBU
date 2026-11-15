import { normalizeConfig } from '../src/config.js';
import { BiathlonService } from '../src/service.js';
import { MemoryStore } from '../src/store.js';
import { API_KEY, FOLLOWED, FOLLOWED_2, NOW, createFakeFetch } from './fixtures.js';

export const configured = (extra = {}) =>
  normalizeConfig({ api_key: API_KEY, athletes: `${FOLLOWED}, ${FOLLOWED_2}`, ...extra });

/**
 * A configured service over the fixtures. `memory` seeds the persistent
 * memory (an initialized memory makes the first refresh fire its events).
 */
export function createService({ config = configured(), memory, now = NOW, overrides } = {}) {
  const fetch = createFakeFetch(overrides);
  const store = new MemoryStore(memory);
  let clock = now;
  const service = new BiathlonService({ store, fetch, now: () => clock });
  service.configure(config);
  return {
    service,
    fetch,
    store,
    config,
    setNow: (date) => {
      clock = date;
    },
  };
}

/** A service already refreshed once. */
export async function refreshedService(options) {
  const context = createService(options);
  context.events = await context.service.refresh();
  return context;
}
