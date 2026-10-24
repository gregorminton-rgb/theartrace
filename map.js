/* ==========================================================================
 * map.js — the 1920s travel chart.
 *
 * The travel screen used to be a JPG with absolutely positioned HTML pins, so
 * nothing could move and nothing could be drawn between two cities. This module
 * draws the chart on a real <canvas> and drives the voyages across it.
 *
 * Three things make the drawing trustworthy rather than decorative:
 *
 *  1. COASTLINES come from Natural Earth 1:50m, packed by tools/build-world-geo.py
 *     into `world-geo.js` in the *same* coordinate convention the cities use:
 *         mapX = (lon + 180) / 360      mapY = (lat + 90) / 180
 *     A place pin and its patch of coast are therefore in one system and cannot
 *     drift apart.
 *
 *  2. PROJECTION is a radial lens centred on Europe that enlarges the area the
 *     game is played in ~3x and fades to identity outside it. Because the fade
 *     reaches exactly 1.0 at the lens edge, the world's bounding box stays at
 *     0..1 and no coastline can be pushed off the plate.
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

  /* ---------------------------------------------------------------------
   * Plate geometry. The window is the slice of map space the plate shows:
   * the southern tip of Patagonia and the north of Greenland fall outside,
   * which is both invisible and how a period plate would be trimmed.
   * ------------------------------------------------------------------- */
  var WIN = { x0: 0.0, y0: 0.28, x1: 1.0, y1: 1.0 };
  var WIN_W = WIN.x1 - WIN.x0;
  var WIN_H = WIN.y1 - WIN.y0;
  var ASPECT = WIN_W / WIN_H;          /* width / height, for CSS */

  /* Lens: centre sits on Europe, the plateau radius covers Europe plus the
   * near Atlantic, and the taper brings the scale back to 1 before the lens
   * ends so the rest of the world is untouched. 3.4 is the largest plateau
   * that keeps the radial map monotonic (g'(d) stays positive), i.e. no fold. */
  var LENS = { cx: 0.517, cy: 0.757, scale: 3.4, radius: 0.40 };

  function project(x, y) {
    var dx = x - LENS.cx;
    var dy = y - LENS.cy;
    var d = Math.sqrt(dx * dx + dy * dy);
    var px, py;
    if (d < 1e-9) {
      px = LENS.cx; py = LENS.cy;
    } else {
      var u = d / LENS.radius;
      if (u >= 1) { px = x; py = y; }
      else {
        var w = (1 - u) * (1 - u);
        var k = 1 + (LENS.scale - 1) * w;
        px = LENS.cx + dx * k;
        py = LENS.cy + dy * k;
      }
    }
    return {
      x: (px - WIN.x0) / WIN_W,
      y: (WIN.y1 - py) / WIN_H        /* canvas y grows downward */
    };
  }

  /* ---------------------------------------------------------------------
   * Palette. Everything is mixed from a handful of period inks so the plate
   * reads as one printed object.
   * ------------------------------------------------------------------- */
  var C = {
    seaTop: '#12405f',
    seaBottom: '#0a2b45',
    seaDeep: '#08243a',
    land: '#e3d3ad',
    landHigh: '#eee0c0',
    coast: '#6d5426',
    ink: '#3b2c17',
    inkSoft: 'rgba(59,44,23,.55)',
    inkFaint: 'rgba(59,44,23,.28)',
    route: '#c0392b',
    routeSea: '#2f8fd0',
    gold: '#c9a548',
    paper: '#f4ecd8',
    here: '#d4452f'
  };

  var SERIF = 'Georgia, "Iowan Old Style", "Palatino Linotype", serif';

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
   * 2. Land mask + sea routing
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
    var seen = new Uint8Array(N);
    var closed = new Uint8Array(N);
    for (var i = 0; i < N; i++) { g[i] = Infinity; came[i] = -1; }

    function h(c, r) {
      var dx = Math.abs(c - tc), dy = Math.abs(r - tr) * 1.44;
      return (dx > dy ? dx + dy * 0.44 : dy + dx * 0.44);
    }

    var open = new Heap();
    g[start] = 0;
    open.push(start, h(sc, sr));
    seen[start] = 1;
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
          open.push(nb, ng + h(nx, ny) * 1.05);
          seen[nb] = 1;
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
   * straight line, the way the period map drew its routes. The bow is taken
   * in *screen* space (a canvas row is wider than it is tall, so a map-space
   * arc would look flat) and its sign is chosen so the bent line keeps clear
   * of land whenever the straight one does not. */
  var BOW = 0.06;
  var ARC_STEPS = 32;

  function screenArc(ax, ay, bx, by, bow) {
    var p = project(ax, ay), q = project(bx, by);
    var dx = q.x - p.x, dy = q.y - p.y;
    var len = Math.sqrt(dx * dx + dy * dy) || 1e-9;
    var nx = -dy / len, ny = dx / len;
    var cx = (p.x + q.x) / 2 + nx * bow;
    var cy = (p.y + q.y) / 2 + ny * bow;
    var pts = [];
    for (var i = 0; i <= ARC_STEPS; i++) {
      var t = i / ARC_STEPS, u = 1 - t;
      var sx = u * u * p.x + 2 * u * t * cx + t * t * q.x;
      var sy = u * u * p.y + 2 * u * t * cy + t * t * q.y;
      pts.push({
        x: WIN.x0 + sx * WIN_W,
        y: WIN.y1 - sy * WIN_H
      });
    }
    return pts;
  }

  function link(ax, ay, bx, by) {
    var straight = screenArc(ax, ay, bx, by, 0);
    var straightWet = waterFraction(straight);
    var bow = BOW;
    var pts = screenArc(ax, ay, bx, by, bow);
    if (straightWet >= 0.80) return pts;
    /* the straight run crosses a coast: bend further, and bend the other way
       if that does not help */
    var wet = waterFraction(pts);
    var alt = screenArc(ax, ay, bx, by, -bow);
    var wetAlt = waterFraction(alt);
    if (wetAlt > wet + 0.05) return alt;
    if (wet >= 0.72) return pts;
    for (var i = 0; i < 3; i++) {
      bow *= 1.6;
      var more = screenArc(ax, ay, bx, by, bow);
      var mw = waterFraction(more);
      if (mw > wet) { pts = more; wet = mw; }
      var less = screenArc(ax, ay, bx, by, -bow);
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

    var pts = link(ax, ay, bx, by);
    /* rail only over a short Continental hop; anything that leaves Europe or
       that spends real time on water — the Channel included — is sailed */
    var far = Math.hypot(bx - ax, by - ay) > 0.11;
    var glyph = (far || waterFraction(pts) > 0.30) ? 'ship' : 'rail';

    /* arc-length table so a ship moves at constant speed along the curve */
    var cum = [0];
    for (var i = 1; i < pts.length; i++) {
      cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    }
    var route = { pts: pts, cum: cum, total: cum[cum.length - 1], glyph: glyph };
    ROUTE_CACHE[key] = route;
    return route;
  }

  /* Only the picked start -> destination link is ever shown as a standing
     line. Everything else is drawn by the active voyage itself. */

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
   * 3. The plate
   * =================================================================== */

  function mount(host, opts) {
    if (!GEO || !RINGS.length) return null;
    opts = opts || {};
    if (!MASK) MASK = buildMask();

    var canvas = document.createElement('canvas');
    canvas.className = 'wm-canvas';
    host.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    var api = {
      canvas: canvas,
      voyages: [],
      labels: [],
      setVoyages: setVoyages,
      setLabels: setLabels,
      refresh: refresh,
      destroy: destroy
    };

    var W = 0, H = 0, DPR = 1;
    var base = null;            /* cached static plate */
    var rafId = 0;
    var startTime = 0;
    var dead = false;

    function setVoyages(list) {
      api.voyages = list || [];
      kick();
    }
    function setLabels(list) {
      api.labels = list || [];
      refresh();
    }

    /* ---- static plate, drawn once per size ---------------------------- */
    function buildBase() {
      base = document.createElement('canvas');
      base.width = W; base.height = H;
      var b = base.getContext('2d');
      b.setTransform(DPR, 0, 0, DPR, 0, 0);

      /* sea */
      var grad = b.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, C.seaTop);
      grad.addColorStop(0.55, C.seaBottom);
      grad.addColorStop(1, C.seaDeep);
      b.fillStyle = grad;
      b.fillRect(0, 0, W, H);

      drawGraticule(b);
      drawRhumb(b);
      drawLand(b);
      drawGrain(b);
      drawFrame(b);
      drawOrnaments(b);
    }

    function px(p) { return p.x * W; }
    function py(p) { return p.y * H; }

    function drawGraticule(b) {
      b.save();
      b.lineWidth = 1;
      b.strokeStyle = 'rgba(200,225,245,.13)';
      var lon, lat, p, q;
      for (lon = -180; lon <= 180; lon += 15) {
        p = project((lon + 180) / 360, 0);
        q = project((lon + 180) / 360, 1);
        b.beginPath();
        for (var i = 0; i <= 40; i++) {
          var t = i / 40;
          var s = project((lon + 180) / 360, t);
          if (i === 0) b.moveTo(px(s), py(s)); else b.lineTo(px(s), py(s));
        }
        b.stroke();
      }
      for (lat = -75; lat <= 75; lat += 15) {
        var y = (lat + 90) / 180;
        b.beginPath();
        for (var j = 0; j <= 60; j++) {
          var s2 = project(j / 60, y);
          if (j === 0) b.moveTo(px(s2), py(s2)); else b.lineTo(px(s2), py(s2));
        }
        b.stroke();
      }
      /* equator + tropics get the classic emphasis */
      b.setLineDash([5, 4]);
      b.strokeStyle = 'rgba(200,225,245,.26)';
      [0.5, (23.43 + 90) / 180, (-23.43 + 90) / 180].forEach(function (yy) {
        b.beginPath();
        for (var j2 = 0; j2 <= 60; j2++) {
          var s3 = project(j2 / 60, yy);
          if (j2 === 0) b.moveTo(px(s3), py(s3)); else b.lineTo(px(s3), py(s3));
        }
        b.stroke();
      });
      b.restore();
    }

    function drawRhumb(b) {
      var rose = project(0.145, 0.44);
      var cx = px(rose), cy = py(rose);
      b.save();
      b.strokeStyle = 'rgba(200,225,245,.09)';
      b.lineWidth = 1;
      for (var i = 0; i < 16; i++) {
        var a = i * Math.PI / 8;
        b.beginPath();
        b.moveTo(cx, cy);
        b.lineTo(cx + Math.cos(a) * W * 1.6, cy + Math.sin(a) * W * 1.6);
        b.stroke();
      }
      b.restore();
    }

    function traceRings(b, rings, close) {
      b.beginPath();
      for (var r = 0; r < rings.length; r++) {
        var ring = rings[r];
        for (var i = 0; i < ring.length; i++) {
          var p = project(ring[i].x, ring[i].y);
          if (i === 0) b.moveTo(px(p), py(p)); else b.lineTo(px(p), py(p));
        }
        if (close !== false) b.closePath();
      }
    }

    function drawLand(b) {
      b.save();
      /* a wide soft halo reads as the shallow coastal shelf */
      b.save();
      b.shadowColor = 'rgba(90,70,40,.45)';
      b.shadowBlur = 7;
      b.fillStyle = C.land;
      traceRings(b, RINGS);
      b.fill();
      b.restore();

      /* inner texture: a lighter wash offset upwards, like an engraved wash */
      b.save();
      b.clip();
      var wash = b.createLinearGradient(0, 0, 0, H);
      wash.addColorStop(0, 'rgba(255,255,245,.30)');
      wash.addColorStop(0.55, 'rgba(255,255,245,.04)');
      wash.addColorStop(1, 'rgba(70,50,22,.20)');
      b.fillStyle = wash;
      b.fillRect(0, 0, W, H);
      b.restore();

      b.lineJoin = 'round';
      b.strokeStyle = C.coast;
      b.lineWidth = 1.5;
      traceRings(b, RINGS);
      b.stroke();

      b.strokeStyle = 'rgba(255,250,230,.55)';
      b.lineWidth = 0.6;
      traceRings(b, RINGS);
      b.stroke();

      if (LAKES.length) {
        b.fillStyle = 'rgba(160,175,170,.85)';
        traceRings(b, LAKES);
        b.fill();
        b.strokeStyle = 'rgba(74,56,35,.42)';
        b.lineWidth = 0.6;
        traceRings(b, LAKES);
        b.stroke();
      }
      b.restore();
    }

    /* deterministic speckle so the plate looks printed, not airbrushed */
    function drawGrain(b) {
      var g = document.createElement('canvas');
      g.width = 260; g.height = Math.max(60, Math.round(260 * H / W));
      var gc = g.getContext('2d');
      var seed = 20261024;
      function rnd() {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      }
      for (var i = 0; i < 5200; i++) {
        var a = rnd() * 0.09;
        gc.fillStyle = rnd() > 0.5 ? 'rgba(60,44,24,' + a + ')' : 'rgba(255,252,240,' + a + ')';
        gc.fillRect(rnd() * g.width, rnd() * g.height, 1, 1);
      }
      b.save();
      b.globalAlpha = 0.55;
      b.imageSmoothingEnabled = false;
      b.drawImage(g, 0, 0, W, H);
      b.restore();

      /* edge vignette: old plates darken toward the fold */
      var v = b.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.35,
                                     W * 0.5, H * 0.5, Math.max(W, H) * 0.78);
      v.addColorStop(0, 'rgba(60,42,20,0)');
      v.addColorStop(1, 'rgba(60,42,20,.3)');
      b.fillStyle = v;
      b.fillRect(0, 0, W, H);
    }

    function drawFrame(b) {
      b.save();
      b.strokeStyle = 'rgba(74,56,35,.72)';
      b.lineWidth = 2;
      b.strokeRect(7, 7, W - 14, H - 14);
      b.lineWidth = 0.8;
      b.strokeRect(12.5, 12.5, W - 25, H - 25);
      /* corner ticks */
      var L = 16;
      b.strokeStyle = 'rgba(74,56,35,.85)';
      b.lineWidth = 1.4;
      [[13, 13, 1, 1], [W - 13, 13, -1, 1], [13, H - 13, 1, -1], [W - 13, H - 13, -1, -1]]
        .forEach(function (c) {
          b.beginPath();
          b.moveTo(c[0] + c[2] * L, c[1]);
          b.lineTo(c[0], c[1]);
          b.lineTo(c[0], c[1] + c[3] * L);
          b.stroke();
        });
      b.restore();
    }

    function drawOrnaments(b) {
      var sc = Math.max(0.7, Math.min(1.25, W / 1100));
      drawCompassRose(b, W - 62 * sc, H - 62 * sc, 30 * sc);
      drawScaleBar(b, 24, H - 34);
      drawCartouche(b, 24, 20, sc);
      drawSeaLabel(b, 0.40, 0.49, 'ATLANTIC  OCEAN');
      drawSeaLabel(b, 0.775, 0.42, 'INDIAN  OCEAN');
      drawSeaLabel(b, 0.10, 0.60, 'PACIFIC  OCEAN');
    }

    function drawCompassRose(b, cx, cy, r) {
      b.save();
      b.translate(cx, cy);
      b.strokeStyle = 'rgba(74,56,35,.55)';
      b.lineWidth = 1;
      b.beginPath(); b.arc(0, 0, r * 0.94, 0, Math.PI * 2); b.stroke();
      b.beginPath(); b.arc(0, 0, r * 0.62, 0, Math.PI * 2); b.stroke();
      for (var i = 0; i < 8; i++) {
        var a = i * Math.PI / 4;
        var len = i % 2 === 0 ? r : r * 0.66;
        b.save();
        b.rotate(a);
        b.beginPath();
        b.moveTo(0, -len);
        b.lineTo(r * 0.155, 0);
        b.lineTo(0, len * 0.12);
        b.closePath();
        b.fillStyle = i % 2 === 0 ? 'rgba(74,56,35,.72)' : 'rgba(74,56,35,.2)';
        b.fill();
        b.strokeStyle = 'rgba(74,56,35,.6)';
        b.stroke();
        b.restore();
      }
      b.fillStyle = 'rgba(74,56,35,.8)';
      b.font = '700 ' + (r * 0.34).toFixed(1) + 'px ' + SERIF;
      b.textAlign = 'center'; b.textBaseline = 'middle';
      b.fillText('N', 0, -r * 1.16);
      b.restore();
    }

    function drawScaleBar(b, x, y) {
      b.save();
      b.fillStyle = 'rgba(74,56,35,.7)';
      b.font = '9px ' + SERIF;
      b.textAlign = 'left'; b.textBaseline = 'alphabetic';
      b.fillText('2000 nautical miles', x, y - 6);
      var seg = 15;
      for (var i = 0; i < 4; i++) {
        b.fillStyle = i % 2 ? 'rgba(74,56,35,.75)' : 'rgba(244,236,216,.85)';
        b.fillRect(x + i * seg, y, seg, 4);
      }
      b.strokeStyle = 'rgba(74,56,35,.75)';
      b.lineWidth = 0.8;
      b.strokeRect(x, y, seg * 4, 4);
      b.restore();
    }

    function drawCartouche(b, x, y, sc) {
      var w = 186 * sc, h = 44 * sc;
      b.save();
      b.fillStyle = 'rgba(244,236,216,.82)';
      b.strokeStyle = 'rgba(74,56,35,.68)';
      b.lineWidth = 1.2;
      b.beginPath();
      b.rect(x, y, w, h);
      b.fill(); b.stroke();
      b.lineWidth = 0.6;
      b.strokeRect(x + 4, y + 4, w - 8, h - 8);
      b.fillStyle = 'rgba(74,56,35,.92)';
      b.textAlign = 'center'; b.textBaseline = 'middle';
      b.font = '700 ' + (15 * sc).toFixed(1) + 'px ' + SERIF;
      b.fillText('THE GREAT ART RACE', x + w / 2, y + h * 0.38);
      b.font = 'italic ' + (9.5 * sc).toFixed(1) + 'px ' + SERIF;
      b.fillStyle = 'rgba(74,56,35,.66)';
      b.fillText('chart of the art trade · MCMXX', x + w / 2, y + h * 0.68);
      b.restore();
    }

    function drawSeaLabel(b, mx, my, text) {
      var p = project(mx, my);
      b.save();
      b.translate(px(p), py(p));
      b.fillStyle = 'rgba(74,56,35,.4)';
      b.font = 'italic ' + (W < 620 ? 10 : 13) + 'px ' + SERIF;
      b.textAlign = 'center'; b.textBaseline = 'middle';
      var letters = text.split('');
      /* spaced-out italic, the way lettering sits on an engraved sea */
      var span = 0, i;
      var widths = [];
      for (i = 0; i < letters.length; i++) {
        var wv = b.measureText(letters[i]).width;
        widths.push(wv);
        span += wv + 1.6;
      }
      var x = -span / 2;
      for (i = 0; i < letters.length; i++) {
        b.fillText(letters[i], x + widths[i] / 2, 0);
        x += widths[i] + 1.6;
      }
      b.restore();
    }

    /* ---- per-frame overlay ------------------------------------------- */
    function drawPlaceLabels(b, t) {
      var list = api.labels;
      if (!list.length) return;
      b.save();
      b.font = '600 10px ' + SERIF;
      b.textBaseline = 'middle';
      var boxes = [];
      for (var i = 0; i < list.length; i++) {
        var L = list[i];
        var p = project(L.x, L.y);
        var cxp = px(p), cyp = py(p);
        if (cxp < 8 || cxp > W - 8 || cyp < 8 || cyp > H - 8) continue;

        var text = L.label;
        var tw = b.measureText(text).width;
        var isHere = L.here;
        var isCity = L.kind === 'city' || L.kind === 'trade';

        /* candidates in reading order; the first that clears every box wins */
        var cands = isCity
          ? [[6, -11, 'left'], [-6, -11, 'right'], [0, -15, 'center'], [0, 13, 'center'], [6, 8, 'left']]
          : [[6, 0, 'left'], [-6, 0, 'right'], [0, -12, 'center'], [0, 12, 'center']];

        var placed = null;
        for (var c = 0; c < cands.length && !placed; c++) {
          var ox = cands[c][0], oy = cands[c][1], align = cands[c][2];
          var left = align === 'left' ? cxp + ox : align === 'right' ? cxp + ox - tw : cxp + ox - tw / 2;
          var box = [left - 2, cyp + oy - 7, tw + 4, 14];
          var clash = false;
          for (var k = 0; k < boxes.length; k++) {
            var o = boxes[k];
            if (box[0] < o[0] + o[2] && box[0] + box[2] > o[0] &&
                box[1] < o[1] + o[3] && box[1] + box[3] > o[1]) { clash = true; break; }
          }
          if (!clash) placed = { box: box, left: left, align: align, oy: oy };
        }
        /* a city whose label cannot fit still deserves one: force it above */
        if (!placed) {
          placed = { box: [cxp - tw / 2, cyp - 22, tw, 14], left: cxp, align: 'center', oy: -15 };
        }
        boxes.push(placed.box);

        b.textAlign = placed.align;
        var tx = placed.align === 'left' ? placed.left : placed.align === 'right' ? placed.left : cxp;
        var ty = cyp + placed.oy;

        /* halo keeps lettering legible over both sea and land: dark halo for
           pale land lettering, pale halo over the deep-blue ocean */
        var onSea = !isLand(L.x, L.y);
        b.lineWidth = 3;
        b.strokeStyle = onSea ? 'rgba(8,34,54,.92)' : 'rgba(246,238,220,.9)';
        b.strokeText(text, tx, ty);
        b.fillStyle = isHere ? (onSea ? '#ff8b6e' : C.here)
          : onSea ? 'rgba(232,240,247,.96)'
          : 'rgba(46,34,18,.94)';
        b.fillText(text, tx, ty);
      }
      b.restore();
    }

    function drawPins(b) {
      var list = api.labels;
      b.save();
      for (var i = 0; i < list.length; i++) {
        var L = list[i];
        var p = project(L.x, L.y);
        var x = px(p), y = py(p);
        var here = !!L.here;
        var kind = L.kind;
        var r = here ? 4.6 : (kind === 'city' || kind === 'trade') ? 3.4 : 2.9;
        var fill = here ? C.here
          : kind === 'trade' ? '#b3872c'
          : kind === 'city' ? '#2f5f8a'
          : kind === 'colony' ? '#6b5a1f' : '#3f7d44';

        if (here) {
          var pulse = 0.5 + 0.5 * Math.sin((Date.now() - startTime) / 520);
          b.beginPath();
          b.arc(x, y, r + 4 + pulse * 3, 0, Math.PI * 2);
          b.fillStyle = 'rgba(141,34,34,' + (0.16 + 0.12 * (1 - pulse)) + ')';
          b.fill();
        }
        b.beginPath();
        b.arc(x, y, r, 0, Math.PI * 2);
        b.fillStyle = fill;
        b.fill();
        b.lineWidth = 1.5;
        b.strokeStyle = 'rgba(248,240,220,.95)';
        b.stroke();
        b.lineWidth = 0.7;
        b.strokeStyle = 'rgba(50,36,18,.65)';
        b.beginPath();
        b.arc(x, y, r + 1, 0, Math.PI * 2);
        b.stroke();
      }
      b.restore();
    }

    function routePixels(route) {
      var out = new Array(route.pts.length);
      for (var i = 0; i < route.pts.length; i++) {
        var p = project(route.pts[i].x, route.pts[i].y);
        out[i] = { x: px(p), y: py(p) };
      }
      return out;
    }

    function strokePath(b, pts) {
      /* through the midpoints with the vertices as control points: a polyline
         would show its corners, a game board should read as smooth lines */
      b.beginPath();
      b.moveTo(pts[0].x, pts[0].y);
      if (pts.length < 3) {
        for (var a = 1; a < pts.length; a++) b.lineTo(pts[a].x, pts[a].y);
        return;
      }
      for (var i = 1; i < pts.length - 1; i++) {
        var mx = (pts[i].x + pts[i + 1].x) / 2;
        var my = (pts[i].y + pts[i + 1].y) / 2;
        b.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
      }
      b.quadraticCurveTo(pts[pts.length - 2].x, pts[pts.length - 2].y,
                         pts[pts.length - 1].x, pts[pts.length - 1].y);
    }

    /* A standing lane from the current port to a reachable one. It shows the
       shape of the voyage without pretending anybody is sailing it. */
    function drawLane(b, route, pixels) {
      var isRail = route.glyph === 'rail';
      b.save();
      b.lineJoin = 'round';
      b.lineCap = 'round';
      strokePath(b, pixels);
      b.lineWidth = 2.4;
      b.strokeStyle = isRail ? 'rgba(198,74,54,.92)' : 'rgba(92,196,252,.94)';
      b.stroke();
      strokePath(b, pixels);
      b.setLineDash(isRail ? [6, 6] : [3, 7]);
      b.lineWidth = 1.2;
      b.strokeStyle = 'rgba(240,248,255,.5)';
      b.stroke();
      b.setLineDash([]);
      b.restore();
    }

    function drawRoute(b, route, pixels, progress, active) {
      var isRail = route.glyph === 'rail';
      var col = isRail ? C.route : C.routeSea;
      b.save();
      /* the whole lane, faint */
      strokePath(b, pixels);
      b.lineCap = 'round';
      b.setLineDash(isRail ? [4, 5] : [2, 5]);
      b.lineWidth = active ? 2.2 : 1.5;
      b.strokeStyle = 'rgba(' + (isRail ? '200,72,54' : '86,182,240') + ',' + (active ? '.72)' : '.38)');
      b.stroke();
      b.setLineDash([]);

      if (active && progress > 0 && progress < 1) {
        /* the stretch already sailed, drawn solid over the faint remainder */
        var upto = Math.max(1, Math.round(progress * pixels.length));
        var head = pointAt(route, progress);
        var hp = project(head.x, head.y);
        var done = pixels.slice(0, upto);
        done.push({ x: px(hp), y: py(hp) });
        b.lineJoin = 'round';
        strokePath(b, done);
        b.lineWidth = 5;
        b.strokeStyle = isRail ? 'rgba(30,20,10,.30)' : 'rgba(4,26,44,.32)';
        b.stroke();
        strokePath(b, done);
        b.lineWidth = 3;
        b.strokeStyle = isRail ? '#ffd98a' : '#d8f1ff';
        b.shadowColor = col;
        b.shadowBlur = 7;
        b.stroke();
        b.shadowBlur = 0;
      }
      b.restore();
    }

    function drawShip(b, x, y, angle, s, t, phase) {
      b.save();
      b.translate(x, y);
      /* wake behind the hull */
      b.save();
      b.rotate(angle);
      var wg = b.createLinearGradient(-s * 4.5, 0, 0, 0);
      wg.addColorStop(0, 'rgba(255,255,255,0)');
      wg.addColorStop(1, 'rgba(255,255,255,.55)');
      b.strokeStyle = wg;
      b.lineWidth = Math.max(1, s * 0.22);
      b.lineCap = 'round';
      b.beginPath();
      b.moveTo(-s * 4.5, 0);
      b.quadraticCurveTo(-s * 2, Math.sin(t * 3 + phase) * s * 0.35, -s * 0.5, 0);
      b.stroke();
      b.restore();

      var bob = Math.sin(t * 2.2 + phase) * s * 0.1;
      b.translate(0, bob);
      b.rotate(angle);
      b.scale(s / 12, s / 12);

      /* hull */
      b.beginPath();
      b.moveTo(-10, 0);
      b.quadraticCurveTo(-4, 4.6, 8, 2.4);
      b.lineTo(11, -1.6);
      b.quadraticCurveTo(2, -3.4, -10, -2.2);
      b.closePath();
      b.fillStyle = '#3a2a17';
      b.fill();
      b.strokeStyle = 'rgba(20,12,4,.8)';
      b.lineWidth = 0.7;
      b.stroke();

      /* masts + sails */
      b.strokeStyle = 'rgba(40,28,14,.9)';
      b.lineWidth = 0.9;
      b.beginPath(); b.moveTo(-2, -2); b.lineTo(-2, -12); b.stroke();
      b.beginPath(); b.moveTo(5, -1.6); b.lineTo(5, -9); b.stroke();

      b.fillStyle = 'rgba(252,248,236,.96)';
      b.beginPath();
      b.moveTo(-2.4, -11.6);
      b.quadraticCurveTo(2.6, -8.6, -2.4, -4.2);
      b.closePath();
      b.fill();
      b.strokeStyle = 'rgba(90,70,44,.65)';
      b.lineWidth = 0.55;
      b.stroke();

      b.beginPath();
      b.moveTo(4.6, -8.7);
      b.quadraticCurveTo(8.8, -6.4, 4.6, -3.2);
      b.closePath();
      b.fill();
      b.stroke();

      /* bowsprit sail */
      b.fillStyle = 'rgba(250,244,228,.9)';
      b.beginPath();
      b.moveTo(9.4, -2);
      b.quadraticCurveTo(14, -3.4, 11.6, 0);
      b.closePath();
      b.fill();
      b.restore();
    }

    function drawTrain(b, x, y, angle, s, t, phase) {
      b.save();
      b.translate(x, y);
      b.rotate(angle);
      b.scale(s / 12, s / 12);
      /* carriage */
      b.fillStyle = '#4a2a22';
      b.strokeStyle = 'rgba(20,12,4,.85)';
      b.lineWidth = 0.9;
      b.beginPath();
      b.rect(-8, -5, 17, 7);
      b.fill(); b.stroke();
      /* chimney + steam */
      b.fillStyle = '#2f1c14';
      b.fillRect(5, -9, 2.6, 4);
      b.fillStyle = 'rgba(250,246,236,.85)';
      for (var i = 0; i < 3; i++) {
        var d = (t * 2 + phase + i * 0.7) % 2.1;
        b.beginPath();
        b.arc(7 + d * 7, -10 - d * 4, 1.1 + d * 1.5, 0, Math.PI * 2);
        b.fillStyle = 'rgba(252,248,238,' + (0.5 * (1 - d / 2.1)) + ')';
        b.fill();
      }
      /* wheels */
      b.fillStyle = '#21160c';
      b.beginPath(); b.arc(-4, 3, 1.9, 0, Math.PI * 2); b.fill();
      b.beginPath(); b.arc(5, 3, 1.9, 0, Math.PI * 2); b.fill();
      b.restore();
    }

    function drawVoyages(b, now) {
      var vs = api.voyages;
      var t = now / 1000;
      if (!vs.length) return;
      /* the voyage first, then the route board under it: whatever the player
         is travelling on must not be buried under the network */
      var order = vs.slice().sort(function (a, c) {
        return (a.lane ? 1 : 0) - (c.lane ? 1 : 0);
      });

      for (var i = 0; i < order.length; i++) {
        var v = order[i];
        var route = v.route;
        if (!route) continue;
        var pixels = routePixels(route);
        /* a lane whose two ends coincide is not a lane: the projected window
           clips the far side of the globe, so such links are dropped */
        var first = pixels[0], last = pixels[pixels.length - 1];
        var spanPx = Math.hypot(last.x - first.x, last.y - first.y);
        if (v.lane && spanPx < 18) continue;
        if (v.lane) {
          /* a standing link of the route board: drawn, never sailed */
          drawLane(b, route, pixels);
          continue;
        }
        var p = v.progress;
        drawRoute(b, route, pixels, p, p < 1);
        if (p >= 1) continue;

        var head = pointAt(route, p);
        var hp = project(head.x, head.y);
        var size = Math.max(11, Math.min(19, W / 78));
        if (route.glyph === 'rail') {
          drawTrain(b, px(hp), py(hp), Math.atan2(
            Math.sin(head.angle) * WIN_H, Math.cos(head.angle) * WIN_W), size, t, i * 1.7);
        } else {
          /* angle must be corrected for the plate aspect or ships sail at a
           * visibly wrong heading on a non-square canvas */
          var ang = Math.atan2(Math.sin(head.angle) * WIN_H, Math.cos(head.angle) * WIN_W);
          drawShip(b, px(hp), py(hp), ang, size, t, i * 1.7);
        }

        /* day counter riding beside the craft */
        var dayNow = Math.min(v.days, Math.floor(p * v.days) + 1);
        var label = v.label + '  ' + dayNow + '/' + v.days;
        b.save();
        b.font = '600 9.5px ' + SERIF;
        var tw = b.measureText(label).width;
        var lx = px(hp) + 13, ly = py(hp) - 15;
        if (lx + tw + 10 > W - 10) lx = px(hp) - 13 - tw - 10;
        if (ly < 14) ly = py(hp) + 14;
        b.fillStyle = 'rgba(28,20,10,.82)';
        b.beginPath();
        var bw = tw + 10, bh = 15, r = 2.5;
        b.moveTo(lx + r, ly);
        b.arcTo(lx + bw, ly, lx + bw, ly + bh, r);
        b.arcTo(lx + bw, ly + bh, lx, ly + bh, r);
        b.arcTo(lx, ly + bh, lx, ly, r);
        b.arcTo(lx, ly, lx + bw, ly, r);
        b.closePath();
        b.fill();
        b.fillStyle = 'rgba(246,238,220,.96)';
        b.textAlign = 'left';
        b.textBaseline = 'middle';
        b.fillText(label, lx + 5, ly + bh / 2 + 0.5);
        b.restore();
      }
    }

    function drawStaticSelection(b) {
      var sel = opts.getSelection ? opts.getSelection() : null;
      if (!sel) return;
      var p = project(sel.x, sel.y);
      b.save();
      b.strokeStyle = 'rgba(141,34,34,.75)';
      b.lineWidth = 1.4;
      b.setLineDash([4, 3]);
      b.beginPath();
      b.arc(px(p), py(p), 13, 0, Math.PI * 2);
      b.stroke();
      b.restore();
    }

    /* ---- the loop ---------------------------------------------------- */
    function frame() {
      if (dead) return;
      var now = Date.now();
      /* Progress is owned by the caller: it advances with the calendar in
         app.js, one day at a time. The frame loop must not overwrite it, so
         the hull only ever moves when a day actually passes. */
      ctx.clearRect(0, 0, W, H);
      if (base) ctx.drawImage(base, 0, 0, W, H);
      drawStaticSelection(ctx);
      drawPlaceLabels(ctx, now / 1000);
      drawVoyages(ctx, now);
      drawPins(ctx);

      if (hasPulse()) {
        rafId = window.requestAnimationFrame(frame);
      } else {
        rafId = 0;
      }
    }

    function hasPulse() {
      /* every setVoyages() kicks one frame, so the standing lanes need no
         loop of their own; only the "you are here" pulse does. */
      if (!api.labels.length || document.hidden) return false;
      for (var i = 0; i < api.labels.length; i++) if (api.labels[i].here) return true;
      return false;
    }

    function kick() {
      if (rafId) return;
      /* a single paint, plus a short chase while an image or layout settles */
      var chain = 0;
      var step = function () {
        rafId = 0;
        frame();
        if (rafId) return;            /* the pulse loop took over */
        if (++chain < 3) rafId = window.requestAnimationFrame(step);
      };
      rafId = window.requestAnimationFrame(step);
    }

    /* ---- sizing ------------------------------------------------------ */
    function resize() {
      var rect = host.getBoundingClientRect();
      var cssW = Math.max(200, Math.round(rect.width));
      var cssH = Math.max(120, Math.round(rect.height || cssW / ASPECT));
      var dpr = Math.min(2.5, window.devicePixelRatio || 1);
      if (cssW === W && cssH === H && dpr === DPR && base) return;
      W = cssW; H = cssH; DPR = dpr;
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      buildBase();
      kick();
    }

    function refresh() {
      resize();
      kick();
    }

    function destroy() {
      dead = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = 0;
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }

    var ro = null;
    if (window.ResizeObserver) {
      ro = new window.ResizeObserver(function () { refresh(); });
      ro.observe(host);
    }
    window.addEventListener('resize', refresh);

    resize();
    kick();
    return api;
  }

  /* =====================================================================
   * 4. Public surface
   * =================================================================== */
  window.ArtRaceMap = {
    available: !!(GEO && RINGS.length),
    aspect: ASPECT,
    project: project,
    buildRoute: buildRoute,
    pointAt: pointAt,
    isLand: isLand,
    mount: mount
  };

})(window);
