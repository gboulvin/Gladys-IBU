# CLAUDE.md

Project rules for coding assistants (Claude Code reads this file) and for human
contributors.

## What this is

**Biathlon IBU**, a Gladys Assistant **external integration**: a Node.js
service (Node 22+, ESM, no build step) that runs in its own sandboxed Docker
container and talks to Gladys through
[`@gladysassistant/integration-sdk`](https://github.com/GladysAssistant/integration-sdk-js),
its only runtime dependency. It reads the IBU datacenter API (the API behind
biathlonresults.com) and publishes devices, dashboard widgets, scene triggers
and scene actions. It started from the official JavaScript template.

## Commands

```bash
npm install
npm test                                  # node --test, the built-in runner
node --test test/service.test.js          # one file
node --test --test-name-pattern "widget"  # tests whose name matches
npm run lint                              # ESLint
npm run format:check                      # Prettier, as the CI runs it
npm run format                            # Prettier, fix in place
npx github:GladysAssistant/integration-store .   # store admission checks
```

The CI (`.github/workflows/ci.yml`) runs `format:check`, `lint` and `test` on
Node 22 and 24, and builds the Docker image: run the three commands before
pushing.

## Architecture

```
index.js                          SDK wiring only: handlers registered before connect(), refresh loop
src/ibu/client.js                 HTTP client of the IBU API (apikey header, timeouts, IbuApiError)
src/ibu/model.js                  pure normalization of the IBU payloads (races, results, standings, shooting stats)
src/service.js                    BiathlonService: refresh, cache, detection of the scene events
src/store.js                      persistent memory (/data/biathlon-ibu.json): what was already announced
src/devices.js                    discovery payload + states (calendar, standings, athletes)
src/triggers.js                   service detections -> publishSceneEvent (manifest `scene_triggers`)
src/scenes.js                     scene action handlers (manifest `scene_actions`)
src/widgets.js                    dashboard widget handlers (manifest `widgets`)
src/actions.js                    Configuration screen buttons (manifest `actions`)
src/i18n.js                       every user-facing text in en / fr / de / es, date formatting
src/config.js                     DEFAULT_CONFIG (mirrors the manifest defaults) + normalization
gladys-assistant-integration.json manifest: name, config_schema, actions, triggers, widgets...
docs/{en,fr,de,es}.md             user documentation, re-hosted by Gladys (en + fr mandatory)
test/                             node --test, fake IBU fetch (test/fixtures.js) + the SDK's fake Gladys
.github/scripts/release.mjs       release helpers (manifest bump, changelog), tested in test/
```

Data flow: `index.js` calls `refresh()` every `refresh_interval` minutes →
`BiathlonService.refresh()` reads the IBU API and returns the detections →
devices states (`publishChangedStates`), scene events (`publishSceneEvent`) and
a widget nudge (`requestWidgetRefresh`). Widgets and scene actions read the
service cache; they never trigger a full refresh themselves.

## Rules

- **The IBU API key is a secret.** It travels only in the `apikey` header to
  `biathlonresults.com`: never in a URL, a log line, an error message, a scene
  event, a widget or a test fixture of a real key. No key is shipped in the
  code: each user provides their own (the Configuration screen explains how).
- **Be gentle with the IBU servers.** 5 minutes minimum between refreshes,
  cached past events, athlete results re-read every 6 hours or after a race.
  Tests never touch the network: use `createFakeFetch()` from
  `test/fixtures.js`.
- **The IBU payloads are untyped and change without notice.** Read them only
  in `src/ibu/model.js`, defensively (several field names, typed fallbacks),
  and cover every new field with a fixture.
- **External ids are forever.** Devices are keyed on stable ids (`calendar:ibu`,
  `standings:<gender>`, `athlete:<ibu id>`), never on labels. The same goes for
  every key users store: manifest `config_schema`, `actions`, widget, trigger,
  trigger field/variable and scene action/output keys, feature keys.
- **A scene event fires once.** Every detection is remembered in the store
  (`finished`, `reminded`, `leaders`); the first refresh after installation
  only learns the past. Never fire a scene event from a scene action.
- **The container rootfs is read-only.** Write only under `/data`.
- **Versions belong to the Release workflow** (Actions → Release). Never edit
  `version` in `package.json` or in the manifest, nor the `docker_image` tag,
  by hand — except on the README's hand-pushed tag path, which bumps all three
  together before tagging. `test/manifest.test.js` checks they agree.
- **Changelog.** Every user-visible change adds a line under `## [Unreleased]`
  in `CHANGELOG.md` (`### Added`, `Changed`, `Fixed`, `Removed`, `Security`).
- **Four languages.** Every user-facing text exists in English, French, German
  and Spanish: manifest texts (`test/i18n.test.js` walks the whole manifest),
  `src/i18n.js` messages, and `docs/*.md`. Add a message to `src/i18n.js`
  rather than writing a literal string in a module.
- **Manifest.** Texts are multi-language objects, `label`, `description` and
  `placeholder` alike. The catalog `description` holds 10 to 100 characters
  per language. `widgets`, `scene_triggers` and `scene_actions` require
  `gladys_version >= 5.1.0`. `test/manifest.test.js` ties the manifest to the
  code (defaults, actions, triggers, scene actions, widgets): change both sides
  together. The transport tag is `cloud` only.
- **Style.** Prettier formats, ESLint catches mistakes. Comments explain why,
  in English.
