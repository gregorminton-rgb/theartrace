/* =========================================================================
 * engine.js — pure data + maths layer for the web prototype.
 * Every formula here is a direct port of the Unity C# in
 *   Assets/_Project/Scripts/Core/PriceEngine.cs
 *   Assets/_Project/Scripts/Core/MarketState.cs
 *   Assets/_Project/Scripts/Core/ArtworkInstance.cs
 *   Assets/_Project/Scripts/Core/NewGameSetup.cs
 *   Assets/_Project/Scripts/Data/{Artist,Artwork,City,MarketEvent}Definition.cs
 * No DOM access, no game state: safe to unit test by loading it alone.
 * ========================================================================= */
(function (global) {
  'use strict';

  var DATA = global.ART_DATA;
  if (!DATA) { throw new Error('data.js must be loaded before engine.js'); }

  var CFG = DATA.economy;
  var EPOCHS = DATA.enums.epoch;

  /* ---------------------------------------------------------------------
   * Web-only balance keys.
   *
   * web/data.js is generated straight from Assets/_Project/Scripts/Data/
   * EconomyConfig.cs, so the export can only ever carry fields that exist on
   * that ScriptableObject. The browser prototype models two consequences of
   * debt that the Unity build does not have yet - a late fee once a loan has
   * been outstanding a while, and a debt call that seizes crates - and app.js
   * reads those knobs through CFG too. Rather than invent numbers at the point
   * of use, they are declared once here as an explicit list of defaults that
   * are applied ONLY when the export does not supply the key.
   *
   * When EconomyConfig.cs grows a real field for one of these, the exporter
   * picks it up automatically, the default stops applying, and
   * tools/cfgcheck.ps1 reports the key as exported instead of web-only.
   * ------------------------------------------------------------------- */
  var WEB_ONLY_DEFAULTS = {
    startingReputation: 25,       // Unity opens a career at 0 standing everywhere
    loanGraceDays: 14,            // days of debt before the bank starts charging
    loanPenaltyPerDay: 150,       // flat late fee on top of the daily interest
    loanOverdueRepPenalty: 1,     // reputation lost per day past the grace period
    debtCallAfterDays: 90,        // days of debt before the bank seizes crates
    debtCallSeizeArtworks: 2,     // crates taken in one debt call
    debtCallReputationPenalty: 10 // reputation hit when a debt call runs
  };

  /* Web-only keys that are not invented numbers but arithmetic over the export.
     crateSpacePurchaseLimit, for instance, is simply the capacity headroom
     EconomyConfig already defines: the top slot count minus the starting one. */
  var WEB_ONLY_DERIVED = {
    crateSpacePurchaseLimit: function (cfg) {
      return Math.max(0, cfg.maxPortfolioCapacity - cfg.startingPortfolioCapacity);
    }
  };

  var WEB_ONLY_CFG_KEYS = [];
  (function applyWebOnlyKeys() {
    Object.keys(WEB_ONLY_DEFAULTS).forEach(function (key) {
      if (CFG[key] === undefined) {
        CFG[key] = WEB_ONLY_DEFAULTS[key];
        WEB_ONLY_CFG_KEYS.push(key);
      }
    });
    Object.keys(WEB_ONLY_DERIVED).forEach(function (key) {
      if (CFG[key] === undefined) {
        CFG[key] = WEB_ONLY_DERIVED[key](CFG);
        WEB_ONLY_CFG_KEYS.push(key);
      }
    });
  })();

  /* ---------- lookups -------------------------------------------------- */
  var artistById = {}, cityById = {}, workById = {}, eventById = {};
  DATA.artists.forEach(function (a) { artistById[a.id] = a; });
  DATA.cities.forEach(function (c) { cityById[c.id] = c; });
  DATA.works.forEach(function (w) { workById[w.id] = w; });
  DATA.events.forEach(function (e) { eventById[e.id] = e; });

  function artist(id) { return artistById[id] || null; }
  function city(id) { return cityById[id] || null; }
  function work(id) { return workById[id] || null; }
  function epochName(w) {
    var a = artistById[w.artistId];
    return a ? a.epochName : 'Contemporary';
  }
  function epochIndex(w) { return EPOCHS.indexOf(epochName(w)); }

  /* ---------- math helpers -------------------------------------------- */
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function clamp01(v) { return clamp(v, 0, 1); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function round(v) { return Math.round(v); }

  /* Deterministic RNG so a seed reproduces a career (mulberry32). */
  function makeRng(seed) {
    var s = (seed >>> 0) || 1;
    function next() {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    return {
      next: next,                                     // 0..1
      range: function (lo, hi) { return lo + next() * (hi - lo); },
      int: function (lo, hi) { return Math.floor(lo + next() * (hi - lo + 1)); },
      chance: function (p) { return next() < p; },
      pick: function (arr) { return arr[Math.floor(next() * arr.length)]; },
      weighted: function (arr, weightFn) {
        var total = 0;
        arr.forEach(function (it) { total += Math.max(0.0001, weightFn(it)); });
        var r = next() * total;
        for (var i = 0; i < arr.length; i++) {
          r -= Math.max(0.0001, weightFn(arr[i]));
          if (r <= 0) return arr[i];
        }
        return arr[arr.length - 1];
      },
      shuffle: function (arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
          var j = Math.floor(next() * (i + 1));
          var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
      }
    };
  }

  /* ---------- money + labels ----------------------------------------- */
  /* PriceEngine.Money: "$" + thousands separated, or "1.25M" past a million. */
  function money(amount) {
    var neg = amount < 0;
    var a = Math.abs(amount);
    var body;
    if (a >= 1000000) body = (a / 1000000).toFixed(2).replace(/\.?0+$/, '') + 'M';
    else body = String(Math.round(a)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-$' : '$') + body;
  }

  /* ConditionBands.ToBand / Label (ArtRaceEnums.cs) */
  var CUTS = DATA.enums.conditionCuts;
  var BANDS = DATA.enums.conditionLabels;
  function conditionBand(c) {
    var v = clamp01(c);
    for (var i = 0; i < CUTS.length; i++) { if (v < CUTS[i]) return BANDS[i]; }
    return BANDS[BANDS.length - 1];
  }
  function pct(v) { return Math.round(v * 100) + '%'; }

  /* ---------- difficulty (NewGameSetup.cs) ---------------------------- */
  var DIFFICULTY = {
    Easy:   { startingMoney: 1.5, target: 0.75, fee: 0.75, rivals: -1, label: 'Easy',
              summary: 'More starting cash, a smaller fortune to raise and fewer rivals bidding against you.' },
    Normal: { startingMoney: 1.0, target: 1.0,  fee: 1.0,  rivals: 0,  label: 'Normal',
              summary: 'The market as authored: fair prices, fair rivals, no favours.' },
    Hard:   { startingMoney: 0.7, target: 1.3,  fee: 1.25, rivals: 2,  label: 'Hard',
              summary: 'Thin starting cash, a bigger fortune to raise, dearer experts and a crowded auction room.' }
  };
  var DURATIONS = [
    { days: 90,  label: 'short' },
    { days: 180, label: 'medium' },
    { days: 365, label: 'long' }
  ];
  /* =====================================================================
   * PriceEngine.cs port
   *   value = intrinsic * condition * authenticity * city demand
   *           * city wealth * market index  ( * home market discount )
   * ===================================================================== */
  var MAX_APPRECIATION_YEARS = 150;   // PriceEngine.MaxAppreciationYears

  function reputationFactor(workDef) {
    var a = artistById[workDef.artistId];
    var repMult = a ? a.reputationMultiplier : 1;
    return 1 + (repMult - 1) * CFG.reputationWeight;
  }

  function intrinsicValue(workDef, year) {
    if (!workDef) return 0;
    var a = artistById[workDef.artistId];
    var age = Math.max(0, year - workDef.yearCreated);
    var growth = 1 + (a ? a.annualAppreciation : 0.01) * Math.min(age, MAX_APPRECIATION_YEARS);
    var masterpiece = workDef.isMasterpiece ? 2.4 : 1;   // ArtworkDefinition.MasterpieceMultiplier
    return workDef.basePrice * reputationFactor(workDef) * workDef.rarityMultiplier * masterpiece * growth;
  }

  /* PriceEngine.ConditionFactor: lerp(floor, 1, c ^ conditionWeight) */
  function conditionFactor(c) {
    var v = clamp01(c);
    return lerp(CFG.brokenValueFloor, 1, Math.pow(v, Math.max(0.1, CFG.conditionWeight)));
  }

  /* ArtworkInstance.AuthenticityFactor: the state is what the world believes,
   * instance.isFake is what the vault knows. */
  function authenticityFactor(state, forgeryProneArtist) {
    if (state === 'RevealedForgery') return CFG.forgeryValueMultiplier;
    if (state === 'Authenticated') return 1;
    var risk = forgeryProneArtist ? CFG.unexaminedRiskDiscount : CFG.unexaminedRiskDiscount * 0.4;
    return 1 - risk;
  }

  /* CityDefinition.DemandMultiplier */
  function demandMultiplier(cityDef, epoch) {
    if (cityDef.favouriteEpochs.indexOf(epoch) >= 0) return 1 + cityDef.styleBias;
    if (cityDef.bohemianEpochs.indexOf(epoch) >= 0) return 1 - cityDef.styleBias * 0.5;
    return 1;
  }

  /* PriceEngine.UnitValue */
  function unitValue(workDef, inst, cityDef, index, year) {
    if (!workDef || !cityDef) return 0;
    var a = artistById[workDef.artistId];
    var epoch = a ? a.epochName : 'Contemporary';
    var value = intrinsicValue(workDef, year);
    value *= conditionFactor(inst.condition);
    value *= authenticityFactor(inst.authenticity, !!(a && a.forgeryProne));
    value *= demandMultiplier(cityDef, epoch);
    value *= cityDef.wealthMultiplier;             // CityDefinition.WealthMultiplier
    value *= index;
    if (workDef.homeCityId && workDef.homeCityId === cityDef.id) {
      value *= 1 - CFG.homeMarketDiscount;
    }
    return value;
  }

  /* PriceEngine.MarketValue */
  function marketValue(workDef, inst, cityDef, index, year) {
    return Math.max(1, round(unitValue(workDef, inst, cityDef, index, year)));
  }

  /* PriceEngine.DealerAsk — good player reputation shrinks the markup. */
  function dealerAsk(workDef, inst, cityDef, index, year, reputation, quirk) {
    var value = unitValue(workDef, inst, cityDef, index, year);
    var markup = CFG.dealerMargin * Math.max(0.4, 1 - reputation / 300);
    return Math.max(1, round(value * (1 + markup) * (quirk === undefined ? 1 : quirk)));
  }

  /* PriceEngine.DealerBid */
  function dealerBid(workDef, inst, cityDef, index, year, reputation) {
    var value = unitValue(workDef, inst, cityDef, index, year);
    var discount = CFG.dealerSpread * Math.max(0.5, 1 - reputation / 400);
    return Math.max(1, round(value * (1 - discount)));
  }

  /* PriceEngine.AuctionEstimateLow / High */
  function estimateLow(workDef, inst, cityDef, index, year) {
    return Math.max(1, round(marketValue(workDef, inst, cityDef, index, year) * 0.6));
  }
  function estimateHigh(workDef, inst, cityDef, index, year) {
    return Math.max(2, round(marketValue(workDef, inst, cityDef, index, year) * 1.35));
  }
  /* =====================================================================
   * MarketState.cs — one price index per city/epoch slice + live events
   * ===================================================================== */
  function createMarket(rng) {
    var records = {};
    DATA.cities.forEach(function (c) {
      var idx = [];
      for (var e = 0; e < EPOCHS.length; e++) {
        /* MarketState.Init: jitter = (+-1) * volatility * 4, clamped */
        var jitter = (rng.next() * 2 - 1) * CFG.volatility * 4;
        idx.push(clamp(1 + jitter, CFG.indexFloor, CFG.indexCeiling));
      }
      records[c.id] = { cityId: c.id, index: idx, previous: idx.slice() };
    });
    return { records: records, events: [] };
  }

  /* MarketEventDefinition.Affects */
  function affectsEvent(ev, cityDef, epoch) {
    if (!ev.anyEpoch && ev.targetEpoch !== epoch) return false;
    if (ev.scope === 'SingleCity') return cityDef.id === ev.targetCityId;
    if (ev.scope === 'Region') return cityDef.regionName === ev.targetRegionName;
    return true;
  }

  /* MarketState.EventMultiplier */
  function eventMultiplier(market, cityDef, epoch) {
    var mult = 1;
    for (var i = 0; i < market.events.length; i++) {
      if (affectsEvent(market.events[i], cityDef, epoch)) mult *= market.events[i].multiplier;
    }
    return mult;
  }

  /* MarketState.Index */
  function sliceIndex(market, cityDef, epoch) {
    var rec = market.records[cityDef.id];
    if (!rec) return 1;
    return rec.index[Math.max(0, EPOCHS.indexOf(epoch))] * eventMultiplier(market, cityDef, epoch);
  }

  /* MarketState.DailyChange */
  function dailyChange(market, cityDef, epoch) {
    var rec = market.records[cityDef.id];
    if (!rec) return 0;
    var i = EPOCHS.indexOf(epoch);
    if (rec.previous[i] <= 0.0001) return 0;
    return (rec.index[i] * eventMultiplier(market, cityDef, epoch)) / rec.previous[i] - 1;
  }

  /* MarketState.AdvanceDay */
  function advanceMarket(market, rng) {
    DATA.cities.forEach(function (c) {
      var rec = market.records[c.id];
      for (var e = 0; e < rec.index.length; e++) {
        var epoch = EPOCHS[e];
        rec.previous[e] = rec.index[e] * eventMultiplier(market, c, epoch);
        var value = rec.index[e];
        value += (1 - value) * CFG.meanReversion;               // pull back to 1.0
        value *= 1 + (rng.next() * 2 - 1) * CFG.volatility;     // daily noise
        if (rng.next() < CFG.shockChance) {                     // news driven jump
          value *= 1 + (rng.next() * 2 - 1) * CFG.shockSize;
        }
        rec.index[e] = clamp(value, CFG.indexFloor, CFG.indexCeiling);
      }
    });
  }

  /* MarketState.Expire */
  function expireEvents(market, day) {
    market.events = market.events.filter(function (ev) { return ev.endDay > day; });
  }

  /* ActiveEvent wrapper: roll a headline weighted by m_Weight. */
  function rollEvent(market, day, rng) {
    var def = rng.weighted(DATA.events, function (d) { return d.weight; });
    var ev = {
      id: def.id, headline: def.headline, body: def.body, category: def.categoryName,
      anyEpoch: def.anyEpoch, targetEpoch: def.targetEpochName, scope: def.scopeName,
      targetRegionName: def.targetRegionName, targetCityId: def.targetCityId,
      multiplier: def.priceMultiplier, startDay: day, endDay: day + def.durationDays
    };
    market.events.push(ev);
    return ev;
  }
  /* =====================================================================
   * Travel / bank / studio / expert costs (EconomyConfig fields)
   * ===================================================================== */
  /* Normalised map distance (m_MapPosition is 0..1 longitude/latitude). */
  function distance(a, b) {
    var dx = a.mapX - b.mapX;
    var dy = a.mapY - b.mapY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function ticketPrice(from, to) {
    return round(CFG.baseTicketPrice + CFG.ticketPricePerDistance * distance(from, to));
  }
  function ticketDays(from, to) {
    return Math.max(CFG.minimumTravelDays, Math.round(CFG.daysPerDistance * distance(from, to)));
  }
  /* Bank: mirrors EconomyConfig.LoanCeilingMultiplier - the multiplier runs
     from 1 at reputation 0 to maxLoanReputationMultiplier at reputationForMaxLoan
     and never below 1, so a wrecked reputation shrinks the ceiling to the base
     figure instead of going negative. */
  function loanCeiling(reputation) {
    var t = clamp01(reputation / Math.max(1, CFG.reputationForMaxLoan));
    return round(CFG.baseLoanCeiling * lerp(1, CFG.maxLoanReputationMultiplier, t));
  }
  /* Studio: restorationCostPerHundredth is charged per 0.01 of condition gained. */
  function restorationCost(gain) { return round(CFG.restorationCostPerHundredth * gain * 100); }
  function restorationDays(gain) {
    return Math.max(CFG.restorationMinDays, Math.ceil(gain * 100 / 10));
  }
  function expertiseFee(feeFactor) { return round(CFG.expertiseFee * feeFactor); }

  global.ArtRace = {
    DATA: DATA, CFG: CFG, EPOCHS: EPOCHS,
    WEB_ONLY_CFG_KEYS: WEB_ONLY_CFG_KEYS, WEB_ONLY_DEFAULTS: WEB_ONLY_DEFAULTS,
    artists: DATA.artists, cities: DATA.cities, works: DATA.works, marketEvents: DATA.events,
    artistById: artistById, cityById: cityById, workById: workById,
    artist: artist, city: city, work: work,
    workEpoch: function (w) { var a = artistById[w.artistId]; return a ? a.epochName : 'Contemporary'; },
    makeRng: makeRng, clamp: clamp, clamp01: clamp01, lerp: lerp,
    money: money, pct: pct, conditionBand: conditionBand,
    DIFFICULTY: DIFFICULTY, DURATIONS: DURATIONS,
    intrinsicValue: intrinsicValue, conditionFactor: conditionFactor,
    authenticityFactor: authenticityFactor, demandMultiplier: demandMultiplier,
    unitValue: unitValue, marketValue: marketValue, dealerAsk: dealerAsk, dealerBid: dealerBid,
    estimateLow: estimateLow, estimateHigh: estimateHigh,
    createMarket: createMarket, sliceIndex: sliceIndex, dailyChange: dailyChange,
    advanceMarket: advanceMarket, expireEvents: expireEvents, rollEvent: rollEvent,
    affectsEvent: affectsEvent,
    distance: distance, ticketPrice: ticketPrice, ticketDays: ticketDays,
    loanCeiling: loanCeiling, restorationCost: restorationCost, restorationDays: restorationDays,
    expertiseFee: expertiseFee
  };
})(window);

