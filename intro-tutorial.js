/* Five-page tutorial: collection score, A-E tiers, sets, travel and trade. */
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
 var grades=['A','B','C','D','E'],cities=[1,2,4,7,13];
 return '<div class="tutorial-tier-grid" role="table" aria-label="'+copy('Wertklassen und Punkte','Art classes and points')+'">'+
  grades.map(function(g,i){
   var multi=5-i;
   return '<div class="tutorial-tier-card tutorial-tier-'+g.toLowerCase()+'" role="row">'+
    '<strong class="tutorial-tier-letter">'+g+'</strong><span class="tutorial-tier-multi">×'+multi+'</span>'+
    '<span class="tutorial-tier-score">'+multi+' / '+(multi*2)+' / '+(multi*3)+' ★</span>'+
    '<small>'+cities[i]+' '+copy(cities[i]===1?'Stadt':'Städte',cities[i]===1?'city':'cities')+'</small></div>';
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
function render(){
 var A=window.ArtRace,G=window.ArtRaceGame&&window.ArtRaceGame.G;
 if(!A||!A.shell||!G||!G.started)return;
 var cards=[
  {scene:'gallery_dream',title:copy('Werde der erfolgreichste Kunstsammler','Become the most successful art collector'),
   text:copy('Entdecke Galerien und Auktionen, sammle Gemälde und reise zu neuen Kunstmärkten. Du trittst gegen drei Kunsthändler an.','Explore galleries and auctions, collect paintings and travel to new art markets. You face three rival dealers.'),
   tip:copy('Am Karriereende gewinnt die höchste Sammlungspunktzahl – nicht das größte Vermögen.','At the end of the career, the highest collection score wins – not the largest fortune.')},
  {scene:'auction_4',title:copy('Wertklassen A bis E','Art classes A to E'),
   text:copy('Zuerst bringt der Zustand 1, 2 oder 3 Grundpunkte. Die Wertklasse vervielfacht diese Punkte: A ×5, B ×4, C ×3, D ×2, E ×1. Restaurierung kann deinen Punktestand deutlich steigern.','Condition gives 1, 2 or 3 base points. The art class multiplies them: A ×5, B ×4, C ×3, D ×2, E ×1. Restoration can boost your score significantly.'),
   scoring:true,tip:copy('Beispiel bei sehr gutem Zustand: Ein A-Werk bringt 15 ★, ein E-Werk nur 3 ★. Achte auch auf Fälschungen!','Example at excellent condition: an A-class work earns 15 ★, an E-class work just 3 ★. Beware of forgeries!')},
  {scene:'gallery_dream',title:copy('Künstler-Sets und Reisen','Artist sets and travel'),
   text:copy('Zwei verschiedene Werke desselben Künstlers bringen einen Setbonus von 30 %. Eine vollständige Dreier-Sammlung verdoppelt die Punkte dieser Werke. Spitzenkunst ist regional selten: A-Werke erscheinen nur in einer Stadt.','Two different works by the same artist earn a 30% set bonus. Completing a three-work artist collection doubles those works’ points. Top art is geographically rare: A-class works appear in only one city.'),
   set:true,tip:copy('B-Werke gibt es in 2 Städten, C in 4, D in 7 und E in allen 13. Reisen lohnt sich!','B works appear in 2 cities, C in 4, D in 7 and E in all 13. Travel pays off!')},
  {scene:'auction_2',title:copy('Geld verdienen durch Handel','Make money through trade'),
   text:copy('Produziere Waren in den Kolonien und verkaufe sie in Handelshäfen. Die Preise schwanken nach Ort und Tag. Je nach Schwierigkeitsgrad sind die Erlöse knapper.','Produce goods in colonies and sell them at trade ports. Prices vary by location and day. Higher difficulty means tighter earnings.'),
   tip:copy('Nutze deine Einnahmen für Gemälde, Auktionen und Restaurierungen.','Use your earnings to buy paintings, bid at auctions and restore artworks.')},
  {scene:'auction_1',title:copy('Deine Karriere beginnt','Your career begins'),
   text:copy('Prüfe den Wert und den Fundort eines Gemäldes, besuche die Weltkarte und plane deine Sammlung. Die besten Werke ziehen auch andere Bieter an.','Check an artwork’s class and market locations, explore the world map and plan your collection. The finest paintings also attract competing bidders.'),
   tip:copy('Viel Erfolg beim Sammeln!','Good luck collecting!')}
 ];
 var item=cards[page],image=photo(item.scene);
 var extra=item.scoring?'<p class="tutorial-score-key">'+copy('Punkte bei 1 / 2 / 3 Grundpunkten · verfügbare Städte','Points at 1 / 2 / 3 base points · available cities')+'</p>'+classTable()+exampleCards():
  item.set?'<div class="tutorial-set-visual"><div><strong>2 🖼️</strong><span>+30 %</span><small>'+copy('Künstler-Set','Artist set')+'</small></div>'+
  '<div><strong>3 🖼️</strong><span>×2</span><small>'+copy('Vollständiges Set','Complete set')+'</small></div></div>':'';
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