# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

### Fixed

- Athlete statistics (number of races, shooting accuracy, last race) counted
  every competition of the season the IBU lists for the athlete — IBU Cup,
  national championships, summer races — and a race still running. Only the
  finished races of the configured competition level count now.

## [1.1.1] - 2026-11-27

### Fixed

- The standings, the shooting statistics and the last race of the athletes
  stayed on the previous season (2025/2026) after the new one started: they
  followed the season the IBU flags as current for results, a flag the IBU
  flips late. They now move to the new season about 30 minutes after its first
  race starts, and the athletes are read again at once.

### Changed

- The standings and athlete widgets show the season they display.

## [1.1.0] - 2026-11-15

### Changed

- Standings widget: the number of athletes is now a list to pick from
  (podium, top 5, top 10). A widget list holds 10 rows at most.
- Athlete widget: the athlete is now typed (part of the name or the IBU ID,
  case and accents ignored; empty shows the first followed athlete) instead of
  picked in a list that also offered the calendar and standings devices.
  An athlete widget created with 1.0 shows the first followed athlete until its
  athlete is typed in its settings.

## [1.0.1] - 2026-11-15

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

[Unreleased]: https://github.com/gboulvin/Gladys-IBU/compare/v1.1.1...HEAD
[1.1.1]: https://github.com/gboulvin/Gladys-IBU/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/gboulvin/Gladys-IBU/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/gboulvin/Gladys-IBU/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/gboulvin/Gladys-IBU/releases/tag/v1.0.0
