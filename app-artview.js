/* =========================================================================
 * app-artview.js — the large artwork view.
 *
 * Clicking a thumbnail in the dealer gallery, the auction catalogue, the
 * portfolio or the warehouse opens the full plate with its catalogue facts,
 * the curated note from art-notes.js, and whatever the player knows about the
 * copy in hand (condition, authenticity, where it came from, what it is worth).
 * ========================================================================= */
(function () {
  'use strict';

  var A = window.ArtRace;

  var dialog = function () { var s = A && A.shell; if (s && s.dialog) return s.dialog.apply(null, arguments); };
  var closeDialog = function () { var s = A && A.shell; if (s && s.closeDialog) return s.closeDialog(); };
  var h = function () { return A.shared.h.apply(null, arguments); };
  var money = function () { return A.money.apply(null, arguments); };
  var G = function () { return A.app.G; };

  function notes() { return window.ART_RACE_NOTES || { works: {}, artists: {} }; }

  function artPicture(id) {
      var map = (window.ART_ARTWORK_IMAGES && window.ART_ARTWORK_IMAGES.images) || {};
      return map[id] || null;
    }

  /* Known copies of a work in this player's hands — the large view differs
     between "the picture in the catalogue" and "the picture I own". */
  function ownedInstances(defId) {
    return (G().portfolio || []).filter(function (p) { return p.defId === defId; });
  }

  function conditionWord(c) {
    if (c > 0.85) return 'excellent';
    if (c > 0.67) return 'good';
    if (c > 0.4) return 'worn';
    return 'damaged';
  }

  function authWord(inst) {
    if (!inst) return '−';
    if (inst.authenticity === 'Authenticated') return 'authenticated by an expert';
    if (inst.authenticity === 'RevealedForgery') return 'revealed forgery';
    return 'not yet examined';
  }

  function factsRows(w, artist) {
    var rows = [];
    rows.push(['Painter', artist ? artist.name : 'Unknown']);
    if (artist) {
      var life = (artist.birthYear || '?') + '–' + (artist.deathYear || '?');
      rows.push(['Life', life + (artist.nationality ? ' · ' + artist.nationality : '')]);
      if (artist.epochName) rows.push(['Epoch', artist.epochName]);
      if (artist.homeRegionName) rows.push(['School', artist.homeRegionName]);
    }
    rows.push(['Painted', String(w.yearCreated)]);
    rows.push(['Kind', w.typeName || '−']);
    if (w.medium) rows.push(['Medium', w.medium]);
    if (w.dimensions) rows.push(['Size', w.dimensions]);
    rows.push(['Rarity', new Array((w.rarity || 0) + 1).join('◆') + ' (' + (w.rarity || 0) + '/10)']);
    if (w.isMasterpiece) rows.push(['Note', 'a known masterpiece']);
    if (w.hasKnownForgery) rows.push(['Note', 'forgeries of this work circulate']);
    return rows;
  }

  function ownedBlock(instances) {
    if (!instances.length) return '';
    var rows = instances.map(function (inst) {
      return '<div class="av-owned">' +
        '<div class="av-owned-head">' +
          '<span class="av-owned-title">Your copy</span>' +
          '<span class="av-owned-val">' + money(A.app.valueOf(inst)) + '</span>' +
        '</div>' +
        '<div class="av-owned-grid">' +
          '<span>Condition</span><b>' + Math.round(inst.condition * 100) + ' — ' + conditionWord(inst.condition) + '</b>' +
          '<span>Authenticity</span><b>' + authWord(inst) + '</b>' +
          '<span>Provenance</span><b>' + h(inst.provenance || '−') + '</b>' +
          '<span>Purchased</span><b>day ' + inst.boughtDay + ' · ' + money(inst.paidPrice || 0) + '</b>' +
          (inst.restoreReadyDay ? '<span>Restoring</span><b>ready on day ' + inst.restoreReadyDay + '</b>' : '') +
        '</div></div>';
    }).join('');
    return '<h4 class="av-sub">In your collection</h4>' + rows;
  }

  /* Prices are quoted for the city the player is standing in, so a picture is
     always worth what it is worth *here* — the catalogue price varies by
     buyer, epoch band and day. A fresh instance is used for a work the player
     does not own, so the quote is for a clean copy. */
  function marketBlock(w, inst) {
    var g = G();
    var city = A.city(g.cityId);
    if (!city) return '';
    var idx = A.app.idxOf(w, g.cityId);
    var year = A.shared.dateOf(g.day).year;
    var def = { condition: w.typicalCondition != null ? w.typicalCondition : 0.75, quirk: null };
    var dlr = A.dealerAsk(w, inst || def, city, idx, year, g.reputation, inst ? inst.quirk : null);
    var low = A.estimateLow(w, inst || def, city, idx, year);
    var high = A.estimateHigh(w, inst || def, city, idx, year);
    return '<h4 class="av-sub">On the market here · ' + h(city.name) + '</h4>' +
      '<div class="av-market">' +
        '<span>Dealer asking price</span><b>' + money(dlr) + '</b>' +
        '<span>Auction estimate</span><b>' + money(low) + ' – ' + money(high) + '</b>' +
      '</div>';
  }

  /* slug may be a work id (catalogue picture) — the instance is optional and
     only adds the "your copy" section. */
  function openArtwork(id, uid) {
    var w = A.workById ? A.workById[id] : (A.work ? A.work(id) : null);
    if (!w) return;
    var artist = A.artistById[w.artistId] || null;
    var n = notes();
    var note = n.works[id] || {};
    var artistNote = n.artists[w.artistId] || '';
    var pic = artPicture(id);

    var inst = null;
    if (uid) {
      inst = (G().portfolio || []).filter(function (p) { return p.uid === uid; })[0] || null;
    }
    var owned = ownedInstances(id);

    var plate = pic
      ? '<figure class="av-plate"><img src="' + h(pic.file) + '" alt="' + h(w.title) + '" loading="eager" decoding="async">' +
        (pic.how === 'alias' ? '<figcaption>A stand-in plate: a different original by the same painter.</figcaption>' : '') +
        '</figure>'
      : '<div class="av-plate av-plate--missing"><span>No picture imported for this work yet</span></div>';

    var enriched = window.ART_EXTRA_STORIES && window.ART_EXTRA_STORIES[id];
    var extraStory = enriched ? '<section class="av-extra"><h4>' + (window.ArtRaceLanguage && window.ArtRaceLanguage.get() === 'de' ? 'Hintergrundgeschichte' : 'Behind the painting') + '</h4><p>' + h(window.ArtRaceLanguage && window.ArtRaceLanguage.get() === 'de' ? enriched.de : enriched.en) + '</p><a target="_blank" rel="noopener noreferrer" href="' + h(enriched.source) + '">' + (window.ArtRaceLanguage && window.ArtRaceLanguage.get() === 'de' ? 'Museumsquelle ansehen' : 'Museum source') + '</a></section>' : '';
    var story = note.story ? '<p class="av-story">' + h(note.story) + '</p>' : '<p class="av-story">' + h(w.description || '') + '</p>';
    var aside = note.note ? '<p class="av-note">' + h(note.note) + '</p>' : '';

    var facts = '<dl class="av-facts">' + factsRows(w, artist).map(function (r) {
      return '<dt>' + h(r[0]) + '</dt><dd>' + h(r[1]) + '</dd>';
    }).join('') + '</dl>';

    var where = [];
    if (note.museum) where.push(['Hangs today', note.museum]);
    if (note.medium) where.push(['Original medium', note.medium]);
    if (note.dimensions) where.push(['Original size', note.dimensions]);
    var extra = where.length
      ? '<h4 class="av-sub">The original</h4><dl class="av-facts">' + where.map(function (r) {
          return '<dt>' + h(r[0]) + '</dt><dd>' + h(r[1]) + '</dd>';
        }).join('') + '</dl>'
      : '';

    var bio = artist && artist.bio ? '<p class="av-bio">' + h(artist.bio) + '</p>' : '';
    if (artistNote) bio += '<p class="av-bio av-bio--note">' + h(artistNote) + '</p>';

    var body = '<div class="av">' +
      '<div class="av-left">' + plate + '<div class="av-zoom-controls"><button type="button" data-artzoom="out" aria-label="Zoom out">−</button><button type="button" data-artzoom="reset">100%</button><button type="button" data-artzoom="in" aria-label="Zoom in">+</button></div>' + story + aside + extraStory + '</div>' +
      '<div class="av-right">' +
        '<h3 class="av-title">' + h(w.title) + '</h3>' +
        '<p class="av-credit">' + h(artist ? artist.name : 'Unknown') + ', ' + w.yearCreated + '</p>' +
        facts + extra +
        ownedBlock(owned) +
        marketBlock(w, inst) +
        '<h4 class="av-sub">The painter</h4>' + bio +
      '</div></div>';

    dialog(w.title, body, [{ label: 'Close', primary: true, onClick: closeDialog }], 'av-dialog');

    var root = document.querySelector('.dialog.av-dialog');
    var image = root && root.querySelector('.av-plate img');
    var plateNode = root && root.querySelector('.av-plate');
    if (image && plateNode) {
      var scale=1, dx=0, dy=0, activePointers=new Map(), previousDistance=0;
      plateNode.classList.add('av-zoomable');
      function apply(){image.style.transform='translate('+dx+'px,'+dy+'px) scale('+scale+')';}
      function zoom(factor){scale=Math.max(1,Math.min(5,scale*factor));if(scale===1){dx=0;dy=0;}apply();}
      root.querySelectorAll('[data-artzoom]').forEach(function(button){button.addEventListener('click',function(){
        var act=button.getAttribute('data-artzoom');
        if(act==='reset'){scale=1;dx=0;dy=0;apply();}
        else zoom(act==='in'?1.3:1/1.3);
      });});
      plateNode.addEventListener('wheel',function(e){e.preventDefault();zoom(e.deltaY<0?1.12:1/1.12);},{passive:false});
      plateNode.addEventListener('pointerdown',function(e){activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});plateNode.setPointerCapture(e.pointerId);});
      plateNode.addEventListener('pointermove',function(e){
        if(!activePointers.has(e.pointerId))return;
        var prev=activePointers.get(e.pointerId),point={x:e.clientX,y:e.clientY};
        activePointers.set(e.pointerId,point);
        if(activePointers.size===1 && scale>1){dx+=point.x-prev.x;dy+=point.y-prev.y;apply();}
        if(activePointers.size===2){
          var p=Array.from(activePointers.values()),dist=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
          if(previousDistance>0)zoom(Math.pow(dist/previousDistance,.65));
          previousDistance=dist;
        }
      });
      function up(e){activePointers.delete(e.pointerId);previousDistance=0;}
      plateNode.addEventListener('pointerup',up);plateNode.addEventListener('pointercancel',up);
    }
    /* hand the instance to nothing else: the dialog is read-only */
    void inst;
  }

  /* Wire the data- attributes used by the list rows and thumbnails. */
  function action(action, t) {
    if (action === 'art') {
      openArtwork(t.getAttribute('data-work'), t.getAttribute('data-uid') || null);
      return true;
    }
    return false;
  }

  A.artView = window.ArtRaceArtView = { open: openArtwork, action: action };
})();
