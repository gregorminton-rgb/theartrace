/* Art-catalogue localization; data stays in its original language. */
(function(global){
 'use strict';
 var map={"Renaissance":"Renaissance","Baroque":"Barock","Rococo":"Rokoko","Romanticism":"Romantik","Impressionism":"Impressionismus","Modern":"Moderne","Contemporary":"Zeitgenössische Kunst","Painting":"Gemälde","Print":"Druckgrafik","Drawing":"Zeichnung","Sculpture":"Skulptur","Europe":"Europa","Asia":"Asien","America":"Amerika","French":"Französisch","German":"Deutsch","Italian":"Italienisch","Austrian":"Österreichisch","Russian":"Russisch","Norwegian":"Norwegisch","Dutch":"Niederländisch","Spanish":"Spanisch","Japanese":"Japanisch","British":"Britisch","American":"Amerikanisch","Flemish":"Flämisch","Swiss":"Schweizerisch","Oil on canvas":"Öl auf Leinwand","Oil on panel":"Öl auf Holztafel","Oil on board":"Öl auf Platte","Oil on cardboard":"Öl auf Karton","Oil on poplar panel":"Öl auf Pappelholz","Oil on walnut panel":"Öl auf Walnussholz","Oil and opaque colour on wood":"Öl- und Deckfarben auf Holz","Tempera on panel":"Tempera auf Holztafel","Tempera and oil on board":"Tempera und Öl auf Platte","Oil on panel, transferred to canvas":"Öl auf Holztafel, auf Leinwand übertragen","Oil on oak panel":"Öl auf Eichenholz","Oil on oak panels (triptych)":"Öl auf Eichenholztafeln (Triptychon)","Pointillist oil on canvas":"Pointillistische Ölmalerei auf Leinwand","Watercolour and bodycolour":"Aquarell und Deckfarbe","Watercolour and bodycolour on paper":"Aquarell und Deckfarbe auf Papier","Gouache, watercolour and black crayon on paper":"Gouache, Aquarell und schwarze Kreide auf Papier","Gouache on paper":"Gouache auf Papier","Pastel on paper":"Pastell auf Papier","Pastel and charcoal on paper":"Pastell und Kohle auf Papier","Pencil and crayon on paper":"Bleistift und Kreide auf Papier","Pencil and black chalk":"Bleistift und schwarze Kreide","Pencil and gouache on paper":"Bleistift und Gouache auf Papier","Red chalk on paper":"Rötel auf Papier","Pen and ink on parchment":"Feder und Tusche auf Pergament","Silverpoint and pen on parchment":"Silberstift und Feder auf Pergament","Pen and ink with wash":"Feder und Tusche mit Lavierung","Ink on paper":"Tusche auf Papier","Ink and watercolour":"Tusche und Aquarell","Chalk and stencil on paper":"Kreide und Schablone auf Papier","Engraving on laid paper":"Kupferstich auf Büttenpapier","Etching and engraving":"Radierung und Kupferstich","Etching and aquatint":"Radierung und Aquatinta","Woodblock print, nishiki-e":"Farbholzschnitt (Nishiki-e)","Colour lithograph":"Farblithografie","Colour lithograph, set of four":"Farblithografie, vierteilig","Colour lithograph poster on paper":"Farblithografie-Plakat auf Papier","Charcoal and gouache on board":"Kohle und Gouache auf Platte","Bronze, brown patina":"Bronze mit brauner Patina","Original medium":"Originaltechnik","Original size":"Originalmaße","Painter":"Künstler","Kind":"Bildgattung","Epoch":"Epoche","School":"Kunstschule","Medium":"Maltechnik","Size":"Größe","Life":"Lebensdaten","Painted":"Entstehungsjahr","Rarity":"Seltenheit","Note":"Hinweis","Hangs today":"Heutiger Standort","The original":"Das Original","Unknown":"Unbekannt","Paris":"Paris","Florence":"Florenz","Rome":"Rom","Vienna":"Wien","London":"London","Munich":"München","Berlin":"Berlin","Moscow":"Moskau","New York":"New York","Amsterdam":"Amsterdam","Museum of Modern Art":"Museum of Modern Art","Uffizi Gallery":"Uffizien","National Gallery":"Nationalgalerie","Tretyakov Gallery":"Tretjakow-Galerie","The Art Institute of Chicago":"Art Institute of Chicago"};
 function de(){return !!(global.ArtRaceLanguage&&global.ArtRaceLanguage.get()==='de');}
 function translate(value){
   if(!de()||value==null)return value;
   var s=String(value);
   if(Object.prototype.hasOwnProperty.call(map,s))return map[s];
   s=s.replace(/\bOil on canvas\b/g,'Öl auf Leinwand')
      .replace(/\bOil on wood\b/g,'Öl auf Holz')
      .replace(/\bOil on panel\b/g,'Öl auf Holztafel')
      .replace(/\bTempera on panel\b/g,'Tempera auf Holztafel')
      .replace(/\bWatercolour\b/g,'Aquarell')
      .replace(/\bwatercolour\b/g,'Aquarell')
      .replace(/\bInk on paper\b/g,'Tusche auf Papier')
      .replace(/\bPencil on paper\b/g,'Bleistift auf Papier')
      .replace(/\bCharcoal on paper\b/g,'Kohle auf Papier')
      .replace(/\bOil on\b/g,'Öl auf')
      .replace(/\bPen and ink\b/g,'Feder und Tusche')
      .replace(/\bon paper\b/g,'auf Papier')
      .replace(/\bon canvas\b/g,'auf Leinwand')
      .replace(/\bon parchment\b/g,'auf Pergament');
   return s;
 }
 global.ArtRaceArtI18n={translate:translate};
})(window);
