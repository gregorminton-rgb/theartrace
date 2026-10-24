/* =========================================================================
 * app-map.js — world map wiring.
 * Split out of the former single-file app.js. The load order in
 * index.html is fixed: app-core.js first, because it owns G.
 * ========================================================================= */
(function () {
  'use strict';

  var A = window.ArtRace;
  var G = window.ArtRaceGame.G;
  var CFG = A.shared.CFG;
  var el = A.shared.el, h = A.shared.h, show = A.shared.show;
  var MONTHS = A.shared.MONTHS, dateOf = A.shared.dateOf;
  var log = A.shared.log, rep = A.shared.rep;
  /* shared vocabulary published by app-core.js */
  var renderAll = function () { return A.app.renderAll(); };
  var renderPanel = function () { return A.trade ? A.trade.renderPanel() : undefined; };
  var travelTo = function () { return A.app.travelTo.apply(null, arguments); };
  var sailToColony = function () { return A.colonies.sailToColony.apply(null, arguments); };
  var voyageRoute = function () { return A.app.voyageRoute.apply(null, arguments); };
  /* the dialog box which lives in app-shell.js (loads after this file) */
  var dialog = function () { var sh = A.shell; if (sh && sh.dialog) return sh.dialog.apply(null, arguments); };
  var closeDialog = function () { var sh = A.shell; if (sh && sh.closeDialog) return sh.closeDialog(); };
  var pictureFor = function (slug) { return A.art ? A.art.pictureFor(slug) : null; };
  /* colony tables live in app-colonies.js, which loads before this file */
  var COLONIES = A.colonies.COLONIES, COLONY_BY_ID = A.colonies.COLONY_BY_ID;
  var TRADE_HUB_IDS = A.colonies.TRADE_HUB_IDS;

  /* Every place the travel office can show: the art cities from data.js,
     the two trade hubs and the colonies. City pins reuse the mapX/mapY the
     Unity data already ships (0..1 longitude/latitude); the hubs and the
     colonies are authored in app-colonies.js because they only exist as
     artwork, not as CityDefinition entries. */
    var PLACES = (function () {
    var list = [];
    A.cities.forEach(function (c) {
      list.push({ slug: c.id, label: c.name, sub: c.country + ' \u00b7 ' + c.regionName,
                  kind: TRADE_HUB_IDS[c.id] ? 'trade' : 'city', mapX: c.mapX, mapY: c.mapY, city: c });
    });
    COLONIES.forEach(function (c) {
      list.push({ slug: 'colony-' + c.id, label: c.label, sub: c.sub, kind: 'colony',
                  mapX: c.mapX, mapY: c.mapY, colony: c, colonyId: c.id });
    });
    return list;
  })();

  var PLACE_BY_SLUG = {};
  PLACES.forEach(function (p) { PLACE_BY_SLUG[p.slug] = p; });

  /* ---------- world map -------------------------------------------------- *
   * The travel office draws the imported world map (hd-08-world-map) and pins
   * every place of the trade network onto it. City pins reuse the mapX/mapY
   * the Unity data already ships (0..1 longitude/latitude); the trade hubs and
   * the colonies are authored here because they only exist as artwork, not as
   * CityDefinition entries. Clicking a pin opens its imported picture.
   * ---------------------------------------------------------------------- */
  function renderWorldMap() {
    var hasCanvas = !!(window.ArtRaceMap && window.ArtRaceMap.available);
    var lv = G.mapLevel || 'world';
    return '<div class="worldmap' + (hasCanvas ? ' worldmap--canvas' : ' no-map') + '" id="wm-stage">' +
      '<div class="wm-legend">' +
      '<span class="wm-key wm-key--colony">Colonies</span>' +
      '<span class="wm-key wm-key--city">Art-trade cities</span>' +
      '<span class="wm-key wm-key--trade">Trade cities</span>' +
      '<span class="wm-levels">' +
      '<button type="button" class="wm-level' + (lv === 'europe' ? ' is-on' : '') +
      '" data-map-level="europe">Europa</button>' +
      '<button type="button" class="wm-level' + (lv === 'world' ? ' is-on' : '') +
      '" data-map-level="world">Welt</button>' +
      '</span>' +
      '</div>' + (hasCanvas ? '' : '<p class="wm-fallback">The engraved chart could not be drawn — the list below still works.</p>') + '</div>';
  }

  /* Two zoom levels share one camera. Europe is where the art trade is played;
     the world carries the colonies, so a sail to a colony switches the plate
     on its own. */
  function setMapLevel(id) {
    if (id !== 'europe' && id !== 'world') return;
    if (G.mapLevel === id) return;
    G.mapLevel = id;
    if (worldMap) worldMap.setLevel(id);
    renderAll();
  }

  function levelForPlace(place) {
    /* The Europa plate only carries European ground: every place outside it
       (colonies and the overseas art cities) has to be shown on the world. */
    if (!place) return null;
    if (place.kind === 'colony') return 'world';
    return onEurope(place.mapX, place.mapY) ? 'europe' : 'world';
  }

  /* The Europa plate only carries European ground: every place outside its
     Mercator window (the colonies and the overseas art cities) has to be
     shown on the world. The window is derived from the places themselves, so
     adding a city cannot silently put its pin off the plate. */
  var EUROPE_X = (function () {
    var ids = { lissabon: 1, london: 1, amsterdam: 1, berlin: 1, paris: 1, muenchen: 1,
                zuerich: 1, wien: 1, roma: 1, firenze: 1, madrid: 1, prag: 1 };
    var minX = 1, maxX = 0, minY = 1, maxY = 0;
    PLACES.forEach(function (p) {
      if (!ids[p.slug]) return;
      if (p.mapX < minX) minX = p.mapX;
      if (p.mapX > maxX) maxX = p.mapX;
      if (p.mapY < minY) minY = p.mapY;
      if (p.mapY > maxY) maxY = p.mapY;
    });
    if (minX > maxX || minY > maxY) return null;
    /* a margin so a place on the edge of Europe still counts as European */
    var pad = 0.06;
    return { x0: minX - pad, x1: maxX + pad, y0: minY - pad, y1: maxY + pad };
  })();

  function levelForPlace(place) {
    if (!place) return null;
    if (place.kind === 'colony') return 'world';
    if (!EUROPE_X) return 'europe';
    var e = EUROPE_X;
    return (place.mapX >= e.x0 && place.mapX <= e.x1 &&
            place.mapY >= e.y0 && place.mapY <= e.y1) ? 'europe' : 'world';
  }

  /* ---- the live chart ------------------------------------------------ */
  var worldMap = null;
  A.mapView = { get: function () { return worldMap; }, render: renderWorldMap,
                 sync: syncWorldMap, setLevel: setMapLevel,
                 /* pick a place by id instead of by pixel: the chart's own
                    hit-test needs a real canvas rect, tests and the city list
                    do not have one. */
                 pick: function (slug) { showPlace(slug); syncWorldMap(); return G.mapPick; },
                 places: function () { return PLACES.map(function (p) { return p.slug; }); } };

  function mapPlaces() {
    return PLACES.map(function (p) {
      return {
        slug: p.slug, label: p.label, x: p.mapX, y: p.mapY, kind: p.kind,
        here: !!(p.city && p.city.id === G.cityId)
      };
    });
  }

  /* A voyage list for the chart. The player's own crossing first, then any
     house that is also at sea, so several hulls can share the plate. */
  function mapVoyages() {
    var list = [];
    if (G.voyage && (G.voyage.path || G.voyage.route)) {
      var v = G.voyage;
      /* progress follows the calendar: the hull sits at the departure port on
         the day the tickets were bought and reaches the far end on arrival. */
      var elapsed = Math.max(0, G.day - v.startDay);
      list.push({
        route: v.path || v.route,
        days: Math.max(1, v.days),
        label: v.label,
        duration: v.duration,
        start: v.start ? v.start : null,
        progress: Math.max(0, Math.min(1, elapsed / Math.max(1, v.days)))
      });
      return list;
    }
    /* Nothing is drawn while the player browses: a line means a journey, and
       a journey only exists once a start and a destination are picked. */
    return list;
  }

  /* The one picked start -> destination link, before the tickets are bought.
     No pick, no line. */
  function mapPreview() {
    if (G.voyage || !G.mapPick) return null;
    var here = A.city(G.cityId);
      if (!here) return null;
      var dest = null;
      for (var i = 0; i < PLACES.length; i++) {
        var p = PLACES[i];
        if (Math.abs(p.mapX - G.mapPick.x) < 1e-6 && Math.abs(p.mapY - G.mapPick.y) < 1e-6) {
      dest = p; break;
        }
      }
      if (!dest) return null;
    var target = dest.city || dest.colony;
    if (!target) return null;
      if (dest.city && dest.city.id === here.id) return null;
      var r = voyageRoute(here, target);
      if (!r) return null;
      return { route: r, glyph: r.glyph, lane: true };
    }

  function syncWorldMap() {
    if (G.view !== 'travel' && !G.colonyTravel) {
      destroyWorldMap();
      return;
    }
    /* The chart mounts in the travel panel, or — when the player is ashore —
       in the colony's own travel view. Both carry a stage with #wm-stage-plus
       only one of them is on screen at a time. */
    var stage = el(G.colonyTravel ? 'colony-wm-stage' : 'wm-stage');
    if (!stage) { destroyWorldMap(); return; }
    var Map = window.ArtRaceMap;
    if (!Map || !Map.available) return;

    /* renderPanel() rewrites panel.innerHTML on every render, so the stage
       node is a fresh element each time and any canvas mounted into the old
       one is orphaned. Drop the stale instance whenever the node changed. */
    if (worldMap && (worldMap.canvas.parentElement !== stage || !stage.isConnected)) {
      destroyWorldMap();
    }

    if (!worldMap) {
      worldMap = Map.mount(stage, {
        level: G.mapLevel || 'world',
        getSelection: function () { return G.mapPick || null; }
      });
      if (!worldMap) {
        /* no Pixi (or no geo data): fall back to a plain notice, the list
           below the plate still carries every place */
        var note = document.createElement('p');
        note.className = 'wm-fallback';
        note.textContent = 'The engraved chart could not be drawn — the list below still works.';
        stage.appendChild(note);
        return;
      }
      stage.addEventListener('click', function (ev) {
        var lvBtn = ev.target.closest('[data-map-level]');
        if (lvBtn) { setMapLevel(lvBtn.getAttribute('data-map-level')); return; }
        var c = worldMap && worldMap.canvas;
        if (!c || ev.target !== c) return;
        pickPlaceAt(ev, c);
      });
    }
    if (worldMap.level !== (G.mapLevel || 'world')) worldMap.setLevel(G.mapLevel || 'world');
    var preview = mapPreview();
    worldMap.setLabels(mapPlaces());
    worldMap.setVoyages(preview ? mapVoyages().concat([preview]) : mapVoyages());
    worldMap.refresh();
  }

  function destroyWorldMap() {
    if (worldMap) {
      worldMap.destroy();
      worldMap = null;
    }
  }

  /* Clicking the plate picks the place whose projected pin is nearest, within
     a generous radius: a finger on a phone is not a mouse pointer. */
  function pickPlaceAt(ev, canvas) {
    var Map = window.ArtRaceMap;
    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var cx = (ev.clientX - rect.left) / rect.width;
    var cy = (ev.clientY - rect.top) / rect.height;
    var best = null, bestD = Infinity;
    PLACES.forEach(function (p) {
      var q = Map.project(p.mapX, p.mapY);
      if (q.x < -0.05 || q.x > 1.05 || q.y < -0.05 || q.y > 1.05) return;
      var d = Math.sqrt((q.x - cx) * (q.x - cx) + (q.y - cy) * (q.y - cy));
      if (d < bestD) { bestD = d; best = p; }
    });
    /* 4.5% of the plate: about a fingertip at phone size */
    if (best && bestD <= 0.045) {
      G.mapPick = { x: best.mapX, y: best.mapY };
      /* a colony is off the Europe plate: show the world so the new line is
         actually on screen */
      var want = levelForPlace(best);
      if (want && want !== (G.mapLevel || 'world')) {
        G.mapLevel = want;
        if (worldMap) worldMap.setLevel(want);
      }
      showPlace(best.slug);
    }
  }

  function showPlace(slug) {
    var place = PLACE_BY_SLUG[slug];
    if (!place) return;
    G.mapPick = { x: place.mapX, y: place.mapY };
    /* a place off the current plate is not on screen: switch to the plate
       that carries it, so the start -> destination line is visible */
    var want = levelForPlace(place);
    if (want && want !== (G.mapLevel || 'world')) {
      G.mapLevel = want;
      if (worldMap) worldMap.setLevel(want);
    }
    /* a colony pin slug is "colony-<id>"; its plate lives under pic/slug */
    var pic = pictureFor(place.colony ? (place.colony.pic || place.colony.slug) : slug);
    var caption = place.label + (place.sub ? ' — ' + place.sub : '') +
      (place.kind === 'trade' && TRADE_HUB_IDS[slug] ? ' · trade hub' : '') +
      (place.kind === 'colony' ? ' · colony' : '');
    var body;
    if (pic) {
      body = '<img class="place-pic" src="' + pic.file + '" alt="' + h(place.label) + '"' +
             ' loading="eager" decoding="async"' +
             ' onerror="this.outerHTML=\'<div class=&quot;place-pic place-pic--missing&quot;>' +
             '<span>Picture failed to load</span></div>\'" />' +
             '<p class="place-caption">' + h(caption) + '</p>';
    } else {
      body = '<div class="place-pic place-pic--missing"><span>' + h(place.label) + '</span></div>' +
             '<p class="place-caption">' + h(caption) + ' · no picture imported yet</p>';
    }
    var buttons = [{ label: 'Back', primary: true, onClick: closeDialog }];
    
    /* Ashore on a plantation the voyage starts from the colony, not the city
       the player left behind: hand the departure to the colony module. */
    var ashore = !!G.colonyId && A.colonies && A.colonies.departFromColony;

    /* City: Travel button */
    if (place.city && place.city.id !== G.cityId) {
      if (ashore) {
        buttons.unshift({ label: 'Travel here', primary: true, onClick: function () {
          closeDialog(); renderAll();
          A.colonies.departFromColony(place.slug);
        } });
      } else {
        var price = A.ticketPrice(A.city(G.cityId), place.city);
        buttons.unshift({ label: 'Travel here · ' + A.money(price), onClick: function () { closeDialog(); travelTo(place.city.id); renderAll(); } });
      }
    }
    
    /* Colony: Sail button */
    if (place.colony && place.colony.id !== G.colonyId) {
      if (ashore) {
        buttons.unshift({ label: 'Sail to ' + place.colony.label, primary: true, onClick: function () {
          closeDialog(); renderAll();
          A.colonies.departFromColony('colony-' + place.colony.id);
        } });
      } else if (!G.colonyId) {
        var sail = A.ticketPrice(A.city(G.cityId), place.colony);
        buttons.unshift({ label: 'Sail to ' + place.colony.label + ' · ' + A.money(sail), primary: true, onClick: function () { closeDialog(); sailToColony(place.colony.id); } });
      }
    }
    
    
    dialog(place.label, body, buttons);
    if (worldMap) syncWorldMap();
  }

})();
