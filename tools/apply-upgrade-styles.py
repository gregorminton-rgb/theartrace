with open('styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

target = '''.plot-pips-group {
  display: flex;
  gap: 2px;
}
.plot-level-star {
  font-size: 0.70rem;
  color: #ffca28;
  text-shadow: 0 1px 2px rgba(0,0,0,0.7);
}'''

replacement = '''/* Plantation field levels & visual upgrade gimmicks */
.plot-farm-head-left, .plot-farm-head-right {
  display: flex;
  align-items: center;
  gap: 3px;
}
.plot-lvl-badge {
  display: inline-flex;
  align-items: center;
  font-family: var(--sans, sans-serif);
  font-size: 0.60rem;
  font-weight: 800;
  padding: 1px 4px;
  border-radius: 4px;
  line-height: 1.1;
  text-shadow: 0 1px 2px rgba(0,0,0,0.6);
  pointer-events: auto;
}
.plot-lvl-badge.lvl-1 {
  background: rgba(2, 136, 209, 0.85);
  color: #e1f5fe;
  border: 1px solid #4fc3f7;
}
.plot-lvl-badge.lvl-2 {
  background: rgba(46, 125, 50, 0.88);
  color: #f1f8e9;
  border: 1px solid #81c784;
}
.plot-lvl-badge.lvl-3 {
  background: linear-gradient(135deg, #b71c1c, #d32f2f);
  color: #fff9c4;
  border: 1px solid #ffd54f;
  box-shadow: 0 0 6px rgba(255, 213, 79, 0.5);
}

.plot.plot--level-1 {
  border-color: #0288d1;
  box-shadow: 0 3px 10px rgba(2, 136, 209, 0.35), inset 0 0 10px rgba(3, 169, 244, 0.22);
}
.plot.plot--level-2 {
  border-color: #43a047;
  box-shadow: 0 3px 12px rgba(67, 160, 71, 0.4), inset 0 0 12px rgba(76, 175, 80, 0.28);
}
.plot.plot--level-3 {
  border-color: #ffb300;
  box-shadow: 0 4px 16px rgba(255, 179, 0, 0.45), inset 0 0 14px rgba(255, 193, 7, 0.32);
}
.plot.plot--level-3::after {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0 16px 16px 0;
  border-color: transparent #ffd54f transparent transparent;
  z-index: 3;
  pointer-events: none;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
}

.plot-pips-group {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  background: rgba(0, 0, 0, 0.55);
  padding: 1px 4px;
  border-radius: 4px;
}
.plot-pips-group.empty-pips {
  margin-top: 4px;
  background: rgba(0, 0, 0, 0.65);
}
.plot-level-star {
  font-size: 0.72rem;
  color: #ffd54f;
  text-shadow: 0 1px 3px rgba(0,0,0,0.8), 0 0 4px rgba(255, 213, 79, 0.6);
  line-height: 1;
  display: inline-block;
}
.plot-level-star.lvl-1 {
  color: #81d4fa;
  text-shadow: 0 1px 2px rgba(0,0,0,0.8), 0 0 4px #0288d1;
}
.plot-level-star.lvl-2 {
  color: #aed581;
  text-shadow: 0 1px 2px rgba(0,0,0,0.8), 0 0 4px #43a047;
}
.plot-level-star.lvl-3 {
  color: #ffd54f;
  text-shadow: 0 1px 3px rgba(0,0,0,0.8), 0 0 6px #ffb300, 0 0 10px #ff6f00;
  animation: starPulse 1.8s infinite ease-in-out;
}
@keyframes starPulse {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 2px #ffb300); }
  50% { transform: scale(1.22); filter: drop-shadow(0 0 6px #ffd54f); }
}

.field-upgrade-water {
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
}
.field-upgrade-fertiliser {
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
}
.field-upgrade-shed {
  filter: drop-shadow(0 2px 3px rgba(0,0,0,0.6));
}'''

assert target in css, "target not found in styles.css"
css = css.replace(target, replacement)

with open('styles.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Updated styles.css successfully.")
