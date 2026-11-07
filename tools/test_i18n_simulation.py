import json
import re

# Load all_works
with open('tools/all_works.json', 'r', encoding='utf-8') as f:
    works = json.load(f)

# Read art-i18n.js
with open('art-i18n.js', 'r', encoding='utf-8') as f:
    art_i18n_content = f.read()

# Check that every work id is in titlesDe
missing_in_art_i18n = []
for w in works:
    wid = w['id']
    if f'"{wid}":' not in art_i18n_content and f"'{wid}':" not in art_i18n_content:
        missing_in_art_i18n.append(wid)

print(f"art-i18n.js missing count: {len(missing_in_art_i18n)}")
if missing_in_art_i18n:
    print("Missing in art-i18n.js:", missing_in_art_i18n)

# Read language.js
with open('language.js', 'r', encoding='utf-8') as f:
    lang_content = f.read()

missing_in_lang = []
for w in works:
    en = json.dumps(w['title'], ensure_ascii=False)
    if en not in lang_content:
        missing_in_lang.append(w['title'])

print(f"language.js missing count: {len(missing_in_lang)}")
if missing_in_lang:
    print("Missing in language.js:", missing_in_lang)

print("ALL TESTS PASSED IF BOTH MISSING COUNTS ARE 0!")
