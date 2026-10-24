/* =========================================================================
 * app-colonies.js — the colonial screen: crop catalogue, colony plates,
 * planting, the plot grid, the inspector and the colony tabs.
 *
 * The economy itself (growth, hands per plot, hire costs) lives in app-crew.js.
 * ========================================================================= */
(function () {
  'use strict';

  var A = window.ArtRace;
  var G = window.ArtRaceGame.G;
  var CFG = A.CFG;
  var pictureFor = function (slug) { return A.art ? A.art.pictureFor(slug) : null; };
  function el(id) { return document.getElementById(id); }
  function h(s) { return String(s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  }); }
  function show(node, on) { node.hidden = !on; }
  function log(line) {
    G.log.unshift({ day: G.day, text: line });
    if (G.log.length > 120) G.log.pop();
  }

  var crew = window.ArtRaceCrew;
  /* crew constants (plain numbers, read once) */
  var PLOTS_PER_COLONY = crew.PLOTS_PER_COLONY;
  var MAX_FIELD_WORKERS = crew.MAX_FIELD_WORKERS;
  var MAX_COLONY_WORKERS = crew.MAX_COLONY_WORKERS;
  var WORKER_HIRE_COST = crew.WORKER_HIRE_COST;
  var WORKER_SPEED = crew.WORKER_SPEED;
  var WORKER_YIELD = crew.WORKER_YIELD;
  var UPGRADE_SPEED = crew.UPGRADE_SPEED;
  var UPGRADE_YIELD = crew.UPGRADE_YIELD;
  var UPGRADES = crew.UPGRADES;
  /* crew functions (hoisted in app-crew.js, which loads before this file) */
  var colonyFields = crew.colonyFields, fieldById = crew.fieldById;
  var plotField = crew.plotField, fieldGrowthRate = crew.fieldGrowthRate;
  var fieldYield = crew.fieldYield, fieldDaysLeft = crew.fieldDaysLeft;
  var fieldProgressPct = crew.fieldProgressPct;
  var colonyHired = crew.colonyHired, colonyAssigned = crew.colonyAssigned;
  var colonyIdle = crew.colonyIdle, colonyHeldUnits = crew.colonyHeldUnits;
  var plantCrop = crew.plantCrop, harvestField = crew.harvestField;
  var hireWorker = crew.hireWorker, assignWorker = crew.assignWorker;
  var unassignWorker = crew.unassignWorker, upgradeField = crew.upgradeField;
  var selectField = crew.selectField, endColonyDay = crew.endColonyDay;
  var colonyAction = crew.colonyAction;
  /* app-core.js publishes these; call them at click time */
  var renderAll = function () { return A.app.renderAll(); };
  var checkEnd = function () { return A.app.checkEnd(); };
  var advanceDay = function (silent) { return A.app.advanceDay(silent); };
  var beginVoyage = function () { return A.app.beginVoyage.apply(null, arguments); };
  var syncWorldMap = function () { return A.mapView && A.mapView.sync ? A.mapView.sync() : undefined; };
  var thumb = function (w) { return A.art ? A.art.thumb(w) : ''; };
  /* app-shell.js owns the modal; read it at call time so load order is free */
  var dialog = function () { return A.shell.dialog.apply(null, arguments); };
  var closeDialog = function () { return A.shell.closeDialog(); };

  /* ---------- colonial plantations & crops -------------------------------- *
   * The colony economy: sail to a colony, lay out fields, grow a crop, then
   * sell the harvest at the London / New York trade desks. Colonies only exist
   * as artwork (kol1..kol6 + the commodity plates in new\), so the balance is
   * authored here.
   * ---------------------------------------------------------------------- */

  /* the trade desks that pay a premium for a colonial crop */
  var TRADE_HUB_IDS = { london: true, newyork: true };
  var CROPS = [
    { id: 'kakao',  label: 'Cocoa',    slug: 'kakao',  days: 12, cost: 900,  base: 2600 },
    { id: 'tee',    label: 'Tea',      slug: 'tee',    days: 10, cost: 750,  base: 2200 },
    { id: 'kaffee', label: 'Coffee',   slug: 'kaffee', days: 14, cost: 1100, base: 3200 },
    { id: 'tabak',  label: 'Tobacco',  slug: 'tabak',  days: 16, cost: 1000, base: 3000 },
    { id: 'stoffe', label: 'Textiles', slug: 'stoffe', days: 20, cost: 1500, base: 4600 }
  ];
  var CROP_BY_ID = {};
  CROPS.forEach(function (c) { CROP_BY_ID[c.id] = c; });

  /* Each trade hub pays its own premium by commodity. */
  var TRADE_HUB_MULT = {
    london:  { kakao: 1.00, tee: 1.18, kaffee: 1.02, tabak: 1.12, stoffe: 1.06 },
    newyork: { kakao: 1.06, tee: 1.02, kaffee: 1.18, tabak: 1.00, stoffe: 1.14 }
  };

  /* The four colonies you can actually sail to (each carries its own plate). */
  /* Koordinaten korrigiert für realistische Mercator-Projektion (X: 0=180°W, 1=180°E; Y: 0=Süd, 1=Nord) */
  var COLONIES = [
    { id: 'guatemala', label: 'Guatemala', sub: 'Cocoa & coffee colony', mapX: 0.215, mapY: 0.600, pic: 'kolonie1',
      bg: 'linear-gradient(to bottom, #8b9f7a 0%, #6b7d5a 40%, #5a6948 100%)',
      plots: [
        {x:12,y:18},{x:28,y:22},{x:45,y:19},{x:62,y:24},{x:78,y:20},
        {x:15,y:42},{x:32,y:38},{x:48,y:45},{x:65,y:40},{x:82,y:43},
        {x:10,y:65},{x:27,y:62},{x:50,y:68},{x:70,y:63},{x:85,y:70}
      ]
    },
    { id: 'jamaica', label: 'Jamaica', sub: 'Sugar & coffee island', mapX: 0.310, mapY: 0.655, pic: 'plantage1',
      bg: 'linear-gradient(to bottom, #7fa885 0%, #5d8363 40%, #4a6b50 100%)',
      plots: [
        {x:8,y:15},{x:24,y:20},{x:42,y:16},{x:58,y:22},{x:76,y:18},
        {x:12,y:38},{x:30,y:42},{x:50,y:38},{x:68,y:44},{x:85,y:40},
        {x:15,y:60},{x:35,y:64},{x:52,y:62},{x:72,y:66},{x:88,y:63}
      ]
    },
    { id: 'trinidad', label: 'Trinidad', sub: 'Cocoa & coffee island', mapX: 0.330, mapY: 0.600, pic: 'plantage2',
      bg: 'linear-gradient(to bottom, #9fa87c 0%, #7d8a5f 40%, #62704a 100%)',
      plots: [
        {x:10,y:20},{x:26,y:24},{x:44,y:18},{x:60,y:26},{x:80,y:22},
        {x:14,y:44},{x:32,y:40},{x:52,y:46},{x:70,y:42},{x:87,y:48},
        {x:8,y:66},{x:28,y:70},{x:48,y:65},{x:68,y:72},{x:85,y:68}
      ]
    },
    { id: 'ceylon', label: 'Ceylon', sub: 'Tea highlands', mapX: 0.735, mapY: 0.700, pic: 'tee',
      bg: 'linear-gradient(to bottom, #6b8f6e 0%, #4d6d50 40%, #3a5740 100%)',
      plots: [
        {x:15,y:16},{x:32,y:20},{x:48,y:15},{x:65,y:22},{x:82,y:18},
        {x:10,y:40},{x:28,y:44},{x:50,y:40},{x:70,y:46},{x:88,y:42},
        {x:12,y:64},{x:30,y:68},{x:52,y:65},{x:72,y:70},{x:87,y:66}
      ]
    },
    { id: 'kuba', label: 'Cuba', sub: 'Sugar & tobacco island', mapX: 0.275, mapY: 0.690, pic: 'tabak',
      bg: 'linear-gradient(to bottom, #a89a6d 0%, #87794f 40%, #6b603d 100%)',
      plots: [
        {x:14,y:17},{x:30,y:23},{x:46,y:16},{x:63,y:25},{x:80,y:19},
        {x:11,y:41},{x:29,y:37},{x:51,y:44},{x:69,y:39},{x:86,y:45},
        {x:13,y:63},{x:33,y:69},{x:50,y:64},{x:71,y:71},{x:86,y:65}
      ]
    },
    { id: 'brazil', label: 'Pernambuco', sub: 'Sugar & coffee coast', mapX: 0.390, mapY: 0.400, pic: 'brasilien',
      bg: 'linear-gradient(to bottom, #6f8f5c 0%, #547040 35%, #3f5731 100%)',
      plots: [
        {x:16,y:15},{x:34,y:21},{x:50,y:14},{x:67,y:23},{x:83,y:17},
        {x:10,y:39},{x:27,y:45},{x:49,y:38},{x:68,y:46},{x:87,y:41},
        {x:14,y:62},{x:31,y:69},{x:53,y:63},{x:70,y:70},{x:85,y:64}
      ]
    },
    { id: 'bengalen', label: 'Bengal', sub: 'Jute & indigo delta', mapX: 0.825, mapY: 0.735, pic: 'stoffe',
      bg: 'linear-gradient(to bottom, #8a8f63 0%, #6b7049 40%, #545a38 100%)',
      plots: [
        {x:13,y:16},{x:31,y:22},{x:49,y:15},{x:66,y:21},{x:83,y:16},
        {x:10,y:40},{x:28,y:43},{x:50,y:38},{x:68,y:45},{x:86,y:39},
        {x:12,y:62},{x:32,y:67},{x:51,y:61},{x:70,y:68},{x:87,y:63}
      ]
    },
    { id: 'goldcoast', label: 'Gold Coast', sub: 'Cocoa hinterland', mapX: 0.470, mapY: 0.600, pic: 'kakao',
      bg: 'linear-gradient(to bottom, #97874f 0%, #7a6c3c 40%, #615530 100%)',
      plots: [
        {x:15,y:18},{x:33,y:14},{x:48,y:21},{x:65,y:17},{x:82,y:22},
        {x:11,y:43},{x:30,y:39},{x:51,y:46},{x:69,y:41},{x:87,y:44},
        {x:14,y:64},{x:31,y:70},{x:50,y:65},{x:72,y:69},{x:85,y:62}
      ]
    },
    { id: 'indien', label: 'Indien', sub: 'Cotton, indigo & tea', mapX: 0.700, mapY: 0.660, pic: 'indien',
      bg: 'linear-gradient(to bottom, #9a8154 0%, #7b6440 40%, #5f4c31 100%)',
      plots: [
        {x:14,y:17},{x:32,y:23},{x:49,y:16},{x:66,y:22},{x:83,y:18},
        {x:10,y:41},{x:29,y:45},{x:50,y:39},{x:69,y:46},{x:87,y:42},
        {x:13,y:63},{x:31,y:69},{x:52,y:64},{x:71,y:70},{x:86,y:65}
      ]
    },
    { id: 'indonesien', label: 'Niederländisch-Indien', sub: 'Spice islands & coffee', mapX: 0.790, mapY: 0.560, pic: 'indonesien',
      bg: 'linear-gradient(to bottom, #6b9a7a 0%, #4d7a5c 40%, #3a5f46 100%)',
      plots: [
        {x:12,y:20},{x:29,y:15},{x:47,y:22},{x:64,y:17},{x:81,y:23},
        {x:15,y:43},{x:33,y:39},{x:51,y:46},{x:70,y:41},{x:88,y:45},
        {x:11,y:65},{x:30,y:70},{x:49,y:64},{x:68,y:71},{x:84,y:66}
      ]
    },
    { id: 'australien', label: 'Australien', sub: 'Wool stations & vineyards', mapX: 0.845, mapY: 0.290, pic: 'australien',
      bg: 'linear-gradient(to bottom, #b0925e 0%, #8e7449 40%, #6d5838 100%)',
      plots: [
        {x:16,y:16},{x:34,y:21},{x:51,y:15},{x:68,y:22},{x:84,y:18},
        {x:10,y:40},{x:28,y:44},{x:49,y:38},{x:67,y:45},{x:86,y:41},
        {x:14,y:62},{x:32,y:68},{x:53,y:63},{x:71,y:70},{x:85,y:64}
      ]
    },
    { id: 'rio', label: 'Rio de Janeiro', sub: 'Coffee hills & sugar coast', mapX: 0.4083, mapY: 0.3450, pic: 'rio',
      bg: 'linear-gradient(to bottom, #7a9a6a 0%, #5c7a50 40%, #45603d 100%)',
      plots: [
        {x:13,y:18},{x:31,y:14},{x:48,y:21},{x:66,y:17},{x:83,y:22},
        {x:11,y:42},{x:29,y:46},{x:50,y:40},{x:68,y:45},{x:87,y:41},
        {x:15,y:63},{x:33,y:69},{x:51,y:64},{x:70,y:70},{x:85,y:65}
      ]
    }
  ];
  var COLONY_BY_ID = {};
  COLONIES.forEach(function (c) { COLONY_BY_ID[c.id] = c; });

  /* Deterministic, day-driven produce price (no extra RNG state). */
  function hash2(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }
  function cropPrice(crop, hubId) {
    var mult = (TRADE_HUB_MULT[hubId] || {})[crop.id] || 1;
    var wave = 0.8 + 0.4 * Math.sin(G.day * 0.17 + (hash2(crop.id + ':' + hubId) % 1000) * 0.01);
    return Math.round(crop.base * mult * wave);
  }

  /* Plantagen-Koordinaten korrigiert für realistische Weltkarte */

    var PLACES = (function () {
    var list = [];
    A.cities.forEach(function (c) {
      list.push({ slug: c.id, label: c.name, sub: c.country + ' · ' + c.regionName,
                  kind: TRADE_HUB_IDS[c.id] ? 'trade' : 'city', mapX: c.mapX, mapY: c.mapY, city: c });
    });
    COLONIES.forEach(function (c) { list.push({ slug: 'colony-' + c.id, label: c.label, sub: c.sub, kind: 'colony', mapX: c.mapX, mapY: c.mapY, colony: c, colonyId: c.id }); });
    return list;
  })();

  var PLACE_BY_SLUG = {};
  PLACES.forEach(function (p) { PLACE_BY_SLUG[p.slug] = p; });


  /* The travel chart. `map.js` draws the whole plate on a canvas — pins,
     routes and the moving craft included; this only builds the empty stage
     plus the legend, and syncWorldMap() fills the stage once the panel is in
     the document (a canvas needs a laid-out parent to size to). */

  function sailToColony(colonyId) {
    var colony = COLONY_BY_ID[colonyId];
    if (!colony || G.colonyId || !G.started || G.ended) return;
    if (G.voyage) { log('You are already en route to ' + G.voyage.toName + '.'); return; }
    var from = A.city(G.cityId);
    var price = A.ticketPrice(from, colony);
    var days = A.ticketDays(from, colony);
    if (price > G.cash) { log('The passage to ' + colony.label + ' costs ' + A.money(price) + '.'); return; }
    G.cash -= price;
    beginVoyage(colony, days, price, 0, 0, colony.id);
    checkEnd();
  }

  function sailBack() {
    var colony = COLONY_BY_ID[G.colonyId];
    var to = A.city(G.colonyReturnCityId);
    if (colony && to) {
      var days = A.ticketDays(colony, to);
      for (var i = 0; i < days; i++) advanceDay(true);
      log('Sailed back to ' + to.name + ' (' + days + ' day(s)).');
    }
    G.colonyId = null;
    G.colonyReturnCityId = null;
    G.colonyMenu = 'plantage';
    G.selectedFieldId = null;
    G.plantCropId = null;
    show(el('colony'), false);
    if (A.shell && A.shell.resumeClock) A.shell.resumeClock();
    renderAll();
  }

  /* Travel from the plantation. The old screen only offered "sail back" to
     the port of departure; the player can also cross to a neighbouring colony
     or any city, so the button lists every reachable place with the price and
     the crossing time the chart distance implies. */
  /* Travel from the plantation shows the chart, not a list: the player should
     see where the colony lies before choosing a port. The list under the chart
     stays as the fallback for a touch screen and for naming prices exactly. */
  function openColonyTravel() {
    var colony = COLONY_BY_ID[G.colonyId];
    if (!colony) return;
    if (G.voyage) { log('You are already en route to ' + G.voyage.toName + '.'); return; }
    G.colonyTravel = true;
    G.colonyMenu = 'reise';
    renderColony();
    if (A.mapView && A.mapView.sync) A.mapView.sync();
  }

  /* The rows under the colony chart — the same destinations, in days order. */
  function colonyTravelRowsHTML() {
    var colony = COLONY_BY_ID[G.colonyId];
    if (!colony) return '';
    var rows = colonyDestinations().map(function (d) {
      var target = d.city || COLONY_BY_ID[d.colonyId];
      var price = A.ticketPrice(colony, target);
      var days = A.ticketDays(colony, target);
      d.price = price;
      d.days = days;
      return d;
    });
    rows.sort(function (a, b) { return a.days - b.days || a.price - b.price; });
    return rows.map(function (d) {
      var price = d.price;
      var days = d.days;
      var kind = d.kind === 'colony' ? 'Kolonie' : d.kind === 'trade' ? 'Handel' : 'Stadt';
      var disabled = price > G.cash ? ' disabled' : '';
      return '<button type="button" class="dest-row" data-colony="depart" data-dest="' + h(d.slug) + '"' +
        ' data-price="' + price + '" data-days="' + days + '"' + disabled + '>' +
        '<span class="dest-name">' + h(d.label) + '</span>' +
        '<span class="dest-kind">' + kind + '</span>' +
        '<span class="dest-sub">' + h(d.sub || '') + '</span>' +
        '<span class="dest-meta">' + A.money(price) + ' · ' + days + 'd</span>' +
        '<span class="dest-leg" aria-hidden="true">' + days + 'd · ' + A.money(price) + '</span>' +
        '</button>';
    }).join('');
  }

  /* Hovering (or pressing on) a destination row draws the passage on the
     chart and shows the fare beside the name. Nothing is booked here: the row
     only asks for confirmation once it is clicked. */
  function bindDestHover(list) {
    if (!list || list.__hoverBound) return;
    list.__hoverBound = true;
    function rowOf(ev) {
      var t = ev.target;
      while (t && t !== list && !(t.classList && t.classList.contains('dest-row'))) t = t.parentNode;
      return t && t !== list ? t : null;
    }
    function enter(ev) {
      var row = rowOf(ev);
      if (!row) return;
      list.querySelectorAll('.dest-row.is-hover').forEach(function (r) {
        if (r !== row) r.classList.remove('is-hover');
      });
      row.classList.add('is-hover');
      if (A.mapView && A.mapView.preview) A.mapView.preview(row.getAttribute('data-dest'));
    }
    function leave(ev) {
      var row = rowOf(ev);
      if (row) row.classList.remove('is-hover');
      if (A.mapView && A.mapView.clear) A.mapView.clear();
    }
    list.addEventListener('mouseover', enter);
    list.addEventListener('mouseout', leave);
    /* touch has no hover: a tap shows the preview, the same tap's click asks */
    list.addEventListener('touchstart', enter, { passive: true });
  }

  /* Everything the plantation can be left for: every city and every other
     colony, with the price and duration the chart distance implies. The
     current colony, and any art city that doubles as a colony, are excluded
     by id so the list never offers a trip to where the player already is. */
  function colonyDestinations() {
    var here = G.colonyId;
    var out = [];
    A.cities.forEach(function (c) {
      if (c.id === here) return;
      out.push({ slug: c.id, label: c.name, sub: c.country + ' · ' + c.regionName,
                 kind: TRADE_HUB_IDS[c.id] ? 'trade' : 'city', city: c, colonyId: null,
                 mapX: c.mapX, mapY: c.mapY });
    });
    COLONIES.forEach(function (c) {
      if (c.id === here) return;
      out.push({ slug: 'colony-' + c.id, label: c.label, sub: c.sub, kind: 'colony',
                 city: null, colonyId: c.id, mapX: c.mapX, mapY: c.mapY });
    });
    return out;
  }

  /* Leaves the plantation for another colony or a city. The passage is a
     normal voyage, so the chart animates it and the days tick by exactly as
     they do from a port; the colony screen simply closes first. */
  function departFromColony(slug) {
    var colony = COLONY_BY_ID[G.colonyId];
    if (!colony || !G.started || G.ended) return;
    if (G.voyage) { log('You are already en route to ' + G.voyage.toName + '.'); return; }
    var dest = null;
    var list = colonyDestinations();
    for (var i = 0; i < list.length; i++) if (list[i].slug === slug) { dest = list[i]; break; }
    if (!dest) return;
    var target = dest.city || COLONY_BY_ID[dest.colonyId];
    var price = A.ticketPrice(colony, target);
    var days = A.ticketDays(colony, target);
    if (price > G.cash) {
      log('The passage to ' + dest.label + ' costs ' + A.money(price) + '.');
      renderColony();
      return;
    }
    /* A row click only asks: the voyage is booked from the confirmation. */
    confirmDeparture(dest, colony, target, price, days);
  }

  /* The one question before the money is spent: destination, price, days. */
  function confirmDeparture(dest, colony, target, price, days) {
    A.shell.dialog(
      'Nach ' + dest.label + ' reisen?',
      '<div class="confirm-leg">' +
        '<p class="confirm-head">Von <b>' + h(colony.label) + '</b> nach <b>' + h(dest.label) + '</b></p>' +
        '<div class="confirm-grid">' +
          '<div><span>Reisedauer</span><b>' + days + ' Tage</b></div>' +
          '<div><span>Fahrpreis</span><b>' + A.money(price) + '</b></div>' +
          '<div><span>Bargeld danach</span><b>' + A.money(G.cash - price) + '</b></div>' +
        '</div>' +
        '<p class="confirm-note">Die Plantage bleibt bewirtschaftet zurück. Ankunft an Tag ' +
          (G.day + days) + '.</p>' +
      '</div>',
      [
        { label: 'Abbrechen', onClick: function () {
            A.shell.closeDialog();
            if (A.mapView && A.mapView.clear) A.mapView.clear();
          } },
        { label: 'Ja, ablegen', primary: true, onClick: function () {
            A.shell.closeDialog();
            bookPassage(dest, colony, target, price, days);
          } }
      ],
      'confirm-dialog'
    );
    if (A.mapView && A.mapView.preview) A.mapView.preview(dest.slug);
  }

  function bookPassage(dest, colony, target, price, days) {
    if (!colony || !G.started || G.ended) return;
    if (G.voyage) { log('You are already en route to ' + G.voyage.toName + '.'); return; }
    if (price > G.cash) return;
    G.cash -= price;
    /* the ship leaves from the colony, so the chart must start there */
    G.cityId = colony.id && A.city(colony.id) ? colony.id : G.colonyReturnCityId || G.cityId;
    G.colonyId = null;
    G.colonyMenu = 'plantage';
    G.colonyTravel = false;
    G.selectedFieldId = null;
    G.plantCropId = null;
    show(el('colony'), false);
    beginVoyage(target, days, price, 0, 0, dest.colonyId || null);
    if (A.shell && A.shell.resumeClock) A.shell.resumeClock();
    checkEnd();
    renderAll();
  }

  function openColony() {
    show(el('colony'), true);
    renderColony();
  }

  function renderColony() {
    var colony = COLONY_BY_ID[G.colonyId];
    if (!colony) return;
    el('colony-title').textContent = colony.label;
    el('colony-sub').textContent = colony.sub;
    el('colony-cash').textContent = 'Cash ' + A.money(G.cash) + ' · day ' + G.day + ' · ' + colonyFields().length + ' field(s)';
    el('colony-warehouse').textContent = 'Warehouse ' + colonyHeldUnits() + ' unit(s)';
    
    /* Update menu buttons */
    Array.prototype.forEach.call(document.querySelectorAll('.colony-menu-btn'), function (btn) {
      var menu = btn.getAttribute('data-menu');
      btn.classList.toggle('active', menu === G.colonyMenu);
    });
    
    /* Show/hide views */
    show(el('colony-view-plantage'), G.colonyMenu === 'plantage');
    show(el('colony-view-handel'), G.colonyMenu === 'handel');
    show(el('colony-view-lager'), G.colonyMenu === 'lager');
    show(el('colony-view-arbeiter'), G.colonyMenu === 'arbeiter');
    show(el('colony-view-reise'), G.colonyMenu === 'reise');
    
    /* The chart is mounted on demand: the stage has to be visible before the
       renderer measures it. */
    if (G.colonyMenu === 'reise') {
      var dl = el('colony-dest-list');
      if (dl) {
        dl.innerHTML = colonyTravelRowsHTML();
        bindDestHover(dl);
      }
      if (A.mapView && A.mapView.sync) A.mapView.sync();
    } else {
      G.colonyTravel = false;
      if (A.mapView && A.mapView.clear) A.mapView.clear();
    }
    
    /* Render plantage view (only when visible) */
    if (G.colonyMenu === 'plantage') {
      el('colony-palette').innerHTML = colonyPaletteHTML();
      el('colony-workers').innerHTML = colonyWorkersHTML();
      el('colony-grid').innerHTML = colonyGridHTML();
      el('colony-grid').style.background = colony.bg || '';
      el('colony-inspector').innerHTML = colonyInspectorHTML();
      el('colony-hint').textContent = G.plantCropId
        ? 'Click a free plot to plant ' + CROP_BY_ID[G.plantCropId].label + ' — or drag a plate from the left.'
        : 'Drag a crop plate onto a free plot, or click a plate then a plot.';
    }
    
    /* Render lager view */
    if (G.colonyMenu === 'lager') {
      el('colony-lager-content').innerHTML = colonyWarehouseHTML();
    }
    
    /* Render arbeiter view */
    if (G.colonyMenu === 'arbeiter') {
      el('colony-arbeiter-content').innerHTML = colonyWorkersHTML();
    }
  }

  function cropThumb(crop, cls) {
    var pic = pictureFor(crop.slug);
    return pic ? '<img class="crop-thumb' + (cls ? ' ' + cls : '') + '" src="' + pic.file + '" alt="' + h(crop.label) + '" />' : '';
  }

  function colonyPaletteHTML() {
    var cards = CROPS.map(function (c) {
      var indicative = cropPrice(c, 'london');
      return '<div class="crop-tile' + (G.plantCropId === c.id ? ' selected' : '') + '" draggable="true"' +
        ' data-drag-crop="' + c.id + '" data-colony="arm" data-crop="' + c.id + '"' +
        ' title="Drag onto a free plot, or click then click a plot">' +
        cropThumb(c) +
        '<span class="crop-tile-label">' + h(c.label) + '</span>' +
        '<span class="crop-tile-meta">' + c.days + 'd · seed ' + A.money(c.cost) + '</span>' +
        '<span class="crop-tile-prov">~' + A.money(indicative) + '/u at trade desk</span>' +
        '</div>';
    }).join('');
    return '<h3 class="colony-panel-title">Crops</h3>' +
      '<p class="colony-note">Drag a plate onto a plot to lay out a field.</p>' + cards;
  }

  function colonyWorkersHTML() {
    var hired = colonyHired();
    var assigned = colonyAssigned();
    var idle = colonyIdle();
    var maxed = hired >= MAX_COLONY_WORKERS;
    var afford = G.cash >= WORKER_HIRE_COST;
    return '<h3 class="colony-panel-title">Workers</h3>' +
      '<div class="colony-workers-totals">' +
        '<span class="colony-worker-num">' + hired + '</span><span class="colony-worker-label">hired</span>' +
        '<span class="colony-worker-num">' + assigned + '</span><span class="colony-worker-label">working</span>' +
        '<span class="colony-worker-num">' + idle + '</span><span class="colony-worker-label">idle</span>' +
      '</div>' +
      '<button class="btn buy" data-colony="hire"' + ((!maxed && afford) ? '' : ' disabled') + '>Hire worker · ' + A.money(WORKER_HIRE_COST) + '</button>' +
      '<p class="colony-note">' + (maxed ? 'The colony is fully staffed.'
        : 'Each worker adds +' + Math.round(WORKER_SPEED * 100) + '% growth and +1 unit per two. Assign them from a field\'s inspector.') + '</p>';
  }

  function colonyGridHTML() {
    var cells = [];
    for (var i = 0; i < PLOTS_PER_COLONY; i++) cells.push(colonyPlotHTML(i));
    return cells.join('');
  }

  /* A little SVG diorama: tilled soil, crop rows that grow with progress, and
     the assigned workers walking/picking along a row. Workers are PNG cutouts
     placed with <image> so they scale with the tile. */
  function fieldSVG(crop, f, pct) {
    var grown = Math.max(0.18, Math.min(1, pct / 100));
    var ripe = f.ripe;
    var green = ripe ? '#5f8d43' : '#6f9a52';
    var rows = '';
    for (var r = 0; r < 3; r++) {
      var y = 30 + r * 11;
      rows += '<rect x="8" y="' + (y + 4) + '" width="84" height="2.5" rx="1" fill="#5c4326" opacity="' + (0.45 + r * 0.12).toFixed(2) + '"/>';
      for (var c = 0; c < 7; c++) {
        var x = 12 + c * 12;
        var hh = (4 + grown * 9).toFixed(1);
        var sway = ((c + r) % 2 ? 1 : -1) * 0.8;
        rows += '<path d="M' + x + ' ' + (y + 5) + ' q' + sway + ' -' + (hh / 2) + ' 0 -' + hh +
          '" stroke="' + green + '" stroke-width="' + (1.1 + grown * 0.9).toFixed(1) +
          '" fill="none" stroke-linecap="round" opacity="' + (0.55 + grown * 0.45).toFixed(2) + '"/>';
        if (grown > 0.55) {
          rows += '<circle cx="' + (x + sway) + '" cy="' + (y + 5 - hh) + '" r="' + (0.9 + grown * 0.9).toFixed(1) +
            '" fill="' + (ripe ? '#e0bc63' : '#8fae6a') + '"/>';
        }
      }
    }
    var seen = Math.max(0, Math.min(f.workers, 4));
    var people = '';
    var poses = [['stand', 'm1'], ['pick', 'f2'], ['stand', 'f3'], ['pick', 'm4']];
    for (var w = 0; w < seen; w++) {
      var pose = poses[w % poses.length];
      var kind = ripe ? 'stand' : 'pick';
      var file = 'images/sprites/worker-' + kind + '-' + pose[1] + '.png';
      var px = 18 + w * 21;
      var delay = (w * 0.7).toFixed(1);
      people += '<g class="field-worker" style="animation-delay:' + delay + 's">' +
        '<image href="' + file + '" x="' + px + '" y="20" width="18" height="36" preserveAspectRatio="xMidYMax meet"/>' +
        '</g>';
    }
    return '<svg class="plot-field" viewBox="0 0 100 64" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><linearGradient id="soil' + f.id + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#8a6b43"/><stop offset="1" stop-color="#6b5030"/></linearGradient></defs>' +
      '<rect x="2" y="8" width="96" height="50" rx="5" fill="url(#soil' + f.id + ')"/>' +
      '<rect x="2" y="8" width="96" height="50" rx="5" fill="none" stroke="#4a3620" stroke-width="1.2" opacity="0.7"/>' +
      rows + people +
      '</svg>';
  }

  function colonyPlotHTML(i) {
    var colony = COLONY_BY_ID[G.colonyId];
    if (!colony || !colony.plots || i >= colony.plots.length) return '';
    var pos = colony.plots[i];
    var f = plotField(i);
    
    if (f) {
      var crop = CROP_BY_ID[f.cropId];
      var pct = fieldProgressPct(f);
      var selected = G.selectedFieldId === f.id ? ' selected' : '';
      var pips = '';
      for (var l = 0; l < f.level; l++) pips += '<i class="plot-pip"></i>';
      var houseSVG = '<svg class="plot-house" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">' +
        '<polygon points="16,4 28,14 28,28 4,28 4,14" fill="#8b6f47" stroke="#5a4a30" stroke-width="1.5"/>' +
        '<polygon points="16,4 28,14 16,11" fill="#a0825a" opacity="0.6"/>' +
        '<rect x="12" y="18" width="8" height="10" fill="#4a3a20"/>' +
        '<rect x="8" y="16" width="5" height="5" fill="#2d4a5c" stroke="#1a2a35" stroke-width="0.8"/>' +
        '<rect x="19" y="16" width="5" height="5" fill="#2d4a5c" stroke="#1a2a35" stroke-width="0.8"/>' +
        '</svg>';
      return '<button type="button" class="plot plot--planted' + (f.ripe ? ' ripe' : '') + selected + '"' +
        ' style="left:' + pos.x + '%;top:' + pos.y + '%"' +
        ' data-colony="select" data-field="' + f.id + '" data-plot="' + i + '">' +
        fieldSVG(crop, f, pct) +
        houseSVG +
        '<span class="plot-label">' + h(crop.label) + '</span>' +
        '<span class="plot-workers">' + f.workers + ' worker(s)</span>' +
        '<span class="field-progress"><i style="width:' + pct + '%"></i></span>' +
        '<span class="plot-status">' + (f.ripe ? 'RIPE' : fieldDaysLeft(f) + 'd') + '</span>' +
        '<span class="plot-pips">' + pips + '</span>' +
        '</button>';
    }
    
    var armed = G.plantCropId ? ' can-plant' : '';
    return '<button type="button" class="plot plot--empty' + armed + '"' +
      ' style="left:' + pos.x + '%;top:' + pos.y + '%"' +
      ' data-colony="plant-at" data-plot="' + i + '" data-empty="1">' +
      '<span class="plot-empty-plus">+</span>' +
      '<span class="plot-empty-label">' + (G.plantCropId ? 'plant ' + CROP_BY_ID[G.plantCropId].label : 'empty plot') + '</span>' +
      '</button>';
  }

  function colonyInspectorHTML() {
    var f = G.selectedFieldId ? fieldById(G.selectedFieldId) : null;
    if (!f) {
      return '<h3 class="colony-panel-title">Inspector</h3>' +
        '<p class="colony-note">Click a field to inspect it, assign workers and upgrade it. Ripe fields harvest here or on the plot.</p>' +
        colonyWarehouseHTML();
    }
    var crop = CROP_BY_ID[f.cropId];
    var next = UPGRADES[f.level];
    var idle = colonyIdle();
    var html = '<h3 class="colony-panel-title">' + h(crop.label) + ' field</h3>' +
      '<div class="colony-field-head">' + cropThumb(crop, 'crop-thumb--card') +
        '<div><span class="colony-field-title">' + h(crop.label) + '</span>' +
        '<span class="colony-field-sub">plot ' + (f.plotIndex + 1) + ' · planted day ' + f.plantedDay + '</span></div></div>' +
      '<span class="field-progress"><i style="width:' + fieldProgressPct(f) + '%"></i></span>' +
      '<span class="colony-field-state">' + (f.ripe ? 'Ripe — ready to harvest' : fieldDaysLeft(f) + ' day(s) left · +' + Math.round(fieldGrowthRate(f) * 100) + '% growth/day') + '</span>' +
      '<span class="colony-field-yield">Harvest ' + fieldYield(f) + ' unit(s) · ' + f.workers + ' worker(s) · level ' + f.level + '</span>' +
      '<div class="colony-inspector-btns">' +
      (f.ripe ? '<button class="btn buy" data-colony="harvest" data-field="' + f.id + '">Harvest ' + fieldYield(f) + ' unit(s)</button>' : '') +
      '<button class="btn" data-colony="assign" data-field="' + f.id + '"' + ((idle > 0 && f.workers < MAX_FIELD_WORKERS) ? '' : ' disabled') + '>+1 worker</button>' +
      '<button class="btn ghost" data-colony="unassign" data-field="' + f.id + '"' + (f.workers > 0 ? '' : ' disabled') + '>-1 worker</button>' +
      (next
        ? '<button class="btn go" data-colony="upgrade" data-field="' + f.id + '"' + (G.cash >= next.cost ? '' : ' disabled') + '>' + h(next.label) + ' · ' + A.money(next.cost) + '</button>'
        : '<button class="btn" disabled>Fully upgraded</button>') +
      '</div>';
    return html + colonyWarehouseHTML();
  }

  function colonyWarehouseHTML() {
    var ids = CROPS.map(function (c) { return c.id; }).filter(function (k) { return (G.goods[k] || 0) > 0; });
    var head = '<h4 class="colony-warehouse-title">Colonial warehouse</h4>';
    if (!ids.length) return head + '<p class="colony-note">Empty. Harvest a ripe field, then sell at the London or New York trade desk.</p>';
    return head + ids.map(function (k) {
      var c = CROP_BY_ID[k];
      return '<div class="colony-warehouse-row">' + cropThumb(c) + '<span>' + h(c.label) + '</span><b>' + G.goods[k] + '</b></div>';
    }).join('');
  }

  /* ---------- borrowed by the other app-*.js modules ---------------------- */
  A.colonies = window.ArtRaceColonies = {
    CROPS: CROPS, CROP_BY_ID: CROP_BY_ID, COLONIES: COLONIES, COLONY_BY_ID: COLONY_BY_ID,
    TRADE_HUB_IDS: TRADE_HUB_IDS, TRADE_HUB_MULT: TRADE_HUB_MULT,
    cropPrice: cropPrice, cropThumb: cropThumb, hash2: hash2,
    sailToColony: sailToColony, sailBack: sailBack, openColony: openColony,
    colonyDestinations: colonyDestinations, departFromColony: departFromColony,
    colonyTravelRowsHTML: colonyTravelRowsHTML, openColonyTravel: openColonyTravel,
    bindDestHover: bindDestHover,
    renderColony: renderColony
  };
})();
