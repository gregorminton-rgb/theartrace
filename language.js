/* Bilingual presentation layer; independent from saved careers. */
(function(){
'use strict';
var KEY='theartrace.language.v1', lang='en', chosen=false;
try { var saved=localStorage.getItem(KEY);if(saved==='de'||saved==='en'){lang=saved;chosen=true;} } catch(e){}
var pairs=[
['New Game','Neues Spiel'],['Continue','Fortsetzen'],['How to Play','Spielanleitung'],['Data Source','Datenquelle'],
['Buy low in Amsterdam. Sell high in Berlin. Mind the fakes.','Kaufe günstig in Amsterdam. Verkaufe teuer in Berlin. Hüte dich vor Fälschungen.'],
['Prototype build · every number is exported from the Unity project','Prototyp · alle Werte aus dem Unity-Projekt exportiert'],
['Travel','Reisen'],['Dealer','Kunsthandel'],['Portfolio','Sammlung'],['Auction','Auktion'],['Bank','Bank'],['Studio','Atelier'],['Trade','Handel'],
['Market indices','Marktindizes'],['News','Nachrichten'],['End day','Tag beenden'],['Cash','Bargeld'],['Reputation','Ansehen'],['Goal','Ziel'],
['Music','Musik'],['Gallery in Amsterdam','Galerie in Amsterdam'],['Day speed','Tagesgeschwindigkeit'],['Let days pass automatically','Tage automatisch verstreichen lassen'],
['slow','langsam'],['normal','normal'],['fast','schnell'],['Plantation menu','Plantagenmenü'],['Crops','Feldfrüchte'],['Sow fields','Felder bestellen'],
['Ship the harvest','Ernte verschiffen'],['Store','Lager'],['Supplies & crates','Vorräte und Kisten'],['Workers','Arbeitskräfte'],['Hire & assign','Einstellen und zuweisen'],
['World map','Weltkarte'],['Warehouse','Lagerhaus'],['Colonial plantation','Kolonialplantage'],
['Pick a port on the chart — a city or another colony — and sail on from here.','Wähle einen Hafen auf der Karte – eine Stadt oder eine andere Kolonie – und segle weiter.'],
['How to play','Spielanleitung'],['Data source','Datenquelle'],['Back','Zurück'],['Close','Schließen'],
['Set up a career','Spiel vorbereiten'],['Name of the dealer','Name des Kunsthändlers'],['Difficulty','Schwierigkeit'],['Career length','Spieldauer'],
['Starting city','Startstadt'],['Cancel','Abbrechen'],['Begin career','Spiel starten'],['Easy','Einfach'],['Hard','Schwer'],
['rivals','Konkurrenten'],['fees','Gebühren'],['days','Tage'],['day','Tag'],['pictures','Gemälde'],
['artists','Künstler'],['cities','Städte'],['artworks','Kunstwerke'],['market events','Marktereignisse'],
['Artists','Künstler'],['Cities','Städte'],['Artworks','Kunstwerke'],['Market events','Marktereignisse'],
['Economy keys','Wirtschaftsparameter'],['Web-only knobs','Web-spezifische Parameter'],
['How money is made','So verdienst du Geld'],['Risks','Risiken'],['Forgeries.','Fälschungen.'],['Condition.','Zustand.'],
['Debt.','Schulden.'],['News.','Nachrichten.'],['Colonies & plantations','Kolonien und Plantagen'],
['Buy','Kaufen'],['Sell','Verkaufen'],['Bid','Bieten'],['Pass','Passen'],['Examine','Prüfen'],
['Restore','Restaurieren'],['Collect','Abholen'],['Borrow','Leihen'],['Repay','Zurückzahlen'],['Buy slot','Platz kaufen'],
['Loading','Lädt'],['Select','Auswählen'],['Market','Markt'],['Price','Preis'],['Value','Wert'],
['Condition','Zustand'],['Authenticity','Echtheit'],['Buy now','Jetzt kaufen'],['Sell now','Jetzt verkaufen'],
['Day','Tag'],['Month','Monat'],['Year','Jahr'],['January','Januar'],['February','Februar'],['March','März'],
['April','April'],['May','Mai'],['June','Juni'],['July','Juli'],['August','August'],['September','September'],
['October','Oktober'],['November','November'],['December','Dezember'],
['Your collection','Deine Sammlung'],['Owned','Im Besitz'],['Available','Verfügbar'],['Capacity','Kapazität'],
['Buy artwork','Kunstwerk kaufen'],['Sell artwork','Kunstwerk verkaufen'],['Starting money','Startkapital'],
['Workers available','Verfügbare Arbeitskräfte'],['Harvest','Ernte'],['Fields','Felder'],
['Planted','Angepflanzt'],['Ready','Bereit'],['Production','Produktion'],['Sail','Segeln'],
['Open','Öffnen'],['Return','Zurückkehren'],['Continue game','Spiel fortsetzen'],
['Price per unit','Stückpreis'],['Total','Gesamt'],['Profit','Gewinn'],['Loss','Verlust'],
['Expert','Experte'],['Forgery','Fälschung'],['Genuine','Echt'],['Unknown','Unbekannt'],
['No offers','Keine Angebote'],['Sold','Verkauft'],['Bought','Gekauft'],['Destination','Zielort'],
['Reputation:','Ansehen:'],['Cash:','Bargeld:'],['Current city','Aktueller Ort'],
['Buy low','Günstig einkaufen'],['Sell high','Teuer verkaufen'],
["The collection","Die Sammlung"],
["Pictures held","Gemälde im Besitz"],
["Market value of the collection","Marktwert der Sammlung"],
["Paid for it all","Gesamter Kaufpreis"],
["Crate slots bought","Gekaufte Kistenplätze"],
["Career","Karriere"],
["Days used","Verbrauchte Tage"],
["Net worth","Nettovermögen"],
["Cash on hand","Bargeldbestand"],
["Debt","Schulden"],
["Deals","Geschäfte"],
["Best / worst flip","Bester / schlechtester Verkauf"],
["Forgeries passed on","Weiterverkaufte Fälschungen"],
["By epoch","Nach Epoche"],
["Read the journal","Tagebuch lesen"],
["New career","Neue Karriere"],
["crates","Kisten"],
["none","keine"],
["of","von"],
["bought","gekauft"],
["sold","verkauft"],
["A new day","Ein neuer Tag"],
["Auction house","Auktionshaus"],
["Auction lots","Auktionslose"],
["Current auction","Aktuelle Auktion"],
["Sell goods","Waren verkaufen"],
["Trade goods","Handelswaren"],
["Plant crops","Feldfrüchte pflanzen"],
["Hire worker","Arbeitskraft einstellen"],
["Upgrade field","Feld verbessern"],
["Harvest now","Jetzt ernten"],
["Your fields","Deine Felder"],
["Go back","Zurück"],
["Close window","Fenster schließen"],
["No artworks","Keine Kunstwerke"],
["No news","Keine Nachrichten"],
["Continue career","Karriere fortsetzen"],
["Available cash","Verfügbares Bargeld"],
["Bank balance","Kontostand"],
["Auction results","Auktionsergebnisse"],
["Journal","Tagebuch"],
["Overview","Übersicht"],
["Buy price","Kaufpreis"],
["Sale price","Verkaufspreis"],
["Travel cost","Reisekosten"],
["Travel time","Reisezeit"],
["Trade route","Handelsroute"],
["Available routes","Verfügbare Routen"],
["Current location","Aktueller Standort"],
["Harvested","Geerntet"],
["Planted fields","Bepflanzte Felder"],
["Workers assigned","Zugewiesene Arbeitskräfte"],
["Stock","Lagerbestand"],
["In stock","Auf Lager"],
["Out of stock","Nicht verfügbar"],
["Quantity","Menge"],
["Unit price","Einzelpreis"],
["Storage","Lagerung"],
["Warehouse capacity","Lagerkapazität"],
["Available workers","Verfügbare Arbeitskräfte"],
["Assign","Zuweisen"],
["Remove","Entfernen"],
["Sell all","Alles verkaufen"],
["Buy all","Alles kaufen"],
["Selected","Ausgewählt"],
["Next day","Nächster Tag"],
["Report","Bericht"],
["Statistics","Statistik"],
["Profit / loss","Gewinn / Verlust"],
["Instructions","Anleitung"],
["Help","Hilfe"],
["Start game","Spiel starten"],
["New game","Neues Spiel"],
["Game over","Spielende"],
["End of career","Karriereende"],
["Victory","Sieg"],
["Defeat","Niederlage"],
["Congratulations","Glückwunsch"],
["Continue —","Fortsetzen —"]
];
var map=Object.create(null),reverse=Object.create(null);
pairs.forEach(function(p){map[p[0]]=p[1];if(!(p[1] in reverse))reverse[p[1]]=p[0];});
var originals=new WeakMap(), rendered=new WeakMap(),mutating=false;
function convert(s){
 var match=/^(\s*)([\s\S]*?)(\s*)$/.exec(s);if(!match||!match[2])return s;
 var text=match[2], result=lang==='de'?(map[text]||text):text;
 if(lang==='de'&&result===text)result=text.replace(/^Continue — day (\d+) of (\d+)/,'Fortsetzen — Tag $1 von $2')
 .replace(/(\d+) pictures\b/g,'$1 Gemälde').replace(/^Cash (?=\$)/,'Bargeld ')
 .replace(/^Reputation (?=\d)/,'Ansehen ').replace(/^Goal (?=\$)/,'Ziel ')
 .replace(/^Gallery in /,'Galerie in ').replace(/(\d+) artists · /,'$1 Künstler · ')
 .replace(/(\d+) cities · /,'$1 Städte · ').replace(/(\d+) artworks · /,'$1 Kunstwerke · ')
 .replace(/(\d+) market events · /,'$1 Marktereignisse · ')
 .replace(/economy parameters, all exported from the Unity project\./,'Wirtschaftsparameter, alle aus dem Unity-Projekt exportiert.');
 return match[1]+result+match[3];
}
function walk(root){
 if(!root || root.nodeType===1 && root.closest && root.closest('#language-gate,script,style'))return;
 if(root.nodeType===3){
   if(!root.nodeValue.trim())return;
   var src=originals.get(root);
   if(src===undefined || (root.nodeValue!==src && root.nodeValue!==rendered.get(root))){src=root.nodeValue;originals.set(root,src);}
   var target=convert(src);if(root.nodeValue!==target)root.nodeValue=target;
   rendered.set(root,target);
   return;
 }
 if(root.nodeType!==1&&root.nodeType!==9&&root.nodeType!==11)return;
 if(root.nodeType===1){
   ['title','aria-label','placeholder'].forEach(function(attr){
     if(!root.hasAttribute(attr))return;
     var key='data-i18n-source-'+attr;
     var src=root.getAttribute(key);
     if(src===null){src=root.getAttribute(attr);root.setAttribute(key,src);}
     var target=convert(src);if(root.getAttribute(attr)!==target)root.setAttribute(attr,target);
   });
   if(root.tagName==='INPUT'||root.tagName==='TEXTAREA')return;
 }
 Array.from(root.childNodes).forEach(walk);
}
var queued=false;
function paint(){
 if(queued)return;queued=true;
 Promise.resolve().then(function(){queued=false;mutating=true;walk(document.body);mutating=false;});
}
function setLanguage(value){
 if(value!=='de'&&value!=='en')return;
 lang=value;chosen=true;
 try{localStorage.setItem(KEY,value);}catch(e){}
 document.documentElement.lang=value;
 var gate=document.getElementById('language-gate');if(gate)gate.hidden=true;
 document.querySelectorAll('.language-switch').forEach(function(button){button.textContent=value==='de'?'DE / EN':'EN / DE';});
 paint();
}
function showGate(){
 var gate=document.getElementById('language-gate');if(!gate)return;
 gate.hidden=false;
 var btn=gate.querySelector('[data-select-language="'+lang+'"]')||gate.querySelector('button');
 if(btn)btn.focus();
}
document.addEventListener('click',function(ev){
 var selection=ev.target.closest('[data-select-language]');
 if(selection){setLanguage(selection.getAttribute('data-select-language'));return;}
 if(ev.target.closest('#language-switch,[data-change-language]')){showGate();}
});
document.addEventListener('keydown',function(ev){
 var gate=document.getElementById('language-gate');
 if(!gate||gate.hidden)return;
 if(ev.key==='Escape'){ev.preventDefault();ev.stopImmediatePropagation();}
 if(ev.key==='Tab'){var btns=Array.from(gate.querySelectorAll('button'));if(!btns.length)return;
 var current=btns.indexOf(document.activeElement),next=ev.shiftKey?(current<=0?btns.length-1:current-1):(current===btns.length-1?0:current+1);
 if(current<0)next=0;ev.preventDefault();btns[next].focus();}
},true);
document.documentElement.lang=lang;
if(!chosen)showGate();
if(typeof MutationObserver!=='undefined'){
 var observer=new MutationObserver(function(records){if(mutating)return;
 for(var i=0;i<records.length;i++){if(records[i].target.closest&&records[i].target.closest('#language-gate'))continue;paint();break;}
 });
 observer.observe(document.body,{subtree:true,childList:true,characterData:true});
}
paint();
window.ArtRaceLanguage={get:function(){return lang;},set:setLanguage};
})();