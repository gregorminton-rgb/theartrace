# -*- coding: utf-8 -*-
"""Turn Natural Earth land polygons into the compact `world-geo.js` the canvas
map draws from.

Why a generated file and not a runtime download: the game has to run offline
from a plain `python -m http.server`, so the coastlines ship with the project
exactly like every other asset in `images/`.

Coordinate convention is the one `data.js` already uses for city pins:
    mapX = (lon + 180) / 360      0 = 180W .. 1 = 180E
    mapY = (lat +  90) / 180      0 = 90S  .. 1 = 90N
so a coordinate straight out of this file lands on the same spot as a city's
authored `mapX`/`mapY`. No extra projection is baked in here - the browser
does the drawing projection, because Europe has to be enlarged at render time
without moving the pins off their real coordinates.

Run:  python tools/build-world-geo.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# Antarctica is off the playable map and would only add noise along the bottom.
LAT_MIN, LAT_MAX = -58.0, 84.0

# Europe gets a much finer tolerance: that is where the game is actually
# played and where a coarse outline would visibly cut corners off Italy.
EUROPE = (-14.0, 32.0, 46.0, 72.0)      # lon_min, lat_min, lon_max, lat_max
TOL_GLOBAL = 0.55                       # degrees
TOL_EUROPE = 0.13

SCALE = 10000.0                         # integer grid for the output


def to_map(lon, lat):
    return ((lon + 180.0) / 360.0, (lat + 90.0) / 180.0)


def in_europe(lon, lat):
    return EUROPE[0] <= lon <= EUROPE[2] and EUROPE[1] <= lat <= EUROPE[3]


def rdp(pts, tol):
    """Douglas-Peucker on lon/lat. Iterative so a 20k-point ring cannot blow
    the Python recursion limit."""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        lo, hi = stack.pop()
        if hi <= lo + 1:
            continue
        ax, ay = pts[lo]
        bx, by = pts[hi]
        dx, dy = bx - ax, by - ay
        span = (dx * dx + dy * dy) ** 0.5
        best_i, best_d = -1, -1.0
        for i in range(lo + 1, hi):
            px, py = pts[i]
            if span == 0.0:
                d = ((px - ax) ** 2 + (py - ay) ** 2) ** 0.5
            else:
                d = abs(dy * px - dx * py + bx * ay - by * ax) / span
            if d > best_d:
                best_i, best_d = i, d
        if best_d > tol:
            keep[best_i] = True
            stack.append((lo, best_i))
            stack.append((best_i, hi))
    return [pts[i] for i in range(len(pts)) if keep[i]]


def ring_area(pts):
    a = 0.0
    n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % n]
        a += x1 * y2 - x2 * y1
    return abs(a) * 0.5


def load(name):
    path = os.path.join(HERE, name)
    if not os.path.exists(path):
        raise SystemExit('missing input: %s' % path)
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def rings_of(feature):
    g = feature['geometry']
    if g is None:
        return []
    if g['type'] == 'Polygon':
        return [g['coordinates']]
    if g['type'] == 'MultiPolygon':
        return g['coordinates']
    return []


def bbox_hits_europe(pts):
    """Eurasia is a single enormous ring whose centroid sits in Siberia, so a
    centroid test would simplify Italy and the Dutch coast with the coarse
    tolerance and drop Rome into the sea. The bounding box is the honest test:
    any ring that reaches into the play area gets the fine tolerance."""
    lons = [p[0] for p in pts]
    lats = [p[1] for p in pts]
    return not (max(lons) < EUROPE[0] or min(lons) > EUROPE[2] or
                max(lats) < EUROPE[1] or min(lats) > EUROPE[3])


def build_land():
    data = load('_ne50.json')
    out = []
    kept_pts = 0
    for feat in data['features']:
        for poly in rings_of(feat):
            if not poly:
                continue
            outer = poly[0]
            tol = TOL_EUROPE if bbox_hits_europe(outer) else TOL_GLOBAL
            simp = rdp(outer, tol)
            # drop specks: anything under ~0.02 square degrees is invisible
            if len(simp) < 4 or ring_area(simp) < 0.02:
                continue
            pts = []
            for lon, lat in simp:
                if lat < LAT_MIN or lat > LAT_MAX:
                    continue
                x, y = to_map(lon, lat)
                pts.append((int(round(x * SCALE)), int(round(y * SCALE))))
            if len(pts) < 4:
                continue
            # consecutive duplicates after rounding carry no information
            clean = [pts[0]]
            for p in pts[1:]:
                if p != clean[-1]:
                    clean.append(p)
            if len(clean) >= 4:
                out.append(clean)
                kept_pts += len(clean)
    return out, kept_pts


def build_lakes():
    data = load('_ne50c.json')
    out = []
    for feat in data['features']:
        for poly in rings_of(feat):
            if not poly:
                continue
            simp = rdp(poly[0], 0.25)
            if len(simp) < 4 or ring_area(simp) < 0.6:
                continue
            pts = []
            for lon, lat in simp:
                if lat < LAT_MIN or lat > LAT_MAX:
                    continue
                x, y = to_map(lon, lat)
                pts.append((int(round(x * SCALE)), int(round(y * SCALE))))
            if len(pts) >= 4:
                out.append(pts)
    return out


def encode(rings):
    """Flat integer list: x0 y0 x1 y1 ... Nothing else - the browser needs no
    per-ring bookkeeping beyond the polygon boundary count."""
    flat = []
    for r in rings:
        flat.append(len(r))
        for x, y in r:
            flat.append(x)
            flat.append(y)
    return flat


def main():
    land, kept = build_land()
    lakes = build_lakes()
    payload = {
        'scale': int(SCALE),
        'land': encode(land),
        'lakes': encode(lakes),
    }
    probe = os.path.join(ROOT, 'world-geo.js')
    body = json.dumps(payload, separators=(',', ':'))
    with open(probe, 'w', encoding='utf-8', newline='\n') as f:
        f.write('/* Generated by tools/build-world-geo.py - do not edit by hand.\n')
        f.write(' * Coastlines from Natural Earth 1:50m (public domain), simplified per\n')
        f.write(' * region and packed as  len,x,y,x,y,...  in a 0..%d grid.\n' % SCALE)
        f.write(' *   mapX = (lon + 180) / 360      mapY = (lat + 90) / 180\n')
        f.write(' * same convention as the city mapX/mapY in data.js.\n')
        f.write(' */\n')
        f.write('window.ArtRaceGeo = %s;\n' % body)
    size = os.path.getsize(probe)
    print('land rings   : %d  (%d points)' % (len(land), kept))
    print('lake rings   : %d' % len(lakes))
    print('world-geo.js : %.1f KB' % (size / 1024.0))


if __name__ == '__main__':
    main()
