/* =========================================================================
 * app-shell.js — dialogs, title, wiring, boot.
 * Split out of the former single-file app.js. The load order in
 * index.html is fixed: app-core.js first, because it owns G.
 * ========================================================================= */
(function () {
  'use strict';

  var A = window.ArtRace;
  var ART = A.art || {};
  var pictureFor = function (id) { return ART.pictureFor ? ART.pictureFor(id) : null; };
  var G = window.ArtRaceGame.G;
  var CFG = A.shared.CFG;
  var el = A.shared.el, h = A.shared.h, show = A.shared.show;
  var MONTHS = A.shared.MONTHS, dateOf = A.shared.dateOf;
  var log = A.shared.log, rep = A.shared.rep;
  /* shared vocabulary published by app-core.js */
  var renderAll = function () { return A.app.renderAll(); };
  var advanceDay = function () { return A.app.advanceDay.apply(null, arguments); };
  var netWorth = function () { return A.app.netWorth(); };
  var valueOf = function () { return A.app.valueOf.apply(null, arguments); };
  var findOwned = function () { return A.app.findOwned.apply(null, arguments); };
  var syncWorldMap = function () { return A.mapView && A.mapView.sync ? A.mapView.sync() : undefined; };
  var showPlace = function () { return A.mapView ? A.mapView.showPlace.apply(null, arguments) : undefined; };
  /* colony economy lives in app-crew.js */
  var crewRef = function (n) { return window.ArtRaceCrew[n]; };
  var colonyAction = function () { return crewRef('colonyAction').apply(null, arguments); };
  var plantCrop = function () { return crewRef('plantCrop').apply(null, arguments); };
  var plotField = function () { return crewRef('plotField').apply(null, arguments); };
  var sellOwned = function () { return A.app.sellOwned.apply(null, arguments); };
  var sellGoods = function () { return A.trade ? A.trade.sellGoods.apply(null, arguments) : undefined; };
  var newGame = function () { return A.app.newGame.apply(null, arguments); };
  var travelTo = function () { return A.app.travelTo.apply(null, arguments); };
  var bidLot = function () { return A.app.bidLot.apply(null, arguments); };
  var passLot = function () { return A.app.passLot.apply(null, arguments); };
  var buyOffer = function () { return A.app.buyOffer.apply(null, arguments); };
  var buySlot = function () { return A.app.buySlot.apply(null, arguments); };
  var collect = function () { return A.app.collect.apply(null, arguments); };
  var examine = function () { return A.app.examine.apply(null, arguments); };
  var repay = function () { return A.app.repay.apply(null, arguments); };

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
      if (A.mapView && A.mapView.get()) syncWorldMap();
    }
  }
  /* =====================================================================
   * SCREENS
   * ===================================================================== */
  function stopClock() {
    if (G.clockTimer) { clearInterval(G.clockTimer); G.clockTimer = null; }
    el('cal-auto').checked = false;
    el('cal-timer').classList.remove('running');
    G.clockWanted = false;
  }

  /* Arriving at a colony pauses the calendar; leaving the colony screen
     resumes it if the player had it running. */
  function resumeClockIfWanted() {
    if (!G.clockWanted || G.clockTimer || G.ended) return;
    el('cal-auto').checked = true;
    el('cal-timer').classList.add('running');
    G.clockTimer = setInterval(tickClock, 1600);
  }

  function tickClock() {
    if (G.ended) { stopClock(); return; }
    /* While the player is ashore the colony screen drives its own day, so the
       global clock waits instead of ticking a hidden portrait city. */
    if (G.colonyId) return;
    try {
      advanceDay(false);
      renderAll();
    } catch (err) {
      stopClock();
      log('The clock stopped on day ' + G.day + ': ' + err.message);
      renderAll();
    }
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
        G.clockWanted = true;
        el('cal-timer').classList.add('running');
        G.clockTimer = setInterval(tickClock, 1600);
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

  A.shell = { stopClock: stopClock, resumeClock: resumeClockIfWanted, endGame: endGame,
              dialog: dialog, closeDialog: closeDialog };
  window.ArtRaceApp = { G: G, app: A.app, shared: A.shared, game: A };
})();
