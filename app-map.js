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
    return '<div class="worldmap' + (hasCanvas ? ' worldmap--canvas' : ' no-map') + '" id="wm-stage">' +
      '<div class="wm-legend">' +
      '<span class="wm-key wm-key--colony">Colonies</span>' +
      '<span class="wm-key wm-key--city">Art-trade cities</span>' +
      '<span class="wm-key wm-key--trade">Trade cities</span>' +
      '</div>' + (hasCanvas ? '' : '<p class="wm-fallback">The engraved chart could not be drawn — the list below still works.</p>') + '</div>';
  }

  /* ---- the live chart ------------------------------------------------ */
  var worldMap = null;
  A.mapView = { get: function () { return worldMap; }, render: renderWorldMap,
                 sync: syncWorldMap };

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
    if (G.view !== 'travel') {
      destroyWorldMap();
      return;
    }
    var stage = el('wm-stage');
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
        getSelection: function () { return G.mapPick || null; }
      });
      if (!worldMap) return;
      stage.addEventListener('click', function (ev) {
        var c = worldMap && worldMap.canvas;
        if (!c || ev.target !== c) return;
        pickPlaceAt(ev, c);
      });
    }
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
      showPlace(best.slug);
    }
  }

  function showPlace(slug) {
    var place = PLACE_BY_SLUG[slug];
    if (!place) return;
    G.mapPick = { x: place.mapX, y: place.mapY };
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
    
    /* City: Travel button */
    if (place.city && place.city.id !== G.cityId) {
      var price = A.ticketPrice(A.city(G.cityId), place.city);
      buttons.unshift({ label: 'Travel here · ' + A.money(price), onClick: function () { closeDialog(); travelTo(place.city.id); renderAll(); } });
    }
    
    /* Colony: Sail button (only if not already at a colony) */
    if (place.colony && !G.colonyId) {
      var sail = A.ticketPrice(A.city(G.cityId), place.colony);
      buttons.unshift({ label: 'Sail to ' + place.colony.label + ' · ' + A.money(sail), primary: true, onClick: function () { closeDialog(); sailToColony(place.colony.id); } });
    }
    
    
    dialog(place.label, body, buttons);
    if (worldMap) syncWorldMap();
  }

})();
