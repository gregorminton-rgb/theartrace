/* ==========================================================================
 * map.js — the 1920s travel chart, drawn with PixiJS.
 *
 * The travel screen used to be a JPG with absolutely positioned HTML pins, so
 * nothing could move and nothing could be drawn between two cities. The chart
 * is now a Pixi scene: land and lettering are vector graphics, the hulls and
 * the locomotives are animated display objects that ride the route curves.
 *
 * Three things make the drawing trustworthy rather than decorative:
 *
 *  1. COASTLINES come from Natural Earth 1:50m, packed by tools/build-world-geo.py
 *     into `world-geo.js` in the *same* coordinate convention the cities use:
 *         mapX = (lon + 180) / 360      mapY = (lat + 90) / 180
 *     A place pin and its patch of coast are therefore in one system and cannot
 *     drift apart.
 *
 *  2. TWO ZOOM LEVELS share one Mercator camera: EUROPE, where the Art Race is
 *     actually played, and the WORLD, which carries the colonies. Both are
 *     plain Mercator, so a pin, its coast and its route line all move together
 *     at any window size — the old radial lens enlarged Europe but bent the
 *     geography around it.
 *
 *  3. SEA ROUTES are found by an A* search over a land/water mask built from the
 *     same coastline data, then smoothed, so a ship instinctively rounds Cape
 *     Horn or the Cape of Good Hope instead of sailing over Argentina.
 *
 * European hops are not sea voyages at all — in the 1920s you took the boat
 * train — so those legs are drawn as a dashed express arc and carry a small
 * locomotive instead of a hull.
 * ========================================================================== */
(function (window) {
  'use strict';

  var GEO = window.ArtRaceGeo;
  var FONT = '"Playfair Display", Georgia, "Iowan Old Style", serif';

  /* ---------------------------------------------------------------------
   * Plate geometry. Every level is a Mercator window onto map space:
   * lon = mapX * 360 - 180, lat = mapY * 180 - 90, merc = ln(tan(pi/4 + lat/2)).
   * `lat0`/`lat1` are the north and south edges of the plate; lon 0 sits at the
   * horizontal middle, which puts Spain in the left third of the Europe plate
   * and the Atlantic in the middle of the world plate.
   * ------------------------------------------------------------------- */
  var LEVELS = {
    europe: {
      id: 'europe',
      lat0: 62, lat1: 30, cell: 10, lon0: 2,
      /* the Europe plate shows 36 deg of longitude; without lonSpan the whole
         globe is squeezed into the panel and Europe is a hairline in the middle.
         Window chosen so all six European cities sit clear of the frame. */
      lonSpan: 36,
      sea: ['#12405f', '#0a2b45', '#08243a'],
      land: '#e3d3ad', coast: '#6d5426',
      city: '#8a2525', trade: '#b3872c', colony: '#9e2a2b',
      ocean: [['ATLANTIC  OCEAN', -18, 42], ['MEDITERRANEAN', 16, 37],
              ['BLACK  SEA', 34, 43]],
      cartouche: ['CARTA D\u2019EUROPA', 'the art trade \u00b7 MCMXX']
    },
    world: {
      id: 'world',
      lat0: 76, lat1: -56, cell: 20, lon0: 0,
      sea: ['#17465c', '#0e3049', '#0a2437'],
      land: '#dabc98', coast: '#6b4c2c',
      city: '#1a2b3c', trade: '#b3872c', colony: '#9e2a2b',
      ocean: [['ATLANTIC  OCEAN', -32, 8], ['PACIFIC  OCEAN', -140, 0],
              ['INDIAN  OCEAN', 78, -22]],
      cartouche: ['MAPPEMONDE', 'territories & settlements \u00b7 MCMXX']
    }
  };

  function merc(lat) {
    var r = Math.max(-1.48, Math.min(1.48, lat * Math.PI / 180));
    return Math.log(Math.tan(Math.PI / 4 + r / 2));
  }

  /* The camera for one level at one window size: canvas pixels <-> map space.
     `mapY` runs over the whole globe (lat -90..90), so a level window has to be
     taken from the fraction span of `lat0`..`lat1`, not from the raw value.
     Longitude and latitude are scaled independently: a Mercator world is 2:1
     but the panel is not, so one shared scale would either crop the globe or
     leave a sliver of ocean. Longitude uses the level's `lonSpan` window around
     `lon0`, latitude the mercator span of the level. */
  function camera(level, W, H) {
    /* mapY is (lat + 90) / 180, so lat0 (the northern edge) has the LARGER
       fraction and lat1 the smaller one. */
    var fA = (level.lat0 + 90) / 180, fB = (level.lat1 + 90) / 180;
    var m0 = merc(level.lat0), m1 = merc(level.lat1);
    var span = m0 - m1;
    var deg = level.lonSpan || 360;
    var mid = (level.lon0 || 0) / 360 + 0.5;
    return {
      W: W, H: H, level: level,
      fromMap: function (x, y) {
        var t = fB !== fA ? (y - fA) / (fB - fA) : 0;
        var lat = (1 - t) * level.lat0 + t * level.lat1;
        return {
          x: ((x - mid) / (deg / 360) + 0.5) * W,
          y: (m0 - merc(lat)) * (H / span)
        };
      }
    };
  }

  /* =====================================================================
   * 1. Geometry decoding
   * =================================================================== */

  function decode(flat) {
    var out = [];
    if (!flat) return out;
    var i = 0;
    while (i < flat.length) {
      var n = flat[i++];
      if (!n) break;
      var ring = new Array(n);
      for (var k = 0; k < n; k++) {
        ring[k] = { x: flat[i] / GEO.scale, y: flat[i + 1] / GEO.scale };
        i += 2;
      }
      out.push(ring);
    }
    return out;
  }

  var RINGS = decode(GEO && GEO.land);
  var LAKES = decode(GEO && GEO.lakes);

  /* =====================================================================
   * 2. Land mask + sea routing (all in map space, level-independent)
   * =================================================================== */

  var GW = 480, GH = 240;              /* mask resolution */
  var MASK = null;

  function buildMask() {
    var m = new Uint8Array(GW * GH);
    for (var r = 0; r < RINGS.length; r++) {
      var ring = RINGS[r], n = ring.length;
      var minY = 1e9, maxY = -1e9, i;
      for (i = 0; i < n; i++) {
        var y = ring[i].y;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      if (minY < 0) minY = 0;
      if (maxY > 1) maxY = 1;
      var row0 = Math.max(0, Math.floor(minY * GH));
      var row1 = Math.min(GH - 1, Math.ceil(maxY * GH));
      var xs = [];
      for (var row = row0; row <= row1; row++) {
        var yc = (row + 0.5) / GH;
        xs.length = 0;
        for (i = 0; i < n; i++) {
          var a = ring[i], b = ring[(i + 1) % n];
          if ((a.y > yc) !== (b.y > yc)) {
            xs.push(a.x + (yc - a.y) / (b.y - a.y) * (b.x - a.x));
          }
        }
        if (xs.length < 2) continue;
        xs.sort(function (p, q) { return p - q; });
        for (var k = 0; k + 1 < xs.length; k += 2) {
          var c0 = Math.round(xs[k] * GW - 0.5);
          var c1 = Math.round(xs[k + 1] * GW - 0.5);
          if (c0 < 0) c0 = 0;
          if (c1 > GW - 1) c1 = GW - 1;
          for (var c = c0; c <= c1; c++) m[row * GW + c] = 1;
        }
      }
    }
    /* Inflate by one cell: routes then keep a visible gap off the beach
     * instead of grazing the coastline pixel for pixel. */
    var out = new Uint8Array(GW * GH);
    for (var yy = 0; yy < GH; yy++) {
      for (var xx = 0; xx < GW; xx++) {
        if (!m[yy * GW + xx]) continue;
        for (var dy = -1; dy <= 1; dy++) {
          var y2 = yy + dy;
          if (y2 < 0 || y2 >= GH) continue;
          for (var dx = -1; dx <= 1; dx++) {
            var x2 = xx + dx;
            if (x2 < 0 || x2 >= GW) continue;
            out[y2 * GW + x2] = 1;
          }
        }
      }
    }
    return out;
  }

  function isLand(x, y) {
    if (!MASK) MASK = buildMask();
    var c = Math.floor(x * GW);
    var r = Math.floor(y * GH);
    if (c < 0) c = 0; if (c > GW - 1) c = GW - 1;
    if (r < 0) r = 0; if (r > GH - 1) r = GH - 1;
    return MASK[r * GW + c] === 1;
  }

  /* --- minimal binary heap, keyed by float priority ------------------- */
  function Heap() { this.pri = []; this.val = []; }
  Heap.prototype.size = function () { return this.pri.length; };
  Heap.prototype.push = function (v, p) {
    var i = this.pri.length;
    this.pri.push(p); this.val.push(v);
    while (i > 0) {
      var up = (i - 1) >> 1;
      if (this.pri[up] <= this.pri[i]) break;
      var tp = this.pri[up]; this.pri[up] = this.pri[i]; this.pri[i] = tp;
      var tv = this.val[up]; this.val[up] = this.val[i]; this.val[i] = tv;
      i = up;
    }
  };
  Heap.prototype.pop = function () {
    var n = this.pri.length - 1;
    var topVal = this.val[0];
    this.pri[0] = this.pri[n]; this.val[0] = this.val[n];
    this.pri.pop(); this.val.pop();
    var i = 0;
    while (true) {
      var l = i * 2 + 1, r = l + 1, s = i;
      if (l < n && this.pri[l] < this.pri[s]) s = l;
      if (r < n && this.pri[r] < this.pri[s]) s = r;
      if (s === i) break;
      var tp = this.pri[s]; this.pri[s] = this.pri[i]; this.pri[i] = tp;
      var tv = this.val[s]; this.val[s] = this.val[i]; this.val[i] = tv;
      i = s;
    }
    return topVal;
  };

  /* --- A* over the water mask ----------------------------------------
   * Land is not forbidden outright, just very expensive: an inland capital
   * still needs a route, and a pinch point like Suez or Panama is closed at
   * this grid size, so the solver must be able to fall back on a land leg
   * instead of failing. The ocean wins wherever there is a choice. */
  var LAND_COST = 26;
  var DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1.44], [0, -1, 1.44],
              [1, 1, 1.75], [1, -1, 1.75], [-1, 1, 1.75], [-1, -1, 1.75]];

  function seaPath(ax, ay, bx, by) {
    if (!MASK) MASK = buildMask();
    var sc = Math.floor(ax * GW), sr = Math.floor(ay * GH);
    var tc = Math.floor(bx * GW), tr = Math.floor(by * GH);
    if (sc < 0) sc = 0; if (sc > GW - 1) sc = GW - 1;
    if (sr < 0) sr = 0; if (sr > GH - 1) sr = GH - 1;
    if (tc < 0) tc = 0; if (tc > GW - 1) tc = GW - 1;
    if (tr < 0) tr = 0; if (tr > GH - 1) tr = GH - 1;

    var start = sr * GW + sc, goal = tr * GW + tc;
    if (start === goal) return [{ x: ax, y: ay }, { x: bx, y: by }];

    var N = GW * GH;
    var g = new Float32Array(N);
    var came = new Int32Array(N);
    var closed = new Uint8Array(N);
    for (var i = 0; i < N; i++) { g[i] = Infinity; came[i] = -1; }

    function hd(c, r) {
      var dx = Math.abs(c - tc), dy = Math.abs(r - tr) * 1.44;
      return (dx > dy ? dx + dy * 0.44 : dy + dx * 0.44);
    }

    var open = new Heap();
    g[start] = 0;
    open.push(start, hd(sc, sr));
    var guard = 0;

    while (open.size()) {
      if (++guard > 400000) break;
      var cur = open.pop();
      if (closed[cur]) continue;
      closed[cur] = 1;
      if (cur === goal) break;
      var cy = (cur / GW) | 0;
      var cx = cur - cy * GW;
      for (var d = 0; d < 8; d++) {
        var nx = cx + DIRS[d][0], ny = cy + DIRS[d][1];
        if (nx < 0 || nx >= GW || ny < 0 || ny >= GH) continue;
        var nb = ny * GW + nx;
        if (closed[nb]) continue;
        var step = DIRS[d][2];
        if (MASK[nb]) step *= LAND_COST;
        var ng = g[cur] + step;
        if (ng < g[nb]) {
          g[nb] = ng;
          came[nb] = cur;
          open.push(nb, ng + hd(nx, ny) * 1.05);
        }
      }
    }

    if (came[goal] === -1 && start !== goal) return null;

    /* walk back, then stitch the true city positions onto the ends so the
     * route starts at the pin and not at the centre of its grid cell */
    var cells = [];
    var p = goal;
    var hops = 0;
    while (p !== -1 && hops++ < N) {
      cells.push(p);
      if (p === start) break;
      p = came[p];
    }
    cells.reverse();
    var pts = [{ x: ax, y: ay }];
    for (i = 1; i < cells.length - 1; i++) {
      var rr = (cells[i] / GW) | 0;
      var cc = cells[i] - rr * GW;
      pts.push({ x: (cc + 0.5) / GW, y: (rr + 0.5) / GH });
    }
    pts.push({ x: bx, y: by });
    return pts;
  }

  /* --- smoothing ------------------------------------------------------ */
  function rdp(pts, tol) {
    if (pts.length < 3) return pts;
    var keep = new Array(pts.length);
    for (var i = 0; i < pts.length; i++) keep[i] = false;
    keep[0] = keep[pts.length - 1] = true;
    var stack = [[0, pts.length - 1]];
    while (stack.length) {
      var seg = stack.pop(), lo = seg[0], hi = seg[1];
      if (hi <= lo + 1) continue;
      var a = pts[lo], b = pts[hi];
      var dx = b.x - a.x, dy = b.y - a.y;
      var span = Math.sqrt(dx * dx + dy * dy);
      var bestI = -1, bestD = -1;
      for (var k = lo + 1; k < hi; k++) {
        var pp = pts[k], dd;
        if (span < 1e-12) dd = Math.hypot(pp.x - a.x, pp.y - a.y);
        else dd = Math.abs(dy * pp.x - dx * pp.y + b.x * a.y - b.y * a.x) / span;
        if (dd > bestD) { bestD = dd; bestI = k; }
      }
      if (bestD > tol) {
        keep[bestI] = true;
        stack.push([lo, bestI]);
        stack.push([bestI, hi]);
      }
    }
    var out = [];
    for (i = 0; i < pts.length; i++) if (keep[i]) out.push(pts[i]);
    return out;
  }

  function chaikin(pts, iters) {
    for (var it = 0; it < iters; it++) {
      if (pts.length < 3) return pts;
      var out = [pts[0]];
      for (var i = 0; i < pts.length - 1; i++) {
        var p = pts[i], q = pts[i + 1];
        out.push({ x: p.x * 0.75 + q.x * 0.25, y: p.y * 0.75 + q.y * 0.25 });
        out.push({ x: p.x * 0.25 + q.x * 0.75, y: p.y * 0.25 + q.y * 0.75 });
      }
      out.push(pts[pts.length - 1]);
      pts = out;
    }
    return pts;
  }

  /* A European hop is rail, not sail: a gentle arc bowing off the straight
   * line, the way a period plate drew an express line. */
  function railArc(ax, ay, bx, by) {
    var mx = (ax + bx) / 2, my = (ay + by) / 2;
    var dx = bx - ax, dy = by - ay;
    var len = Math.sqrt(dx * dx + dy * dy) || 1e-6;
    var bow = Math.min(len * 0.22, 0.014);
    var nx = -dy / len, ny = dx / len;
    var cx = mx + nx * bow, cy = my + ny * bow;
    var pts = [];
    for (var t = 0; t <= 1.0001; t += 1 / 24) {
      var u = 1 - t;
      pts.push({
        x: u * u * ax + 2 * u * t * cx + t * t * bx,
        y: u * u * ay + 2 * u * t * cy + t * t * by
      });
    }
    return pts;
  }

  function waterFraction(pts) {
    var wet = 0;
    for (var i = 0; i < pts.length; i++) if (!isLand(pts[i].x, pts[i].y)) wet++;
    return pts.length ? wet / pts.length : 1;
  }

  /* The link between two ports as the plate draws it: one gentle bow off the
   * straight line. The bow lives in map space, and its sign is chosen so the
   * bent line keeps clear of land whenever the straight one does not. */
  var BOW = 0.06;
  var ARC_STEPS = 32;

  function mapArc(ax, ay, bx, by, bow) {
    var dx = bx - ax, dy = by - ay;
    var len = Math.sqrt(dx * dx + dy * dy) || 1e-9;
    var nx = -dy / len, ny = dx / len;
    var cx = (ax + bx) / 2 + nx * bow;
    var cy = (ay + by) / 2 + ny * bow;
    var pts = [];
    for (var i = 0; i <= ARC_STEPS; i++) {
      var t = i / ARC_STEPS, u = 1 - t;
      pts.push({
        x: u * u * ax + 2 * u * t * cx + t * t * bx,
        y: u * u * ay + 2 * u * t * cy + t * t * by
      });
    }
    return pts;
  }

  function link(ax, ay, bx, by) {
    /* a crossing that leaves the continent gets a real sea path around the
       headlands; a short hop gets the express arc below */
    if (Math.hypot(bx - ax, by - ay) > 0.11) {
      var sea = seaPath(ax, ay, bx, by);
      if (sea && sea.length > 2) {
        var smooth = chaikin(rdp(sea, 0.0016), 2);
        smooth[0] = { x: ax, y: ay };
        smooth[smooth.length - 1] = { x: bx, y: by };
        return smooth;
      }
    }
    var straight = mapArc(ax, ay, bx, by, 0);
    var straightWet = waterFraction(straight);
    var bow = BOW;
    var pts = mapArc(ax, ay, bx, by, bow);
    if (straightWet >= 0.80) return pts;
    var wet = waterFraction(pts);
    var alt = mapArc(ax, ay, bx, by, -bow);
    var wetAlt = waterFraction(alt);
    if (wetAlt > wet + 0.05) return alt;
    if (wet >= 0.72) return pts;
    for (var i = 0; i < 3; i++) {
      bow *= 1.6;
      var more = mapArc(ax, ay, bx, by, bow);
      var mw = waterFraction(more);
      if (mw > wet) { pts = more; wet = mw; }
      var less = mapArc(ax, ay, bx, by, -bow);
      var lw = waterFraction(less);
      if (lw > wet) { pts = less; wet = lw; }
      if (wet >= 0.88) break;
    }
    return pts;
  }

  var ROUTE_CACHE = {};

  function buildRoute(ax, ay, bx, by) {
    var key = ax.toFixed(3) + ',' + ay.toFixed(3) + '>' + bx.toFixed(3) + ',' + by.toFixed(3);
    if (ROUTE_CACHE[key]) return ROUTE_CACHE[key];

    /* rail only over a short Continental hop; anything that leaves Europe or
       that spends real time on water — the Channel included — is sailed */
    var direct = Math.hypot(bx - ax, by - ay) < 0.11;
    var pts = direct ? railArc(ax, ay, bx, by) : link(ax, ay, bx, by);
    var glyph = (direct ? waterFraction(pts) <= 0.30 : false) ? 'rail' : 'ship';

    /* arc-length table so a ship moves at constant speed along the curve */
    var cum = [0];
    for (var i = 1; i < pts.length; i++) {
      cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    }
    var route = { pts: pts, cum: cum, total: cum[cum.length - 1], glyph: glyph };
    ROUTE_CACHE[key] = route;
    return route;
  }

  function pointAt(route, t) {
    var target = Math.max(0, Math.min(1, t)) * route.total;
    var cum = route.cum, pts = route.pts;
    var lo = 0, hi = cum.length - 1;
    while (lo < hi - 1) {
      var mid = (lo + hi) >> 1;
      if (cum[mid] <= target) lo = mid; else hi = mid;
    }
    var seg = cum[hi] - cum[lo] || 1e-9;
    var f = (target - cum[lo]) / seg;
    var a = pts[lo], b = pts[hi];
    return {
      x: a.x + (b.x - a.x) * f,
      y: a.y + (b.y - a.y) * f,
      angle: Math.atan2(b.y - a.y, b.x - a.x)
    };
  }

  /* =====================================================================
   * 3. Colours and drawing helpers
   * =================================================================== */
  var PAPER = '#f4ecd8';

  function hex(c) {
    if (typeof c === 'number') return c;
    return parseInt(c.replace('#', ''), 16);
  }

  function mixHex(a, b, t) {
    var A = hex(a), B = hex(b);
    var ar = (A >> 16) & 255, ag = (A >> 8) & 255, ab = A & 255;
    var br = (B >> 16) & 255, bg = (B >> 8) & 255, bb = B & 255;
    var r = Math.round(ar + (br - ar) * t);
    var g = Math.round(ag + (bg - ag) * t);
    var bl = Math.round(ab + (bb - ab) * t);
    return (r << 16) | (g << 8) | bl;
  }

  /* through the midpoints with the vertices as control points: a polyline
     would show its corners, a game board should read as smooth lines */
  function traceCurve(g, pts) {
    if (!pts.length) return g;
    g.moveTo(pts[0].x, pts[0].y);
    if (pts.length < 3) {
      for (var a = 1; a < pts.length; a++) g.lineTo(pts[a].x, pts[a].y);
      return g;
    }
    for (var i = 1; i < pts.length - 1; i++) {
      var mx = (pts[i].x + pts[i + 1].x) / 2;
      var my = (pts[i].y + pts[i + 1].y) / 2;
      g.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    g.quadraticCurveTo(pts[pts.length - 2].x, pts[pts.length - 2].y,
                       pts[pts.length - 1].x, pts[pts.length - 1].y);
    return g;
  }

  /* Pixi has no line dash, so a dashed line is emitted segment by segment */
  function dashedCurve(g, pts, on, off) {
    if (pts.length < 2) return g;
    var acc = 0, drawing = true;
    g.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i];
      var seg = Math.hypot(b.x - a.x, b.y - a.y);
      if (seg < 1e-6) continue;
      var t = 0;
      while (t < seg - 1e-6) {
        var limit = drawing ? on : off;
        var step = Math.min(limit - acc, seg - t);
        t += step;
        acc += step;
        var f = t / seg;
        var px = a.x + (b.x - a.x) * f, py = a.y + (b.y - a.y) * f;
        if (drawing) g.lineTo(px, py); else g.moveTo(px, py);
        if (acc >= limit - 1e-6) { drawing = !drawing; acc = 0; }
      }
    }
    return g;
  }

  function toPixels(cam, pts) {
    var out = new Array(pts.length);
    for (var i = 0; i < pts.length; i++) out[i] = cam.fromMap(pts[i].x, pts[i].y);
    return out;
  }

  function flatten(pts) {
    var out = [];
    for (var i = 0; i < pts.length; i++) { out.push(pts[i].x, pts[i].y); }
    return out;
  }

  function spaced(text) {
    var out = '';
    for (var i = 0; i < text.length; i++) {
      out += text.charAt(i) + (text.charAt(i) === ' ' ? ' ' : ' ');
    }
    return out;
  }

  /* =====================================================================
   * 4. Static plate parts
   * =================================================================== */

  function drawSea(lv, cam) {
    var g = new PIXI.Graphics();
    var W = cam.W, H = cam.H, bands = 64;
    for (var i = 0; i < bands; i++) {
      var t = i / (bands - 1);
      var col = mixHex(lv.sea[0], lv.sea[2], t * t * 0.6 + Math.sin(t * Math.PI) * 0.16);
      g.beginFill(col, 1);
      g.drawRect(-1, Math.floor(i * H / bands) - 1, W + 2, Math.ceil(H / bands) + 3);
      g.endFill();
    }
    return g;
  }

  function drawGraticule(lv, cam) {
    var g = new PIXI.Graphics();
    var lon, lat, i, p;
    g.lineStyle(1, 0xc8e1f5, 0.13);
    for (lon = -180; lon <= 180; lon += lv.cell) {
      var x = (lon + 180) / 360;
      var first = true;
      for (i = 0; i <= 24; i++) {
        p = cam.fromMap(x, i / 24);
        if (first) { g.moveTo(p.x, p.y); first = false; } else g.lineTo(p.x, p.y);
      }
    }
    for (lat = -80; lat <= 80; lat += lv.cell) {
      var y = (lat + 90) / 180;
      var a = cam.fromMap(0, y), b = cam.fromMap(1, y);
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
    }
    /* equator + tropics get the classic emphasis */
    g.lineStyle(1, 0xc8e1f5, 0.26);
    [0, 23.43, -23.43].forEach(function (deg) {
      var yy = (deg + 90) / 180;
      var aa = cam.fromMap(0, yy), bb = cam.fromMap(1, yy);
      var x = aa.x;
      while (x < bb.x) {
        g.moveTo(x, aa.y);
        g.lineTo(Math.min(bb.x, x + 5), aa.y);
        x += 9;
      }
    });
    return g;
  }

  function drawRhumb(cam) {
    var g = new PIXI.Graphics();
    g.lineStyle(1, 0xc8e1f5, 0.08);
    var cx = cam.W * 0.16, cy = cam.H * 0.42, R = Math.max(cam.W, cam.H) * 1.6;
    for (var i = 0; i < 16; i++) {
      var a = i * Math.PI / 8;
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    }
    return g;
  }

  function visibleRing(cam, ring) {
    var W = cam.W, H = cam.H;
    var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (var i = 0; i < ring.length; i++) {
      var q = cam.fromMap(ring[i].x, ring[i].y);
      if (q.x < minX) minX = q.x;
      if (q.x > maxX) maxX = q.x;
      if (q.y < minY) minY = q.y;
      if (q.y > maxY) maxY = q.y;
    }
    return !(maxX < -90 || minX > W + 90 || maxY < -90 || minY > H + 90);
  }

  function drawLand(lv, cam) {
    var g = new PIXI.Graphics();
    var r, i, pts;
    var land = hex(lv.land), coast = hex(lv.coast);

    /* the shallow shelf: a wide, soft edge under every coast */
    for (r = 0; r < RINGS.length; r++) {
      if (!visibleRing(cam, RINGS[r])) continue;
      pts = toPixels(cam, RINGS[r]);
      g.beginFill(0x5a4628, 0.30);
      g.lineStyle(10, 0x5a4628, 0.20);
      g.drawPolygon(flatten(pts));
      g.endFill();
    }

    /* the landmass itself: pale parchment, one ink line on the coast */
    for (r = 0; r < RINGS.length; r++) {
      if (!visibleRing(cam, RINGS[r])) continue;
      pts = toPixels(cam, RINGS[r]);
      g.beginFill(land, 1);
      g.lineStyle(1.4, coast, 0.92);
      g.drawPolygon(flatten(pts));
      g.endFill();
      g.lineStyle(0.6, 0xfffae6, 0.30);
      g.drawPolygon(flatten(pts));
    }

    for (i = 0; i < LAKES.length; i++) {
      if (!visibleRing(cam, LAKES[i])) continue;
      pts = toPixels(cam, LAKES[i]);
      g.beginFill(0xa0afaa, 0.85);
      g.lineStyle(0.6, 0x4a3823, 0.42);
      g.drawPolygon(flatten(pts));
      g.endFill();
    }
    return g;
  }

  function drawFrame(cam) {
    var g = new PIXI.Graphics();
    var W = cam.W, H = cam.H;
    g.lineStyle(2, 0x4a3823, 0.72);
    g.drawRect(7, 7, W - 14, H - 14);
    g.lineStyle(0.8, 0x4a3823, 0.72);
    g.drawRect(12.5, 12.5, W - 25, H - 25);
    var L = 16;
    g.lineStyle(1.4, 0x4a3823, 0.85);
    [[13, 13, 1, 1], [W - 13, 13, -1, 1], [13, H - 13, 1, -1], [W - 13, H - 13, -1, -1]]
      .forEach(function (c) {
        g.moveTo(c[0] + c[2] * L, c[1]);
        g.lineTo(c[0], c[1]);
        g.lineTo(c[0], c[1] + c[3] * L);
      });
    return g;
  }

  function drawCompassRose(cam) {
    var c = new PIXI.Container();
    var sc = Math.max(0.62, Math.min(1.2, cam.W / 1100));
    var r = 30 * sc;
    var cx = cam.W - 62 * sc, cy = cam.H - 62 * sc;
    var g = new PIXI.Graphics();
    g.lineStyle(1, 0x4a3823, 0.55);
    g.drawCircle(cx, cy, r * 0.94);
    g.drawCircle(cx, cy, r * 0.62);
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4 - Math.PI / 2;
      var len = i % 2 === 0 ? r : r * 0.66;
      var ux = Math.cos(a), uy = Math.sin(a);
      var nx = -uy, ny = ux;
      g.beginFill(0x4a3823, i % 2 === 0 ? 0.72 : 0.22);
      g.lineStyle(0.8, 0x4a3823, 0.6);
      g.drawPolygon([
        cx + ux * len, cy + uy * len,
        cx + nx * r * 0.155, cy + ny * r * 0.155,
        cx - ux * len * 0.12, cy - uy * len * 0.12
      ]);
      g.endFill();
    }
    c.addChild(g);
    var t = new PIXI.Text('N', {
      fontFamily: FONT, fontSize: Math.max(9, Math.round(r * 0.36)), fontWeight: '700', fill: 0x4a3823
    });
    t.alpha = 0.8;
    t.anchor.set(0.5);
    t.position.set(cx, cy - r * 1.18);
    c.addChild(t);
    return c;
  }

  function drawScaleBar(cam) {
    var c = new PIXI.Container();
    var x = 24, y = cam.H - 34, seg = 15;
    var g = new PIXI.Graphics();
    for (var i = 0; i < 4; i++) {
      g.beginFill(i % 2 ? 0x4a3823 : 0xf4ecd8, i % 2 ? 0.75 : 0.85);
      g.lineStyle(0.8, 0x4a3823, 0.75);
      g.drawRect(x + i * seg, y, seg, 4);
      g.endFill();
    }
    c.addChild(g);
    var t = new PIXI.Text('2000 nautical miles', { fontFamily: FONT, fontSize: 9, fill: 0x4a3823 });
    t.alpha = 0.75;
    t.position.set(x, y - 14);
    c.addChild(t);
    return c;
  }

  function drawCartouche(lv, cam) {
    var c = new PIXI.Container();
    var sc = Math.max(0.62, Math.min(1.2, cam.W / 1100));
    var w = 200 * sc, h = 48 * sc, x = 24, y = 20;
    var g = new PIXI.Graphics();
    g.beginFill(hex(PAPER), 0.84);
    g.lineStyle(1.2, 0x4a3823, 0.68);
    g.drawRect(x, y, w, h);
    g.endFill();
    g.lineStyle(0.6, 0x4a3823, 0.68);
    g.drawRect(x + 4, y + 4, w - 8, h - 8);
    c.addChild(g);

    var t1 = new PIXI.Text(lv.cartouche[0], {
      fontFamily: FONT, fontSize: Math.max(9, Math.round(14 * sc)), fontWeight: '700',
      fill: 0x4a3823, letterSpacing: 0.6
    });
    t1.anchor.set(0.5);
    t1.position.set(x + w / 2, y + h * 0.38);
    c.addChild(t1);

    var t2 = new PIXI.Text(lv.cartouche[1], {
      fontFamily: FONT, fontSize: Math.max(7, Math.round(9.5 * sc)), fontStyle: 'italic',
      fill: 0x6a5540
    });
    t2.anchor.set(0.5);
    t2.position.set(x + w / 2, y + h * 0.70);
    c.addChild(t2);
    return c;
  }

  function seaLabel(cam, text, lon, lat) {
    var p = cam.fromMap((lon + 180) / 360, (lat + 90) / 180);
    var t = new PIXI.Text(spaced(text), {
      fontFamily: FONT, fontSize: cam.W < 620 ? 10 : 13, fontStyle: 'italic', fill: 0x4a3823
    });
    t.alpha = 0.42;
    t.anchor.set(0.5);
    t.position.set(p.x, p.y);
    return t;
  }

  /* =====================================================================
   * 5. Vessels
   * =================================================================== */

  function makeShip() {
    var root = new PIXI.Container();
    var wake = new PIXI.Graphics();
    wake.lineStyle(1.6, 0xffffff, 0.5);
    wake.moveTo(-9, 0);
    wake.quadraticCurveTo(-5, 1.2, -1.5, 0);
    root.addChild(wake);

    var hull = new PIXI.Graphics();
    hull.beginFill(0x3a2a17, 1);
    hull.lineStyle(0.7, 0x140c04, 0.8);
    hull.moveTo(-10, 0);
    hull.quadraticCurveTo(-4, 4.6, 8, 2.4);
    hull.lineTo(11, -1.6);
    hull.quadraticCurveTo(2, -3.4, -10, -2.2);
    hull.closePath();
    hull.endFill();

    hull.lineStyle(0.9, 0x281c0e, 0.9);
    hull.moveTo(-2, -2); hull.lineTo(-2, -12);
    hull.moveTo(5, -1.6); hull.lineTo(5, -9);

    hull.beginFill(0xfcf8ec, 0.96);
    hull.lineStyle(0.55, 0x5a4628, 0.65);
    hull.moveTo(-2.4, -11.6);
    hull.quadraticCurveTo(2.6, -8.6, -2.4, -4.2);
    hull.closePath();
    hull.endFill();

    hull.beginFill(0xfcf8ec, 0.96);
    hull.lineStyle(0.55, 0x5a4628, 0.65);
    hull.moveTo(4.6, -8.7);
    hull.quadraticCurveTo(8.8, -6.4, 4.6, -3.2);
    hull.closePath();
    hull.endFill();

    hull.beginFill(0xfaf4e4, 0.9);
    hull.lineStyle(0.5, 0x5a4628, 0.6);
    hull.moveTo(9.4, -2);
    hull.quadraticCurveTo(14, -3.4, 11.6, 0);
    hull.closePath();
    hull.endFill();

    root.addChild(hull);
    return { root: root, wake: wake };
  }

  function makeTrain() {
    var root = new PIXI.Container();
    var steam = new PIXI.Graphics();
    root.addChild(steam);

    var body = new PIXI.Graphics();
    body.beginFill(0x4a2a22, 1);
    body.lineStyle(0.9, 0x140c04, 0.85);
    body.drawRect(-8, -5, 17, 7);
    body.endFill();
    body.beginFill(0x2f1c14, 1);
    body.drawRect(5, -9, 2.6, 4);
    body.endFill();
    body.beginFill(0x21160c, 1);
    body.drawCircle(-4, 3, 1.9);
    body.drawCircle(5, 3, 1.9);
    body.endFill();
    root.addChild(body);
    return { root: root, steam: steam };
  }

  /* =====================================================================
   * 6. The plate
   * =================================================================== */

  /* the camera of the plate currently on screen, so project() can answer for
     the level the player is looking at; shared by all mounts (there is one) */
  var liveCam = null;

  function nominalCamera() {
    return { cam: camera(LEVELS.world, 1000, 620) };
  }

  function project(x, y) {
    var cam = liveCam || nominalCamera().cam;
    var p = cam.fromMap(x, y);
    return { x: p.x / cam.W, y: p.y / cam.H };
  }

  function mount(host, opts) {
    if (!GEO || !RINGS.length || !window.PIXI) return null;
    opts = opts || {};
    if (!MASK) MASK = buildMask();

    var app;
    try {
      app = new PIXI.Application({
        backgroundAlpha: 0,
        antialias: true,
        resolution: Math.min(2.5, window.devicePixelRatio || 1),
        autoDensity: true,
        powerPreference: 'low-power'
      });
    } catch (err) {
      return null;
    }
    var view = app.view;
    view.className = 'wm-canvas';
    host.appendChild(view);

    var api = {
      canvas: view,
      voyages: [],
      labels: [],
      level: opts.level && LEVELS[opts.level] ? opts.level : 'world',
      setVoyages: setVoyages,
      setLabels: setLabels,
      setLevel: setLevel,
      refresh: refresh,
      destroy: destroy
    };

    var W = 0, H = 0;
    var dead = false;
    var cam = null;

    var seaLayer = new PIXI.Container();
    var gridLayer = new PIXI.Container();
    var landLayer = new PIXI.Container();
    var decoLayer = new PIXI.Container();
    var routeLayer = new PIXI.Container();
    var vesselLayer = new PIXI.Container();
    var pinLayer = new PIXI.Container();
    var labelLayer = new PIXI.Container();
    app.stage.addChild(seaLayer, gridLayer, landLayer, decoLayer,
                       routeLayer, vesselLayer, pinLayer, labelLayer);

    function setVoyages(list) {
      api.voyages = list || [];
      drawRoutes();
    }

    function setLabels(list) {
      api.labels = list || [];
      drawPinsAndLabels();
      drawSelection();
    }

    function setLevel(id) {
      if (!LEVELS[id] || api.level === id) return;
      api.level = id;
      if (!W || !H) return;
      buildStatic();
      drawRoutes();
      drawPinsAndLabels();
      drawSelection();
    }

    function clear(c) {
      while (c.children.length) {
        c.removeChildAt(c.children.length - 1);
      }
    }

    /* ---- the static plate, rebuilt on resize or level change ---------- */
    function buildStatic() {
      var lv = LEVELS[api.level] || LEVELS.world;
      cam = camera(lv, W, H);
      liveCam = cam;

      clear(seaLayer); clear(gridLayer); clear(landLayer); clear(decoLayer);

      seaLayer.addChild(drawSea(lv, cam));
      gridLayer.addChild(drawGraticule(lv, cam));
      gridLayer.addChild(drawRhumb(cam));
      landLayer.addChild(drawLand(lv, cam));
      decoLayer.addChild(drawFrame(cam));
      decoLayer.addChild(drawCompassRose(cam));
      decoLayer.addChild(drawScaleBar(cam));
      decoLayer.addChild(drawCartouche(lv, cam));
      (lv.ocean || []).forEach(function (o) {
        decoLayer.addChild(seaLabel(cam, o[0], o[1], o[2]));
      });
    }

    /* ---- routes ------------------------------------------------------ */
    var runs = [];
    var vessels = [];

    function drawRoutes() {
      clear(routeLayer);
      runs.length = 0;
      if (!cam) return;
      var vs = api.voyages;
      /* the running voyage first, then the standing board under it */
      var order = vs.slice().sort(function (a, c) {
        return (a.lane ? 1 : 0) - (c.lane ? 1 : 0);
      });
      for (var i = 0; i < order.length; i++) {
        var v = order[i];
        var route = v.route;
        if (!route || !route.pts || route.pts.length < 2) continue;
        var px = toPixels(cam, route.pts);
        var first = px[0], last = px[px.length - 1];
        if (v.lane) {
          if (Math.hypot(last.x - first.x, last.y - first.y) < 18) continue;
          routeLayer.addChild(laneGraphic(route, px));
          continue;
        }
        var progress = typeof v.progress === 'number' ? v.progress : 0;
        routeLayer.addChild(routeGraphic(route, px, progress));
        runs.push({ v: v, route: route, progress: progress });
      }
      rebuildVessels();
    }

    /* A standing lane from the current port to a reachable one. It shows the
       shape of the voyage without pretending anybody is sailing it. */
    function laneGraphic(route, px) {
      var isRail = route.glyph === 'rail';
      var c = new PIXI.Container();
      var base = new PIXI.Graphics();
      base.lineStyle(2.4, isRail ? 0xc64a36 : 0x5cc4fc, 0.92);
      traceCurve(base, px);
      c.addChild(base);
      var dashes = new PIXI.Graphics();
      dashes.lineStyle(1.2, 0xf0f8ff, 0.5);
      dashedCurve(dashes, px, isRail ? 6 : 3, isRail ? 6 : 7);
      c.addChild(dashes);
      return c;
    }

    function routeGraphic(route, px, progress) {
      var isRail = route.glyph === 'rail';
      var active = progress < 1;
      var g = new PIXI.Graphics();
      g.lineStyle(active ? 2.2 : 1.5,
        isRail ? 0xc84836 : 0x56b6f0,
        active ? 0.72 : 0.38);
      dashedCurve(g, px, isRail ? 4 : 2, isRail ? 5 : 5);

      if (progress > 0 && progress < 1) {
        var head = pointAt(route, progress);
        var hp = cam.fromMap(head.x, head.y);
        var upto = Math.max(1, Math.round(progress * px.length));
        var seg = px.slice(0, upto);
        seg.push({ x: hp.x, y: hp.y });
        g.lineStyle(5, isRail ? 0x1e140a : 0x041a2c, 0.30);
        traceCurve(g, seg);
        g.lineStyle(3, isRail ? 0xffd98a : 0xd8f1ff, 1);
        traceCurve(g, seg);
      }
      return g;
    }

    /* ---- vessels ----------------------------------------------------- */
    function rebuildVessels() {
      clear(vesselLayer);
      vessels.length = 0;
      if (!cam) return;
      var size = Math.max(0.95, Math.min(1.7, cam.W / 700));
      for (var i = 0; i < runs.length; i++) {
        var run = runs[i];
        if (run.progress >= 1) continue;
        var isRail = run.route.glyph === 'rail';
        var craft = isRail ? makeTrain() : makeShip();
        var holder = new PIXI.Container();
        holder.addChild(craft.root);
        holder.scale.set(size);
        vesselLayer.addChild(holder);

        var label = new PIXI.Text('', {
          fontFamily: FONT, fontSize: 9.5, fontWeight: '600', fill: 0xf6eedc,
          stroke: 0x1c140a, strokeThickness: 2.5
        });
        vesselLayer.addChild(label);
        vessels.push({ craft: craft, holder: holder, label: label, run: run,
                       phase: i * 1.7, isRail: isRail });
      }
      placeVessels(performance.now(), true);
    }

    function placeVessels(nowMs, instant) {
      if (!cam) return;
      var t = (nowMs || 0) / 1000;
      for (var i = 0; i < vessels.length; i++) {
        var item = vessels[i];
        var run = item.run;
        var p = run.progress;
        if (p >= 1) { item.holder.visible = false; item.label.visible = false; continue; }

        /* The hull sits on the day mark the game owns, then creeps a little
           until the next day passes so the plate is never frozen. */
        var days = Math.max(1, run.v.days || 1);
        var drift = instant ? 0 : (0.35 / days) * ((t * 0.6 + item.phase) % 1);
        var at = Math.min(0.9995, p + Math.max(0, drift));
        var head = pointAt(run.route, at);
        var sp = cam.fromMap(head.x, head.y);
        var ahead = pointAt(run.route, Math.min(1, at + 0.005));
        var ap = cam.fromMap(ahead.x, ahead.y);
        var ang = Math.atan2(ap.y - sp.y, ap.x - sp.x);
        if (!isFinite(ang)) ang = 0;

        var bob = item.isRail ? 0 : Math.sin(t * 2.2 + item.phase) * 1.1;
        item.holder.position.set(sp.x, sp.y + bob);
        item.holder.rotation = ang;
        item.holder.visible = true;

        item.craft.wake && (function (wk) {
          wk.clear();
          wk.lineStyle(1.6, 0xffffff, 0.34 + 0.2 * Math.sin(t * 3 + item.phase));
          wk.moveTo(-9, 0);
          wk.quadraticCurveTo(-5, 1.6 * Math.sin(t * 2 + item.phase), -1.5, 0);
        })(item.craft.wake);

        item.craft.steam && (function (st) {
          st.clear();
          for (var k = 0; k < 3; k++) {
            var d = (t * 0.9 + item.phase + k * 0.7) % 2.1;
            st.beginFill(0xfcf8ee, 0.5 * (1 - d / 2.1));
            st.drawCircle(7 + d * 7, -10 - d * 4, 1.1 + d * 1.5);
            st.endFill();
          }
        })(item.craft.steam);

        var dayNow = Math.min(days, Math.floor(p * days) + 1);
        item.label.text = (run.v.label || '') + '  ' + dayNow + '/' + days;
        var lx = sp.x + 16, ly = sp.y - 22;
        if (lx + item.label.width > W - 12) lx = Math.max(12, sp.x - 16 - item.label.width);
        if (ly < 24) ly = sp.y + 14;
        item.label.position.set(lx, ly);
        item.label.visible = true;
      }
    }

    /* ---- pins and place labels --------------------------------------- */
    function drawPinsAndLabels() {
      clear(pinLayer);
      clear(labelLayer);
      if (!cam) return;
      var lv = LEVELS[api.level] || LEVELS.world;
      var list = api.labels;
      var boxes = [];
      var pins = [];
      var i;

      for (i = 0; i < list.length; i++) {
        var L = list[i];
        var p = cam.fromMap(L.x, L.y);
        if (p.x < -40 || p.x > W + 40 || p.y < -40 || p.y > H + 40) continue;
        pins.push({ L: L, x: p.x, y: p.y });
      }

      for (i = 0; i < pins.length; i++) {
        var q = pins[i];
        var here = !!q.L.here;
        var kind = q.L.kind;
        var r = here ? 4.6 : (kind === 'city' || kind === 'trade') ? 3.4 : 2.9;
        var col = here ? 0xd4452f
          : kind === 'trade' ? hex(lv.trade)
          : kind === 'city' ? hex(lv.city)
          : kind === 'colony' ? hex(lv.colony) : 0x3f7d44;

        if (here) {
          var ring = new PIXI.Graphics();
          ring.beginFill(0x8d2222, 0.20);
          ring.drawCircle(0, 0, r + 6);
          ring.endFill();
          ring.position.set(q.x, q.y);
          ring.isPulse = true;
          pinLayer.addChild(ring);
        }
        var g = new PIXI.Graphics();
        g.beginFill(col, 1);
        g.lineStyle(1.5, 0xf8f0dc, 0.95);
        g.drawCircle(0, 0, r);
        g.endFill();
        g.lineStyle(0.7, 0x32240f, 0.65);
        g.drawCircle(0, 0, r + 1);
        g.position.set(q.x, q.y);
        pinLayer.addChild(g);
        boxes.push([q.x - r - 2, q.y - r - 2, (r + 2) * 2, (r + 2) * 2]);
      }

      for (i = 0; i < pins.length; i++) {
        var o = pins[i];
        var onLand = isLand(o.L.x, o.L.y);
        var isCity = o.L.kind === 'city' || o.L.kind === 'trade';
        var text = new PIXI.Text(o.L.label, {
          fontFamily: FONT, fontSize: o.L.kind === 'colony' ? 9.5 : 10, fontWeight: '600',
          fill: o.L.here ? 0xff8b6e : (onLand ? 0x2e2212 : 0xe8f0f7),
          stroke: onLand ? 0xf6eedc : 0x082236,
          strokeThickness: 3
        });
        var tw = text.width, th = text.height;
        var cands = isCity
          ? [[7, -6 - th], [-7 - tw, -6 - th], [-tw / 2, -th - 11], [-tw / 2, 8], [7, -th / 2]]
          : [[7, -th / 2], [-7 - tw, -th / 2], [-tw / 2, -th - 7], [-tw / 2, 7]];
        var placed = null;
        for (var c = 0; c < cands.length && !placed; c++) {
          var bx = o.x + cands[c][0], by = o.y + cands[c][1];
          var box = [bx - 2, by - 1, tw + 4, th + 2];
          var clash = false;
          for (var b = 0; b < boxes.length; b++) {
            var ob = boxes[b];
            if (box[0] < ob[0] + ob[2] && box[0] + box[2] > ob[0] &&
                box[1] < ob[1] + ob[3] && box[1] + box[3] > ob[1]) { clash = true; break; }
          }
          if (!clash) placed = { x: bx, y: by, box: box };
        }
        if (!placed) {
          placed = { x: o.x - tw / 2, y: o.y - th - 12,
                     box: [o.x - tw / 2 - 2, o.y - th - 13, tw + 4, th + 2] };
        }
        boxes.push(placed.box);
        text.position.set(placed.x, placed.y);
        labelLayer.addChild(text);
      }
    }

    /* a dashed ring around the picked place, before the tickets are bought */
    function drawSelection() {
      var existing = labelLayer.getChildByName('pick-ring');
      if (existing) labelLayer.removeChild(existing);
      var sel = opts.getSelection ? opts.getSelection() : null;
      if (!sel || !cam) return;
      var p = cam.fromMap(sel.x, sel.y);
      var g = new PIXI.Graphics();
      g.name = 'pick-ring';
      g.lineStyle(1.4, 0x8d2222, 0.75);
      for (var a = 0; a < Math.PI * 2; a += 0.75) {
        g.arc(p.x, p.y, 13, a, Math.min(Math.PI * 2, a + 0.42));
      }
      labelLayer.addChildAt(g, 0);
    }

    /* ---- animation --------------------------------------------------- */
    var tickerFn = function () {
      if (dead || !cam) return;
      var now = performance.now();
      placeVessels(now, false);
      for (var i = 0; i < pinLayer.children.length; i++) {
        var c = pinLayer.children[i];
        if (c.isPulse) {
          c.scale.set(1 + 0.30 * (0.5 + 0.5 * Math.sin(now / 520)));
          c.alpha = 0.9;
        }
      }
    };
    app.ticker.add(tickerFn);

    /* ---- sizing ------------------------------------------------------ */
    function resize() {
      var rect = host.getBoundingClientRect();
      var cssW = Math.max(220, Math.round(rect.width));
      var cssH = Math.max(150, Math.round(rect.height || cssW * 0.60));
      if (cssW === W && cssH === H) return;
      W = cssW; H = cssH;
      app.renderer.resize(W, H);
      buildStatic();
      drawRoutes();
      drawPinsAndLabels();
      drawSelection();
    }

    function refresh() {
      if (dead) return;
      resize();
      drawSelection();
    }

    var ro = null;
    if (window.ResizeObserver) {
      ro = new window.ResizeObserver(function () { if (!dead) refresh(); });
      ro.observe(host);
    }
    window.addEventListener('resize', refresh);

    function destroy() {
      if (dead) return;
      dead = true;
      if (ro) { ro.disconnect(); ro = null; }
      window.removeEventListener('resize', refresh);
      if (liveCam === cam) liveCam = null;
      try { app.destroy(false, { children: true }); } catch (e) { /* already gone */ }
      if (view.parentNode) view.parentNode.removeChild(view);
    }

    resize();
    return api;
  }

  /* =====================================================================
   * 7. Public surface
   * =================================================================== */
  window.ArtRaceMap = {
    available: !!(GEO && RINGS && RINGS.length && window.PIXI),
    aspect: 1.65,
    levels: ['europe', 'world'],
    project: project,
    buildRoute: buildRoute,
    pointAt: pointAt,
    isLand: isLand,
    mount: mount,
    /* harness hook: the real camera for a level at a given plate size */
    testCamera: function (levelName, w, h) {
      var lv = LEVELS[levelName];
      if (!lv) return null;
      var cam = camera(lv, w, h);
      return function (x, y) { return cam.fromMap(x, y); };
    }
  };

})(window);
