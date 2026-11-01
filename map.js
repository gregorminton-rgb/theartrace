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
      sea: ['#1b6c94', '#0f4a70', '#093352'],
      land: '#a8ba78', coast: '#4e5930',
      city: '#8a2525', trade: '#b3872c', colony: '#9e2a2b',
      ocean: [['ATLANTIC  OCEAN', -18, 42], ['MEDITERRANEAN', 16, 37],
              ['BLACK  SEA', 34, 43]],
      cartouche: ['CARTA D\u2019EUROPA', 'the art trade \u00b7 MCMXX']
    },
    world: {
      id: 'world',
      lat0: 76, lat1: -56, cell: 20, lon0: 0,
      sea: ['#1f7396', '#114d6e', '#0a3450'],
      land: '#b4c582', coast: '#52633a',
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
  function camera(level, W, H, view) {
    /* mapY is (lat + 90) / 180, so lat0 (the northern edge) has the LARGER
       fraction and lat1 the smaller one. */
    var fA = (level.lat0 + 90) / 180, fB = (level.lat1 + 90) / 180;
    var m0 = merc(level.lat0), m1 = merc(level.lat1);
    var span = m0 - m1;
    var deg = level.lonSpan || 360;
    var mid = (level.lon0 || 0) / 360 + 0.5;
    /* Fit the ENTIRE plate inside the viewport at 1x. Preserve its 1.85:1
       geometry by letterboxing; never crop at the minimum zoom. */
    /* Mercator must use the SAME pixel scale horizontally (radians of
       longitude) and vertically (Mercator latitude). A fixed 1.85:1
       ratio distorted both plates and obscured their true extent. */
    /* Comfortable atlas proportions; all longitudes and relevant ports fit at 1x.
       The former full-polar Mercator aspect produced huge blank bands. */
    var plateRatio = level.id === 'world' ? 1.85 : 1.55;
    var drawW = Math.min(W, H * plateRatio);
    var drawH = drawW / plateRatio;
    var insetX = (W - drawW) / 2, insetY = (H - drawH) / 2;
    /* view: { z: zoom factor, cx, cy: plate point kept at the centre (0..1) }.
       Zoom is applied after the projection, so routes, pins, vessels and
       hit tests all share it. */
    var z = view && view.z > 1 ? view.z : 1;
    var cx = view && typeof view.cx === 'number' ? view.cx : 0.5;
    var cy = view && typeof view.cy === 'number' ? view.cy : 0.5;
    function base(x, y) {
      var t = fB !== fA ? (y - fA) / (fB - fA) : 0;
      var lat = (1 - t) * level.lat0 + t * level.lat1;
      return {
        x: insetX + ((x - mid) / (deg / 360) + 0.5) * drawW,
        y: insetY + (m0 - merc(lat)) * (drawH / span)
      };
    }
    /* cx/cy are normalized PROJECTED screen coordinates, not longitude/latitude.\n       Feeding them back through base() flips Y and distorts zoom/panning. */
    var origin = z > 1 ? { x: cx * W, y: cy * H } : null;
    return {
      W: W, H: H, level: level, z: z,
      fromMap: function (x, y) {
        var p = base(x, y);
        if (z <= 1) return p;
        return {
          x: (p.x - origin.x) * z + W / 2,
          y: (p.y - origin.y) * z + H / 2
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

  /* Terrain regions as soft, irregular blobs: [lon, lat, rLon, rLat] in
   * degrees. Each blob is drawn as a wobbly ellipse and clipped to the land,
   * so no straight edges show. Later groups paint over earlier ones. */
  var TERRAIN = [
    { color: 0x9bb36a, blobs: [            /* farmland */
      [5, 47, 7, 4], [18, 50, 7, 3.5], [-2, 53, 4, 2.5], [10, 53, 5, 3.5],
      [35, 50, 9, 4], [-93, 40, 9, 5], [-80, 40, 5, 4], [115, 32, 6, 5],
      [80, 26, 6, 2.5], [-62, -35, 5, 6], [148, -33, 2.5, 3.5], [-2, 42, 4, 3]
    ] },
    { color: 0xe6c86e, blobs: [            /* desert */
      [10, 23, 18, 6], [30, 27, 9, 4], [45, 22, 7, 7], [105, 42, 9, 3.5],
      [131, -25, 11, 6], [22, -23, 5, 4], [-69, -22, 2.5, 5], [56, 33, 5, 3.5]
    ] },
    { color: 0x2f5e2a, blobs: [            /* jungle */
      [-62, -4, 11, 5], [22, 0, 7, 5], [114, 0, 3.5, 2.5], [102, 0, 2.5, 3.5],
      [-88, 15, 3.5, 2], [-3, 7, 4, 2.5], [-72, -8, 4, 3]
    ] },
    { color: 0x78a660, blobs: [            /* green temperate valleys */
      [8, 49, 8, 3.5], [18, 46, 7, 3], [23, 54, 9, 4], [-3, 53, 4, 4],
      [8, 58, 5, 3], [14, 61, 4, 2], [27, 57, 5, 3], [11, 42, 3, 3]
    ] },
    { color: 0xf6f3e8, blobs: [            /* snow and ice */
      [-42, 72, 11, 5], [-100, 70, 14, 4.5], [100, 70, 22, 4.5],
      [-150, 64, 5, 2.5], [20, 68, 5, 2.5], [85, 32, 7, 2],
      [9, 65, 4, 4], [19, 67, 5, 4], [9, 46.7, 2.9, 1.1], [79, 30, 10, 2]
    ] }
  ];

  /* An irregular ellipse in map space, projected to the screen. */
  function blobToPixels(cam, b, k) {
    var out = [], n = 14;
    for (var i = 0; i < n; i++) {
      var t = i / n * Math.PI * 2;
      var j = 1 + 0.22 * Math.sin(3 * t + k) + 0.12 * Math.cos(5 * t + 2 * k);
      var lon = b[0] + b[2] * Math.cos(t) * j;
      var lat = b[1] + b[3] * Math.sin(t) * j;
      out.push(cam.fromMap((lon + 180) / 360, (lat + 90) / 180));
    }
    return out;
  }

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

  /* Chaikin rounds every corner, and a corner it rounds may be two points that
     sit a fraction of the line's own width apart. The smoothed curve then
     arrives, turns and comes back almost on itself — on the plate that reads
     as two parallel lines, which is the one thing a route must never look
     like. Drop near-duplicate vertices first so there is no corner to curl. */
  function dedupe(pts, minStep) {
    if (!pts || pts.length < 2) return pts;
    var out = [pts[0]];
    for (var i = 1; i < pts.length; i++) {
      var prev = out[out.length - 1], p = pts[i];
      if (Math.hypot(p.x - prev.x, p.y - prev.y) >= minStep) out.push(p);
    }
    var last = pts[pts.length - 1], tail = out[out.length - 1];
    if (out.length > 1 &&
        Math.hypot(last.x - tail.x, last.y - tail.y) < minStep) {
      out.pop();
    }
    out.push(last);
    return out;
  }

  /* An arrival that doubles back on itself is the same defect seen from the
     other side: the path's last stretch runs back along the previous one. Trim
     the tail back to the last point that still moves *towards* the harbour. */
  function uncurl(pts) {
    if (!pts || pts.length < 4) return pts;
    var end = pts[pts.length - 1];
    var keep = pts.length - 1;
    /* walk backwards until the step direction agrees with the approach */
    while (keep > 1) {
      var a = pts[keep - 1], b = pts[keep];
      var inx = end.x - a.x, iny = end.y - a.y;
      var sx = b.x - a.x, sy = b.y - a.y;
      var sl = Math.hypot(sx, sy), il = Math.hypot(inx, iny);
      if (sl < 1e-9 || il < 1e-9) { keep--; continue; }
      var dot = (sx * inx + sy * iny) / (sl * il);
      if (dot > 0.25) break;
      keep--;
    }
    return pts.slice(0, keep + 1);
  }

  function link(ax, ay, bx, by) {
    /* a crossing that leaves the continent gets a real sea path around the
       headlands; a short hop gets the express arc below */
    if (Math.hypot(bx - ax, by - ay) > 0.11) {
      var sea = seaPath(ax, ay, bx, by);
      if (sea && sea.length > 2) {
        /* 0.004 map units is roughly five pixels at the zoom the plate is
           read at — below that two vertices are one vertex for the eye. */
        var cleaned = dedupe(sea, 0.004);
        var smooth = chaikin(rdp(cleaned, 0.0016), 2);
        smooth = uncurl(dedupe(smooth, 0.004));
        smooth[0] = { x: ax, y: ay };
        if (smooth.length > 2) smooth[smooth.length - 1] = { x: bx, y: by };
        else smooth.push({ x: bx, y: by });
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
    var acc = 0, drawing = true, penAt = pts[0];
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
        if (drawing) {
          /* a dash may resume mid-segment, but the pen was lifted: start the
             stroke at the segment point, not by chording back to where the
             previous dash ended, which reads as a second line */
          if (penAt !== a) g.moveTo(a.x, a.y);
          g.lineTo(px, py);
          penAt = null;
        } else {
          g.moveTo(px, py);
        }
        if (acc >= limit - 1e-6) {
          drawing = !drawing;
          acc = 0;
          if (!drawing) penAt = null;
        }
      }
      if (!drawing) penAt = null;
      if (drawing) penAt = b;
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
    g.lineStyle(1, 0xd8ecff, 0.20);
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
    g.lineStyle(1, 0xd8ecff, 0.36);
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
    var g = new PIXI.Container();
    var r, i, pts;
    var land = hex(lv.land), coast = hex(lv.coast);

    /* the shallow shelf: a wide, soft edge under every coast, drawn first so
       the landmass sits on top of it */
    var shelf = new PIXI.Graphics();
    for (r = 0; r < RINGS.length; r++) {
      if (!visibleRing(cam, RINGS[r])) continue;
      pts = toPixels(cam, RINGS[r]);
      shelf.beginFill(0x3a2a14, 0.18);
      shelf.drawPolygon(flatten(pts));
      shelf.endFill();
    }
    g.addChild(shelf);

    /* the landmass itself: the base tone, then the terrain zones clipped to it */
    var fill = new PIXI.Graphics();
    for (r = 0; r < RINGS.length; r++) {
      if (!visibleRing(cam, RINGS[r])) continue;
      fill.beginFill(land, 1);
      fill.drawPolygon(flatten(toPixels(cam, RINGS[r])));
      fill.endFill();
    }

    var terrain = new PIXI.Graphics();
    /* Draw the same biomes on both maps so Europe no longer looks flat. */
    {
      for (var z = 0; z < TERRAIN.length; z++) {
        terrain.beginFill(TERRAIN[z].color, 1);
        for (var b = 0; b < TERRAIN[z].blobs.length; b++) {
          terrain.drawPolygon(flatten(blobToPixels(cam, TERRAIN[z].blobs[b], b * 1.7 + z)));
        }
        terrain.endFill();
      }
    }
    /* the base tone is visible; the terrain zones are clipped to it */
    g.addChild(fill);
    /* Land-only mask: biome blobs must not paint over surrounding seas. */
    var terrainMask = new PIXI.Graphics();
    for (r = 0; r < RINGS.length; r++) {
      if (!visibleRing(cam, RINGS[r])) continue;
      terrainMask.beginFill(0xffffff, 1);
      terrainMask.drawPolygon(flatten(toPixels(cam, RINGS[r])));
      terrainMask.endFill();
    }
    g.addChild(terrainMask);
    terrain.mask = terrainMask;
    g.addChild(terrain);
    /* Playful hand-drawn mountain crests and snowy ridges.
       Map coordinates preserve their positions through zoom and pan. */
    var relief = new PIXI.Graphics();
    var ranges = [
      [9.5,46.7,7], [11.6,47.4,6], [8.3,46.1,5],  /* Alps */
      [7.8,61.5,7], [11,64,7], [15,67,6],         /* Norway */
      [-3.7,57,5], [-4.5,56.6,4],                 /* Highlands */
      [-107,39,8], [-112,44,7], [-71,-33,8],      /* Rockies / Andes */
      [86,28,8], [79,32,7], [44,42,5], [15,43,4] /* Himalaya / Caucasus / Balkans */
    ];
    ranges.forEach(function(v){
      var p=cam.fromMap((v[0]+180)/360,(v[1]+90)/180);
      if(p.x < -20 || p.x > cam.W+20 || p.y < -20 || p.y > cam.H+20)return;
      var sz=Math.max(3.5,Math.min(13,v[2]*Math.sqrt(cam.z)));
      relief.lineStyle(1,0x51614b,0.8);
      relief.beginFill(0x738876,0.94);
      relief.drawPolygon([p.x-sz,p.y+sz*.65,p.x,p.y-sz,p.x+sz,p.y+sz*.65]);
      relief.endFill();
      relief.lineStyle(0);
      relief.beginFill(0xf8faf4,0.98);
      relief.drawPolygon([p.x-sz*.36,p.y-sz*.14,p.x,p.y-sz,p.x+sz*.4,p.y-sz*.11,p.x+sz*.08,p.y-sz*.27,p.x-sz*.06,p.y-sz*.17]);
      relief.endFill();
    });
    g.addChild(relief);

    /* coastline ink, a faint highlight and lakes sit above the zones; they go
       in their own child, since a Graphics draws its own geometry before its
       children and would otherwise be hidden under the fill */
    var ink = new PIXI.Graphics();
    for (r = 0; r < RINGS.length; r++) {
      if (!visibleRing(cam, RINGS[r])) continue;
      pts = toPixels(cam, RINGS[r]);
      ink.lineStyle(1.4, coast, 0.92);
      ink.drawPolygon(flatten(pts));
      ink.lineStyle(0.6, 0xfffae6, 0.3);
      ink.drawPolygon(flatten(pts));
    }
    for (i = 0; i < LAKES.length; i++) {
      if (!visibleRing(cam, LAKES[i])) continue;
      pts = toPixels(cam, LAKES[i]);
      ink.beginFill(0xa0afaa, 0.85);
      ink.lineStyle(0.6, 0x4a3823, 0.42);
      ink.drawPolygon(flatten(pts));
      ink.endFill();
    }
    g.addChild(ink);
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

  /* Eight painted plates of the same vintage sailing ship, one per compass
     point. The sprite points east at rest, so the sheet is indexed clockwise
     from E and the holder must never be rotated (see placeVessels). */
  var SHIP_DIRS = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];
  var shipTextures = null;
  /* the vessels on the live plate, for the harness hook below */
  var liveVessels = null;

  function shipTexture(dir) {
    if (!shipTextures) {
      shipTextures = {};
      for (var i = 0; i < SHIP_DIRS.length; i++) {
        var name = SHIP_DIRS[i];
        var tex = PIXI.Texture.from('images/sprites/ship-' + name + '.png');
        shipTextures[name] = tex;
      }
    }
    return shipTextures[dir] || shipTextures.e;
  }

  function shipDirFor(angle) {
    var a = angle == null || !isFinite(angle) ? 0 : angle;
    var oct = Math.round(((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI / 4)) % 8;
    return SHIP_DIRS[oct];
  }

  function makeShip() {
    var root = new PIXI.Container();
    var wake = new PIXI.Graphics();
    wake.lineStyle(1.6, 0xffffff, 0.5);
    wake.moveTo(-9, 0);
    wake.quadraticCurveTo(-5, 1.2, -1.5, 0);
    root.addChild(wake);

    var sprite = new PIXI.Sprite(shipTexture('e'));
    sprite.anchor.set(0.5, 0.5);
    /* 128px plate -> roughly a 26px vessel on a 700px-wide chart */
    sprite.scale.set(0.24);
    root.addChild(sprite);

    return { root: root, wake: wake, sprite: sprite };
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
    var canvasEl = app.view;
    canvasEl.className = 'wm-canvas';
    host.appendChild(canvasEl);

    var api = {
      canvas: canvasEl,
      voyages: [],
      labels: [],
      level: opts.level && LEVELS[opts.level] ? opts.level : 'world',
      anchor: null,
      setVoyages: setVoyages,
      setAnchor: setAnchor,
      setLabels: setLabels,
      setLevel: setLevel,
      resetZoom: resetZoom,
      getView: function(){return {level:api.level,z:zoomView.z,cx:zoomView.cx,cy:zoomView.cy};},
      refresh: refresh,
      destroy: destroy
    };

    var W = 0, H = 0;
    var dead = false;
    var cam = null;
    /* zoom state: factor z, and the plate point (0..1) held at the centre */
    /* Start mobile viewers closer to the land, without changing viewport size.
       Pinch, drag, wheel and the Europe/World selector retain their controls. */
    function defaultZoom(){return window.matchMedia && window.matchMedia('(max-width: 760px)').matches ? 1.35 : 1;}
    var saved = opts.initialView;
    var zoomView = saved && saved.level === api.level &&
      isFinite(saved.z) && isFinite(saved.cx) && isFinite(saved.cy) ?
      { z: saved.z, cx: saved.cx, cy: saved.cy } :
      { z: defaultZoom(), cx: 0.5, cy: 0.5 };
    var ZMIN = 1, ZMAX = 6;
    clampView();

    /* keep the view centre inside the plate, so the zoom never shows
       empty space beyond the map edge */
    function clampView() {
      zoomView.z = Math.max(ZMIN, Math.min(ZMAX, zoomView.z));
      var half = 0.5 / zoomView.z;
      zoomView.cx = Math.max(half, Math.min(1 - half, zoomView.cx));
      zoomView.cy = Math.max(half, Math.min(1 - half, zoomView.cy));
      if (zoomView.z === ZMIN) { zoomView.cx = 0.5; zoomView.cy = 0.5; }
    }

    /* Zoom by a factor around a screen point (css px inside the host); the
       map point under the finger or cursor stays put. */
    function zoomAt(factor, sx, sy) {
      if (!W) return;
      var old = zoomView.z;
      var next = Math.max(ZMIN, Math.min(ZMAX, old * factor));
      if (next === old) return;
      var ux = zoomView.cx + (sx - W / 2) / (W * old);
      var uy = zoomView.cy + (sy - H / 2) / (H * old);
      zoomView.z = next;
      /* Keep the exact map point under the cursor/finger midpoint stationary. */
      zoomView.cx = ux - (sx - W / 2) / (W * next);
      zoomView.cy = uy - (sy - H / 2) / (H * next);
      clampView();
      redrawAll();
    }

    function resetZoom() {
      zoomView.z = defaultZoom();
      zoomView.cx = 0.5;
      zoomView.cy = 0.5;
      if (W && H) redrawAll();
    }

    function panBy(dx, dy) {
      if (!W || zoomView.z <= 1) return;
      zoomView.cx -= dx / (W * zoomView.z);
      zoomView.cy -= dy / (H * zoomView.z);
      clampView();
      redrawAll();
    }

    function redrawAll() {
      buildStatic();
      drawRoutes();
      drawPinsAndLabels();
      drawSelection();
      drawAnchor();
      try { app.renderer.render(app.stage); } catch (e) { console.error('[map] render failed', e); }
    }

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

    /* Where the traveller stands right now, as {x, y} in map space — a port,
       or a plantation ashore. The hover preview of the city list needs it to
       draw a line from here to the place under the pointer. */
    function setAnchor(pt) {
      var nx = pt && typeof pt.x === 'number' ? pt.x : null;
      var ny = pt && typeof pt.y === 'number' ? pt.y : null;
      if (api.anchor && nx === api.anchor.x && ny === api.anchor.y) return;
      api.anchor = nx === null || ny === null ? null : { x: nx, y: ny };
      drawAnchor();
    }

    function setLabels(list) {
      api.labels = list || [];
      drawPinsAndLabels();
      drawSelection();
    }

    function setLevel(id) {
      if (!LEVELS[id] || api.level === id) return;
      api.level = id;
      /* A new geographical view always starts with the whole plate. */
      resetZoom();
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
      cam = camera(lv, W, H, zoomView);
      liveCam = cam;

      clear(seaLayer); clear(gridLayer); clear(landLayer); clear(decoLayer);

      seaLayer.addChild(drawSea(lv, cam));
      gridLayer.addChild(drawGraticule(lv, cam));
      landLayer.addChild(drawLand(lv, cam));
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
    liveVessels = vessels;

    function drawRoutes() {
      clear(routeLayer);
      runs.length = 0;
      if (!cam) return;
      var vs = api.voyages;
      /* the running voyage first, then the standing board under it */
      var order = vs.slice().sort(function (a, c) {
        return (a.lane ? 1 : 0) - (c.lane ? 1 : 0);
      });
      /* a standing lane whose ends match a voyage under way is the same line */
      function runningOver(route) {
        for (var k = 0; k < vs.length; k++) {
          var r = vs[k].route;
          if (vs[k].lane || !r || !r.pts || !route.pts) continue;
          var a = r.pts[0], b = route.pts[0];
          var c = r.pts[r.pts.length - 1], d = route.pts[route.pts.length - 1];
          if (Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6 &&
              Math.abs(c.x - d.x) < 1e-6 && Math.abs(c.y - d.y) < 1e-6) return true;
        }
        return false;
      }
      for (var i = 0; i < order.length; i++) {
        var v = order[i];
        var route = v.route;
        if (!route || !route.pts || route.pts.length < 2) continue;
        var px = toPixels(cam, route.pts);
        var first = px[0], last = px[px.length - 1];
        if (v.lane) {
          if (Math.hypot(last.x - first.x, last.y - first.y) < 18) continue;
          if (runningOver(route)) continue;
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
       shape of the voyage without pretending anybody is sailing it.
       One stroke only: a base line plus a dashed overlay reads as two routes. */
    function laneGraphic(route, px) {
      var isRail = route.glyph === 'rail';
      var c = new PIXI.Container();
      var base = new PIXI.Graphics();
      base.lineStyle(1.6, isRail ? 0xc64a36 : 0x5cc4fc, 0.55);
      dashedCurve(base, px, isRail ? 5 : 4, isRail ? 5 : 6);
      c.addChild(base);
      return c;
    }

    /* Cut a pixel polyline at a fraction of its length. Returns the part
       before the cut and the part after it, both starting/ending on the cut. */
    function splitAtArc(px, t) {
      var total = 0, i;
      for (i = 1; i < px.length; i++) total += Math.hypot(px[i].x - px[i - 1].x, px[i].y - px[i - 1].y);
      var want = total * t, acc = 0;
      for (i = 1; i < px.length; i++) {
        var d = Math.hypot(px[i].x - px[i - 1].x, px[i].y - px[i - 1].y);
        if (acc + d >= want) {
          var f = d > 0 ? (want - acc) / d : 0;
          var hp = { x: px[i - 1].x + (px[i].x - px[i - 1].x) * f, y: px[i - 1].y + (px[i].y - px[i - 1].y) * f };
          return {
            done: px.slice(0, i).concat([hp]),
            left: [hp].concat(px.slice(i))
          };
        }
        acc += d;
      }
      return { done: px.slice(), left: [px[px.length - 1]] };
    }

    function routeGraphic(route, px, progress) {
      var isRail = route.glyph === 'rail';
      var active = progress < 1;
      var g = new PIXI.Graphics();
      /* the part not yet sailed, then the part already covered drawn solid on
         top of it. The dashed remainder must not run underneath the solid one,
         or the eye reads two parallel lines wherever they nearly coincide. */
      if (progress > 0 && progress < 1) {
        /* split the very same polyline at the head by arc length, so the
           sailed part and the remainder meet exactly and never run beside
           each other */
        var parts = splitAtArc(px, progress);
        var seg = parts.done, rest = parts.left;
        if (rest.length >= 2) {
          g.lineStyle(active ? 2.2 : 1.5, isRail ? 0xc84836 : 0x56b6f0, 0.72);
          dashedCurve(g, rest, isRail ? 4 : 2, isRail ? 5 : 5);
        }
        if (seg.length >= 2) {
          g.lineStyle(5, isRail ? 0x1e140a : 0x041a2c, 0.30);
          traceCurve(g, seg);
          g.lineStyle(3, isRail ? 0xffd98a : 0xd8f1ff, 1);
          traceCurve(g, seg);
        }
      } else {
        g.lineStyle(active ? 2.2 : 1.5, isRail ? 0xc84836 : 0x56b6f0,
                    active ? 0.72 : 0.38);
        dashedCurve(g, px, isRail ? 4 : 2, isRail ? 5 : 5);
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
        /* The painted ship carries its heading in the picture, so the vessel
           is never rotated: rotate flags the wake, the frame is the heading. */
        item.holder.rotation = 0;
        if (!item.isRail && item.craft.sprite) {
          var dir = shipDirFor(ang);
          var tex = shipTexture(dir);
          if (item.craft.sprite.texture !== tex) {
            item.craft.sprite.texture = tex;
            item.craft.sprite.shipDir = dir;
          }
          item.craft.sprite.rotation = 0;
        }
        item.holder.visible = true;

        item.craft.wake && (function (wk) {
          wk.clear();
          /* the wake trails opposite the painted heading */
          var bx = -Math.cos(ang) * 9, by = -Math.sin(ang) * 9;
          var nx = -Math.sin(ang) * 3, ny = Math.cos(ang) * 3;
          var sway = Math.sin(t * 2 + item.phase) * 1.6;
          wk.lineStyle(1.5, 0xffffff, 0.3 + 0.18 * Math.sin(t * 3 + item.phase));
          wk.moveTo(bx, by);
          wk.quadraticCurveTo(bx * 0.55 + nx + sway, by * 0.55 + ny, -Math.cos(ang) * 1.5, -Math.sin(ang) * 1.5);
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
        var r = here ? 8 : kind === 'trade' ? 7 : kind === 'colony' ? 7 : 6;
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
        /* A soft surrounding disc makes tiny destinations legible on busy land. */
        var halo = new PIXI.Graphics();
        halo.beginFill(0x081a27, 0.68);
        halo.drawCircle(0, 0, r + 4);
        halo.endFill();
        halo.position.set(q.x, q.y);
        pinLayer.addChild(halo);
        var g = new PIXI.Graphics();
        g.beginFill(col, 1);
        g.lineStyle(1.5, 0xf8f0dc, 0.95);
        if(kind === 'colony' && !here) {
          g.drawRoundedRect(-r, -r, r*2, r*2, 3);
        } else if(kind === 'trade' && !here) {
          g.drawPolygon([0,-r,r,0,0,r,-r,0]);
        } else {
          g.drawCircle(0, 0, r);
        }
        g.endFill();
        /* Sticker-style travel tokens: illustrated motif, specular highlight,
           dark outline. Their hit-testing remains based on the existing pins. */
        g.lineStyle(1,0xffffff,0.6);
        g.moveTo(-r*.48,-r*.42);g.lineTo(-r*.1,-r*.65);
        g.lineStyle(0);
        if (kind === 'colony' && !here) {
          /* Two playful leaves over a planter. */
          g.beginFill(0xf8e3a3,1);
          g.drawRoundedRect(-r*.49,r*.19,r*.98,r*.34,1);
          g.endFill();
          g.lineStyle(1.3,0xf7f6d4,1);g.moveTo(0,r*.21);g.lineTo(0,-r*.42);
          g.lineStyle(0);g.beginFill(0xd6f58b,1);
          g.drawEllipse(-r*.24,-r*.28,r*.32,r*.19);
          g.drawEllipse(r*.25,-r*.40,r*.29,r*.18);g.endFill();
        } else if (kind === 'trade' && !here) {
          /* A coin embossed with a bright money mark. */
          g.beginFill(0xffe39a,1);g.drawCircle(0,0,r*.54);g.endFill();
          g.lineStyle(1.4,0x865018,1);g.drawCircle(0,0,r*.54);
          g.moveTo(-r*.25,-r*.2);g.lineTo(r*.24,-r*.2);
          g.moveTo(-r*.25,r*.16);g.lineTo(r*.24,r*.16);g.lineStyle(0);
        } else {
          /* Mini art frame: the collection cities are miniature galleries. */
          g.beginFill(0xffdf87,1);g.drawRoundedRect(-r*.49,-r*.42,r*.98,r*.84,1);g.endFill();
          g.beginFill(0x6cadbe,1);g.drawRect(-r*.32,-r*.25,r*.64,r*.5);g.endFill();
          g.beginFill(0xe6f7cc,1);g.drawPolygon([-r*.3,r*.22,0,-r*.11,r*.3,r*.22]);g.endFill();
        }
        g.lineStyle(0.7, 0x32240f, 0.65);
        g.drawCircle(0, 0, r + 1);
        g.position.set(q.x, q.y);
        pinLayer.addChild(g);
        boxes.push([q.x - r - 5, q.y - r - 5, (r + 5) * 2, (r + 5) * 2]);
      }

      for (i = 0; i < pins.length; i++) {
        var o = pins[i];
        var onLand = isLand(o.L.x, o.L.y);
        var isCity = o.L.kind === 'city' || o.L.kind === 'trade';
        var text = new PIXI.Text(o.L.label, {
          fontFamily: FONT, fontSize: o.L.kind === 'colony' ? 11.5 : 12, fontWeight: '600',
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

    /* The traveller's own position: a small sea-chevron so the hover preview
       has an obvious starting point, even when no port pin is nearby. */
    function drawAnchor() {
      var existing = labelLayer.getChildByName('here-anchor');
      if (existing) labelLayer.removeChild(existing);
      if (!api.anchor || !cam) return;
      var p = cam.fromMap(api.anchor.x, api.anchor.y);
      var g = new PIXI.Graphics();
      g.name = 'here-anchor';
      g.lineStyle(1.6, 0xffe9a8, 0.9);
      g.beginFill(0x1a1206, 0.75);
      g.drawCircle(p.x, p.y, 7.5);
      g.endFill();
      g.lineStyle(1.2, 0xffe9a8, 0.55);
      g.moveTo(p.x, p.y - 12); g.lineTo(p.x + 4, p.y - 5); g.lineTo(p.x - 4, p.y - 5);
      g.closePath();
      labelLayer.addChild(g);
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
      /* A host inside a hidden panel reports 0x0. Building at the 220x150
         floor would leave a mis-sized plate that never gets corrected, so
         wait for a real layout box instead. */
      if (!rect.width || !rect.height) return;
      var cssW = Math.max(220, Math.round(rect.width));
      var cssH = Math.max(150, Math.round(rect.height || cssW * 0.60));
      /* Canvas matches the visible viewport exactly. The camera, not CSS,
         fits the whole map with correct aspect and permits 1x overview. */
      canvasEl.style.width = '100%';
      canvasEl.style.height = '100%';
      canvasEl.style.maxWidth = '';
      canvasEl.style.position = '';
      canvasEl.style.left = '';
      canvasEl.style.top = '';
      if (cssW === W && cssH === H) return;
      W = cssW; H = cssH;
      app.renderer.resize(W, H);
      buildStatic();
      drawRoutes();
      drawPinsAndLabels();
      drawSelection();
      drawAnchor();
    }

    var retryQueued = false;

    function refresh() {
      if (dead) return;
      resize();
      /* No layout box yet (hidden panel, mid-open): nothing has been built, so
         ask for another frame until the browser gives the host a size. */
      if (!W) {
        if (!retryQueued && window.requestAnimationFrame) {
          retryQueued = true;
          window.requestAnimationFrame(function () { retryQueued = false; refresh(); });
        }
        return;
      }
      drawSelection();
      drawAnchor();
      /* Force the frame instead of waiting for the ticker: the chart is
         mounted in panels that open and close, and a throttled or paused
         ticker would otherwise leave the plate blank until something else
         happens to trigger a draw. */
      try { app.renderer.render(app.stage); } catch (e) { /* gone mid-frame */ }
    }

    var ro = null;
    if (window.ResizeObserver) {
      ro = new window.ResizeObserver(function () { if (!dead) refresh(); });
      ro.observe(host);
    }
    window.addEventListener('resize', refresh);

    /* ---- zoom input: wheel, pinch, drag-to-pan ------------------------ */
    var pointers = new Map();
    var pinchDist = 0, pinchMid = null;
    var dragMoved = false;
    function localPoint(e) {
      var r = canvasEl.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (W / (r.width || W)),
               y: (e.clientY - r.top) * (H / (r.height || H)) };
    }
    function onWheel(e) {
      if (dead) return;
      e.preventDefault();
      var p = localPoint(e);
      zoomAt(e.deltaY < 0 ? 1.10 : 1 / 1.10, p.x, p.y);
    }
    function onDown(e) {
      pointers.set(e.pointerId, localPoint(e));
      dragMoved = false;
      if (pointers.size === 2) {
        var pts = Array.from(pointers.values());
        pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        pinchMid = {x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};
      }
    }
    function onMove(e) {
      if (!pointers.has(e.pointerId)) return;
      var prev = pointers.get(e.pointerId);
      var now = localPoint(e);
      pointers.set(e.pointerId, now);
      if (pointers.size >= 2) {
        var pts = Array.from(pointers.values());
        var d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (pinchDist > 0 && d > 0) {
          var mx = (pts[0].x + pts[1].x) / 2, my = (pts[0].y + pts[1].y) / 2;
          /* Two-finger translation and scaling share the gesture centroid. */
          if(pinchMid) panBy(mx-pinchMid.x,my-pinchMid.y);
          zoomAt(Math.max(0.75,Math.min(1.35,d/pinchDist)),mx,my);
          pinchDist = d;
          pinchMid = {x:mx,y:my};
        }
        dragMoved = true;
        return;
      }
      var dx = now.x - prev.x, dy = now.y - prev.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) dragMoved = true;
      if (dragMoved) panBy(dx, dy);
    }
    function onUp(e) {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) {pinchDist = 0;pinchMid = null;}
    }
    /* a drag that moved must not also count as a tap on a pin */
    function onClickCapture(e) {
      if (dragMoved) { e.stopPropagation(); e.preventDefault(); dragMoved = false; }
    }
    canvasEl.style.touchAction = 'none';
    canvasEl.addEventListener('wheel', onWheel, { passive: false });
    canvasEl.addEventListener('pointerdown', onDown);
    canvasEl.addEventListener('pointermove', onMove);
    canvasEl.addEventListener('pointerup', onUp);
    canvasEl.addEventListener('pointercancel', onUp);
    canvasEl.addEventListener('click', onClickCapture, true);

    function destroy() {
      if (dead) return;
      dead = true;
      if (ro) { ro.disconnect(); ro = null; }
      window.removeEventListener('resize', refresh);
      if (liveCam === cam) liveCam = null;
      try { app.destroy(false, { children: true }); } catch (e) { /* already gone */ }
      if (canvasEl.parentNode) canvasEl.parentNode.removeChild(canvasEl);
    }

    /* First paint. resize() only rebuilds when the size actually changed, and
       buildStatic() does not render by itself, so the plate would stay blank
       until the ticker happened to tick — which it does not while the panel
       that hosts the chart is still hidden or off-screen. The canvas has no
       layout box yet at this point (it was just appended), so do the first
       paint once the browser has laid it out. */
    refresh();
    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(function () { if (!dead) refresh(); });
    } else {
      window.setTimeout(function () { if (!dead) refresh(); }, 16);
    }
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
    /* harness hook: what the plate is currently drawing, so a headless probe
       can assert that a ship carries a directional sprite */
    testVessels: function () {
      var out = [];
      var vessels = liveVessels || [];
      for (var i = 0; i < vessels.length; i++) {
        var it = vessels[i];
        out.push({
          rail: !!it.isRail,
          visible: !!(it.holder && it.holder.visible),
          rotation: it.holder ? it.holder.rotation : null,
          sprite: it.craft && it.craft.sprite ? it.craft.sprite.texture.valid : null,
          frame: it.craft && it.craft.sprite ? (it.craft.sprite.shipDir || 'e')
            : null,
          label: it.label ? it.label.text : null
        });
      }
      return out;
    },
    /* harness hook: the real camera for a level at a given plate size */
    testCamera: function (levelName, w, h) {
      var lv = LEVELS[levelName];
      if (!lv) return null;
      var cam = camera(lv, w, h);
      return function (x, y) { return cam.fromMap(x, y); };
    }
  };

})(window);
