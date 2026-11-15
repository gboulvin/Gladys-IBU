# Biathlon IBU

Follow biathlon in Gladys with the official data of the International
Biathlon Union (IBU datacenter, the data behind biathlonresults.com): dates and
times of the next races, World Cup / IBU Cup standings, race results and
shooting statistics of your favourite athletes.

This is a **cloud** integration: the data comes from the Internet, nothing
runs on your local network.

## 1. Get an IBU API key

The IBU datacenter only answers requests carrying an API key (`apikey`
header). Two ways to get one:

- **A personal key** — ask the IBU for access to its datacenter API (see
  [biathlonworld.com](https://www.biathlonworld.com/contact)). This is the
  cleanest option.
- **The key of the public website** — biathlonresults.com sends a key with
  every request your browser makes. To read it:
  1. open <https://www.biathlonresults.com> in a desktop browser (Chrome,
     Firefox, Edge);
  2. press **F12** to open the developer tools, then the **Network** tab;
  3. reload the page (**F5**);
  4. type `sportapi` in the filter field and click one of the requests
     (`Events`, `Competitions`…);
  5. in **Headers → Request headers**, copy the value of `apikey`.

  This key belongs to the IBU website and may change at any time: if the
  integration reports "The IBU API refused the key (401)", read it again. Use
  it reasonably, for your personal use only.

The key is stored by Gladys as a secret, sent only to biathlonresults.com and
never written to the logs.

## 2. Configure the integration

1. Open the **Configuration** tab of the integration.
2. Paste the **IBU API key**, then click **Test the IBU connection**.
3. **Followed athletes**: click **Find an athlete**, type a family name
   (e.g. `Jeanmonnot`, `Preuss`, `Bø`) and copy the IBU ID shown (e.g.
   `BTFRA21503199701`) into the field. Separate several IDs with commas (20 at
   most).
4. Pick the **competition level** (World Cup by default), the **language** of
   the device texts, your **time zone** (`Europe/Paris` by default), the
   **refresh interval** (15 minutes by default, 5 minimum) and the **race
   reminder** delay (30 minutes by default).
5. Save: the devices appear in the **Discovery** tab, ready to be added.

## Devices

- **Biathlon calendar** — next race (name, venue, date and time), minutes to
  the next race, last winner.
- **Biathlon standings — Men / Women** — overall leader and points.
- **Biathlete _name_** (one per followed athlete) — overall rank and points,
  shooting accuracy of the season (total, prone, standing, in %), last race
  rank and result.

Shooting accuracy is computed on the individual races of the current season
(sprint, pursuit, individual, mass start), 5 targets per shooting stage.
Relays are left out: their spare rounds do not compare.

## Dashboard widgets

- **Next biathlon races** — the next races with their date and time, a badge
  shortly before the start and a **LIVE** badge while a race runs. Settings:
  gender, number of races.
- **Biathlon standings** — overall, sprint, pursuit, individual, mass start or
  nations cup, men or women, followed athletes in green.
- **Biathlete** — one followed athlete: rank, points, shooting gauge, prone
  and standing accuracy, last race.
- **Last biathlon results** — podium of the last race, and where your
  followed athletes finished.

Widgets follow the language of each Gladys user.

## Scenes

Triggers (scene editor, **Integrations** category):

- **Biathlon race starting soon** — a race starts within the reminder delay.
  Filters: gender, discipline. Variables: `{{triggerEvent.data.race}}`,
  `location`, `start_time_local`, `minutes`…
- **Biathlon race results** — the results of a race are available.
  Variables: `winner`, `winner_nation`, `second`, `third`, `race`,
  `location`…
- **Result of a followed athlete** — a followed athlete finished a race.
  Filters: athlete, placement (victory, 2nd/3rd, top 10, 11th–40th, beyond).
  Variables: `athlete_name`, `rank`, `shootings` (e.g. `0+1+0+0`), `misses`,
  `behind`, `race`.
- **New overall leader** — the yellow bib changed hands. Variables: `leader`,
  `leader_nation`, `points`, `previous_leader`.

Actions:

- **Get the next biathlon race** — outputs `found`, `race`, `location`,
  `start_time_local`, `minutes_until`.
- **Get an athlete's statistics** — outputs `rank`, `points`,
  `shooting_accuracy`, `prone_accuracy`, `standing_accuracy`, `last_rank`…
- **Get a standings leader** — outputs `leader`, `nation`, `points`, `second`,
  `gap`.
- **Refresh the biathlon data** — reads the IBU data right now.

Example: _"Race starting soon" → send a message "{{triggerEvent.data.race}} in
{{triggerEvent.data.location}} starts at
{{triggerEvent.data.start_time_local}}" and turn the TV on._

Texts of scene variables use the language chosen in the configuration. A
detection fires once: the integration remembers what it already announced,
even across restarts. Right after installation, the first refresh only learns
the past and fires nothing.

## Troubleshooting

- **"Enter your IBU API key"** — the key field is empty.
- **"The IBU API refused the key (401)"** — the key is wrong or expired: get a
  new one (see step 1).
- **No races** — between seasons the calendar can be empty; check the
  competition level.
- Check the integration logs from the Gladys UI (`LOG_LEVEL=debug` for the
  full detail).

The data belongs to the IBU. This integration is not affiliated with the IBU.
