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

  function capture(force){
    if(!G.started||!A.race)return;
    if(!force && (G.day-1)%7!==0)return;
    var entries=G.raceSnapshots;
    if(!Array.isArray(entries))entries=G.raceSnapshots=[];
    if(entries.length&&entries[entries.length-1].day===G.day)return;
    entries.push({day:G.day,players:A.race.standings().map(function(p){
      return {id:p.id,points:Number(p.points)||0};
    })});
    if(entries.length>60)entries.shift();
  }
  function visuals(rows){
    rows=rows||A.race.standings();
    var german=de(),maximum=Math.max(1,...rows.map(function(p){return Number(p.points)||0;}));
    var medals = ['🥇', '🥈', '🥉', '🎖️'];
    var avatars = { 'Henry': '🎩', 'Ada': '👒', 'Clara': '🎨', 'Felix': '🧐' };
    var html='<section class="race-chart-card"><h3>'+(german?'Sammlungspunkte im Vergleich':'Collection points compared')+'</h3>';
    html+=rows.map(function(p, i){
      var score=Math.max(0,Number(p.points)||0);
      var isHuman = p.type === 'human';
      var avatar = isHuman ? '🎩' : (avatars[p.name] || '👤');
      var medal = medals[i] || '🎖️';
      return '<div class="race-chart-row"><span class="race-chart-name">' + medal + ' ' + avatar + ' ' + safe(p.name) + '</span>'+
        '<div class="race-chart-track"><div class="race-chart-fill'+(isHuman?' is-player':'')+
        (i===0?' is-leader':'')+
        '" style="width:'+(score/maximum*100).toFixed(1)+'%"></div></div><b>'+score+' ★ <small style="font-size:.68rem;opacity:.75">('+p.pictures+' 🖼️)</small></b></div>';
    }).join('')+'</section>';
    var history=Array.isArray(G.raceSnapshots)?G.raceSnapshots.slice(-8):[];
    if(history.length<2)return html;
    var colors=['#a16a20','#396f8d','#8b5b66','#537650'];
    var peak=Math.max(1,...history.reduce(function(a,s){return a.concat((s.players||[]).map(function(p){return Number(p.points)||0;}));},[]));
    html+='<section class="race-chart-card"><h3>'+(german?'Punkteentwicklung':'Points over time')+'</h3>'+
      '<svg class="race-trend" viewBox="0 0 340 130" role="img" aria-label="'+(german?'Punkteentwicklung':'Points trend')+'">'+
      '<path d="M16 12V115H328" stroke="currentColor" opacity=".25" fill="none"/>';
    for(var id=0;id<4;id++){
      var points=history.map(function(s,i){
        var record=(s.players||[]).filter(function(p){return p.id===id;})[0];
        var val=record?Number(record.points)||0:0;
        return (16+312*i/(history.length-1)).toFixed(1)+','+(115-96*val/peak).toFixed(1);
      }).join(' ');
      html+='<polyline points="'+points+'" fill="none" stroke="'+colors[id]+'" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
    }
    html+='</svg><div class="race-trend-key">'+[0,1,2,3].map(function(id){
      var p=rows.filter(function(q){return q.id===id;})[0];
      return '<span><i style="background:'+colors[id]+'"></i>'+safe(p?p.name:('Player '+id))+'</span>';
    }).join('')+'</div></section>';
    return html;
  }
  function open(){
    if(!G.started||!A.shell||!A.shell.dialog)return;
    capture(true);
    G.weeklySeen=week();
    update();
    var german=de();
    var rows=A.race&&A.race.standings?A.race.standings():[];
    var body='<p>'+(german?'Stand nach '+G.day+' Spieltagen. Die Reihenfolge richtet sich nach Sammlungspunkten.':
      'Standings after '+G.day+' game days, ranked by collection points.')+'</p>';
    body+=visuals(rows);
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
  window.addEventListener('artrace-day-advanced',function(){capture(false);update();});
  document.addEventListener('click',function(e){if(e.target.closest('#new-game,#resume-game'))setTimeout(update,0);});
  window.ArtRaceWeekly={update:update,open:open,capture:capture,visuals:visuals};
})();
