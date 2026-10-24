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
| `cities-extra.js` | cities the web build adds (Lissabon, Rio, San Francisco) |
| `works-extra.js` | painters, works and catalogue facts the web build adds |
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
`debtCallReputationPenalty`, `crateSpacePurchaseLimit`,
`travelDayScale`, `travelDayExponent`,
`priceBandLow`, `priceBandHigh`, `priceBandCurve`.

The moment `EconomyConfig.cs` grows a field of the same name, the exporter
carries it and the default stops applying. The *Data Source* dialog in-game
lists the current state of this split.

### Artwork price band

The exported price stack is

```
basePrice * reputationFactor * rarityMultiplier * (masterpiece ? 2.4 : 1)
          * appreciation over up to 150 years
          * condition * authenticity * city demand * city wealth * market index
```

That stack orders the catalogue correctly but spans more than three orders of
magnitude - the median dealer ask came out at roughly **$690 000** against a
starting purse of $12 000, so almost nothing on a shelf was ever buyable.
`unitValue()` therefore passes the finished value through `bandValue()`, a
monotone re-map of the log range onto `priceBandLow .. priceBandHigh`. Every
work keeps its rank within the catalogue (a Vermeer still costs more than a
Mucha study), but the magnitudes land inside a playable band.

Current tuning, verified with `tools/_prices.html` across all 13 cities,
60 works and every epoch (5 460 dealer asks):

| setting | value |
| --- | --- |
| `startingMoney` | $100 000 |
| `priceBandLow` .. `priceBandHigh` | $40 000 .. $200 000 |
| `priceBandCurve` | 1.75 |
| dealer ask p25 / median / p75 | $71 029 / $95 008 / $127 099 |
| asks inside the band | 95 % |
| asks buyable at the start | 54 % |
| `targetNetWorth` | $1 200 000 |

The anchors of the re-map are **measured, not authored**: `measurePriceSpread()`
walks the real price stack over the catalogue once and takes its log range.
Adding works, or changing `basePrice` in the Unity project, therefore
re-calibrates automatically instead of shifting the whole economy.

`priceBandCurve` above 1 pulls the middle down towards the cheap end, below 1
lifts it. Set `priceBandLow: 0` to switch the band off and get the raw Unity
prices back.

Supporting costs were moved onto the same scale, because they are read against
artwork prices: `extraSlotPrice` $60 000, `baseLoanCeiling` $250 000,
`expertiseFee` $3 500, `restorationCostPerHundredth` $260,
`crateHandlingFee` $900, `baseTicketPrice` $400,
`ticketPricePerDistance` $9 000. Travel now reads: Berlin->London 2 days /
$742, Berlin->New York 10 days / $2 664.

> Note: these are values in `data.js`, which the Unity exporter overwrites. If
> you re-export, re-apply them, or move them into `WEB_ONLY_DEFAULTS` as the
> band keys already are.

## City backdrops

The parlour frame above the panel shows the current city. `app.js` looks the
picture up in `images.js` by city slug; when a city has no imported master yet
it falls back to a palette generated from the city's `theme`/`accent` colours,
so a missing file never leaves a hole in the screen.

```powershell
# regenerate images.js (reads new\ + städte\ + hdArtwork\, never writes back)
powershell -NoProfile -ExecutionPolicy Bypass -File tools\import-images.ps1

# ...or also pull in the raw game screenshots (prefixed orig-)
powershell -NoProfile -ExecutionPolicy Bypass -File tools\import-images.ps1 -IncludeOriginals
```

`städte\` is a second city folder and is optional; it is read *after* `new\`
so that a `münchen.jpg` cannot shadow a `Muenchen.jpg`. Slugs are folded
(`ä`→`ae`, `ü`→`ue`, `ß`→`ss`, other accents lose their diacritic), which is
what `data.js` uses for `muenchen` / `zuerich`.

A master whose filename is the short or English form of a city id is folded
onto the id the game uses (`Rom.jpg` → `roma`, `Vienna.jpg` → `wien`,
`Florence.jpg` → `firenze`). Two cities borrow a plate on purpose: Firenze has
no master of its own and renders `venedig.jpg`, wired through the `cityPicture`
alias table in `app.js`.

The script keeps `images-report.txt` up to date with the sizes, the slug list
and which cities currently have a picture (`images.js` is the only thing the
app reads; the report is for humans). Not every slug is a city: the plates in
`new\` also cover commodities, continents and trade scenes (`kaffee`, `tabak`,
`rio`, ...).

Keep the `?v=` query on the generated manifests in `index.html` current after
an import. The bare Python dev server sends no `Cache-Control`, so browsers
cache `images.js` / `app.js` heuristically and otherwise keep showing the old
picture map long after a successful import.

## Artwork pictures

`tools/import-artwork-images.ps1` reads the master plates in
`D:\Projekte\Ren\ArtRace3Artwork\Bilder` (named `Artist - Title (year)`),
writes web JPEGs into `images/art/` and emits `artwork-images.js`. Every
catalogue record carries the facts the trade rows print next to the picture:
`yearCreated`, the painter (via `artistId`) and `typeName`; the extra masters
also carry `medium` and `dimensions`.

Two details are worth knowing:

- **The folder's painters need not exist in `data.js`.** Fifteen masters in
  the folder belong to painters the Unity export never had (Munch, Schiele,
  Seurat, Picasso, Leonardo, ...). They are declared in `works-extra.js`,
  which loads after `data.js` and before `engine.js`; `engine.js` merges the
  arrays before it builds `artistById` / `workById` and measures the price
  band, so an extra painter is stocked, auctioned and priced like an exported
  one. The importer parses the same file, so a new plate is mapped without
  touching the script.
- **Scene plates are kept, not discarded.** `Auktion1..5.jpg` and the
  generated gallery wall are rooms, not artworks. They are written to
  `images/scenes/` and listed in `ART_RACE_SCENE_PLATES`; `app-trade.js`
  shows one above the auction view (`sceneStrip`).

The importer also keeps `artwork-images-report.txt` current: how many of the
works have a picture, which are still missing, and which plate went to which
work. Titles are German on the plates and English in the data, so
`$titleAliasesRaw` maps a German title onto a work id; add a line there when a
new plate does not map on its own.

## World map

The *Travel* office draws the whole network onto one `<canvas>` built by
`map.js` — sea, continents, pins, routes and the craft all live in the same
coordinate space:

- **Plantations** (green) - the commodity sources: coffee, cocoa, tobacco, tea,
  textiles plus the colonial regions (`indien`, `java`, `brasilien`, ...).
- **Art-trade cities** (blue) - the 13 `CityDefinition`s, placed on their
  exported `mapX`/`mapY`.
- **Trade cities** (gold) - London, New York and the ports (`lissabon`,
  `sanfrancisco`, `rio`, `hafen`).

Clicking near a pin opens the place's imported picture (a missing plate falls
back to a caption instead of breaking the screen); city pins also offer a
*Travel here* button. Plantation/port coordinates are authored in `app.js`
because those plates only exist as artwork, not as data entries.

### Why it is a canvas, not positioned HTML

`project(x, y)` maps a map fraction to a plate fraction, so a pin is always
drawn at the same *relative* spot. Changing the window size or the device pixel
ratio rescales the backing store and nothing drifts. The earlier version placed
absolutely-positioned `<button>`s over a stretched background picture; those
drift as soon as the aspect ratio changes, which is why they are gone.

Two things to know if you touch this code:

- `renderPanel()` rewrites `panel.innerHTML` on every render, so `#wm-stage` is
  a **new element each time**. `syncWorldMap()` therefore drops the cached
  instance whenever the canvas' parent is no longer the live stage. Without
  that check the canvas mounts once and is orphaned forever.
- Voyage progress is owned by the calendar, not by the frame timer: `app.js`
  computes `(day - startDay) / days` and `map.js` only animates the hull's
  bobbing. The hull moves one step per day advanced.

At rest the chart draws a dotted *lane* from the current port to every
reachable one, so the shape of the network is visible before you book.

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
