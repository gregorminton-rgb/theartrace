import re

with open('app-colonies.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Define the new farmFieldSVG, farmEmptySoilSVG, and colonyPlotHTML functions
new_section = '''  /* Rich Hay Day Farmland SVG diorama with crop-specific foliage, fruits, tilled soil and visible upgrades */
  function farmFieldSVG(crop, f, pct) {
    var isRipe = f.ripe;
    var grown = Math.max(0.18, Math.min(1, pct / 100));
    var id = f.id;
    var lvl = f.level || 0;

    var svg = '<svg class="plot-farm-svg" viewBox="0 0 100 68" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">';
    svg += '<defs>';
    svg += '<linearGradient id="farmSoil' + id + '" x1="0" y1="0" x2="0" y2="1">';
    svg += '<stop offset="0%" stop-color="#4e3118"/>';
    svg += '<stop offset="50%" stop-color="#38210e"/>';
    svg += '<stop offset="100%" stop-color="#281608"/>';
    svg += '</linearGradient>';
    svg += '</defs>';

    // Soil bed
    svg += '<rect x="1" y="2" width="98" height="64" rx="6" fill="url(#farmSoil' + id + ')"/>';

    // Upgrade Stufe 2+: Rich nutrient-fertilised dark soil patches
    if (lvl >= 2) {
      svg += '<ellipse cx="28" cy="22" rx="14" ry="3" fill="#150802" opacity="0.6"/>';
      svg += '<ellipse cx="72" cy="37" rx="15" ry="3" fill="#150802" opacity="0.6"/>';
      svg += '<ellipse cx="44" cy="52" rx="16" ry="3" fill="#150802" opacity="0.6"/>';
    }

    // 3D Furrows (Ackerfurchen)
    for (var row = 0; row < 3; row++) {
      var fy = 20 + row * 15;
      svg += '<path d="M 4 ' + fy + ' Q 50 ' + (fy + 4) + ' 96 ' + fy + '" stroke="#1f0f04" stroke-width="3" fill="none" opacity="0.85"/>';
      svg += '<path d="M 4 ' + (fy - 1) + ' Q 50 ' + (fy + 3) + ' 96 ' + (fy - 1) + '" stroke="#5a381b" stroke-width="1.1" fill="none" opacity="0.6"/>';
    }

    // Upgrade Stufe 1+: Glistening irrigation water rills along the furrows
    if (lvl >= 1) {
      for (var wRow = 0; wRow < 3; wRow++) {
        var wy = 21 + wRow * 15;
        svg += '<path d="M 6 ' + wy + ' Q 50 ' + (wy + 4) + ' 94 ' + wy + '" stroke="#0288d1" stroke-width="2.2" fill="none" opacity="0.72" stroke-linecap="round"/>';
        svg += '<path d="M 7 ' + (wy - 0.6) + ' Q 50 ' + (wy + 3.4) + ' 93 ' + (wy - 0.6) + '" stroke="#81d4fa" stroke-width="0.8" fill="none" opacity="0.9" stroke-linecap="round" stroke-dasharray="10 5"/>';
      }
    }

    // Upgrade Stufe 2+: Bamboo / wooden plant support stakes (Rankstangen) behind foliage
    if (lvl >= 2) {
      var stakeCoords = [[24, 7, 26, 26], [48, 6, 50, 25], [72, 7, 74, 26], [36, 22, 38, 41], [60, 21, 62, 40]];
      for (var si = 0; si < stakeCoords.length; si++) {
        var sc = stakeCoords[si];
        svg += '<line x1="' + sc[0] + '" y1="' + sc[1] + '" x2="' + sc[2] + '" y2="' + sc[3] + '" stroke="#8d6e63" stroke-width="1.1" stroke-linecap="round"/>';
        svg += '<circle cx="' + sc[0] + '" cy="' + sc[1] + '" r="0.7" fill="#d7ccc8"/>';
      }
    }

    // Crops rendering based on type
    if (crop.id === 'kakao') {
      for (var r0 = 0; r0 < 3; r0++) {
        var cy0 = 16 + r0 * 15;
        for (var c0 = 0; c0 < 4; c0++) {
          var cx0 = 15 + c0 * 24;
          var leafH0 = 4 + grown * 8;
          svg += '<ellipse cx="' + (cx0 - 3) + '" cy="' + (cy0 - leafH0/2) + '" rx="' + (2.5 + grown * 3.5) + '" ry="' + (2 + grown * 2.5) + '" fill="#2e7d32" transform="rotate(-22 ' + (cx0 - 3) + ' ' + (cy0 - leafH0/2) + ')"/>';
          svg += '<ellipse cx="' + (cx0 + 3) + '" cy="' + (cy0 - leafH0/2) + '" rx="' + (2.5 + grown * 3.5) + '" ry="' + (2 + grown * 2.5) + '" fill="#388e3c" transform="rotate(22 ' + (cx0 + 3) + ' ' + (cy0 - leafH0/2) + ')"/>';
          if (grown > 0.6 || isRipe) {
            var podColor = isRipe ? '#b7410e' : '#a0522d';
            svg += '<path d="M ' + cx0 + ' ' + (cy0 - 2) + ' q -2.5 3.5 0 8 q 2.5 -4.5 0 -8" fill="' + podColor + '" stroke="#5c2606" stroke-width="0.7"/>';
            if (isRipe) svg += '<circle cx="' + (cx0 - 0.7) + '" cy="' + (cy0 + 1) + '" r="0.7" fill="#ffb74d"/>';
          }
        }
      }
    } else if (crop.id === 'kaffee') {
      for (var r1 = 0; r1 < 3; r1++) {
        var cy1 = 16 + r1 * 15;
        for (var c1 = 0; c1 < 5; c1++) {
          var cx1 = 12 + c1 * 19;
          var rSize1 = 2.5 + grown * 4.5;
          svg += '<circle cx="' + cx1 + '" cy="' + cy1 + '" r="' + rSize1 + '" fill="#1b5e20" opacity="0.95"/>';
          svg += '<circle cx="' + (cx1 + 2) + '" cy="' + (cy1 - 2) + '" r="' + (rSize1 * 0.75) + '" fill="#2e7d32" opacity="0.9"/>';
          if (grown > 0.5 || isRipe) {
            var red1 = isRipe ? '#d32f2f' : '#8bc34a';
            svg += '<circle cx="' + (cx1 - 2) + '" cy="' + (cy1 + 1) + '" r="1.5" fill="' + red1 + '"/>';
            svg += '<circle cx="' + (cx1 + 2) + '" cy="' + (cy1 + 2) + '" r="1.3" fill="' + (isRipe ? '#b71c1c' : '#7cb342') + '"/>';
            if (isRipe) {
              svg += '<circle cx="' + cx1 + '" cy="' + (cy1 - 1) + '" r="1.4" fill="#ff1744"/>';
              svg += '<circle cx="' + (cx1 - 0.4) + '" cy="' + (cy1 - 1.4) + '" r="0.5" fill="#fff"/>';
            }
          }
        }
      }
    } else if (crop.id === 'tabak') {
      for (var r2 = 0; r2 < 3; r2++) {
        var cy2 = 18 + r2 * 15;
        for (var c2 = 0; c2 < 4; c2++) {
          var cx2 = 16 + c2 * 23;
          var leafH2 = 4 + grown * 10;
          var tColor1 = isRipe ? '#9e9d24' : '#558b2f';
          var tColor2 = isRipe ? '#c0ca33' : '#689f38';
          svg += '<path d="M ' + cx2 + ' ' + (cy2 + 2) + ' Q ' + (cx2 - 5) + ' ' + (cy2 - leafH2/2) + ' ' + (cx2 - 7) + ' ' + (cy2 - leafH2) + ' Q ' + (cx2 - 1.5) + ' ' + (cy2 - leafH2/2) + ' ' + cx2 + ' ' + (cy2 + 2) + '" fill="' + tColor1 + '"/>';
          svg += '<path d="M ' + cx2 + ' ' + (cy2 + 2) + ' Q ' + (cx2 + 5) + ' ' + (cy2 - leafH2/2) + ' ' + (cx2 + 7) + ' ' + (cy2 - leafH2) + ' Q ' + (cx2 + 1.5) + ' ' + (cy2 - leafH2/2) + ' ' + cx2 + ' ' + (cy2 + 2) + '" fill="' + tColor2 + '"/>';
          svg += '<path d="M ' + cx2 + ' ' + (cy2 + 2) + ' Q ' + cx2 + ' ' + (cy2 - leafH2/2) + ' ' + cx2 + ' ' + (cy2 - leafH2 - 1.5) + '" stroke="' + (isRipe ? '#fbc02d' : '#8bc34a') + '" stroke-width="0.9" fill="none"/>';
        }
      }
    } else if (crop.id === 'tee') {
      for (var r3 = 0; r3 < 3; r3++) {
        var cy3 = 16 + r3 * 15;
        var wH3 = 3.5 + grown * 6;
        svg += '<ellipse cx="50" cy="' + cy3 + '" rx="44" ry="' + wH3 + '" fill="#2e7d32" opacity="0.9"/>';
        svg += '<ellipse cx="48" cy="' + (cy3 - 2) + '" rx="42" ry="' + (wH3 * 0.8) + '" fill="#388e3c" opacity="0.95"/>';
        if (grown > 0.4 || isRipe) {
          for (var c3 = 0; c3 < 6; c3++) {
            var tx3 = 16 + c3 * 14;
            svg += '<path d="M ' + tx3 + ' ' + (cy3 - 1) + ' q -2 -3.5 0 -6.5 q 2 3 0 6.5" fill="' + (isRipe ? '#aed581' : '#81c784') + '"/>';
            svg += '<path d="M ' + (tx3 + 2.5) + ' ' + (cy3 - 1) + ' q 2 -3.5 0 -6.5 q -2 3 0 6.5" fill="' + (isRipe ? '#c5e1a5' : '#a5d6a7') + '"/>';
          }
        }
      }
    } else {
      // Stoffe (Cotton)
      for (var r4 = 0; r4 < 3; r4++) {
        var cy4 = 16 + r4 * 15;
        for (var c4 = 0; c4 < 5; c4++) {
          var cx4 = 13 + c4 * 18;
          var plantH4 = 3.5 + grown * 8;
          svg += '<path d="M ' + cx4 + ' ' + cy4 + ' L ' + cx4 + ' ' + (cy4 - plantH4) + '" stroke="#4e342e" stroke-width="1.3"/>';
          svg += '<circle cx="' + (cx4 - 2.5) + '" cy="' + (cy4 - plantH4 * 0.6) + '" r="' + (1.2 + grown * 1.8) + '" fill="#33691e"/>';
          svg += '<circle cx="' + (cx4 + 2.5) + '" cy="' + (cy4 - plantH4 * 0.6) + '" r="' + (1.2 + grown * 1.8) + '" fill="#33691e"/>';
          if (grown > 0.6 || isRipe) {
            var bSize4 = isRipe ? 3.0 : 2.0;
            svg += '<circle cx="' + cx4 + '" cy="' + (cy4 - plantH4 - 1) + '" r="' + bSize4 + '" fill="#ffffff" stroke="#e0e0e0" stroke-width="0.5"/>';
            svg += '<circle cx="' + (cx4 - 1.2) + '" cy="' + (cy4 - plantH4) + '" r="' + (bSize4 * 0.75) + '" fill="#f5f5f5"/>';
            svg += '<circle cx="' + (cx4 + 1.2) + '" cy="' + (cy4 - plantH4) + '" r="' + (bSize4 * 0.75) + '" fill="#fafafa"/>';
          }
        }
      }
    }

    // Upgrade Stufe 1+: Rustic wooden water barrel & trough (corner gimmick)
    if (lvl >= 1) {
      svg += '<g class="field-upgrade-water">' +
        '<ellipse cx="6" cy="12.5" rx="3.5" ry="1.2" fill="#000" opacity="0.3"/>' +
        '<path d="M 3.2 6.5 Q 2.8 9.5 3.2 12.5 L 8.8 12.5 Q 9.2 9.5 8.8 6.5 Z" fill="#5d4037" stroke="#3e2723" stroke-width="0.5"/>' +
        '<path d="M 3 8.2 Q 6 8.9 9 8.2" stroke="#78909c" stroke-width="0.5" fill="none"/>' +
        '<path d="M 3.1 10.8 Q 6 11.5 8.9 10.8" stroke="#78909c" stroke-width="0.5" fill="none"/>' +
        '<ellipse cx="6" cy="6.5" rx="2.8" ry="1" fill="#29b6f6"/>' +
        '<ellipse cx="5.2" cy="6.3" rx="0.9" ry="0.4" fill="#e1f5fe"/>' +
        '<circle cx="9.2" cy="5.2" r="0.7" fill="#4fc3f7" opacity="0.9"/>' +
      '</g>';
    }

    // Upgrade Stufe 2+: Tied burlap fertiliser sack with leaf emblem
    if (lvl >= 2) {
      svg += '<g class="field-upgrade-fertiliser">' +
        '<ellipse cx="91.5" cy="63" rx="3.5" ry="1.2" fill="#000" opacity="0.35"/>' +
        '<path d="M 88.5 54.5 Q 87 58.5 88.5 62 Q 91.5 63 94.5 62 Q 96 58.5 94.5 54.5 Q 92.5 53.5 90.5 53.5 Z" fill="#d7ccc8" stroke="#8d6e63" stroke-width="0.5"/>' +
        '<path d="M 90 53.5 Q 91.5 52.5 93 53.5" stroke="#5d4037" stroke-width="0.7" fill="none"/>' +
        '<polygon points="89.5,52.5 91.5,54 93.5,52.5" fill="#bcaaa4"/>' +
        '<path d="M 91.5 57 Q 93 58.5 91.5 60.5 Q 90 58.5 91.5 57" fill="#4caf50"/>' +
      '</g>';
    }

    // Upgrade Stufe 3+: Colonial storage shed with red gabled roof, plank walls & harvest crates
    if (lvl >= 3) {
      svg += '<g class="field-upgrade-shed">' +
        '<rect x="79" y="14" width="18" height="2" rx="1" fill="#000" opacity="0.35"/>' +
        '<rect x="80" y="6" width="16" height="9" fill="#8d6e63" stroke="#4e342e" stroke-width="0.5" rx="0.5"/>' +
        '<line x1="80" y1="9" x2="96" y2="9" stroke="#5d4037" stroke-width="0.3"/>' +
        '<line x1="80" y1="12" x2="96" y2="12" stroke="#5d4037" stroke-width="0.3"/>' +
        '<rect x="85.5" y="8" width="5" height="7" rx="0.4" fill="#2d1b10"/>' +
        '<polygon points="79,6.5 88,1.5 97,6.5" fill="#c62828" stroke="#8e0000" stroke-width="0.6"/>' +
        '<polygon points="80,6.2 88,1.8 96,6.2" fill="#d32f2f"/>' +
        '<rect x="74" y="10" width="5" height="5" fill="#bcaaa4" stroke="#5d4037" stroke-width="0.4"/>' +
        '<line x1="74" y1="10" x2="79" y2="15" stroke="#795548" stroke-width="0.3"/>' +
        '<line x1="74" y1="15" x2="79" y2="10" stroke="#795548" stroke-width="0.3"/>' +
        '<rect x="75" y="6.5" width="4" height="4" fill="#a1887f" stroke="#5d4037" stroke-width="0.4"/>' +
        '<line x1="88" y1="1.5" x2="88" y2="-0.8" stroke="#ffd54f" stroke-width="0.5"/>' +
        '<polygon points="88,-0.8 90.5,-0.2 88,0.4" fill="#ffd54f"/>' +
      '</g>';
    }

    // Workers on the field
    var seen = Math.max(0, Math.min(f.workers, 4));
    var poses = [['stand', 'm1'], ['pick', 'f2'], ['stand', 'f3'], ['pick', 'm4']];
    for (var w = 0; w < seen; w++) {
      var pose = poses[w % poses.length];
      var kind = isRipe ? 'stand' : 'pick';
      var file = 'images/sprites/worker-' + kind + '-' + pose[1] + '.png';
      var px = 14 + w * 22;
      var delay = (w * 0.6).toFixed(1);
      svg += '<g class="field-worker" style="animation-delay:' + delay + 's">';
      svg += '<image href="' + file + '" x="' + px + '" y="16" width="20" height="38" preserveAspectRatio="xMidYMax meet"/>';
      svg += '</g>';
    }

    svg += '</svg>';
    return svg;
  }

  function farmEmptySoilSVG(lvl) {
    lvl = lvl || 0;
    var svg = '<svg class="plot-farm-svg" viewBox="0 0 100 68" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' +
        '<linearGradient id="emptySoilGrad" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="#462b16"/>' +
          '<stop offset="50%" stop-color="#321d0d"/>' +
          '<stop offset="100%" stop-color="#241306"/>' +
        '</linearGradient>' +
      '</defs>' +
      '<rect x="1" y="2" width="98" height="64" rx="6" fill="url(#emptySoilGrad)"/>';

    if (lvl >= 2) {
      svg += '<ellipse cx="28" cy="22" rx="14" ry="3" fill="#150802" opacity="0.6"/>';
      svg += '<ellipse cx="72" cy="37" rx="15" ry="3" fill="#150802" opacity="0.6"/>';
      svg += '<ellipse cx="44" cy="52" rx="16" ry="3" fill="#150802" opacity="0.6"/>';
    }

    svg += '<path d="M 4 20 Q 50 24 96 20" stroke="#1d0e04" stroke-width="3" fill="none" opacity="0.8"/>' +
           '<path d="M 4 36 Q 50 40 96 36" stroke="#1d0e04" stroke-width="3" fill="none" opacity="0.8"/>' +
           '<path d="M 4 52 Q 50 56 96 52" stroke="#1d0e04" stroke-width="3" fill="none" opacity="0.8"/>';

    if (lvl >= 1) {
      for (var wRow = 0; wRow < 3; wRow++) {
        var wy = 21 + wRow * 15;
        svg += '<path d="M 6 ' + wy + ' Q 50 ' + (wy + 4) + ' 94 ' + wy + '" stroke="#0288d1" stroke-width="2.2" fill="none" opacity="0.72" stroke-linecap="round"/>';
        svg += '<path d="M 7 ' + (wy - 0.6) + ' Q 50 ' + (wy + 3.4) + ' 93 ' + (wy - 0.6) + '" stroke="#81d4fa" stroke-width="0.8" fill="none" opacity="0.9" stroke-linecap="round" stroke-dasharray="10 5"/>';
      }
      svg += '<g class="field-upgrade-water">' +
        '<ellipse cx="6" cy="12.5" rx="3.5" ry="1.2" fill="#000" opacity="0.3"/>' +
        '<path d="M 3.2 6.5 Q 2.8 9.5 3.2 12.5 L 8.8 12.5 Q 9.2 9.5 8.8 6.5 Z" fill="#5d4037" stroke="#3e2723" stroke-width="0.5"/>' +
        '<path d="M 3 8.2 Q 6 8.9 9 8.2" stroke="#78909c" stroke-width="0.5" fill="none"/>' +
        '<path d="M 3.1 10.8 Q 6 11.5 8.9 10.8" stroke="#78909c" stroke-width="0.5" fill="none"/>' +
        '<ellipse cx="6" cy="6.5" rx="2.8" ry="1" fill="#29b6f6"/>' +
        '<ellipse cx="5.2" cy="6.3" rx="0.9" ry="0.4" fill="#e1f5fe"/>' +
        '<circle cx="9.2" cy="5.2" r="0.7" fill="#4fc3f7" opacity="0.9"/>' +
      '</g>';
    }

    if (lvl >= 2) {
      var stakeCoords = [[24, 7, 26, 26], [48, 6, 50, 25], [72, 7, 74, 26], [36, 22, 38, 41], [60, 21, 62, 40]];
      for (var si = 0; si < stakeCoords.length; si++) {
        var sc = stakeCoords[si];
        svg += '<line x1="' + sc[0] + '" y1="' + sc[1] + '" x2="' + sc[2] + '" y2="' + sc[3] + '" stroke="#8d6e63" stroke-width="1.1" stroke-linecap="round"/>';
        svg += '<circle cx="' + sc[0] + '" cy="' + sc[1] + '" r="0.7" fill="#d7ccc8"/>';
      }
      svg += '<g class="field-upgrade-fertiliser">' +
        '<ellipse cx="91.5" cy="63" rx="3.5" ry="1.2" fill="#000" opacity="0.35"/>' +
        '<path d="M 88.5 54.5 Q 87 58.5 88.5 62 Q 91.5 63 94.5 62 Q 96 58.5 94.5 54.5 Q 92.5 53.5 90.5 53.5 Z" fill="#d7ccc8" stroke="#8d6e63" stroke-width="0.5"/>' +
        '<path d="M 90 53.5 Q 91.5 52.5 93 53.5" stroke="#5d4037" stroke-width="0.7" fill="none"/>' +
        '<polygon points="89.5,52.5 91.5,54 93.5,52.5" fill="#bcaaa4"/>' +
        '<path d="M 91.5 57 Q 93 58.5 91.5 60.5 Q 90 58.5 91.5 57" fill="#4caf50"/>' +
      '</g>';
    }

    if (lvl >= 3) {
      svg += '<g class="field-upgrade-shed">' +
        '<rect x="79" y="14" width="18" height="2" rx="1" fill="#000" opacity="0.35"/>' +
        '<rect x="80" y="6" width="16" height="9" fill="#8d6e63" stroke="#4e342e" stroke-width="0.5" rx="0.5"/>' +
        '<line x1="80" y1="9" x2="96" y2="9" stroke="#5d4037" stroke-width="0.3"/>' +
        '<line x1="80" y1="12" x2="96" y2="12" stroke="#5d4037" stroke-width="0.3"/>' +
        '<rect x="85.5" y="8" width="5" height="7" rx="0.4" fill="#2d1b10"/>' +
        '<polygon points="79,6.5 88,1.5 97,6.5" fill="#c62828" stroke="#8e0000" stroke-width="0.6"/>' +
        '<polygon points="80,6.2 88,1.8 96,6.2" fill="#d32f2f"/>' +
        '<rect x="74" y="10" width="5" height="5" fill="#bcaaa4" stroke="#5d4037" stroke-width="0.4"/>' +
        '<line x1="74" y1="10" x2="79" y2="15" stroke="#795548" stroke-width="0.3"/>' +
        '<line x1="74" y1="15" x2="79" y2="10" stroke="#795548" stroke-width="0.3"/>' +
        '<rect x="75" y="6.5" width="4" height="4" fill="#a1887f" stroke="#5d4037" stroke-width="0.4"/>' +
        '<line x1="88" y1="1.5" x2="88" y2="-0.8" stroke="#ffd54f" stroke-width="0.5"/>' +
        '<polygon points="88,-0.8 90.5,-0.2 88,0.4" fill="#ffd54f"/>' +
      '</g>';
    }

    svg += '</svg>';
    return svg;
  }

  function colonyPlotHTML(i) {
    var colony = COLONY_BY_ID[G.colonyId];
    if (!colony) return '';
    var f = plotField(i);
    var p = crew.ownedPlot ? crew.ownedPlot(G.colonyId, i) : null;
    var german = window.ArtRaceLanguage && window.ArtRaceLanguage.get() === 'de';

    if (f) {
      var crop = CROP_BY_ID[f.cropId];
      var pct = fieldProgressPct(f);
      var isRipe = f.ripe;
      var selected = G.selectedFieldId === f.id ? ' selected' : '';
      if (crew.multiSelect.ids[f.id]) selected += ' multi';

      var cropEmoji = { kakao: '🍫', kaffee: '☕', tabak: '🍂', tee: '🍵', stoffe: '🧵' }[crop.id] || '🌱';
      var daysLeft = fieldDaysLeft(f);
      var statusText = isRipe ? (german ? 'REIF!' : 'RIPE!') : (daysLeft + (german ? ' Tage' : 'd'));
      var yieldUnits = fieldYield(f);

      var pips = '';
      for (var l = 0; l < f.level; l++) {
        var starTitle = (german ? 'Stufe ' : 'Level ') + (l + 1) + ': ' +
          (l === 0 ? (german ? 'Bewässerung' : 'Irrigation') :
           l === 1 ? (german ? 'Düngung' : 'Fertiliser') :
                     (german ? 'Lagerschuppen' : 'Storage shed'));
        pips += '<span class="plot-level-star lvl-' + (l + 1) + '" title="' + starTitle + '">★</span>';
      }

      var lvlTag = '';
      if (f.level === 1) {
        lvlTag = '<span class="plot-lvl-badge lvl-1" title="' + (german ? 'Bewässerung aktiv (+15% Tempo, +1 Ertrag)' : 'Irrigation active') + '">💧 1</span>';
      } else if (f.level === 2) {
        lvlTag = '<span class="plot-lvl-badge lvl-2" title="' + (german ? 'Düngung aktiv (+30% Tempo, +2 Ertrag)' : 'Fertilised') + '">🌱 2</span>';
      } else if (f.level === 3) {
        lvlTag = '<span class="plot-lvl-badge lvl-3" title="' + (german ? 'Lagerschuppen MAX (+45% Tempo, +3 Ertrag)' : 'Storage shed MAX') + '">🏡 3</span>';
      }

      var isAuto = crew.fieldAutoOn(f);
      var lvlClass = f.level ? ' plot--level-' + f.level : '';

      return '<button type="button" class="plot plot--planted' + (isRipe ? ' ripe' : '') + lvlClass + selected + '"' +
        ' data-plot="' + i + '" data-field="' + f.id + '"' +
        (isRipe ? ' data-colony="harvest" title="' + (german ? 'Tippen zum Ernten!' : 'Tap to harvest!') + '"' : ' data-colony="select"') + '>' +
        '<div class="plot-farm-head">' +
          '<div class="plot-farm-head-left">' +
            '<span class="plot-crop-tag">' + cropEmoji + ' ' + h(crop.label) + '</span>' +
            lvlTag +
          '</div>' +
          '<div class="plot-farm-head-right">' +
            (isAuto ? '<span class="plot-auto-badge" title="' + (german ? 'Automatik aktiv' : 'Auto active') + '">⚡</span>' : '') +
            (f.workers > 0 ? '<span class="plot-worker-pill">👤 ' + f.workers + '</span>' : '') +
          '</div>' +
        '</div>' +
        (isRipe ? '<div class="plot-sickle-badge">🌾 <span>' + (german ? 'ERNTEN' : 'HARVEST') + '</span></div>' : '') +
        farmFieldSVG(crop, f, pct) +
        '<div class="plot-farm-foot">' +
          '<div class="field-progress"><i style="width:' + pct + '%"></i></div>' +
          '<div class="plot-foot-bar">' +
            '<span class="plot-status-label">' + statusText + '</span>' +
            '<span class="plot-yield-label">+' + yieldUnits + '</span>' +
            (pips ? '<span class="plot-pips-group">' + pips + '</span>' : '') +
          '</div>' +
        '</div>' +
      '</button>';
    }

    var emptyLvl = (p && p.level) ? p.level : 0;
    var emptyLvlClass = emptyLvl ? ' plot--level-' + emptyLvl : '';
    var armedCrop = G.plantCropId ? CROP_BY_ID[G.plantCropId] : null;
    var armedEmoji = armedCrop ? ({ kakao: '🍫', kaffee: '☕', tabak: '🍂', tee: '🍵', stoffe: '🧵' }[armedCrop.id] || '🌱') : '🌱';
    var plantLabel = armedCrop ? (german ? 'Säen: ' + armedCrop.label : 'Plant ' + armedCrop.label) : (german ? 'Freie Parzelle' : 'Free plot');
    var costVal = armedCrop ? (plotPriceFor(armedCrop) + armedCrop.cost) : 0;
    var costText = costVal ? A.money(costVal) : '';

    var emptyPips = '';
    for (var el = 0; el < emptyLvl; el++) {
      var emptyStarTitle = (german ? 'Stufe ' : 'Level ') + (el + 1);
      emptyPips += '<span class="plot-level-star lvl-' + (el + 1) + '" title="' + emptyStarTitle + '">★</span>';
    }

    return '<button type="button" class="plot plot--empty' + emptyLvlClass + (armedCrop ? ' can-plant' : '') + '"' +
      ' data-colony="plant-at" data-plot="' + i + '" data-empty="1"' +
      ' title="' + (armedCrop ? (german ? 'Tippen zum Säen von ' + armedCrop.label : 'Tap to sow ' + armedCrop.label) : '') + '">' +
      farmEmptySoilSVG(emptyLvl) +
      '<div class="plot-empty-overlay">' +
        '<span class="plot-empty-icon">' + (armedCrop ? armedEmoji : '+') + '</span>' +
        '<span class="plot-empty-title">' + plantLabel + '</span>' +
        (costText ? '<span class="plot-empty-cost">' + costText + '</span>' : '') +
        (emptyPips ? '<div class="plot-pips-group empty-pips">' + emptyPips + '</div>' : '') +
      '</div>' +
    '</button>';
  }'''

# Find the block from "/* Rich Hay Day Farmland SVG diorama" to the end of colonyPlotHTML
pattern = re.compile(r'/\* Rich Hay Day Farmland SVG diorama[\s\S]*?return \'<button type="button" class="plot plot--empty[\s\S]*?</button>\';\s*}', re.MULTILINE)

match = pattern.search(code)
assert match is not None, "Could not find plantation SVG section in app-colonies.js"
code = code[:match.start()] + new_section + code[match.end():]

with open('app-colonies.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Updated app-colonies.js successfully.")
