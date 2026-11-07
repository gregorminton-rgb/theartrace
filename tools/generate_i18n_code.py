import json
import sys
sys.path.insert(0, 'tools')
from test_mapping import GERMAN_TITLES

with open('tools/all_works.json', 'r', encoding='utf-8') as f:
    works = json.load(f)

# Fix typo if any in test_mapping
if 'leonardo_st_john_the_baptist: ' in GERMAN_TITLES:
    del GERMAN_TITLES['leonardo_st_john_the_baptist: ']

missing = []
for w in works:
    wid = w['id']
    if wid not in GERMAN_TITLES:
        missing.append(wid)

if missing:
    print(f"ERROR: {len(missing)} missing works: {missing}")
    sys.exit(1)

print(f"Verified all {len(works)} works have German titles.")

# Check for any quotes issues or formatting
titles_de = {}
titles_en = {}
pairs = []

for w in works:
    wid = w['id']
    en = w['title']
    de = GERMAN_TITLES[wid]
    titles_de[wid] = de
    titles_en[wid] = en
    pairs.append((en, de))

# Generate art-i18n.js code block
lines_art_i18n = []
lines_art_i18n.append("  /* German titles for all 156 catalog artworks */")
lines_art_i18n.append("  var titlesDe = " + json.dumps(titles_de, ensure_ascii=False, indent=2) + ";")
lines_art_i18n.append("  var titlesEn = " + json.dumps(titles_en, ensure_ascii=False, indent=2) + ";")
lines_art_i18n.append("  var titlesByEn = {};")
lines_art_i18n.append("  for (var wid in titlesDe) {")
lines_art_i18n.append("    if (Object.prototype.hasOwnProperty.call(titlesDe, wid)) {")
lines_art_i18n.append("      titlesByEn[titlesEn[wid]] = titlesDe[wid];")
lines_art_i18n.append("    }")
lines_art_i18n.append("  }")
lines_art_i18n.append("""  function workTitle(w, fallback) {
    if (!w && !fallback) return '';
    var id = null, orig = null;
    if (typeof w === 'object' && w) {
      id = w.id;
      orig = w.title;
    } else if (typeof w === 'string') {
      if (titlesDe[w]) id = w;
      else orig = w;
    }
    if (!orig && fallback) orig = fallback;
    if (!de()) return orig || (id && titlesEn[id]) || fallback || id || '';
    if (id && titlesDe[id]) return titlesDe[id];
    if (orig && titlesByEn[orig]) return titlesByEn[orig];
    return orig || (id && titlesEn[id]) || fallback || id || '';
  }
  global.ArtRaceArtI18n.workTitle = workTitle;
  global.ArtRaceArtI18n.titlesDe = titlesDe;
  global.ArtRaceArtI18n.titlesEn = titlesEn;
  if (global.ArtRace) global.ArtRace.workTitle = workTitle;""")

code_art_i18n = "\n".join(lines_art_i18n)
with open('tools/snippet_art_i18n.js', 'w', encoding='utf-8') as f:
    f.write(code_art_i18n)

# Generate language.js pairs block
pairs_js = ",\n".join(f'  [{json.dumps(p[0], ensure_ascii=False)}, {json.dumps(p[1], ensure_ascii=False)}]' for p in pairs)
code_language = "/* Artwork titles (156 masterworks) */\npairs.push(\n" + pairs_js + "\n);\n"
with open('tools/snippet_language_pairs.js', 'w', encoding='utf-8') as f:
    f.write(code_language)

print("Generated snippet_art_i18n.js and snippet_language_pairs.js successfully!")
