/* =========================================================================
 * app-art.js — pictures and backdrops.
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
  /* shared vocabulary published by app-core.js */
  var h = function (v) { return A.shared.h(v); };

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

  /* The thumbnail carries the click-to-enlarge action: the row's own buttons
     stay free for Buy / Sell / Bid. */
  function thumb(w, uid) {
    var tint = EPOCH_TINT[A.workEpoch(w)] || EPOCH_TINT.Modern;
    var pic = artPicture(w.id);
    var attr = ' data-action="art" data-work="' + h(w.id) + '"' +
      (uid != null ? ' data-uid="' + h(uid) + '"' : '') +
      ' title="' + h(w.title) + ' — click for the full picture"';
    if (pic) {
      return '<span class="thumb thumb-art thumb-btn" role="button" tabindex="0"' + attr + '>' +
             '<img src="' + h(pic.file) + '" alt="' + h(w.title) + '" loading="lazy">' +
             '</span>';
    }
    return '<span class="thumb thumb-btn" role="button" tabindex="0"' + attr +
           ' style="background:linear-gradient(135deg,' + tint[0] + ' 25%,' + tint[1] + ' 100%)">' +
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
    var bd = el('backdrop');
    /* At sea the picture shows the destination, never the port left behind;
       the route strip above the picture names both ends. */
    var away = !!G.voyage;
    el('voyage-strip').hidden = !away;
    if (away) {
      var fromCity = A.city(G.voyage.fromId);
      el('voyage-from').textContent = fromCity ? fromCity.name : G.voyage.fromId;
      el('voyage-mid').textContent = (G.voyage.glyph === 'rail' ? 'by rail' : 'at sea') +
        ' · ' + G.voyage.remaining + ' day(s) left';
      el('voyage-to').textContent = G.voyage.toName;
      var dest = A.city(G.voyage.toId);
      var colony = G.voyage.colonyId && A.colonies ? A.colonies.COLONY_BY_ID[G.voyage.colonyId] : null;
      if (dest) {
        var dpic = cityPicture(dest);
        bd.classList.toggle('has-image', !!dpic);
        bd.style.backgroundColor = rgb(dest.theme);
        bd.style.backgroundImage = dpic ? 'url("' + dpic.file + '")' : 'none';
        el('backdrop-caption').textContent = 'Unterwegs nach ' + dest.name;
      } else if (colony) {
        var kpic = pictureFor(colony.pic);
        bd.classList.toggle('has-image', !!kpic);
        bd.style.backgroundColor = '';
        bd.style.backgroundImage = kpic ? 'url("' + kpic.file + '")' : 'none';
        el('backdrop-caption').textContent = 'Unterwegs nach ' + colony.label;
      }
      return;
    }
    var c = A.city(G.cityId);
    /* Ashore the current place is a plantation, not a city: there is no
       city plate to show, so the last port's backdrop stays put. */
    if (!c) return;
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
  A.art = { thumb: thumb, pictureFor: pictureFor, cityPicture: cityPicture,
            renderBackdrop: renderBackdrop, IMAGES: IMAGES };
})();
