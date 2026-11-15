# Biathlon IBU — Gladys Assistant integration

External integration for [Gladys Assistant](https://gladysassistant.com) that
brings the official data of the **International Biathlon Union** (IBU
datacenter, the data behind [biathlonresults.com](https://www.biathlonresults.com))
into your home automation: dates and times of the next races, World Cup / IBU
Cup standings, race results and shooting statistics.

Built from the official
[JavaScript integration template](https://github.com/GladysAssistant/integration-template-js)
with the SDK
[`@gladysassistant/integration-sdk`](https://github.com/GladysAssistant/integration-sdk-js).

- **Transport:** `cloud` (the data comes from the IBU servers, nothing runs on
  your LAN).
- **Languages:** English, French, German, Spanish.
- **Requires:** Gladys 5.1.0 or later, an IBU API key (see below).

## Features

| Surface        | What you get                                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Devices        | Biathlon calendar (next race, minutes to it, last winner) · standings men / women (leader, points) · one device per followed athlete  |
| Athlete device | Overall rank and points, shooting accuracy of the season (total, prone, standing), last race rank and result                          |
| Widgets        | Next races (LIVE badge) · standings (overall, sprint, pursuit, individual, mass start, nations) · athlete card · last results podium  |
| Scene triggers | Race starting soon · race results · result of a followed athlete (filter on win / podium / top 10…) · new overall leader (yellow bib) |
| Scene actions  | Get the next race · get an athlete's statistics · get a standings leader · refresh the data                                           |
| Config buttons | Test the IBU connection · refresh now · find an athlete (gives the IBU ID to follow)                                                  |

Full user documentation: [English](docs/en.md) · [Français](docs/fr.md) ·
[Deutsch](docs/de.md) · [Español](docs/es.md).

## The IBU API key

The IBU datacenter API answers only requests carrying an `apikey` header. The
integration ships **no key**: each user enters their own in the configuration
(a `secret` field). Either ask the IBU for a personal key, or copy the key the
public biathlonresults.com website sends from your browser (developer tools →
Network → a `sportapi` request → `apikey` request header). The steps are in the
Configuration screen and in the documentation. That website key belongs to the
IBU and may change; use it reasonably, for personal use.

The key is only ever sent to `biathlonresults.com`, never logged.

## How it works

```
index.js            SDK wiring + refresh loop (every 15 min by default, 5 min minimum)
src/ibu/client.js   IBU HTTP client (apikey header, 15 s timeout)
src/ibu/model.js    normalization of the IBU payloads, shooting statistics
src/service.js      refresh, cache, detection of the scene events
src/store.js        /data/biathlon-ibu.json: what was already announced
src/devices.js      devices + states          src/widgets.js   dashboard widgets
src/triggers.js     scene triggers            src/scenes.js    scene actions
src/actions.js      configuration buttons     src/i18n.js      en / fr / de / es
```

Shooting accuracy is computed from the athlete's individual races of the
current season (5 targets per stage, prone and standing split according to the
discipline: sprint P-S, individual P-S-P-S, pursuit and mass start P-P-S-S).
Relays are left out.

## Development

```bash
npm install
npm test               # node --test, no network (fake IBU API in test/fixtures.js)
npm run lint
npm run format:check
```

Run it against a Gladys instance:

```bash
GLADYS_HOST_API_URL="http://localhost:1443" \
GLADYS_INTEGRATION_TOKEN="<token>" \
GLADYS_INTEGRATION_SELECTOR="biathlon-ibu" \
DATA_DIR=./data LOG_LEVEL=debug \
npm start
```

Check the store admission rules: `npx github:GladysAssistant/integration-store .`

## Release

Describe the changes under `## [Unreleased]` in [`CHANGELOG.md`](CHANGELOG.md),
then **Actions → Release → Run workflow** (`patch`, `minor` or `major`): the
workflow bumps `package.json` and the manifest, tags, builds the
`linux/amd64` + `linux/arm64` image to `ghcr.io/gboulvin/gladys-ibu` and
publishes the GitHub Release.

The GHCR package must be **public** for Gladys to pull it, and the repository
carries the `gladys-assistant-integration` topic so the store indexer finds it.

## Disclaimer

The data belongs to the IBU. This project is not affiliated with, endorsed by
or connected to the International Biathlon Union.

## License

Apache-2.0
