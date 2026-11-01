/* Five collectible tiers and stable, city-specific original artwork markets. */
(function(global){
 'use strict';
 var A=global.ArtRace;
 var letters=['A','B','C','D','E'];
 function artTier(w) {
   if (!w) return {grade:'E',multiplier:1,cityCount:0};
   var rarity=Number(w.rarity)||0;
   /* The game's celebrated masters are top-tier, including less rare works. */
   var grade=(w.artistId==='picasso'||w.artistId==='rembrandt'||rarity>=10)?'A':
     rarity>=9?'B':rarity>=8?'C':rarity>=7?'D':'E';
   return {grade:grade,multiplier:5-letters.indexOf(grade),cityCount:{A:1,B:2,C:4,D:7,E:A.cities.length}[grade]};
 }
 function citiesFor(w){
   if(!w)return [];
   var candidates=A.cities.filter(function(c){return c.dealerStockSize>0;});
   if(!candidates.length)candidates=A.cities.slice();
   var count=Math.min(artTier(w).cityCount,candidates.length);
   if(count===candidates.length)return candidates.map(function(c){return c.id;});
   var hash=2166136261;
   for(var i=0;i<String(w.id).length;i++){
     hash=Math.imul(hash ^ String(w.id).charCodeAt(i),16777619)>>>0;
   }
   var start=hash%candidates.length;
   var step=1+(Math.floor(hash/997)%Math.max(1,candidates.length-1));
   /* Every step must visit different cities; use a prime-like odd step when needed. */
   function gcd(a,b){while(b){var t=a%b;a=b;b=t;}return a;}
   while(gcd(step,candidates.length)!==1)step=(step%candidates.length)+1;
   var result=[];
   for(var j=0;j<count;j++)result.push(candidates[(start+j*step)%candidates.length].id);
   return result;
 }
 function available(w,cityId){return citiesFor(w).indexOf(cityId)!==-1;}
 A.artTier=artTier;
 A.artMarketCities=citiesFor;
 A.artAvailableInCity=available;
})(window);
