// -----------------------------------------------------------------------------
// Consistency checks between `gladys-assistant-integration.json` and the code.
// The manifest is validated by the store indexer, but nothing there can know
// which handlers the code actually registers — these tests keep both in sync.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { SCENE_ACTIONS } from '../src/scenes.js';
import { WIDGETS } from '../src/widgets.js';
import { CONFIG_ACTIONS } from '../src/actions.js';
import { SCENE_TRIGGER_KEYS } from '../src/triggers.js';
import { DEFAULT_CONFIG } from '../src/config.js';

const manifest = JSON.parse(
  await readFile(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
);
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

const allFields = [
  ...(manifest.config_schema ?? []),
  ...[
    ...(manifest.actions ?? []),
    ...(manifest.scene_triggers ?? []),
    ...(manifest.scene_actions ?? []),
  ].flatMap((item) => item.fields ?? []),
  ...(manifest.widgets ?? []).flatMap((widget) => widget.settings ?? []),
];

const keysOf = (list) => (list ?? []).map((entry) => entry.key);

function minGladysVersion() {
  const match = manifest.gladys_version.match(/>=\s*(\d+)\.(\d+)\.(\d+)/);
  assert.ok(match, 'gladys_version must declare a minimum version');
  return match.slice(1).map(Number);
}

function isAtLeast(version, required) {
  for (let i = 0; i < required.length; i += 1) {
    if (version[i] !== required[i]) {
      return version[i] > required[i];
    }
  }
  return true;
}

const sameKeys = (declared, handled, what) => {
  assert.deepEqual([...declared].sort(), [...handled].sort(), `${what}: manifest and code differ`);
};

test('every manifest action has a handler, and vice versa', () => {
  sameKeys(keysOf(manifest.actions), Object.keys(CONFIG_ACTIONS), 'actions');
});

test('every scene_actions key has a handler, and vice versa', () => {
  sameKeys(keysOf(manifest.scene_actions), Object.keys(SCENE_ACTIONS), 'scene_actions');
});

test('every widgets key has a content handler, and vice versa', () => {
  sameKeys(keysOf(manifest.widgets), Object.keys(WIDGETS), 'widgets');
  assert.ok(manifest.widgets.length <= 5, 'at most 5 widgets');
});

test('every scene trigger the code fires is declared, and vice versa', () => {
  sameKeys(keysOf(manifest.scene_triggers), SCENE_TRIGGER_KEYS, 'scene_triggers');
});

test('capabilities and categories require Gladys >= 5.1.0', () => {
  assert.ok(isAtLeast(minGladysVersion(), [5, 1, 0]), manifest.gladys_version);
  assert.ok(manifest.categories.length >= 1 && manifest.categories.length <= 3);
});

test('the integration is tagged cloud: it only talks to the IBU servers', () => {
  assert.deepEqual(manifest.transports, ['cloud']);
});

test('config_schema defaults stay consistent with DEFAULT_CONFIG', () => {
  for (const field of manifest.config_schema) {
    if (field.default !== undefined) {
      assert.equal(DEFAULT_CONFIG[field.key], field.default, `DEFAULT_CONFIG.${field.key}`);
    }
  }
  for (const key of Object.keys(DEFAULT_CONFIG)) {
    assert.ok(keysOf(manifest.config_schema).includes(key), `${key} is not in config_schema`);
  }
});

test('the API key is a secret field, required, without default', () => {
  const apiKey = manifest.config_schema.find((field) => field.key === 'api_key');
  assert.equal(apiKey.type, 'secret');
  assert.equal(apiKey.required, true);
  assert.equal(apiKey.default, undefined);
});

test('section fields are purely presentational and explain how to get a key', () => {
  const sections = manifest.config_schema.filter((f) => f.type === 'section');
  assert.ok(sections.length > 0);
  for (const section of sections) {
    assert.equal(section.required, undefined);
    assert.equal(section.default, undefined);
    assert.equal(section.placeholder, undefined);
    assert.ok(!(section.key in DEFAULT_CONFIG));
    for (const link of section.links ?? []) {
      assert.match(link.url, /^https:\/\//);
    }
  }
  assert.match(sections[0].description.en, /apikey/);
  assert.match(sections[0].description.fr, /apikey/);
});

test('dynamic selects declare a source and no static options', () => {
  for (const field of allFields.filter((f) => f.source !== undefined)) {
    assert.equal(field.source, 'devices');
    assert.equal(field.options, undefined, field.key);
  }
});

test('select defaults are among their options', () => {
  for (const field of allFields.filter((f) => f.type === 'select' && f.options)) {
    if (field.default !== undefined) {
      assert.ok(
        field.options.some((option) => option.value === field.default),
        `${field.key}: default ${field.default} is not an option`,
      );
    }
  }
});

test('the manifest version is the package version, and the image is tagged with it', () => {
  assert.equal(manifest.version, pkg.version);
  assert.ok(manifest.docker_image.endsWith(`:${manifest.version}`), manifest.docker_image);
});

test('the catalog description holds 10 to 100 characters per language', () => {
  for (const [lang, text] of Object.entries(manifest.description)) {
    assert.ok(text.length >= 10 && text.length <= 100, `description.${lang}: ${text.length}`);
  }
});

test('field placeholders are multi-language objects', () => {
  for (const field of allFields.filter((f) => f.placeholder !== undefined)) {
    assert.equal(typeof field.placeholder, 'object', field.key);
    assert.ok(field.placeholder.en, field.key);
  }
});

test('the user documentation exists in the four languages', async () => {
  for (const lang of ['en', 'fr', 'de', 'es']) {
    await access(new URL(`../docs/${lang}.md`, import.meta.url));
  }
});
