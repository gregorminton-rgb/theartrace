/* app-audio.js — the two ambient tracks.
 *
 *   city    "music/trading-cities.mp3"       standing in a port city, or ashore
 *   auction "music/ship.mp3"                 the auction room
 *   sea     "music/against-the-rising-tide.mp3"  on a voyage across the ocean
 *   rail    "music/travel.mp3"               on a voyage by train (short European hop)
 *
 * Exactly one track is meant to be audible. Both elements are created up
 * front and loop; a switch fades the old one out and the new one in, so a
 * voyage does not cut the music off dead.
 *
 * Browsers refuse to start audio without a user gesture. The game always has
 * one at hand (the button that opened the city, "Begin career"), so the first
 * attempt is made from inside a click handler; if that is still blocked, a
 * one-shot listener retries on the next interaction.
 */
(function () {
  'use strict';
  var G = window.ArtRaceGame.G;
  /* The engine owns city(); window.ArtRaceGame.api is a different, narrower
     surface and must not be assumed to carry it. */
  var A = window.ArtRace;

  var TRACKS = {
    city: 'music/trading-cities.mp3',
    auction: 'music/ship.mp3',
    sea: 'music/against-the-rising-tide.mp3',
    rail: 'music/travel.mp3'
  };
  var VOLUME = 0.45;
  var FADE_MS = 900;
  var FADE_STEP_MS = 60;

  var players = {};          /* name -> HTMLAudioElement */
  var current = null;        /* name of the track that is supposed to sound */
  var unlocked = false;
  var armed = false;
  var muted = false;         /* the player's explicit choice */
  var failed = {};           /* name -> true if the file will not load */
  var fading = {};

  function element(name) {
    if (players[name]) return players[name];
    var src = TRACKS[name];
    if (!src) return null;
    var a = new Audio();
    a.src = src;
    a.loop = true;
    a.preload = 'auto';
    a.volume = 0;
    /* a missing or unsupported file must never break the game */
    a.addEventListener('error', function () {
      failed[name] = true;
      updateToggle();
    });
    players[name] = a;
    return a;
  }

  /* Which track belongs to where the player is; null means silence.
     The voyage flag is tested before the city, because a crossing keeps
     G.cityId pointing at the port it left from. */
  function trackForNow() {
    if (!G || !G.started || G.ended) return null;
    if (document.hidden) return null;
    var screen = document.getElementById('screen-game');
    if (!screen || screen.hidden) return null;
    if (G.voyage) return G.voyage.glyph === 'rail' ? 'rail' : 'sea';
    if (!(A && A.city && A.city(G.cityId))) return null;
    return G.view === 'auction' ? 'auction' : 'city';
  }

  function fadeTo(name, inMs) {
    var targetVol = Math.max(0, Math.min(1, VOLUME));
    /* silence everything that is not the target */
    Object.keys(players).forEach(function (key) {
      if (key === name) return;
      var other = players[key];
      clearInterval(fading[key]);
      if (other.paused) return;
      var v = other.volume;
      fading[key] = setInterval(function () {
        v = Math.max(0, v - targetVol * (FADE_STEP_MS / Math.max(1, inMs)));
        other.volume = v;
        if (v <= 0) { clearInterval(fading[key]); other.pause(); }
      }, FADE_STEP_MS);
    });
    if (!name || failed[name]) return;
    var a = element(name);
    if (!a) return;
    clearInterval(fading[name]);
    if (a.paused) {
      a.volume = 0;
      var p = a.play();
      if (p && p.catch) p.catch(function () { /* the gesture listener retries */ });
    }
    var from = a.volume;
    if (from >= targetVol) { a.volume = targetVol; return; }
    var step = (targetVol - from) / Math.max(1, Math.round(inMs / FADE_STEP_MS));
    fading[name] = setInterval(function () {
      from += step;
      if (from >= targetVol) { from = targetVol; clearInterval(fading[name]); }
      a.volume = from;
    }, FADE_STEP_MS);
  }

  function silenceAll() {
    Object.keys(players).forEach(function (key) {
      clearInterval(fading[key]);
      var a = players[key];
      if (!a.paused) { a.volume = 0; a.pause(); }
    });
  }

  function shouldSound() {
    return !!current && unlocked && !muted;
  }

  /* The single entry point: the game calls this from renderAll(). */
  function sync() {
    try {
      var want = trackForNow();
      /* a track whose file will not load must not silence the other one */
      if (want && failed[want]) {
        current = null;
        if (unlocked && !muted) silenceAll();
        updateToggle();
        return;
      }
      current = want;
      if (shouldSound()) fadeTo(current, FADE_MS);
      else if (!unlocked && current) armGesture();
      else silenceAll();
      updateToggle();
    } catch (err) {
      /* sound is never allowed to take the interface down with it */
      if (window.console) console.warn('audio sync failed:', err.message);
    }
  }

  function armGesture() {
    if (armed) return;
    armed = true;
    var handler = function () {
      document.removeEventListener('pointerdown', handler, true);
      document.removeEventListener('keydown', handler, true);
      armed = false;
      unlocked = true;
      sync();
    };
    document.addEventListener('pointerdown', handler, true);
    document.addEventListener('keydown', handler, true);
  }

  function unlock() {
    unlocked = true;
    sync();
  }

  function updateToggle() {
    var btn = document.getElementById('hud-music');
    if (!btn) return;
    var on = shouldSound();
    btn.classList.toggle('is-on', on);
    btn.textContent = on ? '\u266B' : '\u266A';
    btn.title = on ? 'Music on \u2014 click to mute' : 'Music off \u2014 click to turn on';
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function toggle() {
    muted = !muted;
    unlocked = true;
    sync();
  }

  function volume(v) {
    VOLUME = Math.max(0, Math.min(1, v));
    if (current && players[current] && !players[current].paused) {
      players[current].volume = VOLUME;
    }
  }

  /* Turning music on while the page is hidden would be doubly wrong: nothing
     is heard, and mobile browsers suspend audio anyway. */
  document.addEventListener('visibilitychange', function () { sync(); });

  window.ArtRaceAudio = {
    sync: sync, toggle: toggle, unlock: unlock, volume: volume,
    /* what is actually audible right now, which is what the checks assert on —
       the wanted track may be muted, awaiting a gesture, or blocked */
    current: function () {
      if (muted || !unlocked) return null;
      var want = trackForNow();
      if (!want || failed[want]) return null;
      var a = players[want];
      return (a && !a.paused) ? want : null;
    },
    /* a support hook: what the module thinks the player should hear and why */
    diag: function () {
      return {
        want: trackForNow(), current: current, unlocked: unlocked, armed: armed,
        muted: muted, failed: JSON.stringify(failed),
        players: Object.keys(players).map(function (k) {
          var a = players[k];
          return k + ':' + (a.paused ? 'paused' : 'playing') + ':' + a.volume.toFixed(2);
        }).join(' ')
      };
    }
  };

  var btn = document.getElementById('hud-music');
  if (btn) btn.addEventListener('click', toggle);
})();
