/* =========================================================================
 * app-shell.js — dialogs, title, wiring, boot.
 * Split out of the former single-file app.js. index.html fixes the load
 * order: app-state.js owns G, then app-crew / app-colonies lay the colony
 * on top of it, app-core.js publishes the shared game api, and this file
 * runs last because it is the one that starts the game.
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
  var paintDate = A.shared.paintDate;
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
  var sellPortGoods = function () { return A.trade ? A.trade.sellPortGoods.apply(null, arguments) : undefined; };
  var newGame = function () { return A.app.newGame.apply(null, arguments); };
  var travelTo = function () { return A.app.travelTo.apply(null, arguments); };
  var bidLot = function () { return A.app.bidLot.apply(null, arguments); };
  var passLot = function () { return A.app.passLot.apply(null, arguments); };
  var answerLotQuiz = function () { return A.app.answerLotQuiz.apply(null, arguments); };
  var buyOffer = function () { return A.app.buyOffer.apply(null, arguments); };
  var buySlot = function () { return A.app.buySlot.apply(null, arguments); };
  var collect = function () { return A.app.collect.apply(null, arguments); };
  var restoreArtwork = function () { return A.app.restore.apply(null, arguments); };
  var examine = function () { return A.app.examine.apply(null, arguments); };
  var repay = function () { return A.app.repay.apply(null, arguments); };

  /* ---------- overlay dialog ------------------------------------------- */
  function dialog(title, html, buttons, cls) {
    el('dialog-title').textContent = title;
    el('dialog-body').innerHTML = html;
    el('dialog-actions').innerHTML = (buttons || []).map(function (b, i) {
      /* Semantic colors: affirmative = green, dismiss/back = yellow. */
      var label = String(b.label || '').trim();
      var dismiss = /^(cancel|cancelar|abbrechen|zurück|back|skip|überspringen|no|nein|pass|close|schließen|fertig zurück)$/i.test(label);
      var tone = b.tone === 'danger' ? ' danger' : (dismiss ? ' cancel' : (b.primary ? ' primary' : ''));
      return '<button type="button" class="btn' + tone + '" data-dialog="' + i + '">' + h(b.label) + '</button>';
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
  /* Focused auction quiz instead of three answer buttons in every lot row. */
  function auctionQuizDialog(index) {
    var lot=G.lots && G.lots[index];
    if(!lot || !lot.quiz || lot.leader!=='you')return;
    var q=lot.quiz, de=window.ArtRaceLanguage && window.ArtRaceLanguage.get()==='de';
    var base=q.basePrice||lot.inst.purchasePrice, current=lot.inst.purchasePrice;
    var results=q.results||[], finished=!!q.answered;
    var name=A.work(lot.inst.defId).title;
    var intro='<div class="auction-quiz-modal"><div class="auction-quiz-prices"><span>'+
      (de?'Zuschlag inklusive Provision: ':'Original price including commission: ')+
      '<b>'+A.money(base)+'</b></span><span>'+(de?'Aktueller Preis: ':'Current price: ')+
      '<b>'+A.money(current)+'</b></span></div>'+
      '<p class="auction-quiz-rules">'+(de?'Richtig: −20 % · Falsch: +10 % des ursprünglichen Gesamtpreises. Maximal 60 % Rabatt.' :
       'Correct: −20% · Wrong: +10% of the original total. Up to 60% discount.')+'</p>'+
      (results.length?'<p class="auction-quiz-history">'+results.map(function(r,i){
        return (i+1)+'. '+(r.right?(de?'Richtig':'Correct'):(de?'Falsch':'Wrong'))+
          ' ('+(r.change>=0?'−':'+')+A.money(Math.abs(r.change))+')';
      }).join(' · ')+'</p>':'');
    if(finished){
      var saved=base-current;
      dialog(de?'Quiz abgeschlossen':'Quiz complete',intro+
        '<p class="auction-quiz-summary"><strong>'+(de?'Endpreis: ':'Final price: ')+A.money(current)+'</strong></p>'+
        '<p>'+(saved>=0?(de?'Gesamtersparnis: ':'Total saved: '):(de?'Gesamtaufschlag: ':'Total surcharge: '))+
        '<strong>'+A.money(Math.abs(saved))+'</strong></p></div>',
        [{label:de?'Schließen':'Close',primary:true,onClick:closeDialog}],'auction-quiz-dialog');
      return;
    }
    var question=q.question;
    if(de)question=({
      'In which year was it painted?':'In welchem Jahr wurde das Werk geschaffen?',
      'What medium was it painted in?':'Mit welcher Technik wurde es gemalt?',
      'What kind of picture is it?':'Um welche Bildgattung handelt es sich?'
    })[question]||question;
    var buttons=q.options.map(function(option,choice){
      return {label:String(option),onClick:function(){
        act(answerLotQuiz)(index,choice);
        auctionQuizDialog(index);
      }};
    });
    dialog((de?'Expertenquiz · Runde ':'Expert quiz · Round ')+(q.round||1)+'/3',
      intro+'<p class="auction-quiz-art">'+h(name)+'</p>'+
      '<p class="auction-quiz-question">'+h(question)+'</p>'+
      '<p class="auction-quiz-stakes">'+(de?'Diese Antwort: −':'This answer: −')+
      A.money(Math.round(base*.2))+' / +'+A.money(Math.round(base*.1))+'</p></div>',
      buttons,'auction-quiz-dialog');
  }
  var colonyDetailsType=null;
  function colonyDetailsDialog(type){
    if(!G.colonyId)return;
    colonyDetailsType=type;
    var source=el(type==='crop'?'colony-palette':'colony-inspector');
    var de=window.ArtRaceLanguage && window.ArtRaceLanguage.get()==='de';
    dialog(type==='crop'?(de?'Pflanzen auswählen':'Choose crops'):(de?'Feld bearbeiten':'Edit field'),
      '<div class="colony-modal-content">'+(source?source.innerHTML:'')+'</div>',
      [{label:de?'Fertig':'Done',primary:true,onClick:function(){colonyDetailsType=null;closeDialog();}}],
      'colony-ui-dialog');
  }
  /* =====================================================================
   * SCREENS
   * ===================================================================== */
  /* Two copies of the same little control exist: one in the game HUD, one in
     the colony bar (that screen is a fixed layer, so it covers the HUD). They
     are kept in sync by id pairs — `<prefix>cal-auto` and so on. */
  var CLOCK_UI = [
    { auto: 'cal-auto', timer: 'cal-timer', speed: 'cal-speed',
      day: 'cal-day', month: 'cal-month', year: 'cal-year' },
    { auto: 'colony-cal-auto', timer: 'colony-cal-timer', speed: 'colony-cal-speed',
      day: 'colony-cal-day', month: 'colony-cal-month', year: 'colony-cal-year' }
  ];

  function eachClockUi(fn) {
    CLOCK_UI.forEach(function (ui) {
      var auto = el(ui.auto);
      if (auto) fn(ui, auto);
    });
  }

  function paintClockUi() {
    var speed = G.clockSpeed || 1600;
    /* The date is repainted here as well as in renderHud(): ashore the colony
       screen is what advances the day (and it never calls renderHud), so this
       is the only chance to keep the two date readouts honest while the
       plantation desk is up. paintDate owns the six texts. */
    var d = dateOf(G.day);
    eachClockUi(function (ui, auto) {
      auto.checked = !!G.clockWanted;
      var timer = el(ui.timer);
      if (timer) {
        timer.classList.toggle('running', !!G.clockWanted);
        /* the bar's animation has to run at the chosen speed or it lies */
        timer.style.setProperty('--day-ms', speed + 'ms');
      }
      var speedEl = el(ui.speed);
      if (speedEl) speedEl.value = String(speed);
      /* 'cal-day' -> the 'cal' prefix paintDate writes */
      paintDate(ui.day.replace(/-day$/, ''), d);
    });
  }

  /* One place that starts the interval, so the speed can never disagree with
     the two places that used to hard-code 1600 ms. */
  function startClock() {
    if (G.clockTimer) { clearInterval(G.clockTimer); G.clockTimer = null; }
    if (!G.clockWanted || G.ended) { paintClockUi(); return; }
    paintClockUi();
    /* First day happens immediately; do not restart after an arrival or event. */
    tickClock();
    if (G.clockWanted && !G.ended && !G.clockTimer)
      G.clockTimer = setInterval(tickClock, G.clockSpeed || 1600);
  }

  function stopClock() {
    if (G.clockTimer) { clearInterval(G.clockTimer); G.clockTimer = null; }
    G.clockWanted = false;
    paintClockUi();
  }

  /* Arriving at a colony pauses the calendar; leaving the colony screen
     resumes it if the player had it running. */
  function resumeClockIfWanted() {
    if (!G.clockWanted || G.clockTimer || G.ended) return;
    startClock();
  }

  function setClockSpeed(ms) {
    var v = parseInt(ms, 10);
    if (!v || v < 300) return;
    G.clockSpeed = v;
    /* a running clock picks the new pace up immediately */
    if (G.clockTimer) {
      clearInterval(G.clockTimer);
      G.clockTimer = setInterval(tickClock, G.clockSpeed || 1600);
    }
    paintClockUi();
  }

  function tickClock() {
    /* Keep a live sale interactive: automated day advances otherwise close
       all lots while the player is working through bids and expert quizzes. */
    if (G.view === 'auction' && A.app.auctionOpenHere && A.app.auctionOpenHere()) {
      stopClock();
      log('Auto day paused for the live auction. Finish bidding, then advance the day manually.');
      renderAll();
      return;
    }
    if (G.ended) { stopClock(); return; }
    /* Ashore the colony screen drives the day (its fields and workers), so the
       same interval steps that screen instead of a hidden portrait city. */
    if (G.colonyId) {
      try { crewRef('endColonyDay')(); scheduleSave(); }
      catch (err) { stopClock(); log('The clock stopped on day ' + G.day + ': ' + err.message); }
      return;
    }
    try {
      advanceDay(false);
      renderAll();
      scheduleSave();
    } catch (err) {
      stopClock();
      log('The clock stopped on day ' + G.day + ': ' + err.message);
      renderAll();
    }
  }

  /* The career ends when the days are spent, so the report is a collection
     inventory: how many canvases survived the race, what they are worth, and
     which ones they are. Money is context, not the score. */
  function collectionRow(p, showProfit) {
    var w = A.work(p.defId);
    var artist = A.artistById[w.artistId];
    var epoch = A.workEpoch(w);
    var value = valueOf(p);
    var where = A.cityById[p.purchaseCityId] ? A.cityById[p.purchaseCityId].name : 'a private sale';
    /* dateOf() hands back the month NAME and the year, so no month table here. */
    var bought = dateOf(p.purchaseDay || 1);
    var paid = 'Bought in ' + where + ' on ' + bought.month + ' ' + bought.day + ', ' +
      bought.year + ' for ' + A.money(p.purchasePrice || 0);
    var tags = '<span class="tag">' + A.conditionBand(p.condition) + ' ' + A.pct(p.condition) + '</span>' +
      '<span class="tag">' + (p.authenticity === 'RevealedForgery' ? 'forgery' :
        p.authenticity === 'Authenticated' ? 'authenticated' : 'unexamined') + '</span>' +
      (p.provenance ? '<span class="tag">' + p.provenance + '</span>' : '');
    var delta = value - (p.purchasePrice || 0);
    var deltaHtml = showProfit && p.purchasePrice
      ? '<span class="' + (delta >= 0 ? 'gain' : 'loss') + '">' +
        (delta >= 0 ? '+' : '') + A.money(delta) + '</span>'
      : '<span class="est">' + epoch + '</span>';
    return '<div class="row">' +
      '<div class="row-main"><div>' +
        '<span class="title">' + w.title + '</span>' +
        '<span class="credit">' + (artist ? artist.name : 'Unknown') + ' · ' +
          (w.yearCreated || 'n.d.') + ' · ' + epoch + '</span>' +
        '<span class="prov">' + paid + '</span>' +
      '</div></div>' +
      '<div class="row-tags">' + tags + '</div>' +
      '<div class="row-num"><span class="ask">' + A.money(value) + '</span>' + deltaHtml + '</div>' +
    '</div>';
  }

  function endGame() {
    if (G.ended) return;
    G.ended = true;
    stopClock();
    clearSave();
    show(el('colony'), false);
    var worth = netWorth();
    var held = 0;
    var paidTotal = 0;
    var epochs = {};
    G.portfolio.forEach(function (p) {
      held += valueOf(p);
      paidTotal += p.purchasePrice || 0;
      var e = A.workEpoch(A.work(p.defId));
      epochs[e] = (epochs[e] || 0) + 1;
    });
    var count = G.portfolio.length;
    var raceBoard = A.race ? A.race.standings() : [];
    var winner = raceBoard.length && raceBoard[0].type === 'human';
    var rivalSummary = raceBoard.length ? '<h3>' + (winner ? 'You won the art race!' : 'Final standings') + '</h3>' +
      '<ol>' + raceBoard.map(function(p) { return '<li>' + h(p.name) + ': ' + p.points + ' points · ' + p.pictures + ' paintings · ' + A.money(p.cash) + '</li>'; }).join('') + '</ol>' : '';
    var byEpoch = Object.keys(epochs).sort().map(function (e) {
      return epochs[e] + ' ' + e;
    }).join(' · ') || 'none';
    /* Richest first: the end of a race is a moment for showing off. */
    var shown = G.portfolio.slice().sort(function (a, b) { return valueOf(b) - valueOf(a); });
    var lines = [
      rivalSummary,
      count
        ? 'You end the race with <b>' + count + '</b> picture' + (count === 1 ? '' : 's') +
          ' in the crates.'
        : 'You end the race with empty crates. The market beat you this time.',
      '<div class="stats">' +
      '<div class="stat"><span>Collection points</span><b>' + (A.race ? A.race.collectionPoints(G.portfolio) : count) + '</b></div>' +
      '<div class="stat"><span>Pictures held</span><b>' + count + ' / ' + G.capacity + ' crates</b></div>' +
      '<div class="stat"><span>Market value of the collection</span><b>' + A.money(held) + '</b></div>' +
      '<div class="stat"><span>Paid for it all</span><b>' + A.money(paidTotal) + '</b></div>' +
      '<div class="stat"><span>Crate slots bought</span><b>' + G.slotsBought + ' of ' +
        CFG.crateSpacePurchaseLimit + '</b></div>' +
      '<div class="stat"><span>Career</span><b>' + G.careerDays + ' days · ' + G.difficulty + '</b></div>' +
      '<div class="stat"><span>Days used</span><b>' + Math.min(G.day, G.careerDays) + ' / ' + G.careerDays + '</b></div>' +
      '<div class="stat"><span>Net worth</span><b>' + A.money(worth) + '</b></div>' +
      '<div class="stat"><span>Cash on hand</span><b>' + A.money(G.cash) + '</b></div>' +
      '<div class="stat"><span>Debt</span><b>' + A.money(G.loan) + '</b></div>' +
      '<div class="stat"><span>Reputation</span><b>' + Math.round(G.reputation) + '</b></div>' +
      '<div class="stat"><span>Deals</span><b>' + G.stats.buys + ' bought / ' + G.stats.sells + ' sold</b></div>' +
      '<div class="stat"><span>Best / worst flip</span><b>' + A.money(G.stats.bestProfit) + ' / ' +
        A.money(G.stats.worstProfit) + '</b></div>' +
      '<div class="stat"><span>Forgeries passed on</span><b>' + G.stats.forgery + '</b></div>' +
      '<div class="stat"><span>By epoch</span><b>' + byEpoch + '</b></div>' +
      '</div>',
      shown.length ? '<h3>The collection</h3>' + shown.map(function (p) {
        return collectionRow(p, true);
      }).join('') : ''
    ].join('');
    dialog('The Great Art Race — ' + count + ' picture' + (count === 1 ? '' : 's'),
      lines, [
      { label: 'Read the journal', onClick: function () { G.view = 'report'; G.ended = false; closeDialog(); renderAll(); G.ended = true; } },
      { label: 'New career', primary: true, onClick: backToTitle }
    ]);
  }

  function backToTitle() {
    closeDialog();
    show(el('colony'), false);
    stopClock();
    clearSave();
    G.started = false;
    G.ended = false;
    el('screen-game').hidden = true;
    el('screen-title').hidden = false;
    renderTitle();
  }

  function helpText() {
    var c = A.city(G.cityId);
    var de = window.ArtRaceLanguage && window.ArtRaceLanguage.get() === 'de';
    if (de) return '<p>Du beginnst als Kunsthändler mit <b>' + A.money(CFG.startingMoney) + '</b> und hast ' + G.careerDays +
      ' Tage Zeit. Am Ende zählt vor allem, <b>wie viele Gemälde</b> sich in deinen Transportkisten befinden. Bei Gleichstand entscheidet der Marktwert der Sammlung.</p>' +
      '<h3>So verdienst du Geld</h3><ul>' +
      '<li>Kaufe Werke dort, wo eine Kunstrichtung günstig ist, und verkaufe sie dort, wo Sammler viel zahlen. Jede Stadt bevorzugt bestimmte Epochen. Künstleransehen, Seltenheit, Alter und Zustand bestimmen den Wert.</li>' +
      '<li>Eine <b>Galerie</b> verkauft mit <b>+' + A.pct(CFG.dealerMargin * CFG.dealerPremium) + '</b> Aufschlag auf den Marktwert. Für Rückkäufe zahlt sie <b>' +
      A.pct(1 - CFG.dealerSpread) + '</b> des Werts.</li>' +
      '<li><b>Bei Auktionen sind Kunstwerke oft günstiger.</b> Ein Los startet nahe dem Mindestpreis. Biete gegen andere Sammler und reise rechtzeitig zur Auktion.</li>' +
      '<li>Dein Ansehen (derzeit ' + Math.round(G.reputation) + ') verbessert Händlerpreise und erhöht den möglichen Kredit.</li>' +
      '</ul><h3>Risiken</h3><ul>' +
      '<li><b>Fälschungen:</b> Ein Werk gilt zunächst als <em>ungeprüft</em>. Ein Sachverständiger (hier verfügbar: ' +
      (c.hasExpertOffice ? 'ja' : 'nein') + ') kann es untersuchen, irrt sich aber in ' + A.pct(CFG.expertErrorChance) +
      ' der Fälle. Eine entdeckte Fälschung ist nur <b>' + A.pct(CFG.forgeryValueMultiplier) + '</b> des Originals wert.</li>' +
      '<li><b>Zustand:</b> Bilder verlieren täglich <b>' + A.pct(CFG.dailyConditionDecay) + '</b> an Zustand. Im Atelier lassen sich bis zu <b>' +
      A.pct(CFG.restorationMaxGain) + '</b> wiederherstellen. Jede Verbesserung um 0,01 kostet ' + A.money(CFG.restorationCostPerHundredth) + '.</li>' +
      '<li><b>Schulden:</b> Die täglichen Zinsen betragen <b>' + A.pct(CFG.dailyLoanInterest) + '</b>. Nach ' + CFG.loanGraceDays +
      ' Tagen fallen ' + A.money(CFG.loanPenaltyPerDay) + ' Verzugsgebühren pro Tag an. Nach ' + CFG.debtCallAfterDays +
      ' Tagen kann die Bank ' + CFG.debtCallSeizeArtworks + ' Kunstwerke pfänden.</li>' +
      '<li><b>Nachrichten:</b> Skandale, königliche Aufträge und neue Trends verändern vorübergehend die Marktindizes. Reisen kosten Zeit und Geld und können Bilder beschädigen.</li>' +
      '</ul><h3>Kolonien und Plantagen</h3><ul>' +
      '<li>Segle vom Reisebüro zu einer Kolonie. Ziehe eine Pflanzkarte auf eine freie Parzelle, um Kakao, Tee, Kaffee, Tabak oder Textilien anzubauen.</li>' +
      '<li>Stelle Arbeitskräfte ein und weise sie Feldern zu, um das Wachstum zu beschleunigen und mehr zu ernten. Verbessere Felder für einen höheren Ertrag.</li>' +
      '<li>Reife Felder liefern Ernte ins Lager. Verkaufe Waren an den Handelsplätzen in <b>London</b> oder <b>New York</b>, wo unterschiedliche Preise gelten.</li>' +
      '</ul><p class="note">Mit „Tag beenden“ laufen Preise, Kalender und Nachrichten weiter.</p>';
    return '<p>You are an art dealer with <b>' + A.money(CFG.startingMoney) + '</b> in the first year of a ' +
      G.careerDays + '-day career. When the ' + G.careerDays + ' days are up, the race is scored on <b>how many ' +
      'collection points</b> your paintings earn. Condition below 80% = 1 point, 80–89% = 2, 90–100% = 3. More paintings break point ties.</p>' +
      '<h3>How money is made</h3><ul>' +
      '<li>Buy where a school is cheap, sell where the collectors want it. Each city pushes its own ' +
      '<em>favourite epochs</em> (and discounts them at home), and every artwork is priced by the artist’s ' +
      'reputation, rarity, age and condition.</li>' +
      '<li>A <b>gallery</b> sells at <b>+' + A.pct(CFG.dealerMargin * CFG.dealerPremium) + '</b> over market value: ' +
      'the quick way to buy, and the expensive one. Buy-backs pay <b>' + A.pct(1 - CFG.dealerSpread) +
      '</b> of value.</li>' +
      '<li><b>Auction rooms are where pictures are cheap.</b> A lot opens near the reserve and only has to beat ' +
      'the rival paddles, so patience at the hammer beats a gallery shelf almost every time — but you must travel ' +
      'to the sale and wait for it to be posted.</li>' +
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
      '</ul><p class="note">End the day to advance prices, the calendar and the news.</p>';
  }

  function dataText() {
    function statRows(labels) {
      var counts = [A.artists.length, A.cities.length, A.works.length,
        A.marketEvents.length, Object.keys(CFG).length];
      return labels.map(function (label, i) {
        return '<div class="stat"><span>' + h(label) + '</span><b>' + counts[i] + '</b></div>';
      }).join('');
    }
    var de = window.ArtRaceLanguage && window.ArtRaceLanguage.get() === 'de';
    var rows = statRows(de
      ? ['Künstler', 'Städte', 'Kunstwerke', 'Marktereignisse', 'Wirtschaftsparameter']
      : ['Artists', 'Cities', 'Artworks', 'Market events', 'Economy keys']);
    if (de) {
      return '<p>Alles, was du im Spiel siehst, ist Teil eines eigenständigen Wirtschaftsmodells: ' +
        'Preise, Marktindizes, Ereignisse und Kredite werden jeden Tag neu berechnet.</p>' +
        '<div class="stats">' + rows + '</div>' +
        '<p class="note">Der Wert eines Gemäldes folgt dem Ansehen des Künstlers, seiner Seltenheit, ' +
        'dem Alter und dem Zustand. Die Marktindizes jeder Stadt reagieren auf Nachrichten und auf deine eigenen Käufe.</p>' +
        '<p class="note">Seltenheit und Ansehen werden über eine feste Skala von 1 bis 10 abgebildet, ' +
        'damit zwei Bilder derselben Epoche immer vergleichbar bleiben.</p>';
    }
    return '<p>Everything you see in the game runs on a single, self-contained economic model: ' +
      'prices, market indices, events and loans are recalculated every day.</p>' +
      '<div class="stats">' + rows + '</div>' +
      '<p class="note">An artwork is valued from the artist’s reputation, its rarity, its age and its ' +
      'condition. Each city’s market indices react to the news, and your own buying nudges them too.</p>' +
      '<p class="note">Rarity and reputation sit on a fixed 1–10 scale, so two pictures from the same ' +
      'epoch stay directly comparable.</p>';
  }

  function fillTitleStats() {
    el('title-stats').innerHTML = A.artists.length + ' artists · ' + A.cities.length + ' cities · ' +
      A.works.length + ' artworks · ' + A.marketEvents.length + ' market events · ' +
      Object.keys(CFG).length + ' economy parameters.';
  }

  /* Paint the title canvas with the old start.jpg scene (the studio easel
     painting, hd-09) when it is imported; otherwise keep the warm gradient. */
  function renderTitle() {
    fillTitleStats();
    paintContinueButton();
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
  /* New Game asks the same four setup questions for every career. */
  function showNewGameForm() {
    var cityOpts = A.cities.map(function (c, i) {
      return '<option value="' + c.id + '"' + (c.id === 'amsterdam' ? ' selected' : '') + '>' +
        h(c.name) + ', ' + h(c.country) + '</option>';
    }).join('');
    var diffOpts = ['Easy', 'Normal', 'Hard'].map(function (d) {
      var v = A.DIFFICULTY[d];
      /* No money target any more: difficulty only moves the starting purse,
         the expert fees and the size of the auction crowd. */
      return '<option value="' + d + '"' + (d === 'Normal' ? ' selected' : '') + '>' +
        d + ' — start ' + A.money(CFG.startingMoney * v.startingMoney) +
        ', rivals ' + (v.rivals >= 0 ? '+' : '') + v.rivals +
        ', fees ×' + v.fee + '</option>';
    }).join('');
    var durOpts = A.DURATIONS.map(function (d, i) {
      return '<option value="' + i + '"' + (i === 1 ? ' selected' : '') + '>' +
        h(d.label) + ' (' + d.days + ' days)</option>';
    }).join('');
    dialog('Set up a career', '<div class="form career-setup-form career-setup-v2">' +
      '<fieldset class="race-setup"><legend>Four-player race</legend>' +
      '<p class="race-setup-note">Most collection points win: below 80% = 1 point, 80–89% = 2, 90–100% = 3 per painting.</p>' +
      '<div class="race-setup-grid">' +
      '<label class="race-setup-slot"><span>1 · You <small>Human</small></span><input id="f-name" maxlength="24" value="' + h(G.name) + '" aria-label="Your player name"></label>' +
      '<label class="race-setup-slot"><span>2 · Ada <small>Computer</small></span><input id="f-ai-1" maxlength="24" value="Ada" aria-label="Computer opponent 1 name"></label>' +
      '<label class="race-setup-slot"><span>3 · Clara <small>Computer</small></span><input id="f-ai-2" maxlength="24" value="Clara" aria-label="Computer opponent 2 name"></label>' +
      '<label class="race-setup-slot"><span>4 · Felix <small>Computer</small></span><input id="f-ai-3" maxlength="24" value="Felix" aria-label="Computer opponent 3 name"></label>' +
      '</div></fieldset>' +
      '<div class="career-settings">' +
      '<label>Language / Sprache<select id="f-language" aria-label="Language / Sprache">' +
        '<option value="en"' + (!window.ArtRaceLanguage || window.ArtRaceLanguage.get()==='en' ? ' selected' : '') + '>English</option>' +
        '<option value="de"' + (window.ArtRaceLanguage && window.ArtRaceLanguage.get()==='de' ? ' selected' : '') + '>Deutsch</option>' +
      '</select></label>' +
      '<label>Difficulty<select id="f-diff">' + diffOpts + '</select></label>' +
      '<label>Career length<select id="f-dur">' + durOpts + '</select></label>' +
      '<label>Starting city<select id="f-city">' + cityOpts + '</select></label>' +
      '</div>' +
      '</div>', [
      { label: 'Cancel', onClick: function () { if (!G.started) closeDialog(); else closeDialog(); } },
      { label: 'Begin career', primary: true, onClick: function () {
          if (window.ArtRaceLanguage) window.ArtRaceLanguage.set(el('f-language').value);
          newGame({
            name: el('f-name').value || 'Henry',
            difficulty: el('f-diff').value,
            durationIndex: parseInt(el('f-dur').value, 10),
            cityId: el('f-city').value,
            rivalNames: [el('f-ai-1').value, el('f-ai-2').value, el('f-ai-3').value]
          });
          G.ended = false;
          G.view = 'dealer';
          closeDialog();
          el('screen-title').hidden = true;
          el('screen-game').hidden = false;
          el('player-name').textContent = G.name;
          renderAll();
          clearSave();
          scheduleSave();
          if(window.ArtRaceTutorial) window.ArtRaceTutorial.open();
        } }
    ], 'dialog--setup');
  }

  /* =====================================================================
   * AUTOSAVE / CONTINUE
   *   A phone that refreshes (pull-to-refresh, a backgrounded tab reclaimed
   *   by the OS, a reload) used to drop the whole career, because nothing
   *   was ever written down. The state is small enough to keep in
   *   localStorage: one JSON blob of G minus the RNG closure and the clock
   *   timer, which are rebuilt on load.
   *
   *   Storage access is wrapped in try/catch everywhere: a file:// page and
   *   Safari's private mode both throw on localStorage (quota or security),
   *   and the game must keep playing without a save rather than fail.
   * ===================================================================== */
  var SAVE_KEY = 'artrace.career.v1';
  var store = (function () {
    try {
      var s = window.localStorage;
      s.setItem(SAVE_KEY + '.probe', '1');
      s.removeItem(SAVE_KEY + '.probe');
      return s;
    } catch (err) {
      return null;                       // no persistence available
    }
  })();
  var saveTimer = null;

  /* G holds a couple of things JSON cannot carry: the mulberry32 closure in
     G.rng and the interval handle in G.clockTimer. Both are dropped here and
     rebuilt by restore(). */
  function snapshot() {
    var copy = {};
    Object.keys(G).forEach(function (k) {
      if (k === 'rng' || k === 'clockTimer') return;
      copy[k] = G[k];
    });
    copy.v = 1;
    copy.savedAt = Date.now();
    return copy;
  }

  function saveNow() {
    /* a finished career is not resumable: endGame() clears the slot instead */
    if (!store || !G.started || G.ended) return;
    try {
      store.setItem(SAVE_KEY, JSON.stringify(snapshot()));
    } catch (err) {
      /* quota or private mode: keep playing, just without a save */
      store = null;
    }
  }

  /* Debounced: a colony clicks a dozen times in a row, and the blob is
     rewritten for every one of them otherwise. */
  function scheduleSave() {
    if (!store || !G.started || G.ended) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { saveTimer = null; saveNow(); }, 700);
  }

  function clearSave() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    if (!store) return;
    try { store.removeItem(SAVE_KEY); } catch (err) {}
  }

  function loadSave() {
    if (!store) return null;
    try {
      var raw = store.getItem(SAVE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      /* a save from an older build may lack fields this one renders; the
         shallow checks below are enough to reject garbage safely */
      if (!data || data.v !== 1 || typeof data.day !== 'number' ||
          !data.portfolio || typeof data.cityId !== 'string') return null;
      return data;
    } catch (err) {
      return null;
    }
  }

  /* Reseeds the RNG from the stored seed. The exact stream will diverge from
     an uninterrupted session (a closure cannot be serialised), which is
     acceptable: the seed still makes the restored career reproducible. */
  function restore(data) {
    Object.keys(data).forEach(function (k) {
      if (k === 'v' || k === 'savedAt' || k === 'rng' || k === 'clockTimer') return;
      G[k] = data[k];
    });
    G.rng = A.makeRng(G.seed);
    if (A.race) A.race.ensure();
    G.clockTimer = null;
    /* a restored page does not silently start spending days: the clock is
       off until the player ticks Auto again */
    G.clockWanted = false;
    G.ended = false;
    G.started = true;
  }

  function startSavedCareer() {
    var data = loadSave();
    if (!data) { closeDialog(); return; }
    closeDialog();
    restore(data);
    el('player-name').textContent = G.name;
    el('screen-title').hidden = true;
    el('screen-game').hidden = false;
    renderAll();
    /* the plantation screen is a layer of its own: restore it, not the city */
    if (G.colonyId && A.colonies && A.colonies.COLONY_BY_ID[G.colonyId]) A.colonies.openColony();
    else { G.colonyId = null; show(el('colony'), false); }
    paintClockUi();
  }

  /* The Continue button only exists while there is something to continue,
     and it says what: "day 42 of 180 · 3 pictures". */
  function paintContinueButton() {
    var btn = el('resume-game');
    if (!btn) return;
    var data = loadSave();
    show(btn, !!data);
    if (!data) return;
    btn.textContent = 'Continue — day ' + data.day + ' of ' + data.careerDays +
      ' · ' + (data.portfolio ? data.portfolio.length : 0) + ' pictures';
  }

  /* ---------- wiring ---------------------------------------------------- */
  function act(fn) {
    return function () {
      if (!G.started || G.ended) return;
      fn.apply(null, arguments);
      renderAll();
      scheduleSave();
    };
  }

  document.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-action],[data-view],[data-dialog],[data-place],[data-colony],#new-game,#resume-game,#show-help,#show-data');
    if (!t) return;

    if (t.id === 'new-game') { showNewGameForm(); return; }
    if (t.id === 'resume-game') { startSavedCareer(); return; }
    if (t.id === 'show-help') { dialog('How to play', helpText(), [{ label: 'Back', primary: true, onClick: closeDialog }]); return; }
    if (t.id === 'show-data') { dialog('Data source', dataText(), [{ label: 'Back', primary: true, onClick: closeDialog }]); return; }

    if (t.hasAttribute('data-colony')) {
      colonyAction(t.getAttribute('data-colony'), t); scheduleSave();
      if(colonyDetailsType==='crop' && t.getAttribute('data-colony')==='arm') { colonyDetailsType=null; closeDialog(); }
        else if(colonyDetailsType)colonyDetailsDialog(colonyDetailsType);
      return;
    }
    if (t.hasAttribute('data-place')) { showPlace(t.getAttribute('data-place')); return; }

    if (t.hasAttribute('data-dialog')) {
      var fn = dialogHandlers[parseInt(t.getAttribute('data-dialog'), 10)];
      if (fn) fn();
      return;
    }

    if (t.hasAttribute('data-view')) { colonyDetailsType=null;closeDialog();
      G.view = t.getAttribute('data-view');
      renderAll();
      scheduleSave();
      return;
    }

    var uid = t.hasAttribute('data-uid') ? parseInt(t.getAttribute('data-uid'), 10) : -1;
    var lot = t.hasAttribute('data-lot') ? parseInt(t.getAttribute('data-lot'), 10) : -1;
    var amount = t.hasAttribute('data-amount') ? parseInt(t.getAttribute('data-amount'), 10) : 0;
    var choice = t.hasAttribute('data-choice') ? parseInt(t.getAttribute('data-choice'), 10) : -1;
    var action = t.getAttribute('data-action');

    if (action === 'close-dialog') { colonyDetailsType=null;closeDialog();return; }
    if (action === 'auction-quiz-open') { auctionQuizDialog(lot);return; }
    if (action === 'colony-ui-open') { colonyDetailsDialog(t.getAttribute('data-panel'));return; }
    if (action === 'art') {
      if (A.artView) A.artView.open(t.getAttribute('data-work'), uid >= 0 ? uid : null);
      return;
    }
    if (action === 'buy') act(buyOffer)(uid);
    else if (action === 'sell') act(sellOwned)(uid);
    else if (action === 'examine') act(examine)(uid);
    else if (action === 'restore') act(restoreArtwork)(uid, Math.min(CFG.restorationMaxGain, 1 - (findOwned(uid) || { condition: 1 }).condition));
    else if (action === 'collect') act(collect)(uid);
    else if (action === 'bid') {
      if (G.clockWanted && G.view === 'auction') stopClock();
      act(bidLot)(lot); if(G.lots[lot] && G.lots[lot].leader==='you' && G.lots[lot].quiz && !G.lots[lot].quiz.answered)auctionQuizDialog(lot); }
    else if (action === 'pass') act(passLot)(lot);
    else if (action === 'quiz') act(answerLotQuiz)(lot, choice);
    else if (action === 'borrow') act(borrow)(amount);
    else if (action === 'repay') act(repay)(amount);
    else if (action === 'slot') act(buySlot)();
    else if (action === 'travel') act(travelTo)(t.getAttribute('data-city'));
    else if (action === 'sell-goods') act(sellGoods)(t.getAttribute('data-crop'), parseInt(t.getAttribute('data-units'), 10));
    else if (action === 'sell-port') act(sellPortGoods)(t.getAttribute('data-crop'), parseInt(t.getAttribute('data-units'), 10));
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
      scheduleSave();
    }
  });

  function endDay() {
    A.expireEvents(G.market, G.day);
    advanceDay(false);
  }

  document.addEventListener('change', function (ev) {
    var id = ev.target.id;
    if (id === 'cal-auto' || id === 'colony-cal-auto') {
      if (ev.target.checked && G.started && !G.ended) {
        G.clockWanted = true;
        startClock();
      } else {
        stopClock();
      }
      return;
    }
    if (id === 'cal-speed' || id === 'colony-cal-speed') {
      setClockSpeed(ev.target.value);
      return;
    }
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') closeDialog();
    if (ev.key === 'Enter' && G.started && !G.ended && el('overlay').hidden && el('colony').hidden) {
      advanceDay(false);
      renderAll();
      scheduleSave();
    }
  });

  /* A refresh, a pulled-down phone tab or a browser that reclaims the page
     can land mid-day: write the pending state now instead of waiting for the
     debounce, so nothing after the last click is lost. */
  window.addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') saveNow();
  });

  /* ---------- boot ------------------------------------------------------ */
  function boot() {
    if (!A) {
      document.body.innerHTML = '<div class="fatal">The game data could not be loaded. ' +
        'Reload the page, or serve this folder over http:// (opening the file directly can block scripts).</div>';
      return;
    }
    renderTitle();
    el('screen-title').hidden = false;
  }
  boot();

  A.shell = { stopClock: stopClock, resumeClock: resumeClockIfWanted, endGame: endGame,
              startClock: startClock, setSpeed: setClockSpeed, paintClock: paintClockUi,
              dialog: dialog, closeDialog: closeDialog };
  window.ArtRaceApp = { G: G, app: A.app, shared: A.shared, game: A };
})();
