/* Two simple repeatable missions; progress is persisted with the game state. */
(function () {
  'use strict';
  var A = window.ArtRace, G = window.ArtRaceGame.G;
  var goals = {art:2,trade:20}, rewards = {art:3000,trade:1500};
  function de() {return !!(window.ArtRaceLanguage && window.ArtRaceLanguage.get()==='de');}
  function state() {
    if (!G.missions || typeof G.missions !== 'object') G.missions = {};
    ['art','trade'].forEach(function(k) {
      G.missions[k]=Math.max(0,Number(G.missions[k])||0);
      G.missions[k+'Done']=Math.max(0,Number(G.missions[k+'Done'])||0);
    });
    return G.missions;
  }
  function record(kind,quantity) {
    if (!G.started || G.ended || !goals[kind]) return;
    quantity=Math.max(0,Math.floor(Number(quantity)||0));
    if (!quantity) return;
    var s=state();
    s[kind]+=quantity;
    while (s[kind]>=goals[kind]) {
      s[kind]-=goals[kind];
      s[kind+'Done']++;
      G.cash+=rewards[kind];
      var name=kind==='art'?(de()?'Kunstsammler':'Art collector'):(de()?'Gewürzhändler':'Colonial trader');
      G.log.unshift({day:G.day,text:(de()?'Auftrag erfüllt: ':'Mission completed: ')+name+' · +'+A.money(rewards[kind])});
      if(G.log.length>120)G.log.pop();
    }
  }
  function open() {
    if (!G.started || !A.shell || !A.shell.dialog) return;
    var s=state(),german=de();
    function card(kind,title,description) {
      return '<section style="margin:0 0 14px;padding:12px;border:1px solid #b99a62;border-radius:10px">' +
        '<img src="images/mission-'+(kind==='art'?'art-collector':'spice-trader')+'.jpg" alt="" loading="lazy" onerror="this.style.display=\'none\'" style="display:block;width:100%;max-height:240px;object-fit:cover;border-radius:8px;margin-bottom:10px">' +
        '<strong>'+title+'</strong><p>'+description+'</p><p><b>'+s[kind]+' / '+goals[kind]+'</b> · '+
        (german?'Belohnung: ':'Reward: ')+'<b>+'+A.money(rewards[kind])+'</b></p>'+
        '<progress max="'+goals[kind]+'" value="'+s[kind]+'" style="width:100%"></progress>'+
        '<small style="display:block;margin-top:6px">'+(german?'Erledigt: ':'Completed: ')+s[kind+'Done']+'</small></section>';
    }
    A.shell.dialog(german?'Deine Aufträge':'Your missions',
      '<p>'+(german?'Ohne Zeitlimit. Beide Aufträge kannst du immer wieder erledigen; das Geld erhältst du sofort.':
        'No time limit. Repeat both missions and receive cash immediately.')+'</p>'+
      card('art',german?'🖼️ Kunstsammler':'🖼️ Art collector',
        german?'Kaufe oder ersteigere 2 Gemälde.':'Buy or win 2 paintings.')+
      card('trade',german?'🚢 Gewürzhändler':'🚢 Colonial trader',
        german?'Verkaufe 20 Einheiten Koloniewaren. Automatische Verkäufe zählen mit.':
          'Sell 20 units of colonial goods. Automatic sales count too.'),
      [{label:german?'Schließen':'Close',primary:true,onClick:function(){A.shell.closeDialog();}}],'missions-dialog');
  }
  document.addEventListener('click',function(e) {if(e.target.closest('#hud-missions,#colony-missions'))open();});
  window.ArtRaceMissions={record:record,open:open,state:state};
})();
