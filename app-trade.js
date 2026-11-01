/* =========================================================================
 * app-trade.js — market, panel, trade views.
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
  /* art + colony tables, published by app-art.js / app-colonies.js */
  var thumb = function (w) { return A.art ? A.art.thumb(w) : ''; };
  var CROPS = A.colonies.CROPS, CROP_BY_ID = A.colonies.CROP_BY_ID;
  var TRADE_HUB_IDS = A.colonies.TRADE_HUB_IDS, TRADE_HUB_MULT = A.colonies.TRADE_HUB_MULT;
  var cropPrice = A.colonies.cropPrice, cropThumb = A.colonies.cropThumb;
  var VIEW_TITLES = A.shared.VIEW_TITLES || {};
  /* shared vocabulary published by app-core.js */
  var renderWorldMap = function () { return A.mapView ? A.mapView.render() : undefined; };
  var netWorth = function () { return A.app.netWorth(); };
  var askOf = function () { return A.app.askOf.apply(null, arguments); };
  var valueOf = function () { return A.app.valueOf.apply(null, arguments); };
  var idxOf = function () { return A.app.idxOf.apply(null, arguments); };
  var rivalCount = function () { return A.app.rivalCount.apply(null, arguments); };
  var checkEnd = function () { return A.app.checkEnd(); };

  function viewTrade() {
    var hub = G.cityId;
    if (!TRADE_HUB_IDS[hub]) {
      return '<p class="empty">No trade desk here — sell colonial produce in London, New York or Tokio.</p>';
    }
    var cityName = A.city(hub).name;
    var landed = (G.portGoods && G.portGoods[hub]) || {};
    var landedIds = CROPS.map(function (c) { return c.id; }).filter(function (k) { return (landed[k] || 0) > 0; });
    var landedHTML = '';
    if (landedIds.length) {
      landedHTML = '<p class="note">Crates your plantations shipped here are waiting on the dock — sell them at today\u2019s price.</p>' +
        landedIds.map(function (k) {
          var crop = CROP_BY_ID[k], units = landed[k], price = cropPrice(crop, hub);
          return '<div class="row"><div class="row-main">' + cropThumb(crop) + '<div>' +
            '<span class="title">' + h(crop.label) + '</span>' +
            '<span class="credit">' + units + ' crate(s) on the dock · ' + cityName + ' pays ' + A.money(price) + ' each · ' + cropTrendLabel(crop,hub) + '</span></div></div>' +
            '<div class="row-num"><span class="ask">' + A.money(price * units) + '</span>' +
            '<span class="est">' + A.money(price) + ' × ' + units + '</span></div>' +
            '<div class="row-btns">' +
            '<button class="btn sell" data-action="sell-port" data-crop="' + k + '" data-units="' + units + '">Sell all</button>' +
            '<button class="btn" data-action="sell-port" data-crop="' + k + '" data-units="1">Sell 1</button></div></div>';
        }).join('');
    }
    var ids = CROPS.map(function (c) { return c.id; }).filter(function (k) { return (G.goods[k] || 0) > 0; });
    if (!ids.length) {
      var empty = '<p class="note">The ' + cityName + ' trade desk buys colonial produce. You have nothing here yet — ' +
        'set a standing order on a plantation, or use the <b>Trade</b> tab on a colony to load a ship.</p>';
      return landedHTML || empty;
    }
    var rows = ids.map(function (k) {
      var crop = CROP_BY_ID[k];
      var units = G.goods[k] || 0;
      var price = cropPrice(crop, hub);
      return '<div class="row"><div class="row-main">' + cropThumb(crop) + '<div>' +
        '<span class="title">' + h(crop.label) + '</span>' +
        '<span class="credit">' + units + ' unit(s) · ' + cityName + ' pays ' + A.money(price) + ' each</span></div></div>' +
        '<div class="row-num"><span class="ask">' + A.money(price * units) + '</span>' +
        '<span class="est">' + A.money(price) + ' × ' + units + '</span></div>' +
        '<div class="row-btns">' +
        '<button class="btn sell" data-action="sell-goods" data-crop="' + k + '" data-units="' + units + '">Sell all</button>' +
        '<button class="btn" data-action="sell-goods" data-crop="' + k + '" data-units="1">Sell 1</button></div></div>';
    }).join('');
    return landedHTML + '<p class="note">Produce prices drift with the calendar; London, New York and Tokio pay different rates. Percent changes compare today with yesterday at this port.</p>' + rows;
  }

  /* Crates that already landed in this port, sold straight off the dock. */
  function sellPortGoods(cropId, units) {
    var hub = G.cityId, crop = CROP_BY_ID[cropId];
    var ledger = (G.portGoods && G.portGoods[hub]) || {};
    var have = ledger[cropId] || 0;
    units = Math.min(units | 0, have);
    if (!crop || units <= 0) return;
    var price = cropPrice(crop, hub);
    var total = price * units;
    ledger[cropId] = have - units;
    G.goods[cropId] = Math.max(0, (G.goods[cropId] || 0) - units);
    G.cash += total;
    G.colonyStats.sold += units;
    G.colonyStats.revenue += total;
    if (window.ArtRaceMissions) window.ArtRaceMissions.record('trade', units);
    log('Sold ' + units + ' ' + crop.label + ' at the ' + A.city(hub).name + ' dock for ' + A.money(total) + '.');
    checkEnd();
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
    if (window.ArtRaceMissions) window.ArtRaceMissions.record('trade', units);
    log('Sold ' + units + ' ' + crop.label + ' at ' + A.city(G.cityId).name + ' for ' + A.money(total) + '.');
    checkEnd();
  }

  function cropMarketDelta(crop,hub){
    var today=cropPrice(crop,hub);
    var previous=A.colonies.cropPriceOnDay(crop,hub,G.day-1);
    return previous>0?(today/previous-1)*100:0;
  }
  function cropTrendLabel(crop,hub){
    var change=cropMarketDelta(crop,hub);
    return '<span class="crop-market-change '+(change>0.05?'gain':change<-.05?'loss':'')+'">'+
      (change>=0?'+':'')+change.toFixed(1)+'% '+(window.ArtRaceLanguage&&window.ArtRaceLanguage.get()==='de'?'seit gestern':'vs yesterday')+'</span>';
  }
  function renderMarket() {
    var c = A.city(G.cityId);
    /* Ashore there is no city market to quote: the table keeps the last port's
       figures rather than blanking out or throwing. */
    if (!c) return;
    var rows = A.EPOCHS.map(function (e) {
      var i = A.sliceIndex(G.market, c, e);
      var ch = A.dailyChange(G.market, c, e);
      var arrow = ch > 0.004 ? '▲' : (ch < -0.004 ? '▼' : '■');
      var cls = ch > 0.004 ? 'up' : (ch < -0.004 ? 'down' : 'flat');
      var fav = c.favouriteEpochs.indexOf(e) >= 0 ? ' fav' : (c.bohemianEpochs.indexOf(e) >= 0 ? ' boh' : '');
      return '<tr class="' + cls + fav + '"><td>' + h(e) + '</td>' +
             '<td class="num">' + (i >= 1 ? '+' : '−') + Math.abs((i - 1) * 100).toFixed(1) + '%</td>' +
             '<td class="num">' + (ch >= 0 ? '+' : '') + (ch * 100).toFixed(1) + '%</td>' +
             '<td class="arrow">' + arrow + '</td></tr>';
    }).join('');
    var de = window.ArtRaceLanguage && window.ArtRaceLanguage.get()==='de';
    var hint = document.getElementById('market-explainer');
    if(hint) hint.innerHTML = de
      ? '<strong>Was bedeuten die Indizes?</strong> 1,000 = normales Preisniveau · 1,200 = etwa 20 % höher · 0,800 = etwa 20 % niedriger. „Tag“ zeigt die Änderung seit gestern. Niedrige Werte können günstige Kaufgelegenheiten sein, hohe Werte gute Verkaufsgelegenheiten. Nachrichten können diese Werte vorübergehend verändern.'
      : '<strong>How do market indices work?</strong> 1.000 = normal price level · 1.200 = about 20% higher · 0.800 = about 20% lower. “Day” shows the change since yesterday. Low indices may offer buying opportunities; high indices may favor selling. News can temporarily shift the market.';
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

  /* A sea or rail leg in progress: G.cityId still names the port we left. */
  function inTransit() {
    return !!G.voyage;
  }

  function renderStations() {
    /* Standing on a plantation means G.colonyId is set; the city in G.cityId is
       only the port the player last left, so its rooms are not reached from
       here. Every station is hidden out there — a plantation has its own
       quay and trading instead. */
    var c = G.colonyId ? null : A.city(G.cityId);
    var nav = el('stations');
    Array.prototype.forEach.call(nav.querySelectorAll('.station'), function (b) {
      var v = b.getAttribute('data-view');
      var ok = !!c;
      /* Rooms that exist only in some cities are hidden, not greyed out: a
         locked door with no explanation reads like a bug. The auction is the
         clearest case — the room is only there while a catalogue is hanging. */
      if (v === 'auction') ok = !!c && c.hasAuctionHouse && auctionListUp();
      if (v === 'bank') ok = !!c && !!c.hasBank;
      if (v === 'studio') ok = !!c && !!c.hasRestorationStudio;
      if (v === 'trade') ok = !!c && !!TRADE_HUB_IDS[c.id];
      /* At sea only the chart and the crates are reachable; the rooms of the
         port we sailed from are not. This must come last so no room rule
         above can switch them back on. */
      if (inTransit()) ok = v === 'travel' || v === 'portfolio';
      b.hidden = !ok;
      b.disabled = !ok;
      b.classList.toggle('active', ok && G.view === v);
    });
    nav.classList.toggle('is-empty', !nav.querySelector('.station:not([hidden])'));
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
    /* Catalogue facts: painter, year, kind of picture, and (for the extra
       masters) medium and size. shopInfo falls back to the kind of picture. */
    var translateArt = window.ArtRaceArtI18n ? window.ArtRaceArtI18n.translate : function(v){return v;};
    var tier=A.artTier(w);
    var facts = '<strong>'+(window.ArtRaceLanguage&&window.ArtRaceLanguage.get()==='de'?'Klasse ':'Class ')+tier.grade+' · ×'+tier.multiplier+' ★</strong> · '+h(translateArt(w.typeName)) + (w.medium ? ' · ' + h(translateArt(w.medium)) : '') +
                (w.dimensions ? ' · ' + h(w.dimensions) : '') + ' · rarity ' + w.rarity;
    return '<div class="row-main">' + thumb(w, inst.uid) + '<div>' +
           '<span class="title">' + h(w.title) + '</span>' +
           '<span class="credit">' + h(a ? a.name : 'Unknown') + ', ' + w.yearCreated + ' · ' +
           facts + aliasTag(w) + '</span>' +
           '<span class="prov">' + h(inst.provenance) + '</span></div></div>';
  }

  /* The stand-in label lives here because the manifest marks every plate that
     stands in for a listed work ('alias'). */
  function aliasTag(w) {
    var pic = A.art && A.art.pictureFor ? A.art.pictureFor(w.id) : null;
    if (!pic || pic.how !== 'alias') return '';
    return ' · <em title="the plate shows a different original by the same painter">stand-in</em>';
  }
  /* ---------- scene plates ---------------------------------------------- *
   * Auktion1..5 and the generated gallery wall are not artworks: they are
   * rooms. works-extra.js lists them (ART_RACE_SCENE_PLATES) and the importer
   * writes them to images/scenes, so every supplied file ends up on screen.
   * ---------------------------------------------------------------------- */
  var SCENES = {};
  (window.ART_RACE_SCENE_PLATES || []).forEach(function (s) { SCENES[s.id] = s; });

  function scenePlate(id) { return SCENES[id] || null; }

  /* A thin, lazy-loaded plate above a view. Missing file: nothing is drawn. */
  function sceneStrip(id) {
    var s = scenePlate(id);
    if (!s) return '';
    var SCENE_ALT = {
      auction_1: 'Auction house, morning view',
      auction_2: 'Auction house, the hammer falls',
      auction_3: 'Auction house, bidding from the back row',
      auction_4: 'Auction house, catalogue on view',
      auction_5: 'Auction house, crates leaving',
      gallery_dream: 'Gallery wall at night'
    };
    return '<figure class="scene-strip"><img src="' + h(s.file) + '" alt="' +
           h(SCENE_ALT[id] || s.title || '') + '" loading="lazy"></figure>';
  }

  /* ---------- panel views ---------------------------------------------- */
  function renderPanel() {
    /* On a plantation G.cityId is a colony id, which is not a city: there is
       no dealer, bank or auction behind the colony screen, so the gallery
       panel keeps showing the port the player sailed from. */
    var here = A.city(G.cityId);
    var c = here || A.city(G.colonyReturnCityId) || A.city(G.colonyId);
    var view = G.view;
    if (inTransit() && view !== 'portfolio') view = 'travel';
    if (!here) {
      G.view = 'portfolio';
      el('panel').innerHTML = '<div class="panel-head"><h2>' + h(VIEW_TITLES.portfolio) + '</h2>' +
        '<span class="panel-sub">at sea · ' + A.money(G.cash) + ' in hand · ' +
        G.portfolio.length + '/' + G.capacity + ' crates</span></div>' + viewPortfolio();
      el('panel-hint').textContent = 'Trade and travel open again once you are back in a port.';
      if (A.mapView && A.mapView.sync) A.mapView.sync();
      return;
    }
    if (view === 'auction' && !auctionListUp()) view = 'dealer';
    if (view === 'bank' && !c.hasBank) view = 'dealer';
    if (view === 'studio' && !c.hasRestorationStudio) view = 'dealer';
    if (view === 'trade' && !TRADE_HUB_IDS[c.id]) view = 'dealer';
    G.view = view;

    var head = '<div class="panel-head' + (view === 'auction' ? ' auction-panel-head' : '') + '"><h2>' + h(VIEW_TITLES[view]) + '</h2>' +
               '<span class="panel-sub">' + h(c.name) + ' · ' + A.money(G.cash) + ' in hand · ' +
               G.portfolio.length + '/' + G.capacity + ' crates</span>' +
               (view === 'auction' ? sceneStrip(auctionOpenHere() ? 'auction_2' : 'auction_4') : '') + '</div>';
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
      view === 'dealer' ? 'A gallery is the fast, expensive way to buy — auction rooms are cheaper, if you can wait for the hammer.' : '';
    /* the engraved chart is a canvas, so it can only mount once the panel HTML
       is in the document — that is exactly here. */
    if (A.mapView && A.mapView.sync) A.mapView.sync();
  }

  /* Compare asking prices with the existing city/date/condition estimate.
     This is a guide, not an authenticity guarantee or a profit forecast. */
  function priceSignal(price, low, high) {
    if (!(high > 0) || !(low > 0)) return '';
    var mid = (low + high) / 2;
    var ratio = price / mid;
    var de = window.ArtRaceLanguage && window.ArtRaceLanguage.get() === 'de';
    var grade = ratio < .8 ? 'good' : ratio > 1.2 ? 'expensive' : 'fair';
    var label = grade === 'good' ? (de ? 'Günstig' : 'Good price')
      : grade === 'expensive' ? (de ? 'Teuer' : 'Expensive')
      : (de ? 'Marktüblich' : 'Fair price');
    return '<span class="price-signal price-signal--' + grade + '" title="' +
      (de ? 'Vergleich mit dem Mittelwert der Schätzung' : 'Compared with the midpoint of the estimate') +
      '">' + label + '</span>';
  }

  function marketSortControls(kind) {
    var de = window.ArtRaceLanguage && window.ArtRaceLanguage.get() === 'de';
    return '<div class="art-market-toolbar"><label>' + (de ? 'Sortieren nach' : 'Sort by') +
      ' <select class="art-market-sort" aria-label="' + (de ? 'Kunstwerke sortieren' : 'Sort artwork') + '">' +
      '<option value="default">' + (de ? 'Standardreihenfolge' : 'Default order') + '</option>' +
      '<option value="price-asc">' + (de ? 'Preis: aufsteigend' : 'Price: low to high') + '</option>' +
      '<option value="price-desc">' + (de ? 'Preis: absteigend' : 'Price: high to low') + '</option>' +
      '<option value="condition-desc">' + (de ? 'Zustand: bester zuerst' : 'Condition: best first') + '</option>' +
      '<option value="artist">' + (de ? 'Künstler: A–Z' : 'Artist: A–Z') + '</option>' +
      '<option value="value">' + (de ? 'Preisbewertung: günstig zuerst' : 'Value: best deal first') + '</option>' +
      '</select></label></div>';
  }
  document.addEventListener('change', function(ev) {
    if (!ev.target || !ev.target.classList.contains('art-market-sort')) return;
    var wrap = ev.target.closest('.art-market-view'), grid = wrap && wrap.querySelector('.art-market-grid');
    if (!grid) return;
    var mode = ev.target.value;
    var cards = Array.from(grid.querySelectorAll('.art-market-card'));
    cards.sort(function(a,b) {
      function n(el,key) { var v=Number(el.dataset[key]);return isFinite(v)?v:0; }
      var d=0;
      if (mode==='price-asc') d=n(a,'price')-n(b,'price');
      else if (mode==='price-desc') d=n(b,'price')-n(a,'price');
      else if (mode==='condition-desc') d=n(b,'condition')-n(a,'condition');
      else if (mode==='artist') d=(a.dataset.artist||'').localeCompare(b.dataset.artist||'',undefined,{sensitivity:'base'});
      else if (mode==='value') {
        /* Not-yet-published auction estimates remain hidden and sort last. */
        var va=n(a,'value'),vb=n(b,'value');
        d=(va<0?Infinity:va)-(vb<0?Infinity:vb);
      }
      return d || n(a,'order')-n(b,'order');
    });
    cards.forEach(function(card) {grid.appendChild(card);});
  });

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
      return '<article class="row art-market-card' + (afford ? '' : ' dim') +
        '" data-order="' + offers.indexOf(inst) + '" data-price="' + ask +
        '" data-condition="' + (Number(inst.condition)||0) +
        '" data-artist="' + h((A.artistById[w.artistId]||{}).name||'') +
        '" data-value="' + (estLo>0 && estHi>0 ? (ask/((estLo+estHi)/2)).toFixed(5) : '-1') + '">' + rowHead(inst) +
        '<div class="row-tags">' + condTag(inst) + authTag(inst) + '</div>' +
        '<div class="row-num"><span class="ask">' + A.money(ask) + '</span>' +
        priceSignal(ask, estLo, estHi) +
        '<span class="est">consignor estimate ' + A.money(estLo) + '–' + A.money(estHi) + '</span></div>' +
        '<button class="btn buy" data-action="buy" data-uid="' + inst.uid + '"' + (afford ? '' : ' disabled') + '>Buy</button></article>';
    }).join('');
    return '<p class="note">Restocks every ' + CFG.dealerRestockDays + ' days · gallery markup ' +
      A.pct(CFG.dealerMargin * CFG.dealerPremium) + ' over market value · buy-backs pay ' +
      A.pct(1 - CFG.dealerSpread) + ' of value.</p><section class="art-market-view">' + marketSortControls('dealer') + '<div class="art-market-grid">' + rows + '</div></section>';
  }

  document.addEventListener('change',function(e){
    if(!e.target || (e.target.id!=='gallery-sort' && e.target.id!=='gallery-epoch'))return;
    var gallery=document.querySelector('.portfolio-gallery');if(!gallery)return;
    var grid=gallery.querySelector('.portfolio-gallery-grid'),sort=gallery.querySelector('#gallery-sort').value,epoch=gallery.querySelector('#gallery-epoch').value;
    var tiles=Array.from(grid.querySelectorAll('.portfolio-gallery-tile'));
    tiles.sort(function(a,b){
      if(sort==='condition')return Number(b.dataset.condition)-Number(a.dataset.condition);
      if(sort==='epoch')return a.dataset.epoch.localeCompare(b.dataset.epoch)||a.dataset.title.localeCompare(b.dataset.title);
      return a.dataset.title.localeCompare(b.dataset.title);
    });
    tiles.forEach(function(tile){tile.hidden=epoch!=='all'&&tile.dataset.epoch!==epoch;grid.appendChild(tile);});
  });
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
        (inStudio ? '<span class="tag warn">Restoration booked · ready day ' + inst.restoreReadyDay + '</span>' : '') + '</div>' +
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
    var score=A.race&&A.race.collectionBreakdown?A.race.collectionBreakdown(G.portfolio):null;
    var bonusHtml=score?'<p class="note">'+(window.ArtRaceLanguage&&window.ArtRaceLanguage.get()==='de'?'Sammlungspunkte: ':'Collection points: ')+score.base+' ★ + '+score.bonus+' ★ Bonus = <b>'+score.total+' ★</b>. '+(window.ArtRaceLanguage&&window.ArtRaceLanguage.get()==='de'?'2 Werke eines Künstlers: +30%; alle 3: doppelte Punkte.':'2 works by one artist: +30%; all 3: double points.')+'</p>':'';
    return bonusHtml+'<div class="portfolio-gallery"><div class="portfolio-gallery-heading"><h3>Meine Galerie / My gallery</h3><p>Tippe auf ein Bild, um es groß zu betrachten · Tap a painting to enlarge</p></div><div class="portfolio-gallery-controls"><label>Sortieren / Sort <select id="gallery-sort"><option value="title">Titel / Title</option><option value="condition">Zustand / Condition</option><option value="epoch">Epoche / Epoch</option></select></label><label>Epoche / Epoch <select id="gallery-epoch"><option value="all">Alle / All</option>' + Array.from(new Set(G.portfolio.map(function(inst){return A.workEpoch(A.work(inst.defId));}))).sort().map(function(ep){return '<option value="'+h(ep)+'">'+h(ep)+'</option>';}).join('') + '</select></label></div><div class="portfolio-gallery-grid">' + G.portfolio.map(function(inst){ var w=A.work(inst.defId), pic=window.ART_ARTWORK_IMAGES && window.ART_ARTWORK_IMAGES.images && window.ART_ARTWORK_IMAGES.images[w.id]; return '<button type="button" class="portfolio-gallery-tile" data-epoch="'+h(A.workEpoch(w))+'" data-title="'+h(w.title)+'" data-condition="'+Math.round(inst.condition*100)+'" data-action="art" data-work="'+h(w.id)+'" data-uid="'+inst.uid+'">'+(pic?'<img loading="lazy" alt="'+h(w.title)+'" src="'+h(pic.file)+'">':'<span class="portfolio-gallery-noimage">'+h(w.title)+'</span>')+'<span>'+h(w.title)+' · '+Math.round(inst.condition*100)+'%</span></button>'; }).join('') + '</div></div><p class="note">Warehouse value at today’s indices: ' + A.money(total) +
      ' · condition slips ' + A.pct(CFG.dailyConditionDecay) + ' every day.</p>' + rows;
  }
  /* Is the auction room open for business right now, for this player? */
  var auctionOpenHere = function () { return !!A.app.auctionOpenHere(); };
  var auctionListUp = function () { return !!A.app.auctionListUp(); };
  var daysToAuction = function () { return A.app.daysToAuction(); };
  var saleLeadDays = function () { return A.app.saleLeadDays(); };
  function nextAuctionCity() {
    var names = A.cities.filter(function (x) { return x.hasAuctionHouse; })
                        .map(function (x) { return x.name; });
    return names.join(', ');
  }
  function auctionClosedNote() {
    var c = A.city(G.cityId);
    if (!c.hasAuctionHouse)
      return '<p class="empty">No auction house in ' + h(c.name) +
             '. The rooms are in ' + h(nextAuctionCity()) + '.</p>';
    var days = daysToAuction();
    if (days > 0)
      return '<p class="empty">The room is dark: the hammer falls in ' + days + ' day(s), on day ' +
             G.auctionDay + '. Travel on and come back then — bids are only taken on the sale day.</p>';
    if (days === 0)
      return '<p class="empty">To-day is the sale: the catalogue is being hung. Come back in a moment.</p>';
    return '<p class="empty">The hammer has fallen. The next sale in ' + h(c.name) + ' is on day ' +
           G.auctionDay + '.</p>';
  }

  function viewAuction() {
    var head = '<p class="note">' + (auctionOpenHere() ? 'Sale in progress' :
      'Catalogue on view') + ' · hammer on day ' + G.auctionDay + ' · buyer\u2019s premium ' +
      A.pct(CFG.auctionCommission) + ' · increment ' + A.pct(CFG.auctionIncrementRatio) + '.</p>';
    if (!auctionListUp())
      return auctionClosedNote();
    if (!G.lots.length)
      return '<p class="empty">The sale list is being drawn up — come back tomorrow.</p>';
    var live = auctionOpenHere();
    var rows = G.lots.map(function (lot, i) {
      var cls = lot.closed ? (lot.leader === 'you' ? ' won' : ' gone') : '';
      var step = Math.max(1, Math.round(lot.bid * CFG.auctionIncrementRatio));
      var open = !lot.closed;
      var quizOpen = lot.leader === 'you' && lot.quiz && !lot.quiz.answered;
      var w = A.work(lot.inst.defId);
      var a = A.artistById[w.artistId];
      /* While the expert question is open, the row must not show the answer:
         year, medium and kind of picture stay hidden, and the picture does not open. */
      var info = open
        ? '<div class="row-main">' + thumb(w, lot.inst.uid) + '<div>' +
          '<span class="title">' + h(w.title) + '</span>' +
          '<span class="credit">' + h(a ? a.name : 'Unknown') + '</span></div></div>'
        : quizOpen
          ? '<div class="row-main">' + thumb(w, lot.inst.uid, true) + '<div>' +
            '<span class="title">' + h(w.title) + '</span>' +
            '<span class="credit">' + h(a ? a.name : 'Unknown') + '</span>' +
            '<span class="prov">' + h(lot.inst.provenance) + '</span></div></div>' +
            '<div class="row-tags">' + condTag(lot.inst) + authTag(lot.inst) +
            '<span class="tag">reserve ' + A.money(lot.reserve) + '</span></div>'
          : rowHead(lot.inst) + '<div class="row-tags">' + condTag(lot.inst) + authTag(lot.inst) +
            '<span class="tag">reserve ' + A.money(lot.reserve) + '</span></div>';
      var head = '';
      var nums = '<div class="row-num"><span class="ask">bid ' + A.money(lot.bid) + '</span>' +
        (open ? '' : priceSignal(lot.bid, lot.low, lot.high)) +
        (open ? '' : '<span class="est">estimate ' + A.money(lot.low) + '–' + A.money(lot.high) + '</span>') +
        '<span class="est">' + (lot.closed ? (lot.leader === 'you' ? 'HAMMERED TO YOU' : 'sold to the room')
          : rivalCount() + ' bidders in the room') + '</span></div>';
      var quiz = '';
      if(lot.quiz && lot.leader==='you'){
        var de=window.ArtRaceLanguage && window.ArtRaceLanguage.get()==='de';
        quiz='<div class="auction-quiz-inline"><span>'+
          (lot.quiz.answered?(de?'Quiz abgeschlossen':'Quiz complete') :
            (de?'Expertenquiz · Runde ':'Expert quiz · Round ')+(lot.quiz.round||1)+'/3')+
          '</span><button class="btn" type="button" data-action="auction-quiz-open" data-lot="'+i+'">'+
          (lot.quiz.answered?(de?'Ergebnis':'Result'):(de?'Quiz öffnen':'Open quiz'))+
          '</button></div>';
      }
      var btns = '';
      if (open && live)
        btns = '<button class="btn bid" data-action="bid" data-lot="' + i + '">Bid + ' + A.money(step) + '</button>' +
          '<button class="btn" data-action="pass" data-lot="' + i + '">Pass</button>';
      else if (open)
        btns = '<span class="tag">bids open on day ' + G.auctionDay + '</span>';
      return '<article class="row art-market-card' + cls +
        '" data-order="' + i + '" data-price="' + lot.bid +
        '" data-condition="' + (Number(lot.inst.condition)||0) +
        '" data-artist="' + h((a&&a.name)||'') +
        '" data-value="' + (!open && !quizOpen && lot.low>0 && lot.high>0 ? (lot.bid/((lot.low+lot.high)/2)).toFixed(5) : '-1') +
        '">' + head + info + nums + quiz +
        (btns ? '<div class="row-btns">' + btns + '</div>' : '') + '</article>';
    }).join('');
    return '<section class="auction-view art-market-view">' + head + marketSortControls('auction') + '<div class="art-market-grid">' + rows + '</div></section>';
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
        '<span class="est">' + (inStudio ? 'Restoring: ' + A.pct(inst.condition) + ' → ' + A.pct(Math.min(1,inst.condition + (inst.pendingRestore || 0))) + ' when ready' : A.pct(inst.condition) + ' → ' + A.pct(Math.min(1,inst.condition + gain)) + ' in ' + days + ' day(s)') + '</span></div>' +
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
    /* the colony screen replaces this panel entirely, so a colony passage
       never shows a banner here — and the day clock keeps running. */
    var away = !!G.voyage && !G.voyage.colonyId;
    var de=window.ArtRaceLanguage && window.ArtRaceLanguage.get()==='de';
    var destinations=A.colonies.travelDestinations(G.cityId);
    var rows=destinations.map(function(d){
      var target=d.city||A.colonies.COLONY_BY_ID[d.colonyId];
      var price=A.ticketPrice(from,target),days=A.ticketDays(from,target);
      return {destination:d,target:target,price:price,days:days};
    }).sort(function(a,b){return a.days-b.days||a.price-b.price;}).map(function(item){
      var d=item.destination,price=item.price,days=item.days;
      var colony=d.kind==='colony',blocked=away||price>G.cash;
      var kind=colony?(de?'Kolonie · Anbau':'Colony · Farming'):(d.kind==='trade'?(de?'Stadt · Handel':'City · Trade'):(de?'Stadt':'City'));
      var special=colony ? (de?'Anbau: ':'Produce: ')+
        ((A.colonies.COLONY_CROP_IDS||{})[d.colonyId]||[]).map(function(id){
          var crop=A.colonies.CROP_BY_ID[id];return crop?crop.label:id;
        }).join(', ') : d.sub;
      return '<button type="button" class="dest-row'+(blocked?' is-poor':'')+
        '" data-action="travel" data-city="'+h(d.colonyId||d.slug)+'"'+(blocked?' disabled aria-disabled="true"':'')+'>'+
        '<span class="dest-name">'+h(d.label)+'</span><span class="dest-kind">'+h(kind)+'</span>'+
        '<span class="dest-sub">'+h(special)+'</span>'+
        '<span class="dest-meta">'+A.money(price)+' · '+days+'d</span>'+
        '<span class="dest-leg" aria-hidden="true">'+days+'d · '+A.money(price)+'</span></button>';
    }).join('');
    return renderWorldMap() +
      (away ? '' :
      '<p class="note">Tickets cost ' + A.money(CFG.baseTicketPrice) + ' + ' +
      A.money(CFG.ticketPricePerDistance) + ' per map unit · ' + CFG.crateHandlingFee +
      ' freight per crate · a long ride can knock a painting about. Click a pin or a city on the chart for its picture.</p><div class="dest-list city-travel-destinations">' + rows + '</div>');
  }

  function viewReport() {
    var held = 0;
    G.portfolio.forEach(function (p) { held += valueOf(p); });
    var st = G.stats;
    var rows = [
      ['Career', 'day ' + G.day + ' of ' + G.careerDays + ' · ' + dateOf(G.day).year],
      ['Base', A.city(G.cityId).name],
      /* Same score as the end-of-career dialog: pictures, not dollars. */
      ['Pictures held', G.portfolio.length + ' of ' + G.capacity + ' crates'],
      ['Collection value', A.money(held)],
      ['Net worth', A.money(netWorth())],
      ['Cash', A.money(G.cash) + ' · debt ' + A.money(G.loan)],
      ['Warehouse', G.portfolio.length + ' crate(s) · ' + A.money(held)],
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

  A.trade = {
    renderMarket: renderMarket, renderNews: renderNews, renderStations: renderStations,
    renderTicker: renderTicker, renderPanel: renderPanel,
    viewTrade: viewTrade, viewDealer: viewDealer, viewPortfolio: viewPortfolio,
    viewAuction: viewAuction, viewBank: viewBank, viewStudio: viewStudio,
    viewTravel: viewTravel, viewReport: viewReport,
    sellGoods: sellGoods, sellPortGoods: sellPortGoods
  };
})();
