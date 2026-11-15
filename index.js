// -----------------------------------------------------------------------------
// Entry point of the Biathlon-IBU Gladys external integration.
//
// Role of this file: wire the SDK to the integration modules. It only
//   1. instantiates the SDK (connection, auth, reconnection: handled for you);
//   2. registers the event handlers BEFORE connect();
//   3. connects, then refreshes the IBU data at the configured interval.
//
// The Gladys supervisor injects GLADYS_HOST_API_URL, GLADYS_INTEGRATION_TOKEN
// and GLADYS_INTEGRATION_SELECTOR: `new GladysIntegration()` reads them.
// -----------------------------------------------------------------------------

import { GladysIntegration, logger } from '@gladysassistant/integration-sdk';
import { normalizeConfig } from './src/config.js';
import { BiathlonService } from './src/service.js';
import { FileStore } from './src/store.js';
import { buildDevices, publishStates } from './src/devices.js';
import { publishSceneEvents } from './src/triggers.js';
import { SCENE_ACTIONS } from './src/scenes.js';
import { WIDGETS, handleWidgetAction, refreshWidgets } from './src/widgets.js';
import { CONFIG_ACTIONS } from './src/actions.js';
import { t } from './src/i18n.js';

const gladys = new GladysIntegration();
const service = new BiathlonService({ store: new FileStore() });

let config = normalizeConfig();
let refreshTimer = null;
let refreshing = null;

service.configure(config);

/**
 * Refresh the IBU data, publish the states and the scene events, nudge the
 * widgets. Concurrent calls share the same run.
 */
function refresh() {
  if (!refreshing) {
    refreshing = runRefresh().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

async function runRefresh() {
  if (!service.isConfigured) {
    await gladys.setConnectionStatus(false, t('not_configured')).catch(() => {});
    refreshWidgets(gladys);
    return;
  }
  try {
    const events = await service.refresh();
    // The athlete names are known after the first refresh: re-publish the
    // devices (idempotent upsert by external_id) so they carry them.
    await gladys.publishDiscoveredDevices(buildDevices(gladys, config, service));
    await publishStates(gladys, config, service);
    await publishSceneEvents(gladys, events, config);
    await gladys.setConnectionStatus(true);
  } catch (err) {
    logger.error('IBU refresh failed', err);
    await gladys
      .setConnectionStatus(
        false,
        err.unauthorized ? t('connection_unauthorized') : t('data_unavailable'),
      )
      .catch(() => {});
    throw err;
  } finally {
    refreshWidgets(gladys);
  }
}

function scheduleRefresh() {
  stopRefresh();
  refresh().catch(() => {});
  refreshTimer = setInterval(() => {
    refresh().catch(() => {});
  }, config.refresh_interval * 60_000);
}

function stopRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

// --- Discovery -----------------------------------------------------------------
gladys.onScanRequest(async () => {
  logger.info('onScanRequest -> publishing discovered devices');
  await gladys.publishDiscoveredDevices(buildDevices(gladys, config, service));
});

// --- Configuration screen buttons ---------------------------------------------
for (const [key, handler] of Object.entries(CONFIG_ACTIONS)) {
  gladys.onAction(key, (fields) => handler({ fields, config, service, refresh }));
}

// --- Scene actions -------------------------------------------------------------
// Scene TRIGGERS need no handler: they are published after each refresh (see
// src/triggers.js).
for (const [key, handler] of Object.entries(SCENE_ACTIONS)) {
  gladys.onSceneAction(key, (fields) => handler(gladys, { fields, config, service, refresh }));
}

// --- Dashboard widgets ---------------------------------------------------------
for (const [key, widget] of Object.entries(WIDGETS)) {
  gladys.onWidgetGet(key, (request) => widget.get(gladys, { ...request, config, service }));
  gladys.onWidgetAction(key, (actionKey) => handleWidgetAction(actionKey, { refresh }));
}

// --- Configuration updated by the user -----------------------------------------
gladys.onConfigUpdated(async (newConfig) => {
  logger.info('onConfigUpdated -> new configuration received');
  config = normalizeConfig(newConfig);
  service.configure(config);
  await gladys.publishDiscoveredDevices(buildDevices(gladys, config, service));
  // The interval may have changed: restart the loop, which refreshes now.
  scheduleRefresh();
});

// --- Connection lifecycle ------------------------------------------------------
gladys.on('connected', async () => {
  try {
    config = normalizeConfig(await gladys.getConfig());
    service.configure(config);
    await gladys.publishDiscoveredDevices(buildDevices(gladys, config, service));
    scheduleRefresh();
  } catch (err) {
    logger.error('Post-connection initialization failed', err);
    await gladys.setConnectionStatus(false, t('data_unavailable')).catch(() => {});
  }
});

gladys.on('disconnected', () => {
  stopRefresh();
});

gladys.handleShutdown((signal) => {
  logger.info(`Received ${signal} -> graceful shutdown`);
  stopRefresh();
});

// --- Startup -------------------------------------------------------------------
logger.info('Starting the Biathlon-IBU integration...');
gladys.connect().catch((err) => {
  logger.error('Initial connection failed', err);
  process.exit(1);
});
