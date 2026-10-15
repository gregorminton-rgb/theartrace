/* Headless repro harness (WSH/JScript). Loads data.js + engine.js + app.js
   with a minimal DOM stub and reproduces the "start a career" path for
   Berlin vs Amsterdam to find the exact throw. */

/* ES5 polyfills (classic JScript is ES3). */
if (!Array.prototype.forEach) Array.prototype.forEach = function (fn, t) { for (var i = 0; i < this.length; i++) { if (i in this) fn.call(t, this[i], i, this); } };
if (!Array.prototype.map) Array.prototype.map = function (fn, t) { var r = []; for (var i = 0; i < this.length; i++) { if (i in this) r.push(fn.call(t, this[i], i, this)); } return r; };
if (!Array.prototype.filter) Array.prototype.filter = function (fn, t) { var r = []; for (var i = 0; i < this.length; i++) { if (i in this && fn.call(t, this[i], i, this)) r.push(this[i]); } return r; };
if (!Array.prototype.indexOf) Array.prototype.indexOf = function (v, f) { for (var i = f || 0; i < this.length; i++) { if (this[i] === v) return i; } return -1; };
if (!Array.prototype.slice) Array.prototype.slice = function (a, b) { var r = []; var s = a || 0; var e = (b === undefined) ? this.length : b; for (var i = s; i < e && i < this.length; i++) r.push(this[i]); return r; };
if (!Object.keys) Object.keys = function (o) { var r = []; for (var k in o) { if (Object.prototype.hasOwnProperty.call(o, k)) r.push(k); } return r; };

/* Math.imul polyfill: present in every browser, missing in classic JScript. */
if (!Math.imul) {
  Math.imul = function (a, b) {
    var ah = (a >>> 16) & 0xffff, al = a & 0xffff;
    var bh = (b >>> 16) & 0xffff, bl = b & 0xffff;
    return ((al * bl) + (((ah * bl + al * bh) << 16) >>> 0)) | 0;
  };
}
if (!Math.trunc) Math.trunc = function (x) { return x < 0 ? Math.ceil(x) : Math.floor(x); };

/* Minimal DOM stub. */
function makeEl(id) {
  return {
    id: id, innerHTML: '', textContent: '', hidden: false, disabled: false,
    value: '', checked: false,
    classList: { add: function () {}, remove: function () {}, toggle: function () {} },
    style: { backgroundColor: '', backgroundImage: '' },
    querySelectorAll: function () { return []; },
    getAttribute: function () { return null; },
    setAttribute: function () {},
    closest: function () { return null; }
  };
}

var window = {};
var document = {
  getElementById: function (id) { return makeEl(id); },
  addEventListener: function () {},
  body: { innerHTML: '' }
};
window.ART_IMAGES = { images: {} };

function readUtf8(path) {
  var s = new ActiveXObject('ADODB.Stream');
  s.Type = 2; s.Charset = 'utf-8'; s.Open(); s.LoadFromFile(path);
  var txt = s.ReadText(-1); s.Close();
  return txt;
}

function loadAndEval(path) {
  eval(readUtf8(path));
}

var base = 'D:\\Projekte\\Ren\\TheArtRaceWeb\\';
loadAndEval(base + 'data.js');
loadAndEval(base + 'engine.js');
loadAndEval(base + 'app.js');

var A = window.ArtRace;
var app = window.ArtRaceApp;

WScript.Echo('== engine sanity per city ==');
['amsterdam', 'berlin'].forEach(function (cityId) {
  try {
    var c = A.city(cityId);
    if (!c) throw new Error('city() returned null');
    var rng = A.makeRng(12345);
    var market = A.createMarket(rng);
    A.EPOCHS.forEach(function (e) { A.sliceIndex(market, c, e); A.dailyChange(market, c, e); });
    var w = A.works[0];
    var inst = { condition: 0.8, authenticity: 'Unexamined', isFake: false };
    A.marketValue(w, inst, c, 1, 1925);
    A.dealerAsk(w, inst, c, 1, 1925, 25, 1);
    A.dealerBid(w, inst, c, 1, 1925, 25);
    A.estimateLow(w, inst, c, 1, 1925);
    A.estimateHigh(w, inst, c, 1, 1925);
    A.distance(c, c);
    WScript.Echo('  ' + cityId + ': OK');
  } catch (e) {
    WScript.Echo('  ' + cityId + ': ERROR -> ' + e.message);
  }
});

WScript.Echo('== full app: newGame + renderAll per city ==');
['amsterdam', 'berlin'].forEach(function (cityId) {
  try {
    app.newGame({ name: 'Test', difficulty: 'Normal', durationIndex: 1, cityId: cityId, seed: 12345 });
    app.renderAll();
    WScript.Echo('  ' + cityId + ': OK');
  } catch (e) {
    WScript.Echo('  ' + cityId + ': ERROR -> ' + e.message);
  }
});

WScript.Echo('== done ==');
