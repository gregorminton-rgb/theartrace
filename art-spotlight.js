/* Dismissible art-history spotlight, in cities, colonies and on journeys. */
(function(){
 'use strict';
 var seenDay=-1, dismissTimer=null, bag=[], lastWorkId=null, bagSignature='';
 /* Shuffle bag: show each available artwork once before reshuffling. */
 function shuffle(ids){
  for(var i=ids.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=ids[i];ids[i]=ids[j];ids[j]=t;}
  return ids;
 }
 function nextArtwork(works){
  var ids=works.map(function(w){return w.id;});
  var signature=ids.slice().sort().join('|');
  if(signature!==bagSignature){bag=[];bagSignature=signature;lastWorkId=null;}
  if(!bag.length){
   bag=shuffle(ids.slice());
   if(bag.length>1 && bag[bag.length-1]===lastWorkId){
    var swap=0;while(swap<bag.length-1&&bag[swap]===lastWorkId)swap++;
    var t=bag[bag.length-1];bag[bag.length-1]=bag[swap];bag[swap]=t;
   }
  }
  var selected=bag.pop();lastWorkId=selected;
  return works.filter(function(w){return w.id===selected;})[0];
 }
 function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
 function dismiss(){
  if(dismissTimer){clearTimeout(dismissTimer);dismissTimer=null;}
  var box=document.getElementById('art-spotlight');if(box)box.remove();
 }
 function language(){return window.ArtRaceLanguage && window.ArtRaceLanguage.get()==='de';}
 function showSpotlight(day){
  var A=window.ArtRace, G=window.ArtRaceGame && window.ArtRaceGame.G;
  if(day<seenDay){seenDay=-1;bag=[];lastWorkId=null;}
  if(!A||!G||!G.started||G.ended||day===seenDay||day%7!==0)return;
  if(document.getElementById('overlay') && !document.getElementById('overlay').hidden)return;
  var images=window.ART_ARTWORK_IMAGES && window.ART_ARTWORK_IMAGES.images || {};
  var works=(A.works||[]).filter(function(w){return images[w.id] && images[w.id].file;});
  if(!works.length)return;
  seenDay=day;
  var w=nextArtwork(works);
  var artist=A.artistById && A.artistById[w.artistId];
  var de=language();
  var note=de?'Entdecke ein Werk aus der Kunstgeschichte. Tippe auf das Bild, um mehr zu erfahren.':'Discover a work of art history. Tap the picture to learn more.';
  dismiss();
  var panel=document.createElement('aside');
  panel.id='art-spotlight';panel.className='art-spotlight';
  panel.setAttribute('role','status');
  panel.innerHTML='<button type="button" class="art-spotlight-close" aria-label="'+(de?'Schließen':'Close')+'">×</button>'+
   '<div class="art-spotlight-label">'+(de?'Kunstwerk des Tages':'Artwork of the day')+'</div>'+
   '<button type="button" class="art-spotlight-picture" aria-label="'+(de?'Kunstwerk ansehen':'View artwork')+'"><img src="'+esc(images[w.id].file)+'" alt="'+esc(w.title)+'"></button>'+
   '<div class="art-spotlight-copy"><strong>'+esc(w.title)+'</strong><span>'+esc(artist?artist.name:'')+' · '+esc(w.yearCreated)+' · '+esc(A.workEpoch?A.workEpoch(w):'')+'</span><small>'+note+'</small></div>';
  document.body.appendChild(panel);
  panel.querySelector('.art-spotlight-close').addEventListener('click',dismiss);
  panel.querySelector('.art-spotlight-picture').addEventListener('click',function(){
   dismiss(); if(A.artView&&A.artView.open)A.artView.open(w.id,null);
  });
  dismissTimer=setTimeout(dismiss,7000);
 }
 /* Every ended day closes the previous day's artwork, even on a colony
    or while a dialog is open. A new spotlight belongs only to the new day. */
 window.addEventListener('artrace-day-advanced',function(ev){
  dismiss();
  showSpotlight(ev.detail && ev.detail.day);
 });
 window.addEventListener('pagehide',dismiss);
})();
