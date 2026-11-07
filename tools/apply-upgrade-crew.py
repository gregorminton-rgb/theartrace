import re

# 1. Update app-crew.js
with open('app-crew.js', 'r', encoding='utf-8') as f:
    crew_code = f.read()

# Update claimPlot to include level
old_claim = '''  function claimPlot(colonyId, plotIndex, cropId) {
    if (!G.ownedPlots) G.ownedPlots = {};
    var key = ownedPlotKey(colonyId, plotIndex);
    if (!G.ownedPlots[key]) G.ownedPlots[key] = { auto: false, cropId: cropId };
    G.ownedPlots[key].cropId = cropId;
    return G.ownedPlots[key];
  }'''

new_claim = '''  function claimPlot(colonyId, plotIndex, cropId) {
    if (!G.ownedPlots) G.ownedPlots = {};
    var key = ownedPlotKey(colonyId, plotIndex);
    if (!G.ownedPlots[key]) G.ownedPlots[key] = { auto: false, cropId: cropId, level: 0 };
    G.ownedPlots[key].cropId = cropId;
    return G.ownedPlots[key];
  }'''

assert old_claim in crew_code, "old_claim not found in app-crew.js"
crew_code = crew_code.replace(old_claim, new_claim)

# Update plantCrop to inherit plot level
old_plant = '''    /* the first layout is the purchase: the plot becomes the player's */
    claimPlot(G.colonyId, plotIndex, crop.id);
    G.fields.push({ id: G.nextFieldId++, colonyId: G.colonyId, plotIndex: plotIndex, cropId: crop.id,
                    plantedDay: G.day, progress: 0, ripe: false, workers: 0, level: 0 });'''

new_plant = '''    /* the first layout is the purchase: the plot becomes the player's */
    var prevOwned = ownedPlot(G.colonyId, plotIndex);
    var initLvl = (prevOwned && prevOwned.level) ? prevOwned.level : 0;
    var curPlot = claimPlot(G.colonyId, plotIndex, crop.id);
    if (curPlot && prevOwned && prevOwned.level) curPlot.level = prevOwned.level;
    G.fields.push({ id: G.nextFieldId++, colonyId: G.colonyId, plotIndex: plotIndex, cropId: crop.id,
                    plantedDay: G.day, progress: 0, ripe: false, workers: 0, level: initLvl });'''

assert old_plant in crew_code, "old_plant not found in app-crew.js"
crew_code = crew_code.replace(old_plant, new_plant)

# Update upgradeField to store level on plot
old_upgrade = '''  function upgradeField(fid) {
    var f = fieldById(fid);
    if (!f) return;
    var next = UPGRADES[f.level];
    if (!next) { log('That field is fully upgraded.'); return; }
    if (G.cash < next.cost) { log(next.label + ' costs ' + A.money(next.cost) + '.'); return; }
    G.cash -= next.cost;
    f.level += 1;
    log('Upgraded the ' + T().CROP_BY_ID[f.cropId].label + ' field to ' + next.label + '.');
    renderColony();
  }'''

new_upgrade = '''  function upgradeField(fid) {
    var f = fieldById(fid);
    if (!f) return;
    var next = UPGRADES[f.level];
    if (!next) { log('That field is fully upgraded.'); return; }
    if (G.cash < next.cost) { log(next.label + ' costs ' + A.money(next.cost) + '.'); return; }
    G.cash -= next.cost;
    f.level += 1;
    var p = claimPlot(f.colonyId, f.plotIndex, f.cropId);
    if (p) p.level = Math.max(p.level || 0, f.level);
    log('Upgraded the ' + T().CROP_BY_ID[f.cropId].label + ' field to ' + next.label + '.');
    renderColony();
  }'''

assert old_upgrade in crew_code, "old_upgrade not found in app-crew.js"
crew_code = crew_code.replace(old_upgrade, new_upgrade)

# Update upgradeSelectedFields to store level on plot
old_upgrade_bulk = '''    G.cash-=total;
    fields.forEach(function(f){f.level+=1;});
    log('Upgraded '+fields.length+' fields to '+next.label+' for '+A.money(total)+'.');'''

new_upgrade_bulk = '''    G.cash-=total;
    fields.forEach(function(f){
      f.level+=1;
      var p = claimPlot(f.colonyId, f.plotIndex, f.cropId);
      if (p) p.level = Math.max(p.level || 0, f.level);
    });
    log('Upgraded '+fields.length+' fields to '+next.label+' for '+A.money(total)+'.');'''

assert old_upgrade_bulk in crew_code, "old_upgrade_bulk not found in app-crew.js"
crew_code = crew_code.replace(old_upgrade_bulk, new_upgrade_bulk)

# Update runOverseer replant to preserve level
old_overseer_replant = '''        G.cash -= crop.cost;
        pl.cropId = crop.id;
        G.fields.push({ id: G.nextFieldId++, colonyId: colonyId, plotIndex: pi, cropId: crop.id,
                        plantedDay: G.day, progress: 0, ripe: false, workers: 0, level: 0 });'''

new_overseer_replant = '''        G.cash -= crop.cost;
        pl.cropId = crop.id;
        var initLvl = (pl && pl.level) ? pl.level : 0;
        G.fields.push({ id: G.nextFieldId++, colonyId: colonyId, plotIndex: pi, cropId: crop.id,
                        plantedDay: G.day, progress: 0, ripe: false, workers: 0, level: initLvl });'''

assert old_overseer_replant in crew_code, "old_overseer_replant not found in app-crew.js"
crew_code = crew_code.replace(old_overseer_replant, new_overseer_replant)

with open('app-crew.js', 'w', encoding='utf-8') as f:
    f.write(crew_code)
print("Updated app-crew.js successfully.")
