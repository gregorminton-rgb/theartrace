var fso = new ActiveXObject('Scripting.FileSystemObject');
function read(p){ var f=fso.OpenTextFile('D:\\Projekte\\Ren\\TheArtRaceWeb\\' + p,1); var s=f.ReadAll(); f.Close(); return s; }
Array.prototype.forEach = Array.prototype.forEach || function(fn,th){ for(var i=0;i<this.length;i++) fn.call(th,this[i],i,this); };
Array.prototype.map = Array.prototype.map || function(fn,th){ var o=[]; for(var i=0;i<this.length;i++) o.push(fn.call(th,this[i],i,this)); return o; };
Array.prototype.filter = Array.prototype.filter || function(fn,th){ var o=[]; for(var i=0;i<this.length;i++) if(fn.call(th,this[i],i,this)) o.push(this[i]); return o; };
Array.prototype.indexOf = Array.prototype.indexOf || function(v){ for(var i=0;i<this.length;i++) if(this[i]===v) return i; return -1; };
Array.prototype.some = Array.prototype.some || function(fn,th){ for(var i=0;i<this.length;i++) if(fn.call(th,this[i],i,this)) return true; return false; };
Array.prototype.every = Array.prototype.every || function(fn,th){ for(var i=0;i<this.length;i++) if(!fn.call(th,this[i],i,this)) return false; return true; };
Array.prototype.reduce = Array.prototype.reduce || function(fn,init){ var acc=init; for(var i=0;i<this.length;i++) acc=fn(acc,this[i],i,this); return acc; };
Object.keys = Object.keys || function(o){ var k=[]; for(var p in o) if(o.hasOwnProperty(p)) k.push(p); return k; };
if (!Date.now) Date.now = function(){ return 0; };
if (!Math.imul) Math.imul = function(a,b){ var ah=(a>>>16)&0xffff, al=a&0xffff, bh=(b>>>16)&0xffff, bl=b&0xffff; return (al*bl + (((ah*bl + al*bh)<<16)>>>0))|0; };
/* --- stub DOM: every element is a permissive stand-in --- */
function stubNode(id){
  var n = { id: id, hidden: false, innerHTML: '', textContent: '', value: '', checked: false,
    style: { background: '', setProperty: function(){}, removeProperty: function(){} },
    classList: { add: function(){}, remove: function(){}, toggle: function(){}, contains: function(){ return false; } },
    children: [], dataset: {},
    appendChild: function(c){ this.children.push(c); return c; },
    removeChild: function(){}, insertBefore: function(c){ return c; },
    setAttribute: function(k,v){ this[k]=v; }, getAttribute: function(k){ return this[k] === undefined ? null : this[k]; },
    hasAttribute: function(k){ return this[k] !== undefined && this[k] !== null; },
    removeAttribute: function(k){ delete this[k]; },
    addEventListener: function(){}, removeEventListener: function(){},
    querySelector: function(){ return null; }, querySelectorAll: function(){ return []; },
    closest: function(){ return null; }, focus: function(){},
    getContext: function(){ return { canvas: {}, save:function(){}, restore:function(){}, beginPath:function(){}, moveTo:function(){}, lineTo:function(){}, stroke:function(){}, fill:function(){}, closePath:function(){}, arc:function(){}, ellipse:function(){}, translate:function(){}, rotate:function(){}, scale:function(){}, drawImage:function(){}, fillRect:function(){}, clearRect:function(){}, createLinearGradient:function(){ return { addColorStop: function(){} }; }, measureText: function(){ return { width: 0 }; }, setLineDash: function(){}, quadraticCurveTo:function(){}, bezierCurveTo:function(){}, roundRect:function(){}, setTransform:function(){}, createPattern:function(){ return null; }, getImageData: function(){ return { data: [] }; }, putImageData: function(){}, clip: function(){}, rect: function(){} }; },
    getBoundingClientRect: function(){ return { left:0, top:0, width:800, height:600, right:800, bottom:600 }; },
    offsetWidth: 800, offsetHeight: 600, clientWidth: 800, clientHeight: 600,
    parentNode: null, parentElement: null, firstChild: null, nextSibling: null
  };
  return n;
}
var nodeCache = {};
var document = {
  getElementById: function(id){ if(!nodeCache[id]) nodeCache[id] = stubNode(id); return nodeCache[id]; },
  createElement: function(tag){ return stubNode('new-' + tag); },
  createTextNode: function(){ return stubNode('text'); },
  querySelector: function(){ return null; },
  querySelectorAll: function(){ return []; },
  addEventListener: function(){},
  body: stubNode('body'), documentElement: stubNode('html'), head: stubNode('head')
};
var window = { document: document.toString ? undefined : undefined };
window.document = document;
window.window = window;
window.location = { href: 'http://127.0.0.1:8080/', search: '' };
window.requestAnimationFrame = function(fn){ return 0; };
window.cancelAnimationFrame = function(){};
window.setInterval = function(){ return 0; };
window.clearInterval = function(){};
window.setTimeout = function(){ return 0; };
window.addEventListener = function(){};
window.localStorage = { getItem: function(){ return null; }, setItem: function(){}, removeItem: function(){} };
window.devicePixelRatio = 1;
window.innerWidth = 800; window.innerHeight = 600;
window.Image = function(){ var i = stubNode('img'); i.complete = true; i.naturalWidth = 10; return i; };
try { eval(read('data.js')); } catch (e) { WScript.Echo('LOAD FAIL data.js: ' + e.message); WScript.Quit(1); }
try { eval(read('cities-extra.js')); } catch (e) { WScript.Echo('LOAD FAIL cities-extra.js: ' + e.message); WScript.Quit(1); }
try { eval(read('works-extra.js')); } catch (e) { WScript.Echo('LOAD FAIL works-extra.js: ' + e.message); WScript.Quit(1); }
try { eval(read('engine.js')); } catch (e) { WScript.Echo('LOAD FAIL engine.js: ' + e.message); WScript.Quit(1); }
try { eval(read('app-state.js')); } catch (e) { WScript.Echo('LOAD FAIL app-state.js: ' + e.message); WScript.Quit(1); }
try { eval(read('app-crew.js')); } catch (e) { WScript.Echo('LOAD FAIL app-crew.js: ' + e.message); WScript.Quit(1); }
try { eval(read('app-colonies.js')); } catch (e) { WScript.Echo('LOAD FAIL app-colonies.js: ' + e.message); WScript.Quit(1); }
try { eval(read('app-core.js')); } catch (e) { WScript.Echo('LOAD FAIL app-core.js: ' + e.message); WScript.Quit(1); }
/* =========================================================================
 * tools/smoke.js ? headless regression run (WSH / cscript, no DOM).
 *
 *   cscript //nologo tools\smoke.js
 *
 * Loads data.js, the overlays, engine.js and the four DOM-free app modules
 * against a stub document, then plays a colony passage out and back plus a
 * city crossing. Any exception aborts with the module and day it happened,
 * which is what a frozen calendar looks like from the inside.
 * ========================================================================= */
var A = window.ArtRace, G = window.ArtRaceGame.G;
window.ArtRaceGame.api.newGame({ difficulty: 'Normal', seed: 42 });
var S = window.ArtRaceGame.shared, api = window.ArtRaceGame.api;
var fails = 0;
function check(name, ok, extra) {
  if (!ok) fails++;
  WScript.Echo((ok ? 'ok   ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
}
function days(n) {
  for (var i = 0; i < n; i++) {
    try { window.ArtRaceGame.api.advanceDay(false); }
    catch (e) { WScript.Echo('EXCEPTION on day ' + G.day + ': ' + e.message); WScript.Quit(1); }
  }
}
function runToArrival() {
  var guard = 0;
  while (G.voyage && guard++ < 90) days(1);
  return guard < 90;
}
check('engine loaded', A.works.length === 75 && A.cities.length >= 13,
      'works=' + A.works.length + ' cities=' + A.cities.length);
check('new game starts', G.day === 1 && !G.ended, 'city=' + G.cityId);

/* every colony must be reachable and open its screen */
var colonies = A.colonies.COLONIES;
for (var c = 0; c < colonies.length; c++) {
  G.cash = 500000; G.colonyId = null; G.voyage = null;
  A.colonies.sailToColony(colonies[c].id);
  var started = !!G.voyage && G.voyage.colonyId === colonies[c].id;
  var arrived = runToArrival();
  check('colony ' + colonies[c].id + ' reachable+opens',
        started && arrived && G.colonyId === colonies[c].id && !S.el('colony').hidden,
        'voyage=' + started + ' arrived=' + arrived);
  var home = G.colonyReturnCityId;
  A.colonies.sailBack();
  check('colony ' + colonies[c].id + ' sail back',
        G.colonyId === null && G.cityId === home && S.el('colony').hidden === true,
        'city=' + G.cityId);
}

/* every city pair must arrive where it promised */
var from = G.cityId;
for (var k = 0; k < A.cities.length; k++) {
  var to = A.cities[k];
  if (to.id === G.cityId) continue;
  G.cash = 500000;
  var here = G.cityId;
  window.ArtRaceGame.api.travelTo(to.id);
  if (!G.voyage) { check('sail ' + here + '->' + to.id, false, 'no voyage started'); continue; }
  var okDays = G.voyage.days === A.ticketDays(A.city(here), to);
  runToArrival();
  check('sail ' + here + '->' + to.id, G.cityId === to.id && okDays,
        G.voyage ? 'still at sea' : 'day ' + G.day);
}

/* the leg bookkeeping itself: remaining days must count down to zero */
G.cash = 500000;
G.voyage = null;
window.ArtRaceGame.api.travelTo('tokio');
var total = G.voyage ? G.voyage.days : 0, seen = [];
while (G.voyage) { seen.push(G.voyage.remaining); days(1); }
check('remaining counts down', !!total && seen[0] === total && seen.length >= total,
      'first=' + seen[0] + ' of ' + total + ' steps=' + seen.length);

/* a long stretch of the calendar must never throw */
days(200);
check('200 further days', true, 'day=' + G.day + ' ended=' + G.ended);

WScript.Echo(fails ? ('\n' + fails + ' check(s) failed') : '\nall checks passed');
WScript.Quit(fails ? 1 : 0);
