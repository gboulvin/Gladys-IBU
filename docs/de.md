# Biathlon IBU

Verfolgen Sie Biathlon in Gladys mit den offiziellen Daten der Internationalen
Biathlon-Union (IBU-Datacenter, die Daten von biathlonresults.com): Datum und
Uhrzeit der nächsten Rennen, Weltcup- / IBU-Cup-Wertungen, Rennergebnisse und
Schießstatistiken Ihrer Lieblingsathleten.

Dies ist eine **Cloud**-Integration: Die Daten kommen aus dem Internet, nichts
läuft in Ihrem lokalen Netzwerk.

## 1. Einen IBU-API-Schlüssel erhalten

Das IBU-Datacenter beantwortet nur Anfragen mit einem API-Schlüssel (Header
`apikey`). Zwei Möglichkeiten:

- **Ein persönlicher Schlüssel** — fragen Sie bei der IBU nach einem Zugang zur
  Datacenter-API (siehe
  [biathlonworld.com](https://www.biathlonworld.com/contact)). Das ist die
  sauberste Lösung.
- **Der Schlüssel der öffentlichen Website** — biathlonresults.com sendet bei
  jeder Anfrage Ihres Browsers einen Schlüssel mit. So lesen Sie ihn:
  1. öffnen Sie <https://www.biathlonresults.com> in einem Desktop-Browser;
  2. drücken Sie **F12** und öffnen Sie den Tab **Netzwerk**;
  3. laden Sie die Seite neu (**F5**);
  4. geben Sie `sportapi` in das Filterfeld ein und klicken Sie auf eine
     Anfrage (`Events`, `Competitions`…);
  5. kopieren Sie unter **Header → Anfrage-Header** den Wert von `apikey`.

  Dieser Schlüssel gehört zur IBU-Website und kann sich jederzeit ändern:
  Meldet die Integration „Die IBU-API hat den Schlüssel abgelehnt (401)“,
  lesen Sie ihn erneut aus. Nutzen Sie ihn maßvoll und nur privat.

Der Schlüssel wird von Gladys als Geheimnis gespeichert, nur an
biathlonresults.com gesendet und nie protokolliert.

## 2. Die Integration konfigurieren

1. Öffnen Sie den Tab **Konfiguration** der Integration.
2. Fügen Sie den **IBU-API-Schlüssel** ein und klicken Sie auf
   **IBU-Verbindung testen**.
3. **Verfolgte Athleten**: Klicken Sie auf **Athlet suchen**, geben Sie einen
   Nachnamen ein (z. B. `Preuss`, `Voigt`) und kopieren Sie die angezeigte
   IBU-ID in das Feld. Mehrere IDs durch Kommas trennen (höchstens 20).
4. Wählen Sie die **Wettkampfebene** (standardmäßig Weltcup), die **Sprache**
   der Gerätetexte, Ihre **Zeitzone**, das **Aktualisierungsintervall**
   (standardmäßig 15 Minuten, mindestens 5) und die **Rennerinnerung**
   (standardmäßig 30 Minuten).
5. Speichern: Die Geräte erscheinen im Tab **Erkennung**.

## Geräte

- **Biathlon-Kalender** — nächstes Rennen (Name, Ort, Datum und Uhrzeit),
  Minuten bis zum nächsten Rennen, letzter Sieger.
- **Biathlon-Wertung — Herren / Damen** — Gesamtführender und Punkte.
- **Biathlet _Name_** (einer pro verfolgtem Athleten) — Gesamtplatz und
  Punkte, Trefferquote der Saison (gesamt, liegend, stehend, in %), Platz und
  Ergebnis des letzten Rennens.

Die Trefferquote wird über die Einzelrennen der laufenden Saison berechnet
(Sprint, Verfolgung, Einzel, Massenstart), 5 Scheiben pro Schießeinlage.
Staffeln sind ausgenommen (Nachladepatronen). Es zählen nur beendete Rennen
der konfigurierten Wettkampfebene (standardmäßig Weltcup: keine IBU-Cup-,
nationalen oder Sommerrennen); die Zeile **Rennen** des Widgets zeigt ihre
Anzahl.

## Dashboard-Widgets

- **Nächste Biathlonrennen** — Datum und Uhrzeit, ein Hinweis kurz vor dem
  Start und **LIVE** während des Rennens.
- **Biathlon-Wertung** — Gesamt, Sprint, Verfolgung, Einzel, Massenstart oder
  Nationencup, Podium, Top 5 oder Top 10, verfolgte Athleten in Grün.
- **Biathlet** — ein verfolgter Athlet, gewählt über einen Teil seines Namens
  oder seine IBU-ID (leer: der erste verfolgte Athlet): Platz, Punkte,
  Trefferquote, liegend und stehend, letztes Rennen.
- **Letzte Biathlon-Ergebnisse** — Podium des letzten Rennens und Plätze der
  verfolgten Athleten.

## Szenen

Auslöser: **Biathlonrennen startet bald**, **Ergebnisse eines
Biathlonrennens**, **Ergebnis eines verfolgten Athleten**, **Neuer
Gesamtführender**. Aktionen: **Nächstes Biathlonrennen abrufen**,
**Statistik eines Athleten abrufen**, **Führenden einer Wertung abrufen**,
**Biathlon-Daten aktualisieren**. Die Variablen sind in der englischen
Dokumentation beschrieben.

## Fehlerbehebung

- **Wertung oder Statistik der Vorsaison** — bis zum ersten Rennen einer neuen
  Saison zeigen Wertung, Schießstatistik und letztes Rennen die Vorsaison; sie
  wechseln etwa 30 Minuten nach dem Start des ersten Rennens. Die Widgets
  Wertung und Biathlet zeigen die Saison an.
- **„Die IBU-API hat den Schlüssel abgelehnt (401)“** — Schlüssel falsch oder
  abgelaufen: neuen Schlüssel besorgen (Schritt 1).
- Prüfen Sie die Integrationsprotokolle in Gladys (`LOG_LEVEL=debug`).

Die Daten gehören der IBU. Diese Integration ist nicht mit der IBU verbunden.
