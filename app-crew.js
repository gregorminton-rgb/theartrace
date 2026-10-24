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
    G.fields.splice(idx, 1);
    G.goods[f.cropId] = (G.goods[f.cropId] || 0) + yieldUnits;
    G.colonyStats.harvested += yieldUnits;
    log('Harvested ' + yieldUnits + ' ' + T().CROP_BY_ID[f.cropId].label + ' unit(s) into the warehouse.');
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
    }
  }

  /* Trade desk (London / New York): sell the colonial harvest. */

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
    colonyAction: colonyAction
  };
})();
