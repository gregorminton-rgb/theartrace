/* Six-page tutorial: collection score, A-E tiers, sets, travel and trade. */
(function(){
'use strict';
var page=0;
function de(){return !!(window.ArtRaceLanguage&&window.ArtRaceLanguage.get()==='de');}
function esc(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function copy(a,b){return de()?a:b;}
var scenes={};
(window.ART_RACE_SCENE_PLATES||[]).forEach(function(s){scenes[s.id]=s.file;});
function photo(id){return scenes[id]||'';}
function example(grade){
 var A=window.ArtRace,images=window.ART_ARTWORK_IMAGES&&window.ART_ARTWORK_IMAGES.images||{};
 var works=A&&A.works||[];
 for(var i=0;i<works.length;i++){
  var w=works[i],tier=A.artTier&&A.artTier(w);
  var picture=images[w.id];
  if(tier&&tier.grade===grade&&picture&&picture.file)return {w:w,file:picture.file};
 }
 return null;
}
function classTable(){
 var grades=['A','B','C','D','E'];
 return '<div class="tutorial-tier-grid">'+grades.map(function(g,i){
  var artwork=example(g);
  return '<div class="tutorial-tier-card tutorial-tier-'+g.toLowerCase()+'">'+
   '<div class="tutorial-tier-art">'+(artwork?'<img src="'+esc(artwork.file)+'" alt="'+esc(artwork.w.title)+'" loading="lazy">':'<span aria-hidden="true">🖼️</span>')+'</div>'+
   '<strong class="tutorial-tier-letter">'+g+'</strong>'+
   '<span class="tutorial-tier-multi">×'+(5-i)+'</span></div>';
 }).join('')+'</div>';
}
function exampleCards(){
 return '<div class="tutorial-example-grid">'+['A','E'].map(function(g){
  var item=example(g),points=g==='A'?15:3;
  return '<div class="tutorial-example"><div class="tutorial-example-art">'+
   (item?'<img src="'+esc(item.file)+'" alt="'+esc(item.w.title)+'" loading="lazy">':'<span>🖼️</span>')+
   '</div><div class="tutorial-example-caption"><b>'+copy('Klasse ','Class ')+g+'</b>'+
   '<strong>'+points+' ★</strong></div></div>';
 }).join('')+'</div>';
}
function artistSetExamples(){
 var A=window.ArtRace,images=window.ART_ARTWORK_IMAGES&&window.ART_ARTWORK_IMAGES.images||{};
 var works=A&&A.works||[],groups={};
 works.forEach(function(w){
  var img=images[w.id];
  if(!img||!img.file)return;
  (groups[w.artistId]||(groups[w.artistId]=[])).push({title:w.title,file:img.file});
 });
 var ids=Object.keys(groups).filter(function(id){return groups[id].length>=3;});
 var picasso=ids.filter(function(id){return /picasso/i.test(id);})[0];
 var chosen=groups[picasso||ids[0]]||[];
 var artist=picasso?'Picasso':(A&&A.artists&&A.artists.filter(function(a){return a.id===ids[0];})[0]||{}).name||ids[0]||copy('Künstler','Artist');
 return '<div class="tutorial-set-visual">'+[2,3].map(function(count){
  return '<div class="tutorial-set-example"><div class="tutorial-set-paintings">'+chosen.slice(0,count).map(function(w){
   return '<img src="'+esc(w.file)+'" alt="'+esc(w.title)+'" loading="lazy">';
  }).join('')+'</div><strong>'+esc(artist)+' · '+count+' '+copy('Werke','works')+'</strong>'+
   '<span>'+(count===2?'+30 %':'×2')+'</span><small>'+
   (count===2?copy('Künstler-Set','Artist set'):copy('Vollständiges Set','Complete set'))+
   '</small></div>';
 }).join('')+'</div>';
}
function render(){
 var A=window.ArtRace,G=window.ArtRaceGame&&window.ArtRaceGame.G;
 if(!A||!A.shell||!G||!G.started)return;
 var cards=[
  {scene:'gallery_dream',title:copy('Werde der erfolgreichste Kunstsammler','Become the most successful art collector'),
   text:copy('Entdecke Galerien und Auktionen, sammle Gemälde und reise zu neuen Kunstmärkten. Du trittst gegen drei Kunsthändler an.','Explore galleries and auctions, collect paintings and travel to new art markets. You face three rival dealers.'),
   tip:copy('Am Karriereende gewinnt die höchste Sammlungspunktzahl – nicht das größte Vermögen.','At the end of the career, the highest collection score wins – not the largest fortune.')},
  {scene:'auction_4',title:copy('Wertklassen A bis E','Art classes A to E'),
   text:copy('Alle Kunstwerke haben eine Wertklasse. A ist besonders wertvoll, E eher alltäglich. Je höher die Klasse, desto mehr Punkte bringt ein Bild.','Every artwork has a class. A means exceptional art; E is more common. Higher classes earn more points.'),
   scoring:true,tip:copy('Ein guter Zustand macht jedes Bild wertvoller. Restaurieren lohnt sich!','Good condition increases every painting’s score. Restoration pays off!')},
  {scene:'auction_4',title:copy('Meisterwerk oder Alltagskunst?','Masterpiece or everyday art?'),
   text:copy('Zwei Gemälde im gleichen Topzustand: Das seltene A-Werk bringt deutlich mehr Sammlungspunkte als ein E-Werk.','Two paintings in equally excellent condition: the rare A-class work earns far more collection points than an E-class work.'),
   examples:true,tip:copy('Vergleiche Bilder und Wertklasse, bevor du kaufst.','Compare artworks and their classes before buying.')},
  {scene:'gallery_dream',title:copy('Künstler-Sets und Reisen','Artist sets and travel'),
   text:copy('Sammle mehrere Werke eines Künstlers: Zwei geben einen Bonus, alle drei verdoppeln ihre Punkte. Seltene Meisterwerke findest du nur in wenigen Städten.','Collect several paintings by one artist: two earn a bonus, all three double their points. Rare masterpieces appear in only a few cities.'),
   set:true,tip:copy('B-Werke gibt es in 2 Städten, C in 4, D in 7 und E in allen 13. Reisen lohnt sich!','B works appear in 2 cities, C in 4, D in 7 and E in all 13. Travel pays off!')},
  {scene:'auction_2',title:copy('Geld verdienen durch Handel','Make money through trade'),
   text:copy('Produziere Waren in den Kolonien und verkaufe sie in Handelshäfen. Die Preise schwanken nach Ort und Tag. Je nach Schwierigkeitsgrad sind die Erlöse knapper.','Produce goods in colonies and sell them at trade ports. Prices vary by location and day. Higher difficulty means tighter earnings.'),
   tip:copy('Nutze deine Einnahmen für Gemälde, Auktionen und Restaurierungen.','Use your earnings to buy paintings, bid at auctions and restore artworks.')},
  {scene:'auction_1',title:copy('Deine Karriere beginnt','Your career begins'),
   text:copy('Prüfe den Wert und den Fundort eines Gemäldes, besuche die Weltkarte und plane deine Sammlung. Die besten Werke ziehen auch andere Bieter an.','Check an artwork’s class and market locations, explore the world map and plan your collection. The finest paintings also attract competing bidders.'),
   tip:copy('Viel Erfolg beim Sammeln!','Good luck collecting!')}
 ];
 var item=cards[page],image=photo(item.scene);
 var extra=item.scoring?classTable():item.examples?exampleCards():
  item.set?artistSetExamples():'';
 var html='<div class="tutorial-hero">'+(image?'<img src="'+esc(image)+'" alt="" loading="eager">':'')+
  '<h3 class="tutorial-hero-title">'+esc(item.title)+'</h3></div>'+
  '<div class="tutorial-copy"><p>'+esc(item.text)+'</p>'+extra+
  '<p><strong>'+esc(item.tip)+'</strong></p></div>'+
  '<div class="tutorial-progress" aria-label="'+(page+1)+' / '+cards.length+'">'+cards.map(function(_,i){return '<span class="'+(i===page?'active':'')+'"></span>';}).join('')+'</div>';
 var buttons=[{label:copy('Überspringen','Skip'),onClick:close}];
 if(page>0)buttons.push({label:copy('Zurück','Back'),onClick:function(){page--;render();}});
 buttons.push({label:page===cards.length-1?copy('Karriere starten','Start career'):copy('Weiter','Next'),primary:true,onClick:function(){if(page===cards.length-1)close();else{page++;render();}}});
 A.shell.dialog(copy('Willkommen bei The Great Art Race','Welcome to The Great Art Race'),html,buttons,'dialog--tutorial');
}
function close(){var A=window.ArtRace;if(A&&A.shell)A.shell.closeDialog();}
function open(){page=0;render();}
document.addEventListener('click',function(e){if(e.target.closest('#hud-tutorial-help'))open();});
window.ArtRaceTutorial={open:open};
})();