# The Great Art Race

A browser trading game about buying art low, selling it high, and staying clear
of forgeries and the bank. Travel between European, colonial and trade cities,
run plantations and colonies for raw goods, and build your reputation on the
auction floor.

Plain HTML, CSS and JavaScript. No build step, no backend.

## Play

The game must be served over HTTP (a `file://` page cannot load the bundled data).

```bash
python -m http.server 8080
# then open http://localhost:8080/
```

On Windows, `serve.cmd` starts the same server.

## Project layout

| File / folder | Purpose |
| --- | --- |
| `index.html` | Screens, HUD, dock and script tags |
| `styles.css` | Visual theme |
| `data.js` | Game data (cities, painters, works, economy config) |
| `cities-extra.js`, `works-extra.js` | Additional cities, painters and works |
| `images.js`, `artwork-images.js` | Generated image manifests |
| `engine.js` | Pure logic: prices, markets, travel, bank, studio |
| `app-*.js` | Game screens and flow (core, shell, trade, art, colonies, map, audio) |
| `map.js`, `world-geo.js` | Canvas world map |
| `vendor/pixi.min.js` | PixiJS 7.4.3 (MIT) |
| `images/`, `music/` | Artwork, city pictures and soundtrack |
| `tools/` | PowerShell importers and checks used during development |

## Credits

- Rendering: [PixiJS](https://pixijs.com/) v7.4.3, MIT License.

## License

Code is released under the MIT License (see `LICENSE`).
Artwork and music have their own status; see `ASSETS.md`.