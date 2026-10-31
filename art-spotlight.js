/* Occasional, dismissible art-history spotlight during journeys. */
(function(){
 'use strict';
 var seenDay=-1, dismissTimer=null;
 function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
 function dismiss(){
  if(dismissTimer){clearTimeout(dismissTimer);dismissTimer=null;}
  var box=document.getElementById('art-spotlight');if(box)box.remove();
 }
 function language(){return window.ArtRaceLanguage && window.ArtRaceLanguage.get()==='de';}
 function showSpotlight(day){
  var A=window.ArtRace, G=window.ArtRaceGame && window.ArtRaceGame.G;
  if(!A||!G||!G.started||G.ended||!G.voyage||day===seenDay||day%7!==0)return;
  if(document.getElementById('overlay') && !document.getElementById('overlay').hidden)return;
  var images=window.ART_ARTWORK_IMAGES && window.ART_ARTWORK_IMAGES.images || {};
  var works=(A.works||[]).filter(function(w){return images[w.id] && images[w.id].file;});
  if(!works.length)return;
  seenDay=day;
  var w=works[Math.floor(day/7)%works.length];
  var artist=A.artistById && A.artistById[w.artistId];
  var de=language();
  var note=de?'Entdecke ein Werk aus der Kunstgeschichte. Tippe auf das Bild, um mehr zu erfahren.':'Discover a work of art history. Tap the picture to learn more.';
  dismiss();
  var panel=document.createElement('aside');
  panel.id='art-spotlight';panel.className='art-spotlight';
  panel.setAttribute('role','status');
  panel.innerHTML='<button type="button" class="art-spotlight-close" aria-label="'+(de?'Schließen':'Close')+'">×</button>'+
   '<div class="art-spotlight-label">'+(de?'Kunstwerk auf Reisen':'Art on your journey')+'</div>'+
   '<button type="button" class="art-spotlight-picture" aria-label="'+(de?'Kunstwerk ansehen':'View artwork')+'"><img src="'+esc(images[w.id].file)+'" alt="'+esc(w.title)+'"></button>'+
   '<div class="art-spotlight-copy"><strong>'+esc(w.title)+'</strong><span>'+esc(artist?artist.name:'')+' · '+esc(w.yearCreated)+' · '+esc(A.workEpoch?A.workEpoch(w):'')+'</span><small>'+note+'</small></div>';
  document.body.appendChild(panel);
  panel.querySelector('.art-spotlight-close').addEventListener('click',dismiss);
  panel.querySelector('.art-spotlight-picture').addEventListener('click',function(){
   dismiss(); if(A.artView&&A.artView.open)A.artView.open(w.id,null);
  });
  dismissTimer=setTimeout(dismiss,7000);
 }
 window.addEventListener('artrace-day-advanced',function(ev){showSpotlight(ev.detail&&ev.detail.day);});
 window.addEventListener('pagehide',dismiss);
})();
