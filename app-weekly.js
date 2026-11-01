/* Optional seven-day race recap. Never interrupts automatic days. */
(function () {
  'use strict';
  var A=window.ArtRace, G=window.ArtRaceGame.G;
  function de(){return !!(window.ArtRaceLanguage && window.ArtRaceLanguage.get()==='de');}
  function safe(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function week(){return Math.floor(Math.max(0,G.day-1)/7);}
  function place(id) {
    var city=A.cityById&&A.cityById[id], colony=A.colonies&&A.colonies.COLONY_BY_ID&&A.colonies.COLONY_BY_ID[id];
    return city?city.name:colony?colony.label:String(id||'-');
  }
  function update(){
    if(!G.started)return;
    var pending=week()>0 && week()>(Number(G.weeklySeen)||0);
    ['hud-weekly','colony-weekly'].forEach(function(id) {
      var b=document.getElementById(id);if(!b)return;
      b.textContent='📅 '+(de()?'Woche':'Week')+(pending?' ●':'');
      b.title=pending?(de()?'Neuer Wochenbericht':'New weekly recap'):(de()?'Wochenbericht öffnen':'Open weekly recap');
    });
  }
  function open(){
    if(!G.started||!A.shell||!A.shell.dialog)return;
    G.weeklySeen=week();
    update();
    var german=de();
    var rows=A.race&&A.race.standings?A.race.standings():[];
    var body='<p>'+(german?'Stand nach '+G.day+' Spieltagen. Die Reihenfolge richtet sich nach Sammlungspunkten.':
      'Standings after '+G.day+' game days, ranked by collection points.')+'</p>';
    body+='<div style="display:grid;gap:8px">'+rows.map(function(p,i){
      var mine=p.type==='human',name=safe(p.name),at=safe(place(p.city));
      return '<div style="padding:10px;border:1px solid #ad9264;border-radius:9px;'+(mine?'background:rgba(219,186,106,.17)':'')+'">'+
        '<strong>'+(i+1)+'. '+name+(mine?(german?' (Du)':' (You)'):'')+'</strong>'+
        '<div>'+p.points+' ★ · '+p.pictures+' 🖼️ · '+at+'</div>'+
        '<small>'+(german?'Bargeld: ':'Cash: ')+A.money(p.cash)+'</small></div>';
    }).join('')+'</div>';
    A.shell.dialog((german?'Wochenbericht · Tag ':'Weekly recap · Day ')+G.day,body,
      [{label:german?'Weiter':'Continue',primary:true,onClick:function(){A.shell.closeDialog();}}],'weekly-recap-dialog');
  }
  document.addEventListener('click',function(e){if(e.target.closest('#hud-weekly,#colony-weekly'))open();});
  window.addEventListener('artrace-day-advanced',update);
  document.addEventListener('click',function(e){if(e.target.closest('#new-game,#resume-game'))setTimeout(update,0);});
  window.ArtRaceWeekly={update:update,open:open};
})();
