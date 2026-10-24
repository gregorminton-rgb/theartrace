# =============================================================================
# tools/split-app.py - one-shot helper that carved app.js into the app-*.js
# modules. The old app.js was a single IIFE, so every name resolved through the
# closure; each module now gets the same prelude instead:
#
#     var A = window.ArtRace;
#     var G = window.ArtRaceGame.G;          # the one state object
#     var CFG = A.shared.CFG;                # el, h, show, MONTHS, dateOf, log, rep
#
# Functions stay declarations (hoisted), so a module can still call a helper it
# has not reached yet. Plain <script> order keeps working, dependency free.
#
# Kept for the record - app.js no longer exists, so do not re-run it.
# =============================================================================
import io
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# file -> (label, [(first, last) 1-based inclusive ranges of the ORIGINAL app.js])
PLAN = [
    ('app-core.js', 'state, helpers, actions, clock, render entry', [(1, 623)]),
    ('app-art.js', 'pictures and backdrops', [(624, 705)]),
    ('app-colonies.js', 'colonies, crops, plantations', [(706, 861), (1032, 1408)]),
    ('app-map.js', 'world map wiring', [(862, 1031)]),
    ('app-trade.js', 'market, panel, trade views', [(1409, 1735)]),
    ('app-shell.js', 'dialogs, title, wiring, boot', [(1736, 2057)]),
]

OTHER_PRELUDE = [
    '  var A = window.ArtRace;',
    '  var G = window.ArtRaceGame.G;',
    '  var CFG = A.shared.CFG;',
    '  var el = A.shared.el, h = A.shared.h, show = A.shared.show;',
    '  var MONTHS = A.shared.MONTHS, dateOf = A.shared.dateOf;',
    '  var log = A.shared.log, rep = A.shared.rep;',
    '',
]


def read(path):
    with io.open(path, encoding='utf-8-sig') as fh:
        return fh.read().replace('\r\n', '\n')


def write(path, text):
    with io.open(path, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(text)


def main(argv):
    dry = '--dry' in argv
    src = os.path.join(ROOT, 'app.js')
    lines = read(src).split('\n')
    if lines and lines[-1] == '':
        lines.pop()
    total = len(lines)

    covered = {}
    for name, _label, blocks in PLAN:
        for first, last in blocks:
            for ln in range(first, last + 1):
                if ln in covered:
                    sys.exit('line %d claimed twice' % ln)
                covered[ln] = name

    missing = [str(ln) for ln in range(1, total + 1)
               if ln not in covered and lines[ln - 1].strip()]
    if missing:
        sys.exit('unclaimed code lines: ' + ', '.join(missing))

    decls = 0
    for ln, line in enumerate(lines, 1):
        stripped = line[2:]
        if line.startswith('  ') and (stripped.startswith('var ') or stripped.startswith('function ')):
            decls += 1
            if ln not in covered:
                sys.exit('declaration at line %d is in no module' % ln)

    for name, label, blocks in PLAN:
        body = []
        for first, last in blocks:
            body.extend(lines[first - 1:last])
        head = [
            '/* ' + '=' * 73,
            ' * ' + name + ' \u2014 ' + label + '.',
            ' * Split out of the former single-file app.js. The load order in',
            ' * index.html is fixed: app-core.js first, because it owns G.',
            ' * ' + '=' * 73 + ' */',
            '(function () {',
            "  'use strict';",
            '',
        ]
        if name != 'app-core.js':
            head.extend(OTHER_PRELUDE)
        text = '\n'.join(head + body + ['})();', ''])
        print(('' if not dry else '[dry] ') + name.ljust(18) + '%4d lines' % len(body))
        if not dry:
            write(os.path.join(ROOT, name), text)
    print('source lines %d / declarations %d' % (total, decls))


if __name__ == '__main__':
    main(sys.argv[1:])
