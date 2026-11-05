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
    var de=!!(window.ArtRaceLanguage&&window.ArtRaceLanguage.get()==='de');
    var hubs=['london','newyork','tokio'];
    var names={london:de?'London':'London',newyork:de?'New York':'New York',tokio:de?'Tokio':'Tokyo'};
    var currentHub=hubs.indexOf(G.cityId)!==-1?G.cityId:null;
    var rows=CROPS.map(function(crop){
      /* Display the actual sale price. Outside an exchange show the best of
         the three trade hubs, explicitly naming the destination. */
      var hub=currentHub;
      if(!hub)hub=hubs.reduce(function(best,id){
        return cropPrice(crop,id)>cropPrice(crop,best)?id:best;
      },hubs[0]);
      var price=cropPrice(crop,hub);
      var previous=A.colonies.cropPriceOnDay(crop,hub,G.day-1);
      var change=previous>0?(price/previous-1)*100:0;
      var cls=change>0.05?'up':change<-.05?'down':'flat';
      var arrow=change>0.05?'▲':change<-.05?'▼':'■';
      var label=de?({kakao:'Kakao',tee:'Tee',kaffee:'Kaffee',tabak:'Tabak',stoffe:'Stoffe'}[crop.id]||crop.label):crop.label;
      return '<tr class="'+cls+'"><td>'+h(label)+(currentHub?'':'<small style="display:block;font-size:.68em;opacity:.8">'+h(names[hub])+'</small>')+'</td>'+
        '<td class="num">'+A.money(price)+'</td>'+
        '<td class="num">'+(change>=0?'+':'')+change.toFixed(1)+'%</td>'+
        '<td class="arrow">'+arrow+'</td></tr>';
    }).join('');
    var hint=document.getElementById('market-explainer');
    if(hint)hint.textContent=currentHub
      ? (de?'Aktuelle Verkaufspreise je Kiste in '+names[currentHub]+'. Änderung seit gestern.':'Current sale price per crate in '+names[currentHub]+'. Change since yesterday.')
      : (de?'Bester aktueller Verkaufspreis je Kiste aus London, New York und Tokio. Der Handelsort steht unter der Ware; Verkauf nur dort. Änderung seit gestern.':'Best current sale price per crate across London, New York and Tokyo. Exchange shown below each good; sell there. Daily change.');
    el('market-table').innerHTML='<thead><tr><th>'+(de?'Ware':'Good')+'</th><th class="num">'+(de?'Preis':'Price')+'</th><th class="num">'+(de?'Tag':'Day')+'</th><th></th></tr></thead><tbody>'+rows+'</tbody>';
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
      if (v === 'auction') {
        ok = !!c && c.hasAuctionHouse && auctionListUp();
        var isLiveToday = ok && auctionOpenHere();
        b.classList.toggle('has-live-auction', isLiveToday);
        var liveBadge = b.querySelector('.station-live-badge');
        if (isLiveToday) {
          var de = window.ArtRaceLanguage && window.ArtRaceLanguage.get() === 'de';
          if (!liveBadge) {
            liveBadge = document.createElement('span');
            liveBadge.className = 'station-live-badge';
            b.appendChild(liveBadge);
          }
          liveBadge.textContent = de ? 'HEUTE' : 'TODAY';
        } else if (liveBadge) {
          liveBadge.remove();
        }
      }
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
    // Older saves may still contain the former startup diagnostic.
    var entry = G.log.filter(function (item) { return !/^Seed \d+\b/.test(item.text); })[0];
    el('ticker-text').textContent = entry ? entry.text : 'Welcome to the trade.';
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
        G.portfolio.length + '/' + G.capacity + ' Artwork slots</span></div>' + viewPortfolio();
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
               G.portfolio.length + '/' + G.capacity + ' Artwork slots</span>' +
               (view === 'auction' ? sceneStrip(auctionOpenHere() ? 'auction_2' : 'auction_4') : '') + '</div>';
    var body = '';
    if (view === 'accommodation') body = viewAccommodation(c);
    else if (view === 'dealer') body = viewDealer();
    else if (view === 'portfolio') body = viewPortfolio();
    else if (view === 'auction') body = viewAuction();
    else if (view === 'bank') body = viewBank();
    else if (view === 'studio') body = viewStudio();
    else if (view === 'travel') body = viewTravel();
    else if (view === 'trade') body = viewTrade();
    else body = viewReport();

    el('panel').innerHTML = head + body;
    var hint = el('panel-hint');
    hint.textContent = view === 'accommodation' ? (window.ArtRaceLanguage && window.ArtRaceLanguage.get() === 'de' ? 'Dein Stadthaus und Stadtübersicht. Plane deine Reisen nach den kommenden Kunstauktionen.' : 'Your townhouse and city overview. Plan your journeys around upcoming art auctions.') :
      view === 'travel' ? 'Pick a city on the map or in the list to move the gallery there. Gold colony pins can be sailed to.' :
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

    function viewAccommodation(c) {
    var de = window.ArtRaceLanguage && window.ArtRaceLanguage.get() === 'de';
    var rate = A.cityHotelRate(c.id);
    var schedule = (A.app && A.app.getAuctionSchedule) ? A.app.getAuctionSchedule() : (G.auctionSchedule || []);
    var upcoming = schedule.filter(function (auc) { return auc.day >= G.day && !auc.completed; });
    upcoming.sort(function (a, b) { return a.day - b.day; });

    var facilities = [];
    if (c.hasAuctionHouse) facilities.push({ icon: '🏛️', label: de ? 'Auktionshaus' : 'Auction House' });
    if (c.hasBank) facilities.push({ icon: '🏦', label: de ? 'Bank' : 'Bank' });
    if (c.hasRestorationStudio) facilities.push({ icon: '🎨', label: de ? 'Restaurierungsatelier' : 'Restoration Studio' });
    if (TRADE_HUB_IDS[c.id]) facilities.push({ icon: '💰', label: de ? 'Warenbörse' : 'Commodity Exchange' });

    var facHtml = facilities.map(function (f) {
      return '<span class="hotel-fac-badge"><span aria-hidden="true">' + f.icon + '</span> ' + h(f.label) + '</span>';
    }).join('');

    var hotelHead = '<div class="hotel-welcome-card">' +
      '<div class="hotel-welcome-main">' +
        '<span class="hotel-icon" aria-hidden="true">🏠</span>' +
        '<div>' +
          '<h3>' + (de ? 'Stadthaus & Residenz ' + h(c.name) : 'Townhouse & Residence ' + h(c.name)) + '</h3>' +
          '<p class="hotel-meta">' + h(c.country) + ' · ' + h(c.regionName) + '</p>' +
          (facHtml ? '<div class="hotel-fac-row">' + facHtml + '</div>' : '') +
        '</div>' +
      '</div>' +
      '<div class="hotel-rate-box">' +
        '<span class="hotel-rate-label">' + (de ? 'Wohnkosten / Nacht' : 'Upkeep / night') + '</span>' +
        '<strong>' + A.money(rate) + '</strong>' +
        '<span class="hotel-rate-note">' + (de ? 'Täglich automatisch abgebucht' : 'Deducted daily automatically') + '</span>' +
      '</div>' +
    '</div>';

    var liveAlert = '';
    if (auctionOpenHere()) {
      liveAlert = '<div class="hotel-live-card hotel-live-card--open">' +
        '<div class="hotel-live-icon">🔨</div>' +
        '<div class="hotel-live-text">' +
          '<h4>' + (de ? 'AUKTION HEUTE IN ' + h(c.name).toUpperCase() + '!' : 'AUCTION TODAY IN ' + h(c.name).toUpperCase() + '!') + '</h4>' +
          '<p>' + (de ? 'Der Auktionssaal nimmt heute Gebote entgegen. Nutze deine Chance auf wertvolle Originale.' : 'The saleroom is open for bidding today. Take your chance to acquire rare originals.') + '</p>' +
        '</div>' +
        '<button type="button" class="btn primary" data-view="auction">' + (de ? '🔨 Auktionssaal betreten' : '🔨 Enter Auction Room') + '</button>' +
      '</div>';
    } else if (auctionListUp()) {
      var daysLeft = daysToAuction();
      liveAlert = '<div class="hotel-live-card hotel-live-card--hanging">' +
        '<div class="hotel-live-icon">📜</div>' +
        '<div class="hotel-live-text">' +
          '<h4>' + (de ? 'Auktionskatalog liegt aus' : 'Catalogue on View') + '</h4>' +
          '<p>' + (de ? 'Die Auktion in ' + h(c.name) + ' findet in ' + daysLeft + ' Tag(en) statt (Tag ' + G.auctionDay + '). Besichtige die Lose vorab.' : 'The auction in ' + h(c.name) + ' takes place in ' + daysLeft + ' day(s) (Day ' + G.auctionDay + '). Inspect the lots in advance.') + '</p>' +
        '</div>' +
        '<button type="button" class="btn" data-view="auction">' + (de ? '📜 Katalog im Saal ansehen' : '📜 View Catalogue in Room') + '</button>' +
      '</div>';
    }

    var scheduleCards = '';
    if (!upcoming.length) {
      scheduleCards = '<p class="empty">' + (de ? 'Derzeit sind keine Auktionen im Kalender eingetragen.' : 'No auctions currently scheduled.') + '</p>';
    } else {
      scheduleCards = upcoming.map(function (auc) {
        var aucCity = A.city(auc.cityId);
        var cityName = aucCity ? aucCity.name : auc.cityId;
        var daysAway = auc.day - G.day;
        var isHere = auc.cityId === c.id;
        var isToday = daysAway === 0;

        var timingBadge = isToday
          ? '<span class="hotel-timing-badge hotel-timing-badge--today">' + (de ? '🔨 HEUTE' : '🔨 TODAY') + '</span>'
          : daysAway === 1
            ? '<span class="hotel-timing-badge hotel-timing-badge--soon">' + (de ? 'Morgen · Tag ' + auc.day : 'Tomorrow · Day ' + auc.day) + '</span>'
            : '<span class="hotel-timing-badge">' + (de ? 'In ' + daysAway + ' Tagen · Tag ' + auc.day : 'In ' + daysAway + ' days · Day ' + auc.day) + '</span>';

        var locBadge = isHere
          ? '<span class="hotel-loc-badge hotel-loc-badge--here">' + (de ? 'Hier vor Ort' : 'Here in town') + '</span>'
          : '<span class="hotel-loc-badge">' + (de ? 'Reise nötig' : 'Travel required') + '</span>';

        var lots = (auc.lots || []).slice(0, 2);
        var worksCount = lots.length;

        var thumbsHtml = lots.map(function (lot) {
          var w = A.work(lot.inst.defId);
          if (!w) return '';
          var pic = (A.art && A.art.artPicture ? A.art.artPicture(w.id) : null) ||
                    (A.art && A.art.pictureFor ? A.art.pictureFor(w.id) : null) ||
                    (window.ART_ARTWORK_IMAGES && window.ART_ARTWORK_IMAGES.images ? window.ART_ARTWORK_IMAGES.images[w.id] : null);
          var a = A.artistById[w.artistId];
          var titleWithArtist = h(w.title) + (a ? ' - ' + h(a.name) : '');
          return '<div class="hotel-auc-thumb" title="' + titleWithArtist + '">' +
            (pic ? '<img src="' + h(pic.file) + '" alt="' + h(w.title) + '" loading="lazy" />' : '<span class="hotel-auc-noimg">' + h(w.title.slice(0, 1)) + '</span>') +
          '</div>';
        }).join('');

        var infoHtml = '';
        if (worksCount === 1) {
          var w0 = A.work(lots[0].inst.defId);
          var a0 = w0 ? A.artistById[w0.artistId] : null;
          var artistName0 = a0 ? a0.name : '';
          infoHtml = '<span class="hotel-auc-count">' + (de ? '1 Spitzenlos im Angebot' : '1 featured lot offered') + '</span>' +
                     (w0 ? '<span class="hotel-auc-painting-title" title="' + h(w0.title) + '">&bdquo;' + h(w0.title) + '&ldquo;</span>' : '') +
                     '<span class="hotel-auc-hint">' + (artistName0 ? h(artistName0) + ' · ' : '') + (de ? 'Schätzung ' : 'Est. ') + A.money(lots[0].low) + ' - ' + A.money(lots[0].high) + '</span>';
        } else if (worksCount === 2) {
          var w1 = A.work(lots[0].inst.defId);
          var w2 = A.work(lots[1].inst.defId);
          var a1 = w1 ? A.artistById[w1.artistId] : null;
          var a2 = w2 ? A.artistById[w2.artistId] : null;
          var artistsList = [a1 ? a1.name : '', a2 ? a2.name : ''].filter(Boolean).join(' & ');
          var minEst = Math.min(lots[0].low, lots[1].low);
          var maxEst = Math.max(lots[0].high, lots[1].high);
          infoHtml = '<span class="hotel-auc-count">' + (de ? '2 Meisterwerke im Angebot' : '2 masterpieces offered') + '</span>' +
                     '<span class="hotel-auc-painting-title" title="' + h(artistsList) + '">' + h(artistsList || (de ? 'Ausgewählte Werke' : 'Selected works')) + '</span>' +
                     '<span class="hotel-auc-hint">' + (de ? 'Schätzungen ' : 'Estimates ') + A.money(minEst) + ' - ' + A.money(maxEst) + '</span>';
        } else {
          infoHtml = '<span class="hotel-auc-count">' + (de ? 'Katalog in Vorbereitung' : 'Catalogue in preparation') + '</span>' +
                     '<span class="hotel-auc-hint">' + (de ? 'Klicken für Details' : 'Click to inspect') + '</span>';
        }

        var isSingle = worksCount === 1 ? ' is-single-lot' : '';

        return '<article class="hotel-auction-card' + (isHere ? ' is-here' : '') + (isToday ? ' is-today' : '') + isSingle + '" data-action="auction-preview" data-auction-id="' + h(auc.id) + '">' +
          '<div class="hotel-auction-card-head">' +
            '<div class="hotel-auction-city"><strong>' + h(cityName) + '</strong> ' + locBadge + '</div>' +
            timingBadge +
          '</div>' +
          '<div class="hotel-auction-card-body">' +
            '<div class="hotel-auc-thumbs-wrap">' + thumbsHtml + '</div>' +
            '<div class="hotel-auction-card-info">' + infoHtml + '</div>' +
          '</div>' +
          '<div class="hotel-auction-card-foot">' +
            '<button type="button" class="btn btn-sm" data-action="auction-preview" data-auction-id="' + h(auc.id) + '">' +
              (de ? 'Auktionslose ansehen' : 'View Auction Lots') +
            '</button>' +
            (isToday && isHere ? '<button type="button" class="btn btn-sm primary" data-view="auction">' + (de ? 'Mitbieten' : 'Bid Now') + '</button>' : '') +
          '</div>' +
        '</article>';
      }).join('');
    }

    var scheduleSection = '<section class="hotel-auctions-section">' +
      '<div class="hotel-section-head">' +
        '<h3>🏛️ ' + (de ? 'Auktionskalender & Kommende Auktionen' : 'Auction Calendar & Upcoming Auctions') + '</h3>' +
        '<p class="note">' + (de ? 'Große Kunstauktionen finden in Intervallen in den Metropolen statt. Klicke auf eine Auktion, um genau zu sehen, welche Kunstwerke dort versteigert werden.' : 'Major art auctions take place at scheduled intervals in major art capitals. Click on an auction to see exactly what is being auctioned.') + '</p>' +
      '</div>' +
      '<div class="hotel-auctions-grid">' + scheduleCards + '</div>' +
    '</section>';

    return '<div class="hotel-view">' + hotelHead + liveAlert + scheduleSection + '</div>';
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
    var deScarcity=window.ArtRaceLanguage&&window.ArtRaceLanguage.get()==='de';
    var scarcity=deScarcity?'Wertklassen: A ×5 (nur 1 Stadt), B ×4 (2), C ×3 (4), D ×2 (7), E ×1 (alle Städte). Reisen lohnt sich für seltene Kunst.':'Artwork classes: A ×5 (1 city), B ×4 (2), C ×3 (4), D ×2 (7), E ×1 (all cities). Travel to find valuable art.';
    return '<p class="note">'+scarcity+'</p><p class="note">Restocks every ' + CFG.dealerRestockDays + ' days · gallery markup ' +
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
    var de=!!(window.ArtRaceLanguage&&window.ArtRaceLanguage.get()==='de');
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
    return bonusHtml+'<div class="portfolio-gallery"><div class="portfolio-gallery-heading"><h3>'+(de?'Meine Galerie':'My gallery')+'</h3><p>'+(de?'Tippe auf ein Bild, um es groß zu betrachten':'Tap a painting to enlarge')+'</p></div><div class="portfolio-gallery-controls"><label>'+(de?'Sortieren':'Sort')+' <select id="gallery-sort"><option value="title">'+(de?'Titel':'Title')+'</option><option value="condition">'+(de?'Zustand':'Condition')+'</option><option value="epoch">'+(de?'Epoche':'Epoch')+'</option></select></label><label>Epoche / Epoch <select id="gallery-epoch"><option value="all">'+(de?'Alle':'All')+'</option>' + Array.from(new Set(G.portfolio.map(function(inst){return A.workEpoch(A.work(inst.defId));}))).sort().map(function(ep){return '<option value="'+h(ep)+'">'+h(ep)+'</option>';}).join('') + '</select></label></div><div class="portfolio-gallery-grid">' + G.portfolio.map(function(inst){ var w=A.work(inst.defId), pic=window.ART_ARTWORK_IMAGES && window.ART_ARTWORK_IMAGES.images && window.ART_ARTWORK_IMAGES.images[w.id]; return '<button type="button" class="portfolio-gallery-tile" data-epoch="'+h(A.workEpoch(w))+'" data-title="'+h(w.title)+'" data-condition="'+Math.round(inst.condition*100)+'" data-action="art" data-work="'+h(w.id)+'" data-uid="'+inst.uid+'">'+(pic?'<img loading="lazy" alt="'+h(w.title)+'" src="'+h(pic.file)+'">':'<span class="portfolio-gallery-noimage">'+h(w.title)+'</span>')+'<span>'+h(w.title)+' · '+Math.round(inst.condition*100)+'%</span></button>'; }).join('') + '</div></div><p class="note">Warehouse value at today’s indices: ' + A.money(total) +
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
  function auctionCountdown() {
    var days=daysToAuction();
    var de=!!(window.ArtRaceLanguage&&window.ArtRaceLanguage.get()==='de');
    if(days<=0)return de?'Auktion ist heute':'Auction starts today';
    if(days===1)return de?'Auktion beginnt morgen':'Auction starts tomorrow';
    return de?'Auktion beginnt in '+days+' Tagen':'Auction starts in '+days+' days';
  }
  function auctionClosedNote() {
    var c = A.city(G.cityId);
    if (!c.hasAuctionHouse)
      return '<p class="empty">No auction house in ' + h(c.name) +
             '. The rooms are in ' + h(nextAuctionCity()) + '.</p>';
    var days=daysToAuction();
    if(days>0)return '<p class="empty">'+auctionCountdown()+'.</p>';
    return '<p class="empty">'+auctionCountdown()+'.</p>';
  }

  function viewAuction() {
    var head = '<p class="note">' + (auctionOpenHere() ? 'Sale in progress' :
      'Catalogue on view') + ' · ' + auctionCountdown() + ' · buyer\u2019s premium ' +
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
      var tier=A.artTier(w);
      var tierLabel=(window.ArtRaceLanguage&&window.ArtRaceLanguage.get()==='de'?'Klasse ':'Class ')+tier.grade+' · ×'+tier.multiplier+' ★';
      /* While the expert question is open, the row must not show the answer:
         year, medium and kind of picture stay hidden, and the picture does not open. */
      var info = open
        ? '<div class="row-main">' + thumb(w, lot.inst.uid) + '<div>' +
          '<span class="title">' + h(w.title) + '</span>' +
          '<span class="credit">' + h(a ? a.name : 'Unknown') + ' · '+h(tierLabel)+'</span></div></div>'
        : quizOpen
          ? '<div class="row-main">' + thumb(w, lot.inst.uid, true) + '<div>' +
            '<span class="title">' + h(w.title) + '</span>' +
            '<span class="credit">' + h(a ? a.name : 'Unknown') + ' · '+h(tierLabel)+'</span>' +
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
        btns = '<span class="tag">' + auctionCountdown() + '</span>';
      return '<article class="row art-market-card' + cls +
        '" data-order="' + i + '" data-price="' + lot.bid +
        '" data-condition="' + (Number(lot.inst.condition)||0) +
        '" data-artist="' + h((a&&a.name)||'') +
        '" data-value="' + (!open && !quizOpen && lot.low>0 && lot.high>0 ? (lot.bid/((lot.low+lot.high)/2)).toFixed(5) : '-1') +
        '">' + head + info + nums + quiz +
        (btns ? '<div class="row-btns">' + btns + '</div>' : '') + '</article>';
    }).join('');
    return '<section class="auction-view art-market-view">' + head + '<div class="art-market-grid">' + rows + '</div></section>';
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
    var de = window.ArtRaceLanguage && window.ArtRaceLanguage.get() === 'de';
    if (!city.hasRestorationStudio) return '<p class="empty">' + (de ? 'Kein Restaurierungsatelier in ' + h(city.name) + '.' : 'No restoration studio in ' + h(city.name) + '.') + '</p>';
    if (!G.portfolio.length) return '<p class="empty">' + (de ? 'Nichts zu restaurieren — dein Lager ist leer.' : 'Nothing to restore — the warehouse is empty.') + '</p>';
    var rows = G.portfolio.map(function (inst) {
      var inStudio = inst.restoreReadyDay >= 0 && G.day < inst.restoreReadyDay;
      var curGain = inStudio ? (inst.pendingRestore || 0) : Math.min(CFG.restorationMaxGain, 1 - inst.condition);
      var cost = A.restorationCost(curGain);
      var days = A.restorationDays(curGain);
      var curPct = Math.round(inst.condition * 100);
      var gainPct = Math.round(curGain * 100);
      var targetPct = Math.min(100, curPct + gainPct);

      var progressBar = '<div class="studio-cond-bar-wrap" title="' + curPct + '% → ' + targetPct + '%">' +
        '<div class="studio-cond-bar-track">' +
          '<div class="studio-cond-bar-current" style="width:' + curPct + '%"></div>' +
          '<div class="studio-cond-bar-gain' + (inStudio ? ' is-in-progress' : '') + '" style="left:' + curPct + '%;width:' + gainPct + '%"></div>' +
        '</div>' +
        '<div class="studio-cond-bar-labels">' +
          '<span>' + curPct + '%</span>' +
          '<span class="studio-gain-label">+' + gainPct + '% → ' + targetPct + '%</span>' +
        '</div>' +
      '</div>';

      var statusText = inStudio
        ? (de ? 'In Arbeit (fertig Tag ' + inst.restoreReadyDay + ')' : 'Restoring (ready day ' + inst.restoreReadyDay + ')')
        : (de ? '+' + gainPct + '% in ' + days + ' ' + (days === 1 ? 'Tag' : 'Tagen') : '+' + gainPct + '% in ' + days + ' day(s)');

      return '<div class="row' + (inStudio ? ' busy' : '') + '">' + rowHead(inst) +
        '<div class="row-tags">' + condTag(inst) + progressBar + '</div>' +
        '<div class="row-num"><span class="ask">' + (inStudio ? (de ? 'Tag ' + inst.restoreReadyDay : 'day ' + inst.restoreReadyDay) : A.money(cost)) + '</span>' +
        '<span class="est">' + statusText + '</span></div>' +
        '<div class="row-btns">' +
        (inStudio
          ? '<button class="btn" data-action="collect" data-uid="' + inst.uid + '"' + (G.day >= inst.restoreReadyDay ? '' : ' disabled') + '>' + (de ? 'Abholen' : 'Collect') + '</button>'
          : '<button class="btn" data-action="restore" data-uid="' + inst.uid + '"' + (curGain > 0.005 && cost <= G.cash ? '' : ' disabled') + '>' + (de ? 'Restaurieren' : 'Restore') + '</button>') +
        '</div></div>';
    }).join('');
    return '<p class="note">' + (de
      ? h(city.studioName || 'Das Atelier') + ' berechnet ' + A.money(CFG.restorationCostPerHundredth) + ' pro +0,01 Zustand (max. +' + A.pct(CFG.restorationMaxGain) + ' pro Auftrag, mind. ' + CFG.restorationMinDays + ' Tage).'
      : h(city.studioName || 'The studio') + ' charges ' + A.money(CFG.restorationCostPerHundredth) + ' per +0.01 condition (max ' + A.pct(CFG.restorationMaxGain) + ' per job, at least ' + CFG.restorationMinDays + ' day(s)).') +
      '</p>' + rows;
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
      ['Pictures held', G.portfolio.length + ' / ' + G.capacity + ' Artwork slots'],
      ['Collection value', A.money(held)],
      ['Net worth', A.money(netWorth())],
      ['Cash', A.money(G.cash) + ' · debt ' + A.money(G.loan)],
      ['Warehouse', G.portfolio.length + ' paintings · ' + A.money(held)],
      ['Reputation', Math.round(G.reputation) + ' · slots bought ' + G.slotsBought],
      ['Deals', st.buys + ' bought · ' + st.sells + ' sold · ' + st.hammer + ' hammer wins'],
      ['Best flip', A.money(st.bestProfit) + ' · worst ' + A.money(st.worstProfit)]
    ].map(function (r) {
      return '<div class="stat"><span>' + h(r[0]) + '</span><b>' + h(r[1]) + '</b></div>';
    }).join('');
    var journal = G.log.filter(function (item) { return !/^Seed \d+\b/.test(item.text); }).slice(0, 25).map(function (l) {
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
