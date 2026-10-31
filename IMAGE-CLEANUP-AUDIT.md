# Image inventory and cleanup — 2026-10-31

Inspected `images/` against `images.js`, `artwork-images.js`, the map and colony rendering code, scene import scripts and image reports.

- Before cleanup: **159 image files**, **35,216,166 bytes**.
- Removed: `images/scenes/sandro-botticellis-illustration-zu-dantes-göttlicher-komödie-ca-1485.jpg` (**199,538 bytes**), and `images/unbekannt.jpg` (**471,816 bytes**) plus `images/unbekannt2.jpg` (**480,271 bytes**). The two `unbekannt` manifest records have empty city-ID lists and no observed runtime lookup. Their manifest records were removed.
- After cleanup: **156 image files**, **34,064,541 bytes**.
- Retained **16 worker sprites and 8 ship sprites**: these are dynamically referenced by generated paths such as `images/sprites/worker-${kind}-${pose[1]}.png` and `images/sprites/ship-${name}.png`; searching for complete names would incorrectly flag them as unused.
- Kept the artwork and city assets listed in generated manifests, including fallback art.
- Kept scene files exported by import scripts unless confidently unreferenced. Image-import scripts may regenerate assets; re-running imports should be reviewed before committing outputs.

This is a **conservative static reference audit**, not a full runtime coverage test. Files referenced through unknown dynamic strings or future planned content should be rechecked before larger deletions.
