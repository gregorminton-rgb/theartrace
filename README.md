# The Great Art Race

A browser trading game about buying art low, selling it high, and staying clear
of forgeries and the bank. Travel between European, colonial and trade cities,
run plantations and colonies for raw goods, and build your reputation on the
auction floor.

Plain HTML, CSS and JavaScript. No build step, no backend.

## ▶️ Play now

**[Start The Great Art Race](https://gregorminton-rgb.github.io/theartrace/)**

No install, no account — it runs in the browser and works offline after the
first visit.

## Play locally

The game must be served over HTTP (a `file://` page cannot load the bundled data).

```bash
python -m http.server 8080
# then open http://localhost:8080/
```

On Windows, `serve.cmd` starts the same server.

### Play offline / install as an app

The game is a Progressive Web App (PWA). On first visit it caches its code and
core images. Music and extra pictures are cached the first time you use them.

- **Desktop Chrome / Edge:** click the install icon in the address bar.
- **Android Chrome:** menu → "Install app" / "Add to Home screen".
- **iOS Safari:** Share → "Add to Home Screen".

Once cached, the game runs without a connection. Service workers need HTTPS or
`localhost`, so they do not work from a `file://` page.

After changing game files, bump `CACHE_VERSION` in `sw.js` and the `?v=` value
in `index.html` so players receive the update.

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

## Contributing

The `main` branch is protected. Changes go in through pull requests:

1. Fork the repository, or create a branch if you have write access.
2. Make your change and run `tools/cfgcheck.ps1` if you touched scripts, assets or the service worker.
3. Open a pull request against `main` and describe what changed and why.

## Credits

- Rendering: [PixiJS](https://pixijs.com/) v7.4.3, MIT License.

## License

Code is released under the MIT License (see `LICENSE`).
Artwork and music have their own status; see `ASSETS.md`.