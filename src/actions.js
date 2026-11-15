// -----------------------------------------------------------------------------
// Manifest `actions`: the buttons of the Configuration screen. Each handler
// resolves the multi-language message displayed under its button; a thrown
// error is displayed too.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { t } from './i18n.js';

const logger = createLogger({ name: 'actions' });

function describeError(err) {
  if (err?.unauthorized) {
    return t('connection_unauthorized');
  }
  return t('data_unavailable');
}

export const CONFIG_ACTIONS = {
  async test_connection({ service }) {
    if (!service.isConfigured) {
      return t('not_configured');
    }
    try {
      const { count, label } = await service.testConnection();
      return t('connection_ok', { seasons: count, season: label || '-' });
    } catch (err) {
      logger.warn(`Connection test failed: ${err.message}`);
      return describeError(err);
    }
  },

  async refresh_now({ refresh }) {
    try {
      await refresh();
      return t('refreshed');
    } catch (err) {
      return describeError(err);
    }
  },

  async search_athlete({ fields, service }) {
    if (!service.isConfigured) {
      return t('not_configured');
    }
    const name = String(fields.name ?? '').trim();
    try {
      const found = await service.searchAthletes(name);
      if (found.length === 0) {
        return t('search_none', { name });
      }
      const list = found
        .slice(0, 8)
        .map(
          (athlete) =>
            `${athlete.name}${athlete.nation ? ` (${athlete.nation})` : ''} = ${athlete.ibuId}`,
        )
        .join(' ; ');
      return t('search_found', { list });
    } catch (err) {
      logger.warn(`Athlete search failed: ${err.message}`);
      return describeError(err);
    }
  },
};
