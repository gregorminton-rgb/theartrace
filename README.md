# The Great Art Race - web prototype

A standalone, dependency-free browser build of *The Great Art Race* economy:
buy low in one city, sell high in another, mind the fakes and the bank.

This project was split out of the Unity project (`TheArtRace3/web`) so the
prototype can be developed, served and shipped on its own.

## Run it

The app is plain static files, but it must be served over `http://` (a
`file://` page can be blocked from loading the bundled data).

```powershell
# any static server works; Python is already installed here
python -m http.server 8080
# then open http://localhost:8080/
```

## Layout

| File | Role |
| --- | --- |
| `index.html` | screens, HUD, dock and the `<script>` tags |
| `styles.css` | 1920s gallery-parlour look |
| `data.js` | **generated** Unity data - do not edit by hand |
| `images.js` | **generated** image manifest - do not edit by hand |
| `engine.js` | pure data + maths layer: prices, markets, travel, bank, studio |
| `app.js` | DOM, state, day loop, dialogs, city backdrops, world map |
| `tools/cfgcheck.ps1` | cross-checks every `CFG.*` read against the export |
| `tools/syntax-check.js` | parses the scripts without needing Node |
| `tools/domcheck.ps1` | fails if `app.js` looks up an id that no element has |
| `tools/import-images.ps1` | writes web JPEGs + `images.js` from the master pictures |

## Where the numbers come from

Everything on screen is exported from the Unity project by
`TheArtRace3/tools/export-data.ps1`, which reads
`Assets/Resources/ArtRace/Data/*.asset` plus `EconomyConfig.asset` and writes
`data.js`. Re-run that exporter over there, then copy `data.js` into this
project.

### Web-only knobs

A handful of consequences of debt exist only in the prototype. They are
declared once in `WEB_ONLY_DEFAULTS` / `WEB_ONLY_DERIVED` in `engine.js` and
merged into `CFG` **only when the export does not supply the key**:

`startingReputation`, `loanGraceDays`, `loanPenaltyPerDay`,
`loanOverdueRepPenalty`, `debtCallAfterDays`, `debtCallSeizeArtworks`,
`debtCallReputationPenalty`, `crateSpacePurchaseLimit`.

The moment `EconomyConfig.cs` grows a field of the same name, the exporter
carries it and the default stops applying. The *Data Source* dialog in-game
lists the current state of this split.

## City backdrops

The parlour frame above the panel shows the current city. `app.js` looks the
picture up in `images.js` by city slug; when a city has no imported master yet
it falls back to a palette generated from the city's `theme`/`accent` colours,
so a missing file never leaves a hole in the screen.

```powershell
# regenerate images.js (reads new\ + hdArtwork\, never writes back to them)
powershell -NoProfile -ExecutionPolicy Bypass -File tools\import-images.ps1

# ...or also pull in the raw game screenshots (prefixed orig-)
powershell -NoProfile -ExecutionPolicy Bypass -File tools\import-images.ps1 -IncludeOriginals
```

The script keeps `images-report.txt` up to date with the sizes, the slug list
and which cities currently have a picture (`images.js` is the only thing the
app reads; the report is for humans). Not every slug is a city: the 29 plates
in `new\` also cover commodities, continents and trade scenes (`kaffee`,
`tabak`, `rio`, ...).

## World map

The *Travel* office draws the imported `hd-08-world-map` plate and pins every
place of the trade network onto it:

- **Plantations** (green) - the commodity sources: coffee, cocoa, tobacco, tea,
  textiles plus the colonial regions (`indien`, `java`, `brasilien`, ...).
- **Art-trade cities** (blue) - the 13 `CityDefinition`s, placed on their
  exported `mapX`/`mapY`.
- **Trade cities** (gold) - London, New York and the ports (`lissabon`,
  `sanfrancisco`, `rio`, `hafen`).

Clicking a pin opens the place's imported picture (a missing plate falls back to
a caption instead of breaking the screen); city pins also offer a *Travel here*
button. Plantation/port coordinates are authored in `app.js` because those
plates only exist as artwork, not as data entries.

## Checks

```powershell
# every CFG.* read is either exported or a declared web-only key
powershell -NoProfile -ExecutionPolicy Bypass -File tools\cfgcheck.ps1

# do the scripts still parse? (no Node needed, uses WSH)
cscript //nologo tools\syntax-check.js

# does every el('...') id in app.js exist in the DOM or get created by it?
powershell -NoProfile -ExecutionPolicy Bypass -File tools\domcheck.ps1
```

`cfgcheck.ps1` exits non-zero on a genuine problem, writes its report to
`_cfgcheck.txt` and also prints it. `domcheck.ps1` does the same with
`_domcheck.txt` and fails only on a missing id.
