/* =========================================================================
 * app.js — game state + UI for The Great Art Race web prototype.
 * All numbers come from engine.js (ported Unity logic) and data.js
 * (generated from the Unity .asset files by tools/export-data.ps1).
 * ========================================================================= */
(function () {
  'use strict';

  var A = window.ArtRace;
  var CFG = A.CFG;

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
    colonyId: null,            // colony id while the colony screen is open
    colonyReturnCityId: null,  // city to sail back to on leaving
    colonyMenu: 'plantage',    // current colony menu tab (plantage, handel, lager, arbeiter)
    fields: [],                // laid-out plots: { id, colonyId, plotIndex, cropId, plantedDay, progress, ripe, workers, level }
    goods: {},                 // cropId -> units waiting in the colonial warehouse
    workers: {},               // colonyId -> number of workers hired there
    nextFieldId: 1,
    selectedFieldId: null,     // field open in the colony inspector
    plantCropId: null,         // crop armed for click-to-plant on a free plot
    colonyStats: { planted: 0, harvested: 0, sold: 0, revenue: 0 }
  };

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
    G.auctionDay = 1;
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
    buildAuction();

    log('Career begins in ' + A.city(G.cityId).name + ' with ' + A.money(G.cash) +
        ' and ' + G.careerDays + ' days to make ' + A.money(G.targetWorth) + '.');
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

  function beginVoyage(to, days, price, freight, crates) {
    var from = A.city(G.cityId);
    var route = voyageRoute(from, to);
    /* the chart wants its own copy with an arc-length table, so the hull can
       be placed at any point of the line, not only at a vertex */
    var path = window.ArtRaceMap && window.ArtRaceMap.buildRoute
      ? window.ArtRaceMap.buildRoute(from.mapX, from.mapY, to.mapX, to.mapY)
      : null;
    G.voyage = {
      fromId: from.id, toId: to.id, toName: to.name, colonyId: to.colonyId || null,
      days: days, remaining: days, startDay: G.day, label: from.name + ' → ' + to.name,
      route: route.pts, glyph: route.glyph,
      path: path || { pts: route.pts, glyph: route.glyph }
    };
    log('You set out for ' + to.name + ': ' + A.money(price) +
        ' ticket' + (freight ? ', ' + A.money(freight) + ' freight for ' + crates + ' crate(s)' : '') +
        ', ' + days + ' day(s) ' + (route.glyph === 'rail' ? 'by rail' : 'at sea') + '.');
  }

  /* Called once per day from advanceDay(). Arrival settles provenance, the
     transit damage roll and the restock, so the whole leg behaves exactly as
     the old instant jump did — only spread over real days. */
  function arriveIfDue() {
    var v = G.voyage;
    if (!v) return;
    v.remaining = Math.max(0, v.days - (G.day - v.startDay));
    if (v.remaining > 0) return;
    if (G.ended) { G.voyage = null; return; }

    G.voyage = null;
    G.mapPick = null;
    if (v.colonyId) {
      stopClock();
      G.colonyReturnCityId = G.cityId;
      G.colonyId = v.colonyId;
      G.colonyMenu = 'plantage';
      G.selectedFieldId = null;
      G.plantCropId = null;
      log('Arrived at ' + v.toName + ' on day ' + G.day + '.');
      G.view = 'dealer';
      openColony();
      return;
    }

    var to = A.city(v.toId);
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
    if (G.view === 'travel') G.view = 'dealer';
  }

  /* Travel office: ticket price and duration come straight off the map distance. */
  function travelTo(cityId) {
    var from = A.city(G.cityId);
    var to = A.city(cityId);
    if (!to || cityId === G.cityId) return;
    if (G.voyage) { log('You are already en route to ' + G.voyage.toName + '.'); return; }
    var price = A.ticketPrice(from, to);
    var days = A.ticketDays(from, to);
    if (price > G.cash) { log('The ticket to ' + to.name + ' costs ' + A.money(price) + '.'); return; }
    var crates = G.portfolio.length;
    var freight = crates * CFG.crateHandlingFee;
    G.cash -= price + freight;
    beginVoyage(to, days, price, freight, crates);
    checkEnd();
  }
  /* ---------- auction house -------------------------------------------- */
  function rivalCount() {
    var base = CFG.rivalBidderCount + A.DIFFICULTY[G.difficulty].rivals;
    return Math.max(0, Math.min(8, base));
  }

  /* Every lot has a hidden ceiling per rival paddles; the player wins once the
   * bid passes the richest rival. Reserve and increment are the authored ratios. */
  function buildAuction() {
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
        var ceiling = mv * (0.7 + CFG.rivalAggression * G.rng.range(0.35, 1.15));
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
    G.auctionDay = G.day + CFG.auctionIntervalDays;
  }

  function bidLot(index) {
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
    if (G.day >= G.auctionDay && A.city(G.cityId).hasAuctionHouse) {
      buildAuction();
      log('New sale list at the ' + A.city(G.cityId).name + ' auction house.');
    }
    if (!silent && CFG.logDailyMoves) log('Day ' + G.day + ' opened.');
    arriveIfDue();
    checkEnd();
  }

  function checkEnd() {
    if (!G.started) return;
    if (netWorth() >= G.targetWorth) endGame(true);
    else if (G.day > G.careerDays) endGame(false);
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
    var c = A.city(G.cityId);
    el('hud-city').textContent = 'Gallery in ' + c.name;
    el('hud-sub').textContent = c.country + ' · ' + c.regionName + ' · day ' + G.day + '/' + G.careerDays;
    el('hud-cash').textContent = 'Cash ' + A.money(G.cash);
    el('hud-rep').textContent = 'Reputation ' + Math.round(G.reputation) + ' · debt ' + A.money(G.loan);
    el('hud-goal').textContent = 'Net ' + A.money(netWorth()) + ' / goal ' + A.money(G.targetWorth);
    var d = dateOf(G.day);
    el('cal-day').textContent = d.day;
    el('cal-month').textContent = d.month;
    el('cal-year').textContent = d.year;
  }

  /* CSS-only "painting": the town palette from CityDefinition over an epoch tint. */
  var EPOCH_TINT = {
    Renaissance: ['#5a4326', '#c9a227'], Baroque: ['#2f2016', '#b08d57'],
    Rococo: ['#5b4a63', '#e0c3d0'], Romanticism: ['#1f3340', '#8fb6c9'],
    Impressionism: ['#25404f', '#a9d3c4'], Modern: ['#2a2a2e', '#e05a35'],
    Contemporary: ['#101418', '#57d1c8']
  };
  function rgb(a) { return 'rgb(' + Math.round(a[0] * 255) + ',' + Math.round(a[1] * 255) + ',' + Math.round(a[2] * 255) + ')'; }
  /* ---------- artwork pictures ------------------------------------------ *
   * artwork-images.js (written by tools/import-artwork-images.ps1) maps a
   * work id to a plate the user supplied. Only some works have one, so the
   * gradient/initial stays as the fallback everywhere.
   * ---------------------------------------------------------------------- */
  var ARTWORK = (window.ART_ARTWORK_IMAGES && window.ART_ARTWORK_IMAGES.images) || {};

  function artPicture(workId) { return ARTWORK[workId] || null; }

  function thumb(w) {
    var tint = EPOCH_TINT[A.workEpoch(w)] || EPOCH_TINT.Modern;
    var pic = artPicture(w.id);
    if (pic) {
      return '<span class="thumb thumb-art" title="' + h(w.title) + '">' +
             '<img src="' + h(pic.file) + '" alt="' + h(w.title) + '" loading="lazy">' +
             '</span>';
    }
    return '<span class="thumb" style="background:linear-gradient(135deg,' + tint[0] + ' 25%,' + tint[1] + ' 100%)">' +
           '<span class="thumb-init">' + h((A.artistById[w.artistId] || { name: '?' }).name.slice(0, 1)) + '</span></span>';
  }

  /* ---------- city backdrops -------------------------------------------- *
   * images.js (written by tools/import-images.ps1) maps a slug to a picture.
   * Only some cities have a master file so far, and a missing one falls back
   * to the generated town palette instead of leaving a hole in the frame.
   * ---------------------------------------------------------------------- */
  var IMAGES = (window.ART_IMAGES && window.ART_IMAGES.images) || {};

  function bareSlug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ''); }

  function pictureFor(slug) {
    if (!slug) return null;
    if (IMAGES[slug]) return IMAGES[slug];
    /* tolerate a master called "NewYork.jpg" for the id "newyork" */
    var want = bareSlug(slug);
    for (var key in IMAGES) { if (bareSlug(key) === want) return IMAGES[key]; }
    return null;
  }
  function cityPicture(city) {
    /* Firenze has no master plate of its own; it borrows the Venice picture
       the importer already produces from städte\venedig.jpg. */
    var alias = { firenze: 'venedig' };
    return pictureFor(alias[city.id] || city.id);
  }

  function renderBackdrop() {
    var c = A.city(G.cityId);
    var bd = el('backdrop');
    var pic = cityPicture(c);
    /* background-image/-color are set separately on purpose: the `background`
       shorthand would wipe the background-size/position from styles.css. */
    if (pic) {
      bd.classList.add('has-image');
      bd.style.backgroundColor = rgb(c.theme);
      bd.style.backgroundImage = 'url("' + pic.file + '")';
      el('backdrop-caption').textContent = c.name + ' — ' + c.description;
    } else {
      bd.classList.remove('has-image');
      bd.style.backgroundColor = 'transparent';
      bd.style.backgroundImage = 'linear-gradient(160deg,' + rgb(c.accent) + ' 0%,' +
        rgb(c.theme) + ' 45%,' + rgb(c.ground) + ' 120%)';
      el('backdrop-caption').textContent = c.name + ' — ' + c.description + ' · no picture imported yet';
    }
  }

  /* ---------- world map -------------------------------------------------- *
   * The travel office draws the imported world map (hd-08-world-map) and pins
   * every place of the trade network onto it. City pins reuse the mapX/mapY
   * the Unity data already ships (0..1 longitude/latitude); the trade hubs and
   * the colonies are authored here because they only exist as artwork, not as
   * CityDefinition entries. Clicking a pin opens its imported picture.
   * ---------------------------------------------------------------------- */
  var TRADE_HUB_IDS = { london: true, newyork: true };

  /* ---------- colonial plantations & crops --------------------------------
   * The colony economy: sail to a colony, lay out fields, grow a crop, then
   * sell the harvest at the London / New York trade desks. Colonies only exist
   * as artwork (kol1..kol6 + the commodity plates in new\), so the balance is
   * authored here.
   * ---------------------------------------------------------------------- */
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
    var crop = CROP_BY_ID[f.cropId];
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
    CROPS.forEach(function (c) { n += (G.goods[c.id] || 0); });
    return n;
  }

  function sailToColony(colonyId) {
    var colony = COLONY_BY_ID[colonyId];
    if (!colony || G.colonyId || !G.started || G.ended) return;
    if (G.voyage) { log('You are already en route to ' + G.voyage.toName + '.'); return; }
    var from = A.city(G.cityId);
    var price = A.ticketPrice(from, colony);
    var days = A.ticketDays(from, colony);
    if (price > G.cash) { log('The passage to ' + colony.label + ' costs ' + A.money(price) + '.'); return; }
    G.cash -= price;
    beginVoyage(colony, days, price, 0, 0);
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

  function plantCrop(cropId, plotIndex) {
    var crop = CROP_BY_ID[cropId];
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
    log('Harvested ' + yieldUnits + ' ' + CROP_BY_ID[f.cropId].label + ' unit(s) into the warehouse.');
    if (G.selectedFieldId === fid) G.selectedFieldId = null;
    renderColony();
  }

  function hireWorker() {
    var hired = colonyHired();
    if (hired >= MAX_COLONY_WORKERS) { log('The colony cannot house more workers.'); return; }
    if (G.cash < WORKER_HIRE_COST) { log('Hiring a worker costs ' + A.money(WORKER_HIRE_COST) + '.'); return; }
    G.cash -= WORKER_HIRE_COST;
    G.workers[G.colonyId] = hired + 1;
    log('Hired a worker at the ' + COLONY_BY_ID[G.colonyId].label + ' colony.');
    renderColony();
  }

  function assignWorker(fid) {
    var f = fieldById(fid);
    if (!f) return;
    if (f.workers >= MAX_FIELD_WORKERS) { log('That field already has ' + MAX_FIELD_WORKERS + ' workers.'); return; }
    if (colonyIdle() <= 0) { log('No idle workers — hire one first.'); return; }
    f.workers += 1;
    log('Assigned a worker to the ' + CROP_BY_ID[f.cropId].label + ' field.');
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
    log('Upgraded the ' + CROP_BY_ID[f.cropId].label + ' field to ' + next.label + '.');
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
    } else if (action === 'back') {
      sailBack();
    }
  }

  /* Trade desk (London / New York): sell the colonial harvest. */
  function viewTrade() {
    var hub = G.cityId;
    if (!TRADE_HUB_IDS[hub]) return '<p class="empty">No trade desk here — sell colonial produce in London or New York.</p>';
    var ids = CROPS.map(function (c) { return c.id; }).filter(function (k) { return (G.goods[k] || 0) > 0; });
    if (!ids.length) return '<p class="note">The ' + A.city(hub).name + ' trade desk buys colonial produce. You have nothing in the warehouse yet — sail to a colony, plant and harvest, then come back.</p>';
    var rows = ids.map(function (k) {
      var crop = CROP_BY_ID[k];
      var units = G.goods[k] || 0;
      var price = cropPrice(crop, hub);
      return '<div class="row"><div class="row-main">' + cropThumb(crop) + '<div>' +
        '<span class="title">' + h(crop.label) + '</span>' +
        '<span class="credit">' + units + ' unit(s) · ' + A.city(hub).name + ' pays ' + A.money(price) + ' each</span></div></div>' +
        '<div class="row-num"><span class="ask">' + A.money(price * units) + '</span>' +
        '<span class="est">' + A.money(price) + ' × ' + units + '</span></div>' +
        '<div class="row-btns">' +
        '<button class="btn sell" data-action="sell-goods" data-crop="' + k + '" data-units="' + units + '">Sell all</button>' +
        '<button class="btn" data-action="sell-goods" data-crop="' + k + '" data-units="1">Sell 1</button></div></div>';
    }).join('');
    return '<p class="note">Produce prices drift with the calendar; London and New York pay different rates.</p>' + rows;
  }

  function sellGoods(cropId, units) {
    var crop = CROP_BY_ID[cropId];
    var have = G.goods[cropId] || 0;
    units = Math.min(units | 0, have);
    if (!crop || units <= 0) return;
    var price = cropPrice(crop, G.cityId);
    var total = price * units;
    G.goods[cropId] = have - units;
    G.cash += total;
    G.colonyStats.sold += units;
    G.colonyStats.revenue += total;
    log('Sold ' + units + ' ' + crop.label + ' at ' + A.city(G.cityId).name + ' for ' + A.money(total) + '.');
    checkEnd();
  }

  function renderMarket() {
    var c = A.city(G.cityId);
    var rows = A.EPOCHS.map(function (e) {
      var i = A.sliceIndex(G.market, c, e);
      var ch = A.dailyChange(G.market, c, e);
      var arrow = ch > 0.004 ? '▲' : (ch < -0.004 ? '▼' : '■');
      var cls = ch > 0.004 ? 'up' : (ch < -0.004 ? 'down' : 'flat');
      var fav = c.favouriteEpochs.indexOf(e) >= 0 ? ' fav' : (c.bohemianEpochs.indexOf(e) >= 0 ? ' boh' : '');
      return '<tr class="' + cls + fav + '"><td>' + h(e) + '</td>' +
             '<td class="num">' + i.toFixed(3) + '</td>' +
             '<td class="num">' + (ch >= 0 ? '+' : '') + (ch * 100).toFixed(1) + '%</td>' +
             '<td class="arrow">' + arrow + '</td></tr>';
    }).join('');
    el('market-table').innerHTML = '<thead><tr><th>Epoch</th><th class="num">Index</th>' +
      '<th class="num">Day</th><th></th></tr></thead><tbody>' + rows + '</tbody>';
  }

  function renderNews() {
    var live = G.market.events.map(function (ev) {
      return '<li class="news live"><b>' + h(ev.headline) + '</b>' +
             '<span class="news-meta">' + h(ev.category) + ' · ' + h(ev.scope) +
             (ev.anyEpoch ? '' : ' · ' + h(ev.targetEpoch)) +
             ' · ' + (ev.multiplier >= 1 ? '+' : '') + ((ev.multiplier - 1) * 100).toFixed(0) + '% to day ' + ev.endDay + '</span></li>';
    });
    var old = G.history.slice(0, 6).map(function (ev) {
      return '<li class="news"><b>' + h(ev.headline) + '</b><span class="news-meta">day ' + ev.day + '</span></li>';
    });
    var list = live.concat(old);
    el('news-list').innerHTML = list.length ? list.join('') : '<li class="news">No news. The salerooms are quiet.</li>';
  }

  function renderStations() {
    var c = A.city(G.cityId);
    var nav = el('stations');
    Array.prototype.forEach.call(nav.querySelectorAll('.station'), function (b) {
      var v = b.getAttribute('data-view');
      var ok = true;
      if (v === 'auction') ok = c.hasAuctionHouse;
      if (v === 'bank') ok = c.hasBank;
      if (v === 'studio') ok = c.hasRestorationStudio;
      if (v === 'trade') ok = !!TRADE_HUB_IDS[c.id];
      b.disabled = !ok;
      b.classList.toggle('active', G.view === v);
    });
  }

  function renderTicker() {
    el('ticker-text').textContent = G.log.length ? G.log[0].text : 'Welcome to the trade.';
  }

  /* ---------- shared row markup ---------------------------------------- */
  function authTag(inst) {
    if (inst.authenticity === 'Authenticated') return '<span class="tag ok">authenticated</span>';
    if (inst.authenticity === 'RevealedForgery') return '<span class="tag bad">FORGERY</span>';
    return '<span class="tag warn">unexamined</span>';
  }
  function condTag(inst) {
    var band = A.conditionBand(inst.condition);
    var cls = inst.condition > 0.67 ? 'ok' : (inst.condition > 0.4 ? 'warn' : 'bad');
    return '<span class="tag ' + cls + '">' + h(band) + ' ' + Math.round(inst.condition * 100) + '</span>';
  }
  function rowHead(inst) {
    var w = A.work(inst.defId);
    var a = A.artistById[w.artistId];
    return '<div class="row-main">' + thumb(w) + '<div>' +
           '<span class="title">' + h(w.title) + '</span>' +
           '<span class="credit">' + h(a ? a.name : 'Unknown') + ', ' + w.yearCreated + ' · ' +
           h(w.typeName) + ' · rarity ' + w.rarity + '</span>' +
           '<span class="prov">' + h(inst.provenance) + '</span></div></div>';
  }
  /* ---------- panel views ---------------------------------------------- */
  function renderPanel() {
    var c = A.city(G.cityId);
    var view = G.view;
    if (view === 'auction' && !c.hasAuctionHouse) view = 'dealer';
    if (view === 'bank' && !c.hasBank) view = 'dealer';
    if (view === 'studio' && !c.hasRestorationStudio) view = 'dealer';
    if (view === 'trade' && !TRADE_HUB_IDS[c.id]) view = 'dealer';
    G.view = view;

    var head = '<div class="panel-head"><h2>' + h(VIEW_TITLES[view]) + '</h2>' +
               '<span class="panel-sub">' + h(c.name) + ' · ' + A.money(G.cash) + ' in hand · ' +
               G.portfolio.length + '/' + G.capacity + ' crates</span></div>';
    var body = '';
    if (view === 'dealer') body = viewDealer();
    else if (view === 'portfolio') body = viewPortfolio();
    else if (view === 'auction') body = viewAuction();
    else if (view === 'bank') body = viewBank();
    else if (view === 'studio') body = viewStudio();
    else if (view === 'travel') body = viewTravel();
    else if (view === 'trade') body = viewTrade();
    else body = viewReport();

    el('panel').innerHTML = head + body;
    var hint = el('panel-hint');
    hint.textContent = view === 'travel' ? 'Pick a city on the map or in the list to move the gallery there. Gold colony pins can be sailed to.' :
      view === 'auction' ? 'Bid until the room stops you, then settle the commission.' :
      view === 'trade' ? 'Sell the colonial harvest — London and New York pay different rates.' :
      view === 'dealer' ? 'Dealer asks are inflated, bids are low — reputation narrows the gap.' : '';
  }

  function viewDealer() {
    var offers = G.stock[G.cityId] || [];
    if (!offers.length) return '<p class="empty">The dealer’s shelves are bare until the next restock (day ' +
      (G.restockDay[G.cityId] + CFG.dealerRestockDays) + ').</p>';
    var city = A.city(G.cityId);
    var year = dateOf(G.day).year;
    var rows = offers.map(function (inst) {
      var w = A.work(inst.defId);
      var idx = idxOf(w, G.cityId);
      var ask = askOf(inst);
      var estLo = A.estimateLow(w, inst, city, idx, year);
      var estHi = A.estimateHigh(w, inst, city, idx, year);
      var afford = ask <= G.cash && G.portfolio.length < G.capacity;
      return '<div class="row' + (afford ? '' : ' dim') + '">' + rowHead(inst) +
        '<div class="row-tags">' + condTag(inst) + authTag(inst) + '</div>' +
        '<div class="row-num"><span class="ask">' + A.money(ask) + '</span>' +
        '<span class="est">consignor estimate ' + A.money(estLo) + '–' + A.money(estHi) + '</span></div>' +
        '<button class="btn buy" data-action="buy" data-uid="' + inst.uid + '"' + (afford ? '' : ' disabled') + '>Buy</button></div>';
    }).join('');
    return '<p class="note">Restocks every ' + CFG.dealerRestockDays + ' days · dealer margin ' +
      A.pct(CFG.dealerMargin) + ' · bids pay ' + A.pct(1 - CFG.dealerMargin - CFG.dealerSpread) + ' of value.</p>' + rows;
  }

  function viewPortfolio() {
    if (!G.portfolio.length) return '<p class="empty">No crates yet. Buy something at the dealer, or take a chance at the auction.</p>';
    var city = A.city(G.cityId);
    var year = dateOf(G.day).year;
    var total = 0;
    var rows = G.portfolio.map(function (inst) {
      var w = A.work(inst.defId);
      var idx = idxOf(w, G.cityId);
      var val = A.marketValue(w, inst, city, idx, year);
      total += val;
      var bid = A.dealerBid(w, inst, city, idx, year, G.reputation);
      var profit = bid - inst.purchasePrice;
      var inStudio = inst.restoreReadyDay >= 0 && G.day < inst.restoreReadyDay;
      var html = '<div class="row' + (inStudio ? ' busy' : '') + '">' + rowHead(inst) +
        '<div class="row-tags">' + condTag(inst) + authTag(inst) +
        (inStudio ? '<span class="tag warn">studio · day ' + inst.restoreReadyDay + '</span>' : '') + '</div>' +
        '<div class="row-num"><span class="ask">' + A.money(val) + '</span>' +
        '<span class="est">paid ' + A.money(inst.purchasePrice) + ' · dealer bids ' + A.money(bid) + '</span>' +
        '<span class="' + (profit >= 0 ? 'gain' : 'loss') + '">' + (profit >= 0 ? '+' : '') + A.money(profit) + ' if sold now</span></div>' +
        '<div class="row-btns">';
      if (!inStudio) html += '<button class="btn sell" data-action="sell" data-uid="' + inst.uid + '">Sell</button>';
      if (city.hasExpertOffice) html += '<button class="btn" data-action="examine" data-uid="' + inst.uid + '">Expert ' + A.money(A.expertiseFee(G.feeFactor)) + '</button>';
      if (city.hasRestorationStudio && !inStudio) html += '<button class="btn" data-action="restore" data-uid="' + inst.uid + '">Restore ' + A.money(A.restorationCost(Math.min(CFG.restorationMaxGain, 1 - inst.condition))) + '</button>';
      html += '</div></div>';
      return html;
    }).join('');
    return '<p class="note">Warehouse value at today’s indices: ' + A.money(total) +
      ' · condition slips ' + A.pct(CFG.dailyConditionDecay) + ' every day.</p>' + rows;
  }
  function viewAuction() {
    if (!G.lots.length) return '<p class="empty">No open sale list.</p>';
    var rows = G.lots.map(function (lot, i) {
      var cls = lot.closed ? (lot.leader === 'you' ? ' won' : ' gone') : '';
      var step = Math.max(1, Math.round(lot.bid * CFG.auctionIncrementRatio));
      return '<div class="row' + cls + '">' + rowHead(lot.inst) +
        '<div class="row-tags">' + condTag(lot.inst) + authTag(lot.inst) +
        '<span class="tag">reserve ' + A.money(lot.reserve) + '</span></div>' +
        '<div class="row-num"><span class="ask">bid ' + A.money(lot.bid) + '</span>' +
        '<span class="est">estimate ' + A.money(lot.low) + '–' + A.money(lot.high) + '</span>' +
        '<span class="est">' + (lot.closed ? (lot.leader === 'you' ? 'HAMMERED TO YOU' : 'sold to the room')
          : rivalCount() + ' bidders in the room') + '</span></div>' +
        '<div class="row-btns">' +
        (lot.closed ? '' :
          '<button class="btn bid" data-action="bid" data-lot="' + i + '">Bid + ' + A.money(step) + '</button>' +
          '<button class="btn" data-action="pass" data-lot="' + i + '">Pass</button>') +
        '</div></div>';
    }).join('');
    return '<p class="note">Next sale list on day ' + G.auctionDay + ' · buyer’s premium ' +
      A.pct(CFG.auctionCommission) + ' · increment ' + A.pct(CFG.auctionIncrementRatio) + '.</p>' + rows;
  }

  function viewBank() {
    var ceiling = A.loanCeiling(G.reputation);
    var room = Math.max(0, ceiling - G.loan);
    var accrual = Math.round(G.loan * CFG.dailyLoanInterest);
    return '<p class="note">Reputation ' + Math.round(G.reputation) + ' buys a ceiling of ' +
      A.money(ceiling) + ' (' + A.money(G.loan) + ' drawn, ' + A.money(room) + ' available). ' +
      'Interest ' + A.pct(CFG.dailyLoanInterest) + ' per day = ' + A.money(accrual) + ' accruing. ' +
      'A late fee of ' + A.money(CFG.loanPenaltyPerDay) + ' starts once the debt is older than ' +
      CFG.loanGraceDays + ' days, and the bank calls in crates at ' + CFG.debtCallAfterDays + '.</p>' +
      '<div class="row"><div class="row-main"><div><span class="title">Cash in hand</span>' +
      '<span class="credit">Loans are added straight to your purse</span></div></div>' +
      '<div class="row-num"><span class="ask">' + A.money(G.cash) + '</span></div>' +
      '<div class="row-btns">' +
      [1000, 5000, 20000].map(function (n) {
        return '<button class="btn" data-action="borrow" data-amount="' + n + '"' +
          (room >= n ? '' : ' disabled') + '>Borrow ' + A.money(n) + '</button>';
      }).join('') + '</div></div>' +
      '<div class="row"><div class="row-main"><div><span class="title">Repay</span>' +
      '<span class="credit">Debt ' + A.money(G.loan) + ' · over ' + CFG.debtCallAfterDays +
      ' days the bank calls in your crates</span></div></div>' +
      '<div class="row-num"><span class="ask">' + A.money(G.loan) + '</span></div>' +
      '<div class="row-btns">' +
      [1000, 5000].map(function (n) {
        return '<button class="btn" data-action="repay" data-amount="' + n + '"' +
          (G.cash >= n && G.loan >= n ? '' : ' disabled') + '>Repay ' + A.money(n) + '</button>';
      }).join('') +
      '<button class="btn" data-action="repay" data-amount="' + Math.floor(Math.min(G.cash, G.loan)) + '"' +
      (G.loan > 0 && G.cash > 0 ? '' : ' disabled') + '>Repay all</button></div></div>' +
      '<div class="row"><div class="row-main"><div><span class="title">Extra crate space</span>' +
      '<span class="credit">' + G.capacity + ' of ' + CFG.maxPortfolioCapacity + ' max · ' +
      G.slotsBought + ' of ' + CFG.crateSpacePurchaseLimit + ' purchases used</span></div></div>' +
      '<div class="row-num"><span class="ask">' + A.money(CFG.extraSlotPrice) + '</span></div>' +
      '<button class="btn" data-action="slot"' +
      (G.capacity < CFG.maxPortfolioCapacity && G.cash >= CFG.extraSlotPrice ? '' : ' disabled') + '>Buy slot</button></div>';
  }

  function viewStudio() {
    var city = A.city(G.cityId);
    if (!city.hasRestorationStudio) return '<p class="empty">No restoration studio in ' + h(city.name) + '.</p>';
    if (!G.portfolio.length) return '<p class="empty">Nothing to restore — the warehouse is empty.</p>';
    var rows = G.portfolio.map(function (inst) {
      var inStudio = inst.restoreReadyDay >= 0 && G.day < inst.restoreReadyDay;
      var gain = Math.min(CFG.restorationMaxGain, 1 - inst.condition);
      var cost = A.restorationCost(gain);
      var days = A.restorationDays(gain);
      return '<div class="row' + (inStudio ? ' busy' : '') + '">' + rowHead(inst) +
        '<div class="row-tags">' + condTag(inst) + '</div>' +
        '<div class="row-num"><span class="ask">' + (inStudio ? 'ready day ' + inst.restoreReadyDay : A.money(cost)) + '</span>' +
        '<span class="est">' + (inStudio ? 'collect when the frame dries' : '+' + A.pct(gain) + ' in ' + days + ' day(s)') + '</span></div>' +
        '<div class="row-btns">' +
        (inStudio
          ? '<button class="btn" data-action="collect" data-uid="' + inst.uid + '"' + (G.day >= inst.restoreReadyDay ? '' : ' disabled') + '>Collect</button>'
          : '<button class="btn" data-action="restore" data-uid="' + inst.uid + '"' + (gain > 0.005 && cost <= G.cash ? '' : ' disabled') + '>Restore</button>') +
        '</div></div>';
    }).join('');
    return '<p class="note">' + h(city.studioName || 'The studio') + ' charges ' + A.money(CFG.restorationCostPerHundredth) +
      ' per +0.01 condition, max ' + A.pct(CFG.restorationMaxGain) + ' per job, at least ' +
      CFG.restorationMinDays + ' day(s).</p>' + rows;
  }
  function viewTravel() {
    var from = A.city(G.cityId);
    var away = !!G.voyage;
    var banner = away ? '<div class="voyage-banner">' +
      '<span class="voyage-dest">' + h(G.voyage.label) + '</span>' +
      '<span class="voyage-eta">' + G.voyage.remaining + ' day(s) still to run · ' +
      (G.voyage.glyph === 'rail' ? 'by rail' : 'at sea') + '</span>' +
      '<span class="voyage-tip">Advance the calendar — the chart moves as the days do.</span>' +
      '</div>' : '';
    var rows = A.cities.filter(function (c) { return c.id !== G.cityId; }).map(function (c) {
      var price = A.ticketPrice(from, c);
      var days = A.ticketDays(from, c);
      var goods = ['Dealer'];
      if (c.hasAuctionHouse) goods.push('Auction');
      if (c.hasBank) goods.push('Bank');
      if (c.hasRestorationStudio) goods.push('Studio');
      if (c.hasExpertOffice) goods.push('Expert');
      var hot = A.EPOCHS.filter(function (e) { return c.favouriteEpochs.indexOf(e) >= 0; }).join(', ');
      var blocked = away || price > G.cash;
      return '<div class="row' + (blocked ? ' dim' : '') + '">' +
        '<div class="row-main"><div><span class="title">' + h(c.name) + '</span>' +
        '<span class="credit">' + h(c.country) + ' · ' + h(c.regionName) + ' · wealth ' + c.wealth + '/10 · ' +
        h(goods.join(' + ')) + '</span>' +
        '<span class="prov">collects ' + h(hot || 'no particular school') + (c.bohemianEpochs.length ? ' · bohemian: ' + h(c.bohemianEpochs.join(', ')) : '') + '</span></div></div>' +
        '<div class="row-num"><span class="ask">' + A.money(price) + '</span>' +
        '<span class="est">' + days + ' day(s) ' + (days <= 4 ? 'by rail' : 'at sea') + ' · ' + A.distance(from, c).toFixed(2) + ' units</span></div>' +
        '<button class="btn go" data-action="travel" data-city="' + c.id + '"' + (blocked ? ' disabled' : '') + '>Travel</button></div>';
    }).join('');
    return renderWorldMap() + banner +
      '<p class="note">Tickets cost ' + A.money(CFG.baseTicketPrice) + ' + ' +
      A.money(CFG.ticketPricePerDistance) + ' per map unit · ' + CFG.crateHandlingFee +
      ' freight per crate · a long ride can knock a painting about. Click a pin or a city on the chart for its picture.</p>' + rows;
  }

  function viewReport() {
    var held = 0;
    G.portfolio.forEach(function (p) { held += valueOf(p); });
    var st = G.stats;
    var rows = [
      ['Career', 'day ' + G.day + ' of ' + G.careerDays + ' · ' + dateOf(G.day).year],
      ['Base', A.city(G.cityId).name],
      ['Net worth', A.money(netWorth()) + ' of ' + A.money(G.targetWorth)],
      ['Cash', A.money(G.cash) + ' · debt ' + A.money(G.loan)],
      ['Warehouse', A.money(held) + ' in ' + G.portfolio.length + ' crate(s)'],
      ['Reputation', Math.round(G.reputation) + ' · slots bought ' + G.slotsBought],
      ['Deals', st.buys + ' bought · ' + st.sells + ' sold · ' + st.hammer + ' hammer wins'],
      ['Best flip', A.money(st.bestProfit) + ' · worst ' + A.money(st.worstProfit)],
      ['Seed', G.seed + ' (' + G.difficulty + ')']
    ].map(function (r) {
      return '<div class="stat"><span>' + h(r[0]) + '</span><b>' + h(r[1]) + '</b></div>';
    }).join('');
    var journal = G.log.slice(0, 25).map(function (l) {
      return '<li><em>day ' + l.day + '</em> ' + h(l.text) + '</li>';
    }).join('');
    return '<div class="stats">' + rows + '</div><h3 class="jhead">Journal</h3><ul class="journal">' + journal + '</ul>';
  }

  /* ---------- overlay dialog ------------------------------------------- */
  function dialog(title, html, buttons, cls) {
    el('dialog-title').textContent = title;
    el('dialog-body').innerHTML = html;
    el('dialog-actions').innerHTML = (buttons || []).map(function (b, i) {
      return '<button class="btn' + (b.primary ? ' primary' : '') + '" data-dialog="' + i + '">' + h(b.label) + '</button>';
    }).join('');
    dialogHandlers = (buttons || []).map(function (b) { return b.onClick; });
    var dlg = el('overlay').querySelector('.dialog');
    if (dlg) dlg.className = 'dialog' + (cls ? ' ' + cls : '');
    show(el('overlay'), true);
  }
  var dialogHandlers = [];
  function closeDialog() {
    show(el('overlay'), false);
    dialogHandlers = [];
    /* closing the place card drops the destination again: the plate must not
       keep a line for a journey nobody is going to take */
    if (G.mapPick && !G.voyage) {
      G.mapPick = null;
      if (worldMap) syncWorldMap();
    }
  }
  /* =====================================================================
   * SCREENS
   * ===================================================================== */
  function stopClock() {
    if (G.clockTimer) { clearInterval(G.clockTimer); G.clockTimer = null; }
    el('cal-auto').checked = false;
    el('cal-timer').classList.remove('running');
  }

  function endGame(won) {
    if (G.ended) return;
    G.ended = true;
    stopClock();
    show(el('colony'), false);
    var worth = netWorth();
    var held = 0;
    G.portfolio.forEach(function (p) { held += valueOf(p); });
    var lines = [
      won ? 'You made your money and then some.' : 'The clock ran out before the goal did.',
      '<div class="stats">' +
      '<div class="stat"><span>Net worth</span><b>' + A.money(worth) + '</b></div>' +
      '<div class="stat"><span>Goal</span><b>' + A.money(G.targetWorth) + '</b></div>' +
      '<div class="stat"><span>Days used</span><b>' + Math.min(G.day, G.careerDays) + ' / ' + G.careerDays + '</b></div>' +
      '<div class="stat"><span>Still in crates</span><b>' + A.money(held) + '</b></div>' +
      '<div class="stat"><span>Debt</span><b>' + A.money(G.loan) + '</b></div>' +
      '<div class="stat"><span>Reputation</span><b>' + Math.round(G.reputation) + '</b></div>' +
      '<div class="stat"><span>Flips</span><b>' + G.stats.buys + ' bought / ' + G.stats.sells + ' sold</b></div>' +
      '<div class="stat"><span>Best / worst</span><b>' + A.money(G.stats.bestProfit) + ' / ' + A.money(G.stats.worstProfit) + '</b></div>' +
      '<div class="stat"><span>Forgeries passed on</span><b>' + G.stats.forgery + '</b></div>' +
      '</div>'
    ].join('');
    dialog(won ? 'The Great Art Race — you win' : 'The Great Art Race — time up', lines, [
      { label: 'Read the journal', onClick: function () { G.view = 'report'; G.ended = false; closeDialog(); renderAll(); G.ended = true; } },
      { label: 'New career', primary: true, onClick: backToTitle }
    ]);
  }

  function backToTitle() {
    closeDialog();
    show(el('colony'), false);
    stopClock();
    G.started = false;
    G.ended = false;
    el('screen-game').hidden = true;
    el('screen-title').hidden = false;
    renderTitle();
  }

  function helpText() {
    var c = A.city(G.cityId);
    return '<p>You are an art dealer with <b>' + A.money(CFG.startingMoney) + '</b> in the first year of a ' +
      G.careerDays + '-day career. Make <b>' + A.money(G.targetWorth) + '</b> of net worth and you win.</p>' +
      '<h3>How money is made</h3><ul>' +
      '<li>Buy where a school is cheap, sell where the collectors want it. Each city pushes its own ' +
      '<em>favourite epochs</em> (and discounts them at home), and every artwork is priced by the artist’s ' +
      'reputation, rarity, age and condition.</li>' +
      '<li>A dealer sells at <b>+' + A.pct(CFG.dealerMargin) + '</b> over value and buys back at <b>' +
      A.pct(1 - CFG.dealerMargin - CFG.dealerSpread) + '</b> — so you need a real move in the market to profit.</li>' +
      '<li>Reputation (' + Math.round(G.reputation) + ' now) narrows the dealer spread and raises your loan ceiling.</li>' +
      '</ul><h3>Risks</h3><ul>' +
      '<li><b>Forgeries.</b> Every piece is <em>unexamined</em> until an expert (here: ' +
      (c.hasExpertOffice ? 'yes' : 'no') + ') gives a verdict, and experts are wrong about ' +
      A.pct(CFG.expertErrorChance) + ' of the time. A revealed forgery is worth <b>' +
      A.pct(CFG.forgeryValueMultiplier) + '</b> of the real thing.</li>' +
      '<li><b>Condition.</b> Paintings decay <b>' + A.pct(CFG.dailyConditionDecay) + '</b> a day; the studio can add up to <b>' +
      A.pct(CFG.restorationMaxGain) + '</b> per job for ' + A.money(CFG.restorationCostPerHundredth) + ' per +0.01.</li>' +
      '<li><b>Debt.</b> Interest is <b>' + A.pct(CFG.dailyLoanInterest) + '</b> a day, ' + A.money(CFG.loanPenaltyPerDay) +
      ' late fees after ' + CFG.loanGraceDays + ' days, and after ' + CFG.debtCallAfterDays + ' the bank seizes ' +
      CFG.debtCallSeizeArtworks + ' crates.</li>' +
      '<li><b>News.</b> Auction scandals, royal commissions and revivals move an epoch index for a set number of days. ' +
      'Travel costs money and days, and rough journeys can knock condition off a canvas.</li>' +
      '</ul><h3>Colonies & plantations</h3><ul>' +
      '<li>Sail to a colony from the travel office, then <em>drag</em> a crop plate onto a free plot to lay out a field — cocoa, tea, coffee, tobacco or textiles.</li>' +
      '<li>Hire and assign <em>workers</em> to speed growth and swell the harvest, and upgrade each field for extra yield.</li>' +
      '<li>Ripe fields harvest into the warehouse; sell at the <b>London</b> or <b>New York</b> trade desk, which pay different rates.</li>' +
      '</ul><p class="note">End the day to advance prices, the calendar and the news. This build runs entirely on the ' +
      'Unity data exported by <code>tools/export-data.ps1</code>.</p>';
  }

  function dataText() {
    var rows = [
      ['Artists', A.artists.length, 'Resources/ArtRace/Data/Artist_*.asset'],
      ['Cities', A.cities.length, 'City_*.asset'],
      ['Artworks', A.works.length, 'Work_*.asset'],
      ['Market events', A.marketEvents.length, 'Event_*.asset'],
      ['Economy keys', Object.keys(CFG).length - A.WEB_ONLY_CFG_KEYS.length, 'EconomyConfig.asset'],
      ['Web-only knobs', A.WEB_ONLY_CFG_KEYS.length, 'engine.js WEB_ONLY_DEFAULTS']
    ].map(function (r) {
      return '<div class="stat"><span>' + h(r[0]) + '</span><b>' + r[1] + '</b></div>';
    }).join('');
    return '<p>Every number on screen comes from the Unity project, except the handful of ' +
      'balance knobs the browser prototype models and the Unity build does not have yet.</p>' +
      '<div class="stats">' + rows + '</div>' +
      '<p class="note">Prices, indices, event modifiers, travel and loan maths are ports of ' +
      '<code>PriceEngine.cs</code>, <code>MarketState.cs</code> and <code>EconomyManager.cs</code>. ' +
      'Rarities 1–10 and reputation bands are interpolated exactly as the C# does.</p>' +
      '<p class="note">Web-only: <code>' + h(A.WEB_ONLY_CFG_KEYS.join(', ')) + '</code> — defaults live in ' +
      '<code>engine.js</code> and are overridden automatically the moment ' +
      '<code>EconomyConfig.cs</code> grows a field with the same name.</p>' +
      '<p class="note">data.js was generated by tools/export-data.ps1; re-run that script after editing any .asset.</p>';
  }

  function fillTitleStats() {
    el('title-stats').innerHTML = A.artists.length + ' artists · ' + A.cities.length + ' cities · ' +
      A.works.length + ' artworks · ' + A.marketEvents.length + ' market events · ' +
      Object.keys(CFG).length + ' economy parameters, all exported from the Unity project.';
  }

  /* Paint the title canvas with the old start.jpg scene (the studio easel
     painting, hd-09) when it is imported; otherwise keep the warm gradient. */
  function renderTitle() {
    fillTitleStats();
    var canvas = el('title-canvas');
    var pic = pictureFor('hd-09-studio-easel-painting');
    if (pic) {
      canvas.classList.add('has-image');
      canvas.style.backgroundImage = 'url("' + pic.file + '")';
    } else {
      canvas.classList.remove('has-image');
      canvas.style.backgroundImage = '';
    }
  }
  /* New Game asks the same questions as NewGameSetup.cs in Unity. */
  function showNewGameForm() {
    var cityOpts = A.cities.map(function (c, i) {
      return '<option value="' + c.id + '"' + (c.id === 'amsterdam' ? ' selected' : '') + '>' +
        h(c.name) + ', ' + h(c.country) + '</option>';
    }).join('');
    var diffOpts = ['Easy', 'Normal', 'Hard'].map(function (d) {
      var v = A.DIFFICULTY[d];
      return '<option value="' + d + '"' + (d === 'Normal' ? ' selected' : '') + '>' +
        d + ' — start ' + A.money(CFG.startingMoney * v.startingMoney) +
        ', target ' + A.money(Math.round(CFG.targetNetWorth * v.target)) + '</option>';
    }).join('');
    var durOpts = A.DURATIONS.map(function (d, i) {
      return '<option value="' + i + '"' + (i === 1 ? ' selected' : '') + '>' +
        h(d.label) + ' (' + d.days + ' days)</option>';
    }).join('');
    var seed = Math.floor(Math.random() * 1e9) + 1;
    dialog('Set up a career', '<div class="form">' +
      '<label>Name of the dealer<input id="f-name" value="' + h(G.name) + '"></label>' +
      '<label>Difficulty<select id="f-diff">' + diffOpts + '</select></label>' +
      '<label>Career length<select id="f-dur">' + durOpts + '</select></label>' +
      '<label>Starting city<select id="f-city">' + cityOpts + '</select></label>' +
      '<label>Seed (same seed, same market)<input id="f-seed" type="number" value="' + seed + '"></label>' +
      '</div>', [
      { label: 'Cancel', onClick: function () { if (!G.started) closeDialog(); else closeDialog(); } },
      { label: 'Begin career', primary: true, onClick: function () {
          newGame({
            name: el('f-name').value || 'Henry',
            difficulty: el('f-diff').value,
            durationIndex: parseInt(el('f-dur').value, 10),
            cityId: el('f-city').value,
            seed: parseInt(el('f-seed').value, 10)
          });
          G.ended = false;
          G.view = 'dealer';
          closeDialog();
          el('screen-title').hidden = true;
          el('screen-game').hidden = false;
          el('player-name').textContent = G.name;
          renderAll();
        } }
    ], 'dialog--setup');
  }

  /* ---------- wiring ---------------------------------------------------- */
  function act(fn) {
    return function () {
      if (!G.started || G.ended) return;
      fn.apply(null, arguments);
      renderAll();
    };
  }

  document.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-action],[data-view],[data-dialog],[data-place],[data-colony],#new-game,#show-help,#show-data');
    if (!t) return;

    if (t.id === 'new-game') { showNewGameForm(); return; }
    if (t.id === 'show-help') { dialog('How to play', helpText(), [{ label: 'Back', primary: true, onClick: closeDialog }]); return; }
    if (t.id === 'show-data') { dialog('Data source', dataText(), [{ label: 'Back', primary: true, onClick: closeDialog }]); return; }

    if (t.hasAttribute('data-colony')) { colonyAction(t.getAttribute('data-colony'), t); return; }
    if (t.hasAttribute('data-place')) { showPlace(t.getAttribute('data-place')); return; }

    if (t.hasAttribute('data-dialog')) {
      var fn = dialogHandlers[parseInt(t.getAttribute('data-dialog'), 10)];
      if (fn) fn();
      return;
    }

    if (t.hasAttribute('data-view')) {
      G.view = t.getAttribute('data-view');
      renderAll();
      return;
    }

    var uid = t.hasAttribute('data-uid') ? parseInt(t.getAttribute('data-uid'), 10) : -1;
    var lot = t.hasAttribute('data-lot') ? parseInt(t.getAttribute('data-lot'), 10) : -1;
    var amount = t.hasAttribute('data-amount') ? parseInt(t.getAttribute('data-amount'), 10) : 0;
    var action = t.getAttribute('data-action');

    if (action === 'close-dialog') { closeDialog(); return; }
    if (action === 'buy') act(buyOffer)(uid);
    else if (action === 'sell') act(sellOwned)(uid);
    else if (action === 'examine') act(examine)(uid);
    else if (action === 'restore') act(restore)(uid, Math.min(CFG.restorationMaxGain, 1 - (findOwned(uid) || { condition: 1 }).condition));
    else if (action === 'collect') act(collect)(uid);
    else if (action === 'bid') act(bidLot)(lot);
    else if (action === 'pass') act(passLot)(lot);
    else if (action === 'borrow') act(borrow)(amount);
    else if (action === 'repay') act(repay)(amount);
    else if (action === 'slot') act(buySlot)();
    else if (action === 'travel') act(travelTo)(t.getAttribute('data-city'));
    else if (action === 'sell-goods') act(sellGoods)(t.getAttribute('data-crop'), parseInt(t.getAttribute('data-units'), 10));
    else if (action === 'next-day') act(endDay)();
  });

  /* Drag & drop: crop plates onto free plots. Click-to-plant (arm + click a
     plot) is the fallback path for touch; these listeners handle the gesture. */
  document.addEventListener('dragstart', function (ev) {
    var src = ev.target && ev.target.closest ? ev.target.closest('[data-drag-crop]') : null;
    if (!src) return;
    ev.dataTransfer.setData('text/plain', src.getAttribute('data-drag-crop'));
    ev.dataTransfer.effectAllowed = 'copy';
    src.classList.add('dragging');
  });
  document.addEventListener('dragend', function (ev) {
    var src = ev.target && ev.target.closest ? ev.target.closest('[data-drag-crop]') : null;
    if (src) src.classList.remove('dragging');
  });
  document.addEventListener('dragover', function (ev) {
    var plot = ev.target && ev.target.closest ? ev.target.closest('.plot') : null;
    if (!plot) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'copy';
    plot.classList.add('drag-over');
  });
  document.addEventListener('dragleave', function (ev) {
    var plot = ev.target && ev.target.closest ? ev.target.closest('.plot') : null;
    if (plot) plot.classList.remove('drag-over');
  });
  document.addEventListener('drop', function (ev) {
    var plot = ev.target && ev.target.closest ? ev.target.closest('.plot') : null;
    if (!plot) return;
    ev.preventDefault();
    plot.classList.remove('drag-over');
    var cropId = ev.dataTransfer.getData('text/plain');
    var pi = parseInt(plot.getAttribute('data-plot'), 10);
    if (cropId && !plotField(pi) && G.colonyId && G.started && !G.ended) {
      plantCrop(cropId, pi);
    }
  });

  function endDay() {
    A.expireEvents(G.market, G.day);
    advanceDay(false);
  }

  document.addEventListener('change', function (ev) {
    if (ev.target.id === 'cal-auto') {
      if (ev.target.checked && G.started && !G.ended) {
        el('cal-timer').classList.add('running');
        G.clockTimer = setInterval(function () {
          if (G.ended) { stopClock(); return; }
          advanceDay(false);
          renderAll();
        }, 1600);
      } else {
        stopClock();
      }
    }
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') closeDialog();
    if (ev.key === 'Enter' && G.started && !G.ended && el('overlay').hidden && el('colony').hidden) { advanceDay(false); renderAll(); }
  });

  /* ---------- boot ------------------------------------------------------ */
  function boot() {
    if (!A) {
      document.body.innerHTML = '<div class="fatal">engine.js / data.js failed to load. ' +
        'Run <code>tools/export-data.ps1</code> first, then serve this folder over http:// (file:// can block scripts).</div>';
      return;
    }
    renderTitle();
    el('screen-title').hidden = false;
  }
  boot();

  window.ArtRaceApp = { G: G, newGame: newGame, renderAll: renderAll, advanceDay: advanceDay,
                         netWorth: netWorth, buyOffer: buyOffer, sellOwned: sellOwned, travelTo: travelTo };
})();



