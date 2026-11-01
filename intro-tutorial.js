/* Four-page art-race introduction. Existing art assets, no external services. */
(function(){
'use strict';
var page=0;
function de(){return !!(window.ArtRaceLanguage&&window.ArtRaceLanguage.get()==='de');}
function esc(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function copy(a,b){return de()?a:b;}
var scenes={};
(window.ART_RACE_SCENE_PLATES||[]).forEach(function(s){scenes[s.id]=s.file;});
function photo(id){return scenes[id]||'';}
function artworkFiles(){
 var images=window.ART_ARTWORK_IMAGES&&window.ART_ARTWORK_IMAGES.images||{};
 var works=window.ArtRace&&window.ArtRace.works||[];
 var chosen=[];
 for(var i=0;i<works.length&&chosen.length<3;i++){
  var f=images[works[i].id]&&images[works[i].id].file;
  if(f&&chosen.indexOf(f)<0)chosen.push(f);
 }
 return chosen;
}
function render(){
 var A=window.ArtRace, G=window.ArtRaceGame&&window.ArtRaceGame.G;
 if(!A||!A.shell||!G||!G.started)return;
 var art=artworkFiles();
 var cards=[
 {scene:'gallery_dream',title:copy('Werde der erfolgreichste Kunstsammler','Become the most successful art collector'),
  text:copy('Kaufe Gemälde, entdecke Galerien und Auktionen und reise zu neuen Kunstmärkten. Du trittst gegen drei Kunsthändler an.','Collect paintings, discover galleries and auctions, and travel to new art markets. You compete against three rival dealers.'),
  tip:copy('Am Ende gewinnt, wer die meisten Sammlungspunkte erreicht.','The player with the most collection points wins.')},
 {scene:'auction_4',title:copy('Qualität zählt','Quality matters'),
  text:copy('Jedes Gemälde zählt. Ein guter Zustand bringt besonders viele Punkte – im Atelier kannst du beschädigte Bilder restaurieren.','Every painting counts. Better condition earns more points – restore damaged artwork in the studio.'),
  points:true,tip:copy('Achte beim Kauf außerdem auf Fälschungen!','Watch out for forgeries when buying!')},
 {scene:'auction_2',title:copy('Werde reich durch Handel','Build wealth through trade'),
  text:copy('Kaufe klug bei Galerien und Auktionen. Auf Kolonien kannst du Waren produzieren und in London, New York und Tokio verkaufen.','Buy wisely at galleries and auctions. Produce goods in colonies and sell them in London, New York and Tokyo.'),
  tip:copy('Die Preise schwanken: Ort und Zeitpunkt machen den Unterschied.','Prices change: choosing the right place and time matters.')},
 {scene:'auction_1',title:copy('Deine Karriere beginnt','Your career begins'),
  text:copy('Sieh dir dein erstes Gemälde an, besuche die Weltkarte und prüfe danach deine Sammlung. Du kannst jederzeit frei weiterspielen.','Explore your first artwork, visit the world map, and check your collection. You are always free to play your own way.'),
  tip:copy('Viel Erfolg beim Sammeln!','Good luck collecting!')}
 ];
 var item=cards[page],image=photo(item.scene),imgs=art.map(function(f){return '<img src="'+esc(f)+'" alt="'+copy('Gemäldeausschnitt','Artwork detail')+'" loading="lazy">';}).join('');
 var html='<div class="tutorial-hero">'+(image?'<img src="'+esc(image)+'" alt="" loading="eager">':'')+
   '<div class="tutorial-collage" aria-hidden="true">'+imgs+'</div><h3 class="tutorial-hero-title">'+esc(item.title)+'</h3></div>'+
   '<div class="tutorial-copy"><p>'+esc(item.text)+'</p>'+
   (item.points?'<div class="tutorial-points"><span><b>1 ★</b>'+copy('unter 80 %','below 80%')+'</span><span><b>2 ★</b>80–89 %</span><span><b>3 ★</b>'+copy('ab 90 %','90% and above')+'</span></div>':'')+
   '<p><strong>'+esc(item.tip)+'</strong></p></div>'+
   '<div class="tutorial-progress" aria-label="'+(page+1)+' / 4">'+cards.map(function(_,i){return '<span class="'+(i===page?'active':'')+'"></span>';}).join('')+'</div>';
 var buttons=[];
 buttons.push({label:copy('Überspringen','Skip'),onClick:close});
 if(page>0)buttons.push({label:copy('Zurück','Back'),onClick:function(){page--;render();}});
 buttons.push({label:page===3?copy('Karriere starten','Start career'):copy('Weiter','Next'),primary:true,onClick:function(){if(page===3)close();else{page++;render();}}});
 A.shell.dialog(copy('Willkommen bei The Great Art Race','Welcome to The Great Art Race'),html,buttons,'dialog--tutorial');
}
function close(){var A=window.ArtRace;if(A&&A.shell)A.shell.closeDialog();}
function open(){page=0;render();}
document.addEventListener('click',function(e){if(e.target.closest('#hud-tutorial-help'))open();});
window.ArtRaceTutorial={open:open};
})();