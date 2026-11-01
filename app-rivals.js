/* Four-slot local race: three autonomous rivals, one human.
 * Every rival owns its balance, portfolio and colony fields. The game
 * calendar drives all players; there are no background timers.
 */
(function(global) {
  'use strict';
  var A=global.ArtRace, G=global.ArtRaceGame.G;
  var NAMES=['Ada','Clara','Felix'];
  var COLONIES=['guatemala','ceylon','jamaica'];
  function rand(p,salt) {
    var n=Math.sin((G.seed+p.id*7919+G.day*104729+salt*71)*0.00013)*43758.5453;
    return n-Math.floor(n);
  }
  function city(p) { return A.cityById[p.cityId] || A.cities[0]; }
  function cropFor(p) { var c=A.colonies && A.colonies.CROPS; return c && c[p.id%c.length]; }
  function init(names) {
    var roster = (Array.isArray(names) && names.length===3 ? names : NAMES).map(function(n,i){return String(n || '').trim().slice(0,24) || NAMES[i];});
    G.rivals=roster.map(function(name,i) {
      return {id:i+1,name:name,type:'computer',cityId:A.cities[(i*3)%A.cities.length].id,
        destination:null,travelDays:0, cash:Math.round(G.cash), reputation:25,
        capacity:G.capacity, portfolio:[], nextUid:1, fields:[],
        colonyId:COLONIES[i], colonyInvested:0, cropsSold:0, purchased:0, sales:0,
        log:[], strategy:i};
    });
  }
  function ensure() {if(!Array.isArray(G.rivals)||G.rivals.length!==3)init();}
  function note(p,msg) { p.log.unshift('Day '+G.day+': '+msg);if(p.log.length>12)p.log.pop(); }
  function grow(p) {
    var crop=cropFor(p);if(!crop)return;
    /* Player-style plot economy: land costs twice seed price once, seed
       each harvest. The AI must finance farming before it can buy art. */
    if(G.day<=G.careerDays-12 && p.fields.length<(p.strategy===0?3:2) &&
       p.cash>=crop.cost*4 && (G.day%9===p.id || p.fields.length===0)) {
      p.cash-=crop.cost*3; p.colonyInvested+=crop.cost*3;
      p.fields.push({cropId:crop.id,days:0,level:0,workers:0,harvests:0});
      note(p,'Established a '+crop.label+' field in '+p.colonyId);
    }
    p.fields.forEach(function(field) {
      var def=A.colonies.CROP_BY_ID[field.cropId];
      if(!def)return;
      field.days++;
      if(field.days<def.days)return;
      var hubs=['london','newyork','tokio'];
      var best=0;
      for(var i=0;i<hubs.length;i++)best=Math.max(best,A.colonies.cropPrice(def,hubs[i]));
      /* Shipping and trade fee approximate the same economic costs the human
         must pay; rival stock is not added to the human warehouse. */
      var revenue=Math.max(0,best-150),earned=Math.max(0,revenue-def.cost);
      p.cash+=revenue;
      p.cropsSold++;
      field.harvests++;
      field.days=0;
      if(G.day<G.careerDays-def.days && p.cash>=def.cost) {
        p.cash-=def.cost; // replant with real seed cost
      }else field.finished=true;
      if(field.harvests%3===1)note(p,'Sold '+def.label+' harvest for '+A.money(revenue));
    });
    p.fields=p.fields.filter(function(f){return !f.finished;});
  }
  function travel(p) {
    if(p.travelDays>0){p.travelDays--;if(!p.travelDays&&p.destination){p.cityId=p.destination;p.destination=null;note(p,'Arrived in '+city(p).name);}return;}
    if(G.day%17!==p.id*3 || G.day>=G.careerDays-4)return;
    var next=A.cities[Math.floor(rand(p,8)*A.cities.length)];
    if(!next || next.id===p.cityId)return;
    var cost=A.ticketPrice ? A.ticketPrice(city(p),next) : 350;
    if(!Number.isFinite(cost)||cost<0)cost=350;
    if(p.cash<cost+800)return;
    p.cash-=cost;p.destination=next.id;
    var days=A.ticketDays?A.ticketDays(city(p),next):2;
    p.travelDays=Math.max(1,Math.min(20,Math.round(days)||2));
    note(p,'Travelling to '+next.name);
  }
  function buy(p) {
    if(p.travelDays||p.portfolio.length>=p.capacity)return;
    /* Keep money for operations early; acquire artworks steadily but not daily.
       Competition is judged by condition points and artist-set bonuses. */
    var daysLeft=G.careerDays-G.day;
    var reserve=daysLeft>40?2700:daysLeft>12?1000:0;
    if(p.cash<=reserve+200)return;
    var possibilities=[];
    var c=city(p),yr=A.CFG.startYear+Math.floor((G.day-1)/365);
    var ownedByArtist={};
    p.portfolio.forEach(function(inst){var work=A.work(inst.defId);if(work)ownedByArtist[work.artistId]=(ownedByArtist[work.artistId]||0)+1;});
    var searchCount=24;
    for(var k=0;k<searchCount;k++){
      var w=A.works[Math.floor(rand(p,k+17)*A.works.length)];
      if(!w || w.yearCreated>yr || !A.artAvailableInCity(w,p.cityId) || (A.app&&A.app.ownedWork&&A.app.ownedWork(w.id)))continue;
      if(possibilities.some(function(q){return q.id===w.id;}))continue;
      var inst={condition:Math.max(.55,Math.min(1,w.typicalCondition||.8)),
        authenticity:'Unexamined',isFake:false};
      var idx=A.sliceIndex(G.market,c,A.workEpoch(w));
      var ask=A.dealerAsk(w,inst,c,idx,yr,p.reputation,1);
      if(ask>p.cash-reserve)continue;
      var pts=inst.condition>=.90?3:inst.condition>=.80?2:1;
      var setFit=ownedByArtist[w.artistId]||0;
      /* A matching artist is attractive, but not worth any price. */
      var score=(pts*A.artTier(w).multiplier + (setFit>=2?1.2:setFit===1?.6:0))*1600/Math.max(400,ask);
      possibilities.push({id:w.id,price:ask,condition:inst.condition,score:score});
    }
    possibilities.sort(function(a,b){return b.score-a.score || a.price-b.price;});
    if(!possibilities.length)return;
    /* Never create more than one purchase per daily turn; AI uses the
       gallery price and shares the market with the human player. */
    if(daysLeft>25 && G.day%2!==p.id%2)return;
    var chosen=possibilities[0];
    p.cash-=chosen.price;
    p.portfolio.push({uid:p.nextUid++,defId:chosen.id,purchasePrice:chosen.price,
      purchaseCityId:p.cityId,purchaseDay:G.day,condition:chosen.condition,
      authenticity:'Unexamined',isFake:false});
    p.purchased++;
    p.reputation=Math.min(100,p.reputation+1);
    note(p,'Bought '+A.work(chosen.id).title+' for '+A.money(chosen.price));
  }
  function advance() {
    ensure();
    G.rivals.forEach(function(p){
      if(G.day>G.careerDays)return;
      grow(p);travel(p);buy(p);
    });
  }
  /* Conservation score: every painting contributes; preservation rewards care. */
  function artworkPoints(inst) {
    var condition = Number(inst && inst.condition);
    if (!isFinite(condition)) condition = 0;
    var base=condition >= .90 ? 3 : condition >= .80 ? 2 : 1;
    var work=inst&&A.work(inst.defId);
    return base*(work?A.artTier(work).multiplier:1);
  }
  function collectionBreakdown(portfolio) {
    var base=0, bonus=0, groups={}, catalogue={};
    A.works.forEach(function(w){catalogue[w.artistId]=(catalogue[w.artistId]||0)+1;});
    (portfolio||[]).forEach(function(inst){
      var w=A.work(inst.defId);if(!w)return;
      if(!groups[w.artistId])groups[w.artistId]={works:{},points:0};
      /* A duplicate in a legacy save never counts as a second original. */
      if(groups[w.artistId].works[inst.defId])return;
      groups[w.artistId].works[inst.defId]=true;
      var pts=artworkPoints(inst);
      groups[w.artistId].points+=pts;base+=pts;
    });
    var sets=[];
    Object.keys(groups).forEach(function(id){
      var group=groups[id],held=Object.keys(group.works).length, total=catalogue[id]||0;
      var factor=total>=3&&held>=total?2:(total>=2&&held>=2?1.3:1);
      if(factor>1) {
        var gain=Math.round(group.points*(factor-1)*10)/10;
        bonus+=gain;
        sets.push({artistId:id,held:held,total:total,bonus:gain,factor:factor});
      }
    });
    return {base:base,bonus:Math.round(bonus*10)/10,total:Math.round((base+bonus)*10)/10,sets:sets};
  }
  function collectionPoints(portfolio){return collectionBreakdown(portfolio).total;}
  function standings(){
    ensure();
    return [{id:0,name:G.name||'Player',type:'human',pictures:G.portfolio.length,points:collectionPoints(G.portfolio),
      cash:G.cash,city:G.colonyId||G.cityId,colonies:Object.keys(G.ownedPlots||{}).length,
      net:G.cash}].concat(G.rivals.map(function(p){
      return {id:p.id,name:p.name,type:'computer',pictures:p.portfolio.length,points:collectionPoints(p.portfolio),
        cash:p.cash,city:p.destination||p.cityId,colonies:p.fields.length,
        net:p.cash};
    })).sort(function(a,b){return b.points-a.points || b.pictures-a.pictures || b.net-a.net;});
  }
  function isGerman(){return !!(window.ArtRaceLanguage && window.ArtRaceLanguage.get()==='de');}
  function safe(value){return A.escapeRace(value==null?'':String(value));}
  function placeName(id){
    var c=A.cityById && A.cityById[id];
    return c ? c.name : String(id||'–');
  }
  function fullStandingsHTML(){
    var de=isGerman(),rows=standings();
    return '<div class="race-details-intro">'+(de?'Rangfolge nach Sammlungspunkten. Bei Gleichstand entscheiden Gemäldeanzahl und Bargeld.':'Ranked by collection points; painting count and cash break ties.')+'</div>'+
      rows.map(function(p,i){
        var source=p.type==='human'?G:(G.rivals||[]).filter(function(r){return r.id===p.id;})[0]||{};
        var journey=source.travelDays>0?(de?'Unterwegs · noch '+source.travelDays+' Tage':'Travelling · '+source.travelDays+' days remaining'):(de?'Am Standort':'At location');
        return '<section class="race-detail-player'+(p.type==='human'?' is-human':'')+'">'+
          '<div class="race-detail-heading"><strong>'+(i+1)+'. '+safe(p.name)+'</strong><span>'+p.points+' ★ · '+p.pictures+' 🖼️</span></div>'+
          '<dl><dt>'+(de?'Spieler':'Player')+'</dt><dd>'+(p.type==='human'?(de?'Du':'You'):(de?'Computer':'Computer'))+'</dd>'+
          '<dt>'+(de?'Aufenthaltsort':'Location')+'</dt><dd>'+safe(placeName(p.city))+'</dd>'+
          '<dt>'+(de?'Status':'Status')+'</dt><dd>'+safe(journey)+'</dd>'+
          '<dt>'+(de?'Sammlungspunkte':'Collection points')+'</dt><dd>'+p.points+'</dd>'+
          '<dt>'+(de?'Gemälde':'Paintings')+'</dt><dd>'+p.pictures+'</dd>'+
          '<dt>'+(de?'Bargeld':'Cash')+'</dt><dd>'+A.money(p.cash)+'</dd>'+
          '<dt>'+(de?'Lagerkapazität':'Crate capacity')+'</dt><dd>'+Number(source.capacity||0)+'</dd>'+
          '<dt>'+(de?'Ansehen':'Reputation')+'</dt><dd>'+Number(source.reputation||0)+'</dd>'+
          '<dt>'+(de?'Plantagen/Felder':'Plantations / fields')+'</dt><dd>'+p.colonies+'</dd></dl></section>';
      }).join('');
  }
  function openRaceDetails(){
    if(!A.shell || !A.shell.dialog)return;
    var de=isGerman();
    A.shell.dialog(de?'Alle vier Spieler':'All four players',fullStandingsHTML(),
      [{label:de?'Schließen':'Close',primary:true,onClick:function(){A.shell.closeDialog();}}],'race-details-dialog');
  }
  function draw() {
    var root=document.getElementById('race-standings');
    if(!root || !G.started)return;
    var rows=standings(),self=rows.filter(function(p){return p.type==='human';})[0];
    var rank=rows.indexOf(self)+1, de=isGerman();
    root.innerHTML='<button class="race-self-trigger" type="button" aria-label="'+
      (de?'Alle vier Spieler und Rangliste anzeigen':'View all four players and standings')+'">'+
      '<span class="race-self-avatar">♟</span><span class="race-self-info"><strong>'+safe(self.name)+
      '</strong><small>'+(de?'Platz ':'Rank ')+rank+'/4 · '+self.points+' ★ · '+self.pictures+
      ' 🖼️</small></span><span class="race-self-chevron">⌄</span></button>'+
      '<div class="race-desktop-rows">'+rows.map(function(p,i){
        return '<div class="race-player'+(p.type==='human'?' is-human':'')+'">'+
          '<span class="race-rank">'+(i+1)+'.</span><span class="race-person">'+safe(p.name)+
          '<small>'+safe(placeName(p.city))+'</small></span><strong>'+p.points+' ★ <small>('+p.pictures+' 🖼️)</small></strong>'+
          '<span class="race-money">'+A.money(p.cash)+'</span></div>';
      }).join('')+'</div>';
  }
  document.addEventListener('click',function(ev){
    var target=ev.target.closest('.race-self-trigger');
    if(target && document.getElementById('race-standings') && document.getElementById('race-standings').contains(target))openRaceDetails();
  });
  A.escapeRace=function(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
  A.race={init:init,ensure:ensure,advance:advance,standings:standings,draw:draw,artworkPoints:artworkPoints,collectionPoints:collectionPoints,collectionBreakdown:collectionBreakdown};
})(window);
