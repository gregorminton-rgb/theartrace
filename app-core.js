/* =========================================================================
 * app-core.js — state, helpers, actions, clock, render entry.
 * Split out of the former single-file app.js. The load order in
 * index.html is fixed: app-core.js first, because it owns G.
 * ========================================================================= */
(function () {
  'use strict';

  /* The former app.js was one closure. Every other app-*.js now re-declares
     these same objects under the same names, so nothing else had to change. */
  var A = window.ArtRace;
  var CFG = A.CFG;
  /* --- later modules (app-art / app-map / app-trade / app-shell) ----------
     These files load *after* this one, so their functions must be reached
     through their published objects at call time, never by bare name. */
  var renderBackdrop = function () { if (A.art) A.art.renderBackdrop(); };
  function viaModule(obj, name) {
    return function () {
      var m = A[obj];
      if (!m || typeof m[name] !== 'function') return undefined;
      return m[name].apply(null, arguments);
    };
  }
  var syncWorldMap = viaModule('mapView', 'sync');
  var renderMarket = viaModule('trade', 'renderMarket');
  var renderNews = viaModule('trade', 'renderNews');
  var renderStations = viaModule('trade', 'renderStations');
  var renderTicker = viaModule('trade', 'renderTicker');
  var renderPanel = viaModule('trade', 'renderPanel');
  var stopClock = viaModule('shell', 'stopClock');
  var endGame = viaModule('shell', 'endGame');

  var renderBackdrop = function () { if (A.art) A.art.renderBackdrop(); };
  /* colony economy, published by app-crew.js (loaded just before this file) */
  var crew = window.ArtRaceCrew;
  var PLOTS_PER_COLONY = crew.PLOTS_PER_COLONY, MAX_FIELD_WORKERS = crew.MAX_FIELD_WORKERS;
  var MAX_COLONY_WORKERS = crew.MAX_COLONY_WORKERS, WORKER_HIRE_COST = crew.WORKER_HIRE_COST;
  var WORKER_YIELD = crew.WORKER_YIELD, UPGRADES = crew.UPGRADES;
  var plotField = crew.plotField, fieldGrowthRate = crew.fieldGrowthRate;
  var fieldDaysLeft = crew.fieldDaysLeft, fieldYield = crew.fieldYield;
  var colonyAssigned = crew.colonyAssigned, colonyIdle = crew.colonyIdle;
  var colonyHeldUnits = crew.colonyHeldUnits, endColonyDay = crew.endColonyDay;
  /* colony tables, published by app-colonies.js (loaded just before this file) */
  var CROP_BY_ID = A.colonies.CROP_BY_ID, COLONY_BY_ID = A.colonies.COLONY_BY_ID;
  var CROPS = A.colonies.CROPS, cropPrice = A.colonies.cropPrice;
  var sailToColony = A.colonies.sailToColony, sailBack = A.colonies.sailBack;
  var openColony = A.colonies.openColony, renderColony = A.colonies.renderColony;

  /* ---------- tiny DOM helpers ---------------------------------------- */
  function el(id) { return document.getElementById(id); }
  function h(s) { return String(s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  }); }
  function show(node, on) { node.hidden = !on; }

  var MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
  /* Day 1 is 1 January of startYear, so the calendar page matches the career clock. */
  function dateOf(day) {
    var d = new Date(CFG.startYear, 0, 1);
    d.setDate(d.getDate() + (day - 1));
    return { day: d.getDate(), month: MONTHS[d.getMonth()], year: d.getFullYear() };
  }

  /* ---------- the one game state object -------------------------------- */
  /* The literal lives in app-state.js; this is the very same object. */
  var G = window.ArtRaceGame.G;

  function log(line) {
    G.log.unshift({ day: G.day, text: line });
    if (G.log.length > 120) G.log.pop();
  }

  /* ReputationModel.Change clamps to ReputationModel.Max (100) on the Unity
     side and never lets a record go below zero. The web build tracks one
     overall score instead of a per-city record, so the same clamp applies -
     otherwise a bad run of debt calls could push the loan ceiling negative. */
  function rep(delta) {
    if (!delta) return 0;
    var before = G.reputation;
    G.reputation = Math.max(0, Math.min(100, G.reputation + delta));
    return G.reputation - before;                 // the delta actually applied
  }

  /* ---------- new game -------------------------------------------------- */
  function newGame(opts) {
    /* A new career always un-latches the end flag: the shell resets it on its
       own path, but the module API is also called directly (headless tools). */
    G.ended = false;
    G.name = opts.name || 'Henry';
    G.difficulty = opts.difficulty || 'Normal';
    G.seed = (opts.seed | 0) || (Math.floor(Math.random() * 1e9) + 1);
    G.rng = A.makeRng(G.seed);
    G.careerDays = A.DURATIONS[opts.durationIndex || 1].days;
    var diff = A.DIFFICULTY[G.difficulty];
    G.feeFactor = diff.fee;
    G.targetWorth = Math.round(CFG.targetNetWorth * diff.target);
    G.cash = Math.round(CFG.startingMoney * diff.startingMoney);
    G.day = 1;
    G.cityId = opts.cityId || 'amsterdam';
    G.loan = 0;
    G.reputation = CFG.startingReputation;
    G.capacity = CFG.startingPortfolioCapacity;
    G.portfolio = [];
    G.stock = {};
    G.restockDay = {};
    G.lots = [];
    G.auctionDay = 0;
    G.auctionCityId = null;
    G.nextUid = 1;
    G.log = [];
    G.history = [];
    G.colonyId = null;
    G.colonyReturnCityId = null;
    G.voyage = null;
    G.mapPick = null;
    G.fields = [];
    G.goods = {};
    G.workers = {};
    G.nextFieldId = 1;
    G.selectedFieldId = null;
    G.plantCropId = null;
    G.colonyStats = { planted: 0, harvested: 0, sold: 0, revenue: 0 };
    G.market = A.createMarket(G.rng);
    G.started = true;

    A.cities.forEach(function (c) { stockCity(c.id); });
    syncAuction();

    log('Career begins in ' + A.city(G.cityId).name + ' with ' + A.money(G.cash) +
        ' and ' + G.careerDays + ' days to fill the crates.');
    log('Goal: hold as many pictures as you can when the ' + G.careerDays +
        '-day career ends — starting crates ' + G.capacity + ' of ' + CFG.maxPortfolioCapacity + '.');
    log('Seed ' + G.seed + ' · ' + G.difficulty + ' · ' + A.DURATIONS[opts.durationIndex || 1].label + ' career.');
  }

  /* ---------- instance factories --------------------------------------- */
  var FAKE_ODDS = { known: 0.55, prone: 0.30, clean: 0.05 };

  function fakeChance(w) {
    if (w.hasKnownForgery) return FAKE_ODDS.known;
    var a = A.artistById[w.artistId];
    return (a && a.forgeryProne) ? FAKE_ODDS.prone : FAKE_ODDS.clean;
  }

  function makeInstance(w, condition, isFake, provenance) {
    return {
      uid: G.nextUid++,
      defId: w.id,
      condition: A.clamp(condition, 0.05, 1),        // ConditionBands.Min
      authenticity: 'Unexamined',                    // AuthenticityState
      isFake: isFake,                                // m_GroundTruthIsFake
      purchasePrice: 0,
      purchaseCityId: null,
      purchaseDay: 0,
      provenance: provenance || 'Private collection',
      restoreReadyDay: -1,
      pendingRestore: 0
    };
  }

  /* Dealer stock: rarity makes a piece rarer on the shelf, condition jitters
   * around the artwork's m_TypicalCondition. */
  function stockCity(cityId) {
    var c = A.cityById[cityId];
    var size = c.dealerStockSize;
    if (G.reputation >= CFG.reputationForPremiumStock) size += 1;   // premium stock
    var offers = [];
    for (var i = 0; i < size; i++) {
      var w = G.rng.weighted(A.works, function (x) { return 11 - x.rarity; });
      var cond = A.clamp(w.typicalCondition + G.rng.range(-0.15, 0.15), 0.05, 1);
      var fake = G.rng.chance(fakeChance(w));
      var inst = makeInstance(w, cond, fake, c.name + ' dealer stock');
      inst.quirk = A.clamp(G.rng.range(0.85, 1.15), 0.4, 2);        // dealerQuirk
      offers.push(inst);
    }
    G.stock[cityId] = offers;
    G.restockDay[cityId] = G.day;
  }

  function restockIfNeeded() {
    A.cities.forEach(function (c) {
      if (!G.stock[c.id] || G.day - G.restockDay[c.id] >= CFG.dealerRestockDays) stockCity(c.id);
    });
  }
  /* ---------- pricing helpers used by the UI --------------------------- */
  function idxOf(w, cityId) {
    return A.sliceIndex(G.market, A.cityById[cityId], A.workEpoch(w));
  }
  function askOf(inst) {
    var w = A.work(inst.defId);
    return A.dealerAsk(w, inst, A.city(G.cityId), idxOf(w, G.cityId), dateOf(G.day).year, G.reputation, inst.quirk);
  }
  function bidOf(inst) {
    var w = A.work(inst.defId);
    return A.dealerBid(w, inst, A.city(G.cityId), idxOf(w, G.cityId), dateOf(G.day).year, G.reputation);
  }
  function valueOf(inst) {
    var w = A.work(inst.defId);
    return A.marketValue(w, inst, A.city(G.cityId), idxOf(w, G.cityId), dateOf(G.day).year);
  }
  function netWorth() {
    var assets = 0;
    G.portfolio.forEach(function (p) { assets += valueOf(p); });
    return G.cash + assets - G.loan;
  }

  /* ---------- actions -------------------------------------------------- */
  function buyOffer(uid) {
    var here = G.stock[G.cityId] || [];
    var i = -1;
    here.forEach(function (o, n) { if (o.uid === uid) i = n; });
    if (i < 0) return;
    if (G.portfolio.length >= G.capacity) {
      log('No free crate space — buy a slot at the bank for ' + A.money(CFG.extraSlotPrice) + '.');
      return;
    }
    var inst = here[i];
    var price = askOf(inst);
    if (price > G.cash) { log('Cannot afford ' + A.work(inst.defId).title + ' at ' + A.money(price) + '.'); return; }
    G.cash -= price;
    inst.purchasePrice = price;
    inst.purchaseCityId = G.cityId;
    inst.purchaseDay = G.day;
    inst.provenance = 'Bought from a ' + A.city(G.cityId).name + ' dealer (day ' + G.day + ')';
    G.portfolio.push(inst);
    here.splice(i, 1);
    rep(CFG.reputationPerPurchase);
    G.stats.buys += 1;
    log('Bought ' + A.work(inst.defId).title + ' for ' + A.money(price) + '.');
    checkEnd();
  }

  function sellOwned(uid) {
    var p = findOwned(uid);
    if (!p || busy(p)) return;
    var price = bidOf(p);
    var w = A.work(p.defId);
    G.cash += price;
    var profit = price - p.purchasePrice;
    G.portfolio.splice(G.portfolio.indexOf(p), 1);
    G.stats.sells += 1;
    if (profit > G.stats.bestProfit) G.stats.bestProfit = profit;
    if (profit < G.stats.worstProfit) G.stats.worstProfit = profit;
    if (p.isFake) G.stats.forgery += 1;
    if (profit > 0) {
      rep(CFG.reputationPerProfitableSale);
      log('Sold ' + w.title + ' for ' + A.money(price) + ' (profit ' + A.money(profit) + ').');
    } else {
      log('Sold ' + w.title + ' for ' + A.money(price) + ' (loss ' + A.money(-profit) + ').');
    }
    if (p.authenticity === 'RevealedForgery') {
      var lost = -rep(-CFG.reputationPenaltyForgery);
      log('The dealer spotted the forgery you passed on. Reputation -' + lost + '.');
    }
    checkEnd();
  }

  function findOwned(uid) {
    var found = null;
    G.portfolio.forEach(function (p) { if (p.uid === uid) found = p; });
    return found;
  }
  function busy(p) {
    if (p.restoreReadyDay >= 0 && G.day < p.restoreReadyDay) {
      log('That piece is still on the easel at the studio.');
      return true;
    }
    return false;
  }

  function buySlot() {
    if (G.slotsBought >= CFG.crateSpacePurchaseLimit) { log('You have bought every crate slot you are allowed.'); return; }
    if (G.capacity >= CFG.maxPortfolioCapacity) { log('The warehouse is as big as it gets.'); return; }
    if (G.cash < CFG.extraSlotPrice) { log('Not enough cash for another crate slot.'); return; }
    G.cash -= CFG.extraSlotPrice;
    G.capacity += 1;
    G.slotsBought += 1;
    log('Bought a crate slot for ' + A.money(CFG.extraSlotPrice) + '. Capacity ' + G.capacity + '.');
  }
  function borrow(amount) {
    var ceiling = A.loanCeiling(G.reputation);
    amount = Math.min(Math.max(0, amount | 0), ceiling - G.loan);
    if (amount <= 0) { log('The bank will not lend you more (ceiling ' + A.money(ceiling) + ').'); return; }
    G.loan += amount;
    G.cash += amount;
    if (G.debtSince < 0) G.debtSince = G.day;
    log('Borrowed ' + A.money(amount) + '. Debt ' + A.money(G.loan) + ' at ' + A.pct(CFG.dailyLoanInterest) + '/day.');
  }
  function repay(amount) {
    amount = Math.min(amount | 0, G.cash, G.loan);
    if (amount <= 0) { log('Nothing to repay.'); return; }
    G.cash -= amount;
    G.loan -= amount;
    if (G.loan <= 0) { G.loan = 0; G.debtSince = -1; }
    log('Repaid ' + A.money(amount) + '. Debt ' + A.money(G.loan) + '.');
  }

  /* Expert office: ArtworkInstance.MarkExaminedVerdict, with expertErrorChance. */
  function examine(uid) {
    var p = findOwned(uid);
    if (!p) return;
    if (!A.city(G.cityId).hasExpertOffice) { log('No expert in ' + A.city(G.cityId).name + '.'); return; }
    var fee = A.expertiseFee(G.feeFactor);
    if (G.cash < fee) { log('The expert charges ' + A.money(fee) + '.'); return; }
    G.cash -= fee;
    var verdict = p.isFake;
    if (G.rng.chance(CFG.expertErrorChance)) verdict = !verdict;
    p.authenticity = verdict ? 'RevealedForgery' : 'Authenticated';
    var w = A.work(p.defId);
    if (verdict) {
      rep(-Math.round(CFG.reputationPenaltyForgery / 2));
      log('Expert calls ' + w.title + ' a FORGERY. It now trades at ' + A.pct(CFG.forgeryValueMultiplier) + '.');
    } else {
      log('Expert authenticates ' + w.title + ' (' + A.money(fee) + ').');
    }
  }

  /* Restoration studio: the gain is booked now and lands when you collect it. */
  function restore(uid, gain) {
    var p = findOwned(uid);
    if (!p) return;
    if (!A.city(G.cityId).hasRestorationStudio) { log('No restoration studio here.'); return; }
    if (p.restoreReadyDay >= 0 && G.day < p.restoreReadyDay) { log('Already in the studio.'); return; }
    gain = Math.min(gain, CFG.restorationMaxGain, 1 - p.condition);
    if (gain <= 0.005) { log('Nothing left to restore on that piece.'); return; }
    var cost = A.restorationCost(gain);
    if (G.cash < cost) { log('The studio wants ' + A.money(cost) + ' for that job.'); return; }
    G.cash -= cost;
    p.pendingRestore = gain;
    p.restoreReadyDay = G.day + A.restorationDays(gain);
    log('Booked ' + A.pct(gain) + ' of restoration for ' + A.money(cost) + ', ready on day ' + p.restoreReadyDay + '.');
  }
  function collect(uid) {
    var p = findOwned(uid);
    if (!p || p.restoreReadyDay < 0 || G.day < p.restoreReadyDay) return;
    var gain = p.pendingRestore;
    p.condition = A.clamp(p.condition + gain, 0.05, 1);
    p.pendingRestore = 0;
    p.restoreReadyDay = -1;
    log('Collected ' + A.work(p.defId).title + ' from the studio (+' + A.pct(gain) + ' condition).');
  }

  /* ---------- journeys --------------------------------------------------- *
   * A crossing is a state, not a jump: G.voyage holds the leg and the chart
   * animates the hull along it while the days tick by in advanceDay(). The
   * player is "between ports" meanwhile — G.cityId still names the port of
   * departure until arriveIfDue() hands them over to the new one.
   * ---------------------------------------------------------------------- */
  var VOYAGE_SEA = 0.11;   // map widths; below this the leg is done by rail

  function voyageRoute(from, to) {
    if (window.ArtRaceMap && window.ArtRaceMap.available) {
      var r = window.ArtRaceMap.buildRoute(from.mapX, from.mapY, to.mapX, to.mapY);
      if (r) return r;
    }
    return { pts: [{ x: from.mapX, y: from.mapY }, { x: to.mapX, y: to.mapY }], glyph: 'ship' };
  }

  /* from: the place the ship actually leaves — a city, or the plantation the
     player is standing on. Defaults to the current port. */
  function beginVoyage(to, days, price, freight, crates, forceColonyId, from) {
    from = from || A.city(G.cityId);
    /* Rio and San Francisco are art cities *and* colony ids. A voyage started
       from a city must always end in a city unless the caller explicitly asked
       for the plantation, so the colony twin only counts on request. */
    var colonyId = forceColonyId || to.colonyId
      || (COLONY_BY_ID[to.id] && !A.city(to.id) ? to.id : null);
    var toName = to.name || to.label || to.id;
    if (colonyId) toName = COLONY_BY_ID[colonyId].label;
    var route = voyageRoute(from, to);
    /* the chart wants its own copy with an arc-length table, so the hull can
       be placed at any point of the line, not only at a vertex */
    var path = window.ArtRaceMap && window.ArtRaceMap.buildRoute
      ? window.ArtRaceMap.buildRoute(from.mapX, from.mapY, to.mapX, to.mapY)
      : null;
    G.voyage = {
      fromId: from.id, toId: to.id, toName: toName, colonyId: colonyId,
      days: days, remaining: days, startDay: G.day, label: from.name + ' → ' + toName,
      route: route.pts, glyph: route.glyph,
      path: path || { pts: route.pts, glyph: route.glyph }
    };
    log('You set out for ' + toName + ': ' + A.money(price) +
        ' ticket' + (freight ? ', ' + A.money(freight) + ' freight for ' + crates + ' crate(s)' : '') +
        ', ' + days + ' day(s) ' + (route.glyph === 'rail' ? 'by rail' : 'at sea') + '.');
  }

  /* Called once per day from advanceDay(). Arrival settles provenance, the
     transit damage roll and the restock, so the whole leg behaves exactly as
     the old instant jump did — only spread over real days. */
  function arriveIfDue() {
    var v = G.voyage;
    if (!v) return;
    /* A leg of N days leaves on day D and lands after day D+N-1, so it is due
       the moment the day counter reaches startDay + days. */
    v.remaining = Math.max(0, (v.startDay + v.days) - G.day);
    if (v.remaining > 0) return;
    if (G.ended) { G.voyage = null; return; }

    /* Resolve the port before clearing the voyage, so a bad id can never throw
       out of advanceDay() and leave the calendar frozen. */
    var to = v.colonyId ? null : A.city(v.toId);

    G.voyage = null;
    G.mapPick = null;
    if (v.colonyId) {
      /* The colony screen has its own clock (sailBack), so the global one is
         paused. Never fall through to the city arrival below: that would
         close a colony the player has not even seen. */
      stopClock();
      G.colonyReturnCityId = G.cityId;
      G.colonyId = v.colonyId;
      G.colonyMenu = 'plantage';
      G.selectedFieldId = null;
      G.plantCropId = null;
      log('Arrived at ' + v.toName + ' on day ' + G.day + '.');
      G.view = 'dealer';
      try {
        openColony();
      } catch (err) {
        /* A broken colony screen must not swallow the arrival. */
        log('WARNING: the colony screen failed to open (' + err.message + '). You stay in ' + v.toName + '.');
      }
      return;
    }

    if (!to) {
      log('The crossing to ' + v.toName + ' fell through — you are still in ' +
          A.city(G.cityId).name + '.');
      return;
    }

    G.cityId = v.toId;
    G.portfolio.forEach(function (p) {
      if (G.rng.chance(CFG.travelConditionRiskPerDay * v.days)) {
        p.condition = A.clamp(p.condition - G.rng.range(0.02, 0.08), 0.05, 1);
        log(A.work(p.defId).title + ' was jolted in transit.');
      }
      p.provenance += ' -> ' + to.name + ' (day ' + G.day + ')';
    });
    log('Arrived in ' + to.name + ' on day ' + G.day + '.');
    restockIfNeeded();
    syncAuction();
    if (G.view === 'travel') G.view = 'dealer';
    /* Auto-day is a "carry me across" switch, so docking switches it off; the
       player wanted the crossing, not the days spent standing in the new
       port. The colony branch above stops the clock for the same reason.
       stopClock() also clears the interval, so the tick that landed here can
       never roll one further day into the arrival. */
    stopClock();
  }

  /* Travel office: ticket price and duration come straight off the map distance. */
  function cityTravel(cityId) {
    var from = A.city(G.cityId);
    var to = A.city(cityId);
    if (!to || cityId === G.cityId) return;
    if (G.voyage) { log('You are already en route to ' + G.voyage.toName + '.'); return; }
    var price = A.ticketPrice(from, to);
    var days = A.ticketDays(from, to);
    if (price > G.cash) { log('The ticket to ' + to.name + ' costs ' + A.money(price) + '.'); return; }
    /* Passenger fare only: freight applies to goods shipped from plantations,
       not to the player's own crossings. */
    G.cash -= price;
    beginVoyage(to, days, price, 0, 0);
    checkEnd();
  }

  /* A colony id may also name an art city (Rio, San Francisco). There the
     colony passage starts a voyage whose arrival needs a city address, so the
     art city wins; every other id opens the plantation screen. */
  function travelTo(cityId) {
    if (G.colonyId) {
      log('You are ashore on the plantation — sail back to port first.');
      return;
    }
    if (COLONY_BY_ID[cityId] && !A.city(cityId)) { sailToColony(cityId); return; }
    cityTravel(cityId);
  }

  /* ---------- auction house -------------------------------------------- */
  /* How hard the paddles push a lot. data.js authors the raw aggression; the
     web-only scale keeps the auction room the cheap channel (see
     auctionAggressionScale in engine.js) without touching generated data. */
  function aggression() {
    return CFG.rivalAggression * CFG.auctionAggressionScale;
  }

  function rivalCount() {
    var base = CFG.rivalBidderCount + A.DIFFICULTY[G.difficulty].rivals;
    return Math.max(0, Math.min(8, base));
  }

  /* Every lot has a hidden ceiling per rival paddles; the player wins once the
   * bid passes the richest rival. Reserve and increment are the authored ratios. */
  /* A sale list belongs to exactly one city and to one sale day. It is posted
   * `auctionLeadDays` ahead of the hammer so the player can read the catalogue,
   * and bids are taken only on the sale day, only in that room. */
  function saleLeadDays() { return Math.max(1, CFG.auctionLeadDays || 3); }

  /* The catalogue is on display: right city, list drawn, sale not yet hammered. */
  function auctionListUp() {
    var city = A.city(G.cityId);
    if (!city || !city.hasAuctionHouse) return false;
    if (G.auctionCityId !== city.id || !G.lots.length) return false;
    return G.day >= G.auctionDay - saleLeadDays() && G.day <= G.auctionDay;
  }

  /* Bidding is possible only on the sale day itself. */
  function auctionOpenHere() {
    return auctionListUp() && G.day === G.auctionDay;
  }

  /* Days until the hammer falls in this room; 0 means it falls today. */
  function daysToAuction() {
    var city = A.city(G.cityId);
    if (!city || !city.hasAuctionHouse) return -1;
    return Math.max(0, G.auctionDay - G.day);
  }

  function drawAuction() {
    var city = A.city(G.cityId);
    var lots = [];
    for (var i = 0; i < CFG.auctionLotCount; i++) {
      var w = G.rng.weighted(A.works, function (x) { return 11 - x.rarity; });
      var cond = A.clamp(w.typicalCondition + G.rng.range(-0.2, 0.1), 0.05, 1);
      var inst = makeInstance(w, cond, G.rng.chance(fakeChance(w)), city.name + ' auction lot');
      var idx = A.sliceIndex(G.market, city, A.workEpoch(w));
      var mv = A.marketValue(w, inst, city, idx, dateOf(G.day).year);
      var best = 0;
      for (var r = 0; r < rivalCount(); r++) {
        var ceiling = mv * (0.7 + aggression() * G.rng.range(0.35, 1.15));
        best = Math.max(best, ceiling);
      }
      lots.push({
        inst: inst,
        reserve: Math.max(1, Math.round(mv * CFG.auctionReserveRatio)),
        low: A.estimateLow(w, inst, city, idx, dateOf(G.day).year),
        high: A.estimateHigh(w, inst, city, idx, dateOf(G.day).year),
        bid: Math.max(1, Math.round(mv * CFG.auctionReserveRatio)),
        rivalCeiling: Math.round(best),
        leader: 'room',
        closed: false
      });
    }
    G.lots = lots;
    G.auctionCityId = city.id;
  }

  /* Keeps the sale calendar honest: draw the catalogue when its window opens,
   * drop it when the hammer has fallen, and schedule the next sale. */
  function syncAuction() {
    var city = A.city(G.cityId);
    var hasRoom = !!(city && city.hasAuctionHouse);
    /* Away from an auction house the calendar is kept, not wiped: the player
       should still know when the hammer falls where they last stood. The
       city check in auctionListUp() already hides a foreign sale list. */
    if (!hasRoom) return;
    if (G.auctionCityId !== city.id) {
      /* a different room: its own calendar starts a couple of days out */
      G.auctionCityId = city.id;
      G.lots = [];
      G.auctionDay = Math.max(G.auctionDay, G.day + (CFG.auctionPreDays || 2));
    }
    if (G.day > G.auctionDay) {
      G.auctionDay = G.day + CFG.auctionIntervalDays;
      G.lots = [];
    }
    if (!G.lots.length && G.day >= G.auctionDay - saleLeadDays()) drawAuction();
  }

  function buildAuction() {
    G.auctionCityId = null;
    syncAuction();
  }

  function bidLot(index) {
    if (!auctionOpenHere()) {
      log('The hammer is still \u2014 bids are only taken on the sale day, in the room.');
      return;
    }
    var lot = G.lots[index];
    if (!lot || lot.closed) return;
    if (G.portfolio.length >= G.capacity) { log('No crate space left for a auction win.'); return; }
    var step = Math.max(1, Math.round(lot.bid * CFG.auctionIncrementRatio));
    lot.bid += step;
    if (lot.bid > lot.rivalCeiling) {
      var total = Math.round(lot.bid * (1 + CFG.auctionCommission));
      if (total > G.cash) {
        lot.closed = true;
        log('You won lot ' + (index + 1) + ' but cannot settle ' + A.money(total) + '. The room resold it.');
        return;
      }
      lot.closed = true;
      lot.leader = 'you';
      G.cash -= total;
      var inst = lot.inst;
      inst.purchasePrice = total;
      inst.purchaseCityId = G.cityId;
      inst.purchaseDay = G.day;
      inst.provenance = 'Won at ' + A.city(G.cityId).name + ' auction (day ' + G.day + ')';
      G.portfolio.push(inst);
      rep(CFG.reputationPerAuctionWin);
      G.stats.hammer += 1;
      log('Hammer! ' + A.work(inst.defId).title + ' for ' + A.money(lot.bid) +
          ' + ' + A.pct(CFG.auctionCommission) + ' commission = ' + A.money(total) + '.');
    } else {
      lot.leader = 'room';
      log('Lot ' + (index + 1) + ': your ' + A.money(lot.bid) + ' is outbid by the room.');
    }
    checkEnd();
  }

  function passLot(index) {
    if (!auctionOpenHere()) {
      log('The room is not taking bids to-day.');
      return;
    }
    var lot = G.lots[index];
    if (!lot || lot.closed) return;
    lot.closed = true;
    lot.leader = 'room';
    log('Lot ' + (index + 1) + ' sold to the room for ' + A.money(lot.bid) + '.');
  }

  /* ---------- the clock ------------------------------------------------ */
  function advanceDay(silent) {
    G.day += 1;

    if (G.loan > 0) {
      var interest = Math.round(G.loan * CFG.dailyLoanInterest);
      G.loan += interest;
      if (interest > 0) log('Bank interest +' + A.money(interest) + ' on your debt.');

      /* Late fee once the grace period runs out. The reputation hit always
         lands; the cash fee only if the purse can cover it. (Previously the
         penalty was applied twice on the cash-poor branch.) */
      var inDebt = G.day - G.debtSince;
      if (inDebt > CFG.loanGraceDays) {
        if (G.cash >= CFG.loanPenaltyPerDay) {
          G.cash -= CFG.loanPenaltyPerDay;
          log('Late fee ' + A.money(CFG.loanPenaltyPerDay) + ' (' + inDebt + ' days in debt).');
        }
        rep(-CFG.loanOverdueRepPenalty);
      }
      /* … and a debt call that seizes crates. The debt clock restarts from the
         call, so a debt that survives one seizure faces the next a full period
         later instead of losing a crate every single day. */
      if (inDebt >= CFG.debtCallAfterDays) {
        var seized = Math.min(CFG.debtCallSeizeArtworks, G.portfolio.length);
        var raised = 0;
        for (var s = 0; s < seized; s++) {
          var p = G.portfolio.shift();
          raised += Math.round(bidOf(p) * 0.5);
        }
        G.cash += raised;
        G.loan = Math.max(0, G.loan - raised);
        var called = -rep(-CFG.debtCallReputationPenalty);
        G.debtSince = G.loan > 0 ? G.day : -1;
        log('DEBT CALL — the bank seized ' + seized + ' crate(s), raising ' + A.money(raised) +
            '. Reputation -' + called + '.');
      }
    } else {
      G.debtSince = -1;
    }

    G.portfolio.forEach(function (p) {
      p.condition = A.clamp(p.condition - CFG.dailyConditionDecay, 0.05, 1);   // dailyConditionDecay
      if (p.restoreReadyDay >= 0 && G.day >= p.restoreReadyDay && p.pendingRestore > 0) {
        collect(p.uid);
      }
    });

    /* Colony fields grow toward ripeness on the same clock, sped by workers
       and field upgrades. */
    G.fields.forEach(function (f) {
      if (f.ripe) return;
      f.progress = Math.min(1, f.progress + fieldGrowthRate(f));
      if (f.progress >= 1) {
        f.ripe = true;
        log(CROP_BY_ID[f.cropId].label + ' field is ready to harvest.');
      }
    });

    /* A plantation with a standing order runs itself: the overseer harvests,
       re-sows and pays hands even while the player is in Europe. Crates that
       were loaded onto a ship reach their exchange on the same clock. */
    if (crew.runOverseers) crew.runOverseers();
    if (crew.runShipping) crew.runShipping();

    A.advanceMarket(G.market, G.rng);
    A.expireEvents(G.market, G.day);

    /* EconomyManager: roll a headline with eventChance each morning. */
    if (G.rng.chance(CFG.eventChance)) {
      var ev = A.rollEvent(G.market, G.day, G.rng);
      G.history.unshift({ day: G.day, headline: ev.headline, body: ev.body, ends: ev.endDay,
                          category: ev.category, scope: ev.scope, multiplier: ev.multiplier });
      log('NEWS: ' + ev.headline + ' (' + A.pct(ev.multiplier - 1) + ', until day ' + ev.endDay + ')');
    }

    restockIfNeeded();
    syncAuction();
    if (!silent && CFG.logDailyMoves) log('Day ' + G.day + ' opened.');
    arriveIfDue();
    checkEnd();
  }

  function checkEnd() {
    if (!G.started || G.ended) return;
    /* The career is a race for paintings, not for money: it always runs the
       full 180 days and the result is how many canvases are still in the
       crates at the end. Reaching a net-worth target no longer ends it early —
       you may want to spend every last dollar on one more picture.
       G.ended is set here, not only in the end-of-career dialog, so a headless
       harness without app-shell.js can still see that the race is over. */
    if (G.day > G.careerDays) { G.ended = true; endGame(); }
  }
  /* =====================================================================
   * RENDER
   * ===================================================================== */
  var VIEW_TITLES = {
    dealer: 'Dealer gallery', portfolio: 'Your warehouse', auction: 'Auction house',
    bank: 'Bank', studio: 'Restoration studio', travel: 'Travel office', trade: 'Trade desk', report: 'Career report'
  };

  function renderAll() {
    renderHud();
    renderBackdrop();
    renderMarket();
    renderNews();
    renderStations();
    renderPanel();
    renderTicker();
    syncWorldMap();
  }

  function renderHud() {
    /* A plantation id is not in the city table, so A.city() is null out there;
       the HUD then names the colony instead of a gallery. */
    var c = A.city(G.cityId);
    var colony = G.colonyId ? COLONY_BY_ID[G.colonyId] : null;
    el('hud-city').textContent = colony ? colony.label + ' plantation'
      : (c ? 'Gallery in ' + c.name : 'At sea');
    /* No day counter here: the calendar right next to it already shows the
       date, and two day numbers in one corner only cost space. */
    el('hud-sub').textContent = colony
      ? 'Colony' + (colony.sub ? ' · ' + colony.sub : '')
      : (c ? c.country + ' · ' + c.regionName : 'Under way');
    el('hud-cash').textContent = 'Cash ' + A.money(G.cash);
    el('hud-rep').textContent = 'Reputation ' + Math.round(G.reputation) + ' · debt ' + A.money(G.loan);
    /* The career is a race for pictures, so the chip counts crates:
       how many canvases are held, and what is still unfilled. */
    el('hud-goal').textContent = 'Pictures ' + G.portfolio.length + ' / ' + G.capacity +
      ' · net ' + A.money(netWorth());
    /* The calendar exists twice (HUD and colony bar); both copies show the
       same date, because the colony bar covers the HUD while ashore. */
    var d = dateOf(G.day);
    paintDate('cal', d);
    paintDate('colony-cal', d);
    /* app-audio.js decides from this same state whether music should run.
       Music is a nicety: if it ever throws, the screen must still draw. */
    if (window.ArtRaceAudio) {
      try { window.ArtRaceAudio.sync(); }
      catch (err) { if (window.console) console.warn('audio sync failed:', err.message); }
    }
  }

  function paintDate(prefix, d) {
    var day = el(prefix + '-day'), month = el(prefix + '-month'), year = el(prefix + '-year');
    if (day) day.textContent = d.day;
    if (month) month.textContent = d.month;
    if (year) year.textContent = d.year;
  }

  /* ---------- what the other app-*.js modules borrow --------------------- */
  window.ArtRaceGame = {
    G: window.ArtRaceGame.G,
    shared: {
      CFG: CFG, el: el, h: h, show: show,
      MONTHS: MONTHS, dateOf: dateOf, log: log, rep: rep,
      /* the one writer for the six calendar texts; app-shell.js calls it too,
         so the HUD and the colony bar can never drift apart */
      paintDate: paintDate,
      VIEW_TITLES: VIEW_TITLES
    },
    api: {
      G: window.ArtRaceGame.G, newGame: newGame, renderAll: renderAll,
      /* app-shell.js reassigns window.ArtRaceGame when it loads; these stay
         here so the clock is reachable from app-core as well. */
      advanceDay: advanceDay, netWorth: netWorth, buyOffer: buyOffer,
      sellOwned: sellOwned, travelTo: travelTo,
      /* the rest of the shared vocabulary the later modules call by name */
      askOf: askOf, valueOf: valueOf, idxOf: idxOf, rivalCount: rivalCount,
      findOwned: findOwned, checkEnd: checkEnd,
      beginVoyage: beginVoyage, voyageRoute: voyageRoute,
      /* player actions — app-shell.js wires these to the buttons */
      bidLot: bidLot, passLot: passLot, buySlot: buySlot,
      collect: collect, examine: examine, repay: repay,
      /* auction calendar — app-trade.js reads these instead of guessing */
      auctionOpenHere: auctionOpenHere, auctionListUp: auctionListUp,
      daysToAuction: daysToAuction, saleLeadDays: saleLeadDays
    }
  };
  A.shared = window.ArtRaceGame.shared;
  A.app = window.ArtRaceGame.api;
})();
