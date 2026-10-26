/* =========================================================================
 * app-state.js — the one game state object G.
 *
 * This file owns G and publishes the tiny namespace the other app-*.js
 * modules read it through. It must load before app-core.js, which fills in
 * ArtRaceGame.shared / .api and starts using G.
 * ========================================================================= */
(function () {
  'use strict';

  var A = window.ArtRace;
  var CFG = A.CFG;

  /* ---------- the one game state object -------------------------------- */
  var G = {
    started: false,
    ended: false,
    name: 'Henry',
    difficulty: 'Normal',
    seed: 0,
    rng: null,
    careerDays: CFG.careerLengthDays,
    targetWorth: CFG.targetNetWorth,
    feeFactor: 1,
    day: 1,
    cityId: 'amsterdam',
    cash: 0,
    loan: 0,
    reputation: CFG.startingReputation,
    capacity: CFG.startingPortfolioCapacity,
    portfolio: [],
    stock: {},            // cityId -> offers currently on the shelf
    restockDay: {},       // cityId -> day the shelf was filled
    lots: [],             // current auction lots
    auctionDay: 0,
    nextUid: 1,
    log: [],
    history: [],          // events that already ran, for the news archive
    slotsBought: 0,
    debtSince: -1,        // day the current debt was taken
    stats: { buys: 0, sells: 0, hammer: 0, bestProfit: 0, worstProfit: 0, forgery: 0 },
    view: 'dealer',
    clockTimer: null,
    clockWanted: false,         // the player wants the calendar running (paused ashore)
    clockSpeed: 1600,           // ms per day for the auto calendar (langsam/normal/schnell)
    colonyId: null,            // colony id while the colony screen is open
    mapPick: null,             // { x, y } of the place picked on the travel chart
    mapLevel: 'world',         // travel chart zoom level: 'europe' | 'world'
    colonyTravel: false,       // the colony screen is showing the travel chart
    mapHover: null,            // destination slug under the pointer, for the preview lane
    mapHoverBase: null,        // chart level to restore when the pointer leaves
    colonyReturnCityId: null,  // city to sail back to on leaving
    colonyMenu: 'plantage',    // current colony menu tab (plantage, handel, lager, arbeiter)
    fields: [],                // laid-out plots: { id, colonyId, plotIndex, cropId, plantedDay, progress, ripe, workers, level }
    goods: {},                 // cropId -> units waiting in the colonial warehouse
    workers: {},               // colonyId -> number of workers hired there
    nextFieldId: 1,
    selectedFieldId: null,     // field open in the colony inspector
    plantCropId: null,         // crop armed for click-to-plant on a free plot
    colonyStats: { planted: 0, harvested: 0, sold: 0, revenue: 0 },
    colonyStock: {},          // colonyId -> { cropId: crates waiting on the quay }
    ownedPlots: {},           // "colonyId:plotIndex" -> { auto, cropId }: the plots the player bought
    shipments: [],            // { id, cropId, hubId, units, dueDay, colonyId }
    nextShipmentId: 1,
    portGoods: {}             // cityId -> { cropId: crates landed at the exchange }
  };

  window.ArtRaceGame = { G: G, shared: null, api: null };
})();
