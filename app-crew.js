/* =========================================================================
 * app-crew.js — colonial fields, crops, workers and the harvest.
 *
 * The colony economy: growth rates, how many hands a plot takes, planting,
 * harvesting, hiring. The screen that paints all this lives in
 * app-colonies.js; the day clock in app-core.js calls endColonyDay().
 * ========================================================================= */
(function () {
  'use strict';

  var A = window.ArtRace;
  var G = window.ArtRaceGame.G;
  var CFG = A.CFG;
  /* colony tables, published by app-colonies.js (loads right after this file;
     these are read at call time, not at load time) */
  function T() { return A.colonies || {}; }
  
  function cropById(id) { return T().CROP_BY_ID[id]; }
  function colonyById(id) { return T().COLONY_BY_ID[id]; }
  function cropPriceOf(c, hub) { return T().cropPrice(c, hub); }
  function cropThumbOf(c, cls) { return T().cropThumb(c, cls); }
  var renderAll = function () { return A.app.renderAll(); };
  var renderColony = function () { return A.colonies.renderColony.apply(null, arguments); };
  var departFromColony = function () { return A.colonies.departFromColony.apply(null, arguments); };
  var openColonyTravel = function () { return A.colonies.openColonyTravel.apply(null, arguments); };
  var advanceDay = function () { return A.app.advanceDay.apply(null, arguments); };
  function el(id) { return document.getElementById(id); }
  function log(line) {
    G.log.unshift({ day: G.day, text: line });
    if (G.log.length > 120) G.log.pop();
  }

  /* ---------- colonial plantations: travel, fields, harvest, trade --------- */
  /* ---------- colonial plantations: travel, fields, workers, trade -------- *
   * The colony is its own full-window desk (see #colony in index.html). You
   * lay out fields by dragging a crop plate onto a free plot (or click a plate
   * then a plot), hire and assign workers to speed growth and swell the yield,
   * and upgrade each field individually. Ripe fields harvest into the colonial
   * warehouse and are sold at the London / New York trade desks.
   * ---------------------------------------------------------------------- */
  var PLOTS_PER_COLONY = 15;     // max hexagonal plots per colony
  var MAX_FIELD_WORKERS = 4;     // workers a single field can take
  var MAX_COLONY_WORKERS = 16;   // hired workers a colony can house
  var WORKER_HIRE_COST = 600;    // one-off wage to bring a worker to the colony
  var WORKER_SPEED = 0.20;       // each worker speeds growth by +20%
  var WORKER_YIELD = 0.5;        // each worker adds half a unit (two = +1)
  var UPGRADE_SPEED = 0.15;      // each field upgrade speeds growth by +15%
  var UPGRADE_YIELD = 1;         // each field upgrade adds one unit
  var UPGRADES = [
    { label: 'Irrigation',   cost: 350,  note: '+15% growth, +1 unit' },
    { label: 'Fertiliser',   cost: 750,  note: '+15% growth, +1 unit' },
    { label: 'Storage shed', cost: 1400, note: '+15% growth, +1 unit' }
  ];

  function colonyFields() {
    return G.fields.filter(function (f) { return f.colonyId === G.colonyId; });
  }
  function fieldById(fid) {
    var found = null;
    G.fields.forEach(function (f) { if (f.id === fid) found = f; });
    return found;
  }
  function plotField(plotIndex) {
    var found = null;
    colonyFields().forEach(function (f) { if (f.plotIndex === plotIndex) found = f; });
    return found;
  }
  function fieldGrowthRate(f) {
    var crop = T().CROP_BY_ID[f.cropId];
    if (!crop) return 0;
    return (1 + f.workers * WORKER_SPEED + f.level * UPGRADE_SPEED) / crop.days;
  }
  function fieldYield(f) {
    return 1 + Math.floor(f.workers * WORKER_YIELD) + f.level * UPGRADE_YIELD;
  }
  function fieldDaysLeft(f) {
    if (f.ripe) return 0;
    var rate = fieldGrowthRate(f);
    return rate <= 0 ? 999 : Math.ceil((1 - f.progress) / rate);
  }
  function fieldProgressPct(f) {
    return Math.round(Math.min(1, f.progress) * 100);
  }
  function colonyHired() { return G.workers[G.colonyId] || 0; }
  function colonyAssigned() {
    var n = 0;
    colonyFields().forEach(function (f) { n += f.workers || 0; });
    return n;
  }
  function colonyIdle() { return Math.max(0, colonyHired() - colonyAssigned()); }
  function colonyHeldUnits() {
    var n = 0;
    T().CROPS.forEach(function (c) { n += (G.goods[c.id] || 0); });
    return n;
  }


  function plantCrop(cropId, plotIndex) {
    var crop = T().CROP_BY_ID[cropId];
    if (!crop) return;
    if (plotField(plotIndex)) { log('That plot is already planted.'); return; }
    if (G.cash < crop.cost) { log('Not enough cash for ' + crop.label + ' seed (' + A.money(crop.cost) + ').'); return; }
    G.cash -= crop.cost;
    /* the first layout is the purchase: the plot becomes the player's */
    claimPlot(G.colonyId, plotIndex, crop.id);
    G.fields.push({ id: G.nextFieldId++, colonyId: G.colonyId, plotIndex: plotIndex, cropId: crop.id,
                    plantedDay: G.day, progress: 0, ripe: false, workers: 0, level: 0 });
    G.colonyStats.planted += 1;
    log('Laid out a ' + crop.label + ' field on plot ' + (plotIndex + 1) + '.');
    G.selectedFieldId = G.nextFieldId - 1;
    renderColony();
  }

  function harvestField(fid) {
    var idx = -1;
    G.fields.forEach(function (f, i) { if (f.id === fid) idx = i; });
    if (idx < 0) return;
    var f = G.fields[idx];
    if (!f.ripe) { log('That field is still growing.'); return; }
    var yieldUnits = fieldYield(f);
    var owner = f.colonyId;
    G.fields.splice(idx, 1);
    /* the harvest lands on that colony's quay, ready for its handel tab */
    if (!G.colonyStock) G.colonyStock = {};
    if (!G.colonyStock[owner]) G.colonyStock[owner] = {};
    G.colonyStock[owner][f.cropId] = (G.colonyStock[owner][f.cropId] || 0) + yieldUnits;
    G.goods[f.cropId] = (G.goods[f.cropId] || 0) + yieldUnits;
    G.colonyStats.harvested += yieldUnits;
    log('Harvested ' + yieldUnits + ' ' + T().CROP_BY_ID[f.cropId].label + ' unit(s) onto the quay.');
    if (G.selectedFieldId === fid) G.selectedFieldId = null;
    renderColony();
  }

  function hireWorker() {
    var hired = colonyHired();
    if (hired >= MAX_COLONY_WORKERS) { log('The colony cannot house more workers.'); return; }
    if (G.cash < WORKER_HIRE_COST) { log('Hiring a worker costs ' + A.money(WORKER_HIRE_COST) + '.'); return; }
    G.cash -= WORKER_HIRE_COST;
    G.workers[G.colonyId] = hired + 1;
    log('Hired a worker at the ' + T().COLONY_BY_ID[G.colonyId].label + ' colony.');
    renderColony();
  }

  function assignWorker(fid) {
    var f = fieldById(fid);
    if (!f) return;
    if (f.workers >= MAX_FIELD_WORKERS) { log('That field already has ' + MAX_FIELD_WORKERS + ' workers.'); return; }
    if (colonyIdle() <= 0) { log('No idle workers — hire one first.'); return; }
    f.workers += 1;
    log('Assigned a worker to the ' + T().CROP_BY_ID[f.cropId].label + ' field.');
    renderColony();
  }

  function unassignWorker(fid) {
    var f = fieldById(fid);
    if (!f || !f.workers) return;
    f.workers -= 1;
    renderColony();
  }

  function upgradeField(fid) {
    var f = fieldById(fid);
    if (!f) return;
    var next = UPGRADES[f.level];
    if (!next) { log('That field is fully upgraded.'); return; }
    if (G.cash < next.cost) { log(next.label + ' costs ' + A.money(next.cost) + '.'); return; }
    G.cash -= next.cost;
    f.level += 1;
    log('Upgraded the ' + T().CROP_BY_ID[f.cropId].label + ' field to ' + next.label + '.');
    renderColony();
  }

  function selectField(fid) {
    G.selectedFieldId = (G.selectedFieldId === fid) ? null : fid;
    renderColony();
  }

  /* ---------- the overseer: the plantation runs while you are away -------- *
   * Only buying land needs the player on the spot; planting, hiring,
   * assigning hands and harvesting can be left to an overseer, exactly like
   * the trade orders. One order stands per colony and survives the crossing.
   * ---------------------------------------------------------------------- */
  /* Automation is per field. A plot only becomes the player's when they lay a
     field out on it themselves; the overseer never buys or sows land. Each
     owned field carries its own switch, so the player decides field by field. */
  /* Owned plots live in G.ownedPlots["colonyId:plotIndex"] = { auto, cropId }.
     They outlast the crop: a harvested plot stays the player's, and only the
     plots with auto on are sown again by the overseer. */
  function ownedPlotKey(colonyId, plotIndex) { return colonyId + ':' + plotIndex; }
  function ownedPlot(colonyId, plotIndex) {
    return (G.ownedPlots || {})[ownedPlotKey(colonyId, plotIndex)] || null;
  }
  function claimPlot(colonyId, plotIndex, cropId) {
    if (!G.ownedPlots) G.ownedPlots = {};
    var key = ownedPlotKey(colonyId, plotIndex);
    if (!G.ownedPlots[key]) G.ownedPlots[key] = { auto: false, cropId: cropId };
    G.ownedPlots[key].cropId = cropId;
    return G.ownedPlots[key];
  }
  function fieldAutoOn(f) {
    var p = f ? ownedPlot(f.colonyId, f.plotIndex) : null;
    return !!(p && p.auto);
  }

  function setFieldAuto(fid, on) {
    var f = fieldById(fid);
    if (!f) return;
    claimPlot(f.colonyId, f.plotIndex, f.cropId).auto = !!on;
    renderColony();
  }

  /* The overseer's day, for one owned field with its switch on: harvest it
     when ripe, sow it again with the same crop, and keep one hand on it if
     there is one to spare. It spends cash like the player would. */
  function runOverseer(colonyId, quiet) {
    var i, f;
    var plots = [];
    for (var key in (G.ownedPlots || {})) {
      if (!G.ownedPlots.hasOwnProperty(key) || !G.ownedPlots[key].auto) continue;
      if (key.indexOf(colonyId + ':') !== 0) continue;
      plots.push({ index: parseInt(key.slice(colonyId.length + 1), 10), plot: G.ownedPlots[key] });
    }
    if (!plots.length || !T().CROP_BY_ID) return 0;
    var banked = 0;
    var label = T().COLONY_BY_ID[colonyId] ? T().COLONY_BY_ID[colonyId].label : colonyId;

    /* 1. on each automated plot: harvest when ripe, then sow the same crop */
    for (i = 0; i < plots.length; i++) {
      var pi = plots[i].index, pl = plots[i].plot;
      var cur = null;
      G.fields.forEach(function (x) { if (x.colonyId === colonyId && x.plotIndex === pi) cur = x; });
      if (cur && cur.ripe) {
        var units = fieldYield(cur);
        G.fields.splice(G.fields.indexOf(cur), 1);
        if (!G.colonyStock) G.colonyStock = {};
        if (!G.colonyStock[colonyId]) G.colonyStock[colonyId] = {};
        G.colonyStock[colonyId][cur.cropId] = (G.colonyStock[colonyId][cur.cropId] || 0) + units;
        G.goods[cur.cropId] = (G.goods[cur.cropId] || 0) + units;
        G.colonyStats.harvested += units;
        banked += units;
        if (!quiet) log('Overseer harvested ' + units + ' ' + T().CROP_BY_ID[cur.cropId].label +
                        ' unit(s) at the ' + label + ' colony.');
        cur = null;
      }
      var crop = T().CROP_BY_ID[pl.cropId];
      if (!cur && crop && G.cash >= crop.cost) {
        G.cash -= crop.cost;
        pl.cropId = crop.id;
        G.fields.push({ id: G.nextFieldId++, colonyId: colonyId, plotIndex: pi, cropId: crop.id,
                        plantedDay: G.day, progress: 0, ripe: false, workers: 0, level: 0 });
        G.colonyStats.planted += 1;
      }
    }

    /* 2. keep one hand on each automated field, if the purse allows */
    var hiredNow = G.workers[colonyId] || 0;
    var assignedNow = 0;
    G.fields.forEach(function (x) { if (x.colonyId === colonyId) assignedNow += x.workers || 0; });
    G.fields.forEach(function (x) {
      if (x.colonyId !== colonyId || !fieldAutoOn(x) || x.workers >= 1) return;
      if (hiredNow - assignedNow <= 0) {
        if (hiredNow >= MAX_COLONY_WORKERS || G.cash < WORKER_HIRE_COST) return;
        G.cash -= WORKER_HIRE_COST;
        hiredNow += 1;
        G.workers[colonyId] = hiredNow;
        if (!quiet) log('Overseer hired a worker at the ' + label + ' colony.');
      }
      x.workers += 1;
      assignedNow += 1;
    });
    /* 5. load whatever is lying on the quay, if the shipping order is on */
    var order = shipOf(colonyId);
    if (order && order.on) {
      var shelf = (G.colonyStock || {})[colonyId] || {};
      var hub = order.hubId || 'london';
      for (var k in shelf) {
        if (!shelf.hasOwnProperty(k) || !shelf[k]) continue;
        if (G.cash < shelf[k] * SHIP_FEE_PER_CRATE) break;
        loadShipment(colonyId, k, hub, shelf[k], !quiet);
      }
    }
    return banked;
  }

  /* Called once a day from the clock, for every colony with a standing order. */
  function runOverseers() {
    var ids = {};
    for (var key in (G.ownedPlots || {})) {
      if (G.ownedPlots.hasOwnProperty(key) && G.ownedPlots[key].auto) ids[key.split(':')[0]] = true;
    }
    for (var id in ids) {
      if (!ids.hasOwnProperty(id)) continue;
      try { runOverseer(id, !!(G.colonyId && id === G.colonyId)); }
      catch (e) { /* a colony never breaks the clock */ }
    }
  }

  function endColonyDay() {
    if (G.ended) return;
    A.expireEvents(G.market, G.day);
    advanceDay(false);
    renderColony();
  }

  function colonyAction(action, t) {
    if (action === 'menu') {
      G.colonyMenu = t.getAttribute('data-menu');
      renderColony();
    } else if (action === 'arm') {
      var cid = t.getAttribute('data-crop');
      G.plantCropId = (G.plantCropId === cid) ? null : cid;
      renderColony();
    } else if (action === 'plant-at') {
      var pi = parseInt(t.getAttribute('data-plot'), 10);
      if (plotField(pi)) { renderColony(); return; }
      if (!G.plantCropId) { log('Pick a crop plate first, then click a free plot.'); return; }
      plantCrop(G.plantCropId, pi);
    } else if (action === 'select') {
      selectField(parseInt(t.getAttribute('data-field'), 10));
    } else if (action === 'harvest') {
      harvestField(parseInt(t.getAttribute('data-field'), 10));
    } else if (action === 'hire') {
      hireWorker();
    } else if (action === 'assign') {
      assignWorker(parseInt(t.getAttribute('data-field'), 10));
    } else if (action === 'unassign') {
      unassignWorker(parseInt(t.getAttribute('data-field'), 10));
    } else if (action === 'upgrade') {
      upgradeField(parseInt(t.getAttribute('data-field'), 10));
    } else if (action === 'endday') {
      endColonyDay();
    } else if (action === 'travel') {
      openColonyTravel();
    } else if (action === 'depart') {
      departFromColony(t.getAttribute('data-dest'));
    } else if (action === 'auto') {
      /* the switch is per field: the player automates the fields they own */
      setFieldAuto(parseInt(t.getAttribute('data-field'), 10),
                   t.getAttribute('data-on') !== '1');
    } else if (action === 'ship') {
      shipOrder(t.getAttribute('data-crop'), t.getAttribute('data-hub'),
                parseInt(t.getAttribute('data-units'), 10));
    } else if (action === 'ship-clear') {
      cancelShipping(t.getAttribute('data-crop'));
    } else if (action === 'ship-auto') {
      var cur = (G.shipping && G.shipping[G.colonyId]) || { on: false, hubId: 'london', autoSell: true };
      setShipping({ on: !cur.on });
    } else if (action === 'ship-hub') {
      setShipping({ hubId: t.getAttribute('data-hub') });
    }
  }

  /* ---------- shipping: the colony's handel tab ------------------------- *
   * A crop is loaded onto a ship bound for one of the three trade exchanges.
   * The voyage takes the crossing the chart implies (a minimum of a few days);
   * on arrival the crates are dropped into that port's ledger and — if the
   * standing order says so — sold at the day's price. The order can be
   * switched on and left alone, so a plantation earns while the player hunts
   * pictures in Europe.
   * ---------------------------------------------------------------------- */
  var SHIP_FEE_PER_CRATE = 40;   /* freight is charged on loading */
  var SHIP_MIN_DAYS = 4;

  /* Human-readable exchange name; the module's own hubs table is not exported. */
  function cityLabel(id) {
    var found = id;
    try { found = A.city(id).name; } catch (e) { /* unknown id */ }
    return found;
  }

  function hubIds() {
    var ids = Object.keys(T().TRADE_HUB_IDS || {});
    return ids.length ? ids : ['london', 'newyork', 'tokio'];
  }
  function hubCityObject(id) {
    var city = null;
    A.cities.forEach(function (c) { if (c.id === id) city = c; });
    return city;
  }
  function shipDays(colonyId, hubId) {
    var from = T().COLONY_BY_ID[colonyId];
    var to = hubCityObject(hubId);
    if (!from || !to) return SHIP_MIN_DAYS;
    try { return Math.max(SHIP_MIN_DAYS, Math.round(A.ticketDays(from, to))); }
    catch (e) { return SHIP_MIN_DAYS; }
  }
  function colonyStock() {
    var out = {};
    (T().CROPS || []).forEach(function (c) { out[c.id] = ((G.colonyStock || {})[G.colonyId] || {})[c.id] || 0; });
    return out;
  }
  function colonyUnits() {
    var s = colonyStock(), n = 0;
    for (var k in s) if (s.hasOwnProperty(k)) n += s[k];
    return n;
  }
  function addColonyStock(cropId, units) {
    if (!G.colonyStock) G.colonyStock = {};
    if (!G.colonyStock[G.colonyId]) G.colonyStock[G.colonyId] = {};
    var shelf = G.colonyStock[G.colonyId];
    shelf[cropId] = Math.max(0, (shelf[cropId] || 0) + units);
  }
  function shipOf(colonyId) {
    if (!G.shipping) G.shipping = {};
    return G.shipping[colonyId] || null;
  }
  function setShipping(patch) {
    var id = G.colonyId;
    if (!id) return;
    if (!G.shipping) G.shipping = {};
    var cur = G.shipping[id];
    if (!cur) cur = G.shipping[id] = { on: false, hubId: 'london', autoSell: true };
    for (var k in patch) if (patch.hasOwnProperty(k)) cur[k] = patch[k];
    renderColony();
  }
  function sellAtHub(cropId, hubId, units) {
    var crop = T().CROP_BY_ID[cropId];
    if (!crop || units <= 0) return 0;
    var price = T().cropPrice(crop, hubId);
    var total = price * units;
    G.cash += total;
    G.colonyStats.sold += units;
    G.colonyStats.revenue += total;
    log('Sold ' + units + ' ' + crop.label + ' at the ' + cityLabel(hubId) +
        ' trade desk for ' + A.money(total) + '.');
    return total;
  }

  /* Load a shipment. The crates leave the colony shelf, the freight is paid
     from the purse, and the hull is on its way for shipDays(). */
  function loadShipment(colonyId, cropId, hubId, units, quiet) {
    var colony = T().COLONY_BY_ID[colonyId];
    var crop = T().CROP_BY_ID[cropId];
    if (!colony || !crop) return null;
    hubId = hubId || 'london';
    if (!T().TRADE_HUB_IDS[hubId]) return null;
    var shelf = (G.colonyStock || {})[colonyId] || {};
    units = Math.min(units | 0, shelf[cropId] || 0);
    if (units <= 0) return null;
    var fee = units * SHIP_FEE_PER_CRATE;
    if (G.cash < fee) {
      if (!quiet) log('The freight for ' + units + ' crate(s) costs ' + A.money(fee) + '.');
      return null;
    }
    G.cash -= fee;
    shelf[cropId] = Math.max(0, (shelf[cropId] || 0) - units);
    if (!G.shipments) G.shipments = [];
    G.nextShipmentId = (G.nextShipmentId || 0) + 1;
    var days = shipDays(colony.id, hubId);
    var rec = {
      id: G.nextShipmentId, colonyId: colony.id, cropId: cropId, hubId: hubId, units: units,
      sentDay: G.day, dueDay: G.day + days, fee: fee,
      autoSell: !!(shipOf(colony.id) || {}).autoSell
    };
    G.shipments.push(rec);
    log(units + ' crate(s) of ' + crop.label + ' left the ' + colony.label + ' quay for ' +
        cityLabel(hubId) + ', due day ' + (G.day + days) + '.');
    return rec;
  }

  function shipOrder(cropId, hubId, units) {
    if (!G.colonyId) return;
    var rec = loadShipment(G.colonyId, cropId, hubId, units, false);
    if (!rec) {
      if ((colonyStock()[cropId] || 0) <= 0) {
        log('Nothing of the ' + ((T().CROP_BY_ID[cropId] || {}).label || cropId) + ' harvest is on the quay.');
      }
    }
    renderColony();
  }
  function cancelShipping(cropId) {
    if (!G.shipments) return;
    var before = G.shipments.length;
    G.shipments = G.shipments.filter(function (s) {
      return !(s.colonyId === G.colonyId && s.cropId === cropId && s.dueDay > s.sentDay);
    });
    var back = before - G.shipments.length;
    if (back) log(back + ' shipment(s) recalled to the quay.');
    renderColony();
  }

  /* Arrivals: called once a day. A crate that lands is added to the port's
     ledger (G.portGoods) and sold there if the order says so. */
  function runShipping() {
    if (!G.shipments || !G.shipments.length) return;
    var left = [];
    G.shipments.forEach(function (s) {
      if (s.dueDay > G.day) { left.push(s); return; }
      if (!G.portGoods) G.portGoods = {};
      if (!G.portGoods[s.hubId]) G.portGoods[s.hubId] = {};
      if (s.autoSell) {
        sellAtHub(s.cropId, s.hubId, s.units);
      } else {
        var ledger = G.portGoods[s.hubId];
        ledger[s.cropId] = (ledger[s.cropId] || 0) + s.units;
        var c2 = T().CROP_BY_ID[s.cropId];
        if (c2) log(s.units + ' crate(s) of ' + c2.label + ' waiting at the ' +
                   cityLabel(s.hubId) + ' trade desk.');
      }
    });
    G.shipments = left;
  }

  /* Trade desk (London / New York / Tokio): sell the colonial harvest. */

  window.ArtRaceCrew = {
    PLOTS_PER_COLONY: PLOTS_PER_COLONY,
    MAX_FIELD_WORKERS: MAX_FIELD_WORKERS,
    MAX_COLONY_WORKERS: MAX_COLONY_WORKERS,
    WORKER_HIRE_COST: WORKER_HIRE_COST,
    WORKER_SPEED: WORKER_SPEED,
    WORKER_YIELD: WORKER_YIELD,
    UPGRADE_SPEED: UPGRADE_SPEED,
    UPGRADE_YIELD: UPGRADE_YIELD,
    UPGRADES: UPGRADES,
    colonyFields: colonyFields,
    fieldById: fieldById,
    plotField: plotField,
    fieldGrowthRate: fieldGrowthRate,
    fieldYield: fieldYield,
    fieldDaysLeft: fieldDaysLeft,
    fieldProgressPct: fieldProgressPct,
    colonyHired: colonyHired,
    colonyAssigned: colonyAssigned,
    colonyIdle: colonyIdle,
    colonyHeldUnits: colonyHeldUnits,
    plantCrop: plantCrop,
    harvestField: harvestField,
    hireWorker: hireWorker,
    assignWorker: assignWorker,
    unassignWorker: unassignWorker,
    upgradeField: upgradeField,
    selectField: selectField,
    endColonyDay: endColonyDay,
    colonyAction: colonyAction,
    setFieldAuto: setFieldAuto,
    fieldAutoOn: fieldAutoOn,
    ownedPlot: ownedPlot,
    runOverseer: runOverseer,
    runOverseers: runOverseers,
    hubIds: hubIds,
    shipDays: shipDays,
    colonyStock: colonyStock,
    colonyUnits: colonyUnits,
    addColonyStock: addColonyStock,
    SHIP_FEE_PER_CRATE: SHIP_FEE_PER_CRATE,
    shipOrder: shipOrder,
    loadShipment: loadShipment,
    cancelShipping: cancelShipping,
    setShipping: setShipping,
    shipOf: shipOf,
    sellAtHub: sellAtHub,
    runShipping: runShipping
  };
})();
