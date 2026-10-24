# =============================================================================
# tools/check-braces.py - rough lexer that reports where a JS file's brackets
# stop balancing. Only used while splitting app.js; not part of the game.
#   python tools/check-braces.py app-art.js app-colonies.js app-shell.js
# =============================================================================
import io
import sys


def scan(path):
    s = io.open(path, encoding='utf-8').read()
    depth = 0
    line = 1
    instr = None
    esc = False
    com = None
    first_neg = None
    i = 0
    n = len(s)
    while i < n:
        c = s[i]
        if c == '\n':
            line += 1
        if com == 'line':
            if c == '\n':
                com = None
            i += 1
            continue
        if com == 'block':
            if c == '*' and i + 1 < n and s[i + 1] == '/':
                com = None
                i += 2
                continue
            i += 1
            continue
        if instr:
            if esc:
                esc = False
            elif c == '\\':
                esc = True
            elif c == instr:
                instr = None
            i += 1
            continue
        if c == '/' and i + 1 < n and s[i + 1] == '/':
            com = 'line'
            i += 2
            continue
        if c == '/' and i + 1 < n and s[i + 1] == '*':
            com = 'block'
            i += 2
            continue
        if c in '"\'':
            instr = c
            i += 1
            continue
        if c in '{[(':
            depth += 1
            stack.append((c, line))
        elif c in '}])':
            depth -= 1
            if stack:
                stack.pop()
            if depth < 0 and first_neg is None:
                first_neg = (line, s[max(0, i - 200):i + 100])
        i += 1
    print('%s: depth=%d open=%s comment=%s string=%s' % (
        path, depth, stack[-4:], com, instr))
    if first_neg:
        print('  first negative at line %d:' % first_neg[0])
        print('  ...' + first_neg[1].replace('\n', '\n  '))


for arg in sys.argv[1:]:
    stack = []
    scan(arg)
