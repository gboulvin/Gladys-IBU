import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import {
  FEATURES,
  athleteIds,
  buildDevices,
  buildStates,
  calendarIds,
  ibuIdOfDevice,
  publishStates,
} from '../src/devices.js';
import { normalizeConfig } from '../src/config.js';
import { FOLLOWED, FOLLOWED_2 } from './fixtures.js';
import { refreshedService } from './helpers.js';

test('Gladys accepts the discovered devices', async () => {
  const gladys = createFakeGladys();
  const { service, config } = await refreshedService();
  const devices = buildDevices(gladys, config, service);
  // 1 calendar + 2 standings + 2 athletes.
  assert.equal(devices.length, 5);
  await gladys.publishDiscoveredDevices(devices);
  assert.equal(gladys.fake.discoveredDevices.length, 5);
  assert.ok(devices.some((d) => d.name === 'Biathlete Emilien Jacquelin'));
});

test('every feature declares a numeric min and max (NOT NULL columns in Gladys)', async () => {
  // The fake Gladys accepts a feature without min/max, the real core answers
  // 422 "t_device_feature.min cannot be null" when the user creates the device.
  const gladys = createFakeGladys();
  const { service, config } = await refreshedService();
  for (const device of buildDevices(gladys, config, service)) {
    for (const feature of device.features) {
      assert.ok(Number.isFinite(feature.min), `${feature.external_id}: min`);
      assert.ok(Number.isFinite(feature.max), `${feature.external_id}: max`);
      assert.ok(feature.min <= feature.max, `${feature.external_id}: min <= max`);
    }
  }
});

test('device names follow the configured language', async () => {
  const gladys = createFakeGladys();
  const { service, config } = await refreshedService();
  const fr = buildDevices(gladys, { ...config, language: 'fr' }, service);
  assert.equal(fr[0].name, 'Calendrier biathlon');
  assert.equal(fr[1].name, 'Classement biathlon — Hommes');
  const de = buildDevices(gladys, { ...config, language: 'de' }, service);
  assert.equal(de[2].name, 'Biathlon-Wertung — Damen');
});

test('devices exist before the first refresh, without athlete names', () => {
  const gladys = createFakeGladys();
  const config = normalizeConfig({ athletes: FOLLOWED });
  const devices = buildDevices(gladys, config, null);
  assert.equal(devices.length, 4);
  assert.equal(devices[3].name, `Biathlete ${FOLLOWED}`);
});

test('Gladys accepts the published states', async () => {
  const gladys = createFakeGladys();
  const { service, config } = await refreshedService();
  await publishStates(gladys, config, service);
  const states = gladys.fake.states;
  const byFeature = Object.fromEntries(states.map((s) => [s.device_feature_external_id, s]));
  const calendar = calendarIds(gladys);
  assert.match(
    byFeature[calendar.feature(FEATURES.NEXT_RACE)].text,
    /^Pursuit 10 km — Women, Hochfilzen/,
  );
  assert.equal(byFeature[calendar.feature(FEATURES.MINUTES_TO_NEXT_RACE)].state, 20);
  assert.match(byFeature[calendar.feature(FEATURES.LAST_WINNER)].text, /Dale-Skjevdal \(NOR\)/);
  const athlete = athleteIds(gladys, FOLLOWED);
  assert.equal(byFeature[athlete.feature(FEATURES.RANK)].state, 2);
  assert.equal(byFeature[athlete.feature(FEATURES.SHOOTING)].state, 90);
});

test('unchanged states are not re-published', async () => {
  const gladys = createFakeGladys();
  const { service, config } = await refreshedService();
  const first = await publishStates(gladys, config, service);
  const second = await publishStates(gladys, config, service);
  assert.ok(first.count > 0);
  assert.equal(second.count, 0);
});

test('an athlete device id maps back to its IBU ID', () => {
  const gladys = createFakeGladys();
  const id = athleteIds(gladys, FOLLOWED_2).device;
  assert.equal(ibuIdOfDevice(gladys, id), FOLLOWED_2);
  assert.equal(ibuIdOfDevice(gladys, calendarIds(gladys).device), null);
  assert.equal(ibuIdOfDevice(gladys, undefined), null);
});

test('states only carry finite numbers or texts', async () => {
  const gladys = createFakeGladys();
  const { service, config } = await refreshedService();
  for (const state of buildStates(gladys, config, service)) {
    assert.ok(
      (typeof state.state === 'number' && Number.isFinite(state.state)) ||
        typeof state.text === 'string',
    );
    if (state.text !== undefined) assert.ok(state.text.length <= 250);
  }
});
