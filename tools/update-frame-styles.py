with open('styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

target = """.av-plate { margin: 0 0 .8em; background: #241a10; border: 1px solid #5a4a30; border-radius: 3px; padding: 8px; box-shadow: 0 6px 22px rgba(20,10,0,.45); }
.av-plate img { display: block; width: 100%; height: auto; max-height: 58vh; object-fit: contain; background: #1b130c; }
.av-plate figcaption { margin-top: .45em; font-family: var(--sans); font-size: .62rem; letter-spacing: .04em; text-transform: uppercase; color: #cbb78f; text-align: center; }
.av-plate--missing { display: flex; align-items: center; justify-content: center; min-height: 220px; color: #cbb78f; font-family: var(--sans); font-size: .8rem; }"""

replacement = """/* Museum-grade in-game framing system */
.av-plate { margin: 0 0 .9em; background: #18110b; border: 1px solid #4a3319; border-radius: 4px; padding: 12px; box-shadow: 0 10px 30px rgba(10, 5, 0, 0.65), 0 2px 8px rgba(0, 0, 0, 0.4); display: flex; flex-direction: column; align-items: center; box-sizing: border-box; }
.av-plate img { display: block; width: 100%; height: auto; max-height: 56vh; object-fit: contain; background: #0f0a06; }
.av-plate figcaption { margin-top: .45em; font-family: var(--sans); font-size: .62rem; letter-spacing: .04em; text-transform: uppercase; color: #cbb78f; text-align: center; }
.av-plate--missing { display: flex; align-items: center; justify-content: center; min-height: 220px; color: #cbb78f; font-family: var(--sans); font-size: .8rem; }

.art-frame-moulding {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #7c5a24 0%, #caa452 20%, #68481a 40%, #e6cf8a 65%, #5a3c12 85%, #8c6a2e 100%);
  border: 1px solid #4a300d;
  border-radius: 3px;
  box-shadow: inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -2px 6px rgba(0,0,0,0.6), 0 4px 14px rgba(0,0,0,0.45);
  box-sizing: border-box;
}
.art-frame-mat {
  background: #160f0a;
  padding: 8px;
  border: 2px solid #b38b3f;
  box-shadow: inset 0 3px 12px rgba(0,0,0,0.85), 0 1px 2px rgba(255,255,255,0.2);
  box-sizing: border-box;
}
.art-frame-canvas {
  position: relative;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #0f0a06;
  box-shadow: inset 0 0 10px rgba(0,0,0,0.9);
  width: 100%;
}
.art-frame-canvas img {
  display: block;
  width: 100%;
  height: auto;
  max-height: 56vh;
  object-fit: contain;
  transition: transform 0.08s ease-out;
}
.art-museum-plaque {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  margin-top: 10px;
  padding: 5px 28px;
  background: linear-gradient(180deg, #f0d588 0%, #d4ad4b 45%, #e8cb79 55%, #b3882f 100%);
  border: 1px solid #7c5812;
  border-radius: 2px;
  box-shadow: 0 3px 8px rgba(0,0,0,0.45), inset 0 1px 1px rgba(255,255,255,0.7), inset 0 -1px 2px rgba(0,0,0,0.3);
  text-align: center;
  user-select: none;
}
.art-museum-plaque::before,
.art-museum-plaque::after {
  content: "•";
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 13px;
  line-height: 1;
  color: #5c3f0f;
  text-shadow: 0 1px 0 rgba(255,255,255,0.5);
}
.art-museum-plaque::before { left: 8px; }
.art-museum-plaque::after { right: 8px; }

.plaque-artist {
  font-family: var(--serif, Georgia, serif);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #2b1c06;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.4);
  line-height: 1.2;
}
.plaque-title {
  font-family: var(--serif, Georgia, serif);
  font-style: italic;
  font-size: 0.68rem;
  color: #4a3411;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
  line-height: 1.2;
  margin-top: 1px;
}

/* Gilded frame accents on gallery tiles & auction thumbnails */
.portfolio-gallery-tile img {
  border: 2px solid #b8974a;
  outline: 1px solid #4a3210;
  box-shadow: 0 2px 6px rgba(0,0,0,0.35);
  border-radius: 2px;
  background: #150e08;
}
.auc-preview-art-thumb {
  border: 2.5px solid #c8a355 !important;
  outline: 1px solid #4a300e;
  box-shadow: 0 3px 8px rgba(0,0,0,0.4), inset 0 0 6px rgba(0,0,0,0.6) !important;
  background: #18110a;
}
.thumb-art {
  border: 1.5px solid #b8974a !important;
  box-shadow: 0 2px 5px rgba(0,0,0,0.35) !important;
  border-radius: 3px;
  background: #160f09;
}"""

css_norm = css.replace('\r\n', '\n')
target_norm = target.replace('\r\n', '\n')
assert target_norm in css_norm, "target not found in styles.css"

css_replaced = css_norm.replace(target_norm, replacement.replace('\r\n', '\n'))
if '\r\n' in css:
    css_replaced = css_replaced.replace('\n', '\r\n')

with open('styles.css', 'w', encoding='utf-8') as f:
    f.write(css_replaced)

print("Updated styles.css with in-game museum framing system successfully.")
