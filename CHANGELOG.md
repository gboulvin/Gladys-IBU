# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

### Fixed

- Adding a device failed with "HTTP 422 — t_device_feature.min cannot be
  null": the text features (next race, last winner, leader, last result) now
  declare their `min` and `max`.
- The IBU API key is cleaned when pasted with its header name (`apikey: …`),
  quotes, spaces or a line break, which made the IBU API answer 401.

## [1.0.0] - 2026-11-15

### Added

- First release of the Biathlon IBU integration, built from the official
  Gladys JavaScript integration template (SDK 0.16, Gladys 5.1 or later).
- Data of the IBU datacenter (biathlonresults.com) for the World Cup, the IBU
  Cup or the Junior level, read with the user's own API key (`secret` field,
  sent only to biathlonresults.com, never logged). The Configuration screen
  explains how to get a personal key or read the one of the public website.
- Devices: biathlon calendar (next race, minutes to the next race, last
  winner), overall standings for men and women (leader, points), and one
  device per followed athlete (overall rank and points, shooting accuracy of
  the season — total, prone, standing — last race rank and result).
- Dashboard widgets: next races, standings (overall, sprint, pursuit,
  individual, mass start, nations cup), athlete card, last results podium.
- Scene triggers: race starting soon, race results, result of a followed
  athlete, new overall leader. Each fires once, even across restarts.
- Scene actions: next race, athlete statistics, standings leader, refresh.
- Configuration buttons: test the IBU connection, refresh now, find an athlete
  by name (gives the IBU ID to follow).
- English, French, German and Spanish everywhere: manifest, widgets, messages,
  device names and documentation (`docs/en.md`, `fr.md`, `de.md`, `es.md`).
- Cloud transport tag: the integration only talks to the IBU servers.
- `SECURITY.md`, `CLAUDE.md`, CI (format, lint, tests on Node 22 and 24, Docker
  build), multi-arch image release and GitHub Releases.

[Unreleased]: https://github.com/gboulvin/Gladys-IBU/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/gboulvin/Gladys-IBU/releases/tag/v1.0.0
