/* Bilingual presentation layer; independent from saved careers. */
(function(){
'use strict';
var KEY='theartrace.language.v1', lang='en', chosen=false;
try { var saved=localStorage.getItem(KEY);if(saved==='de'||saved==='en'){lang=saved;chosen=true;} } catch(e){}
var pairs=[
["Baroque revival in the Low Countries","Barock erlebt in den Niederlanden einen Aufschwung"],
["Cheap money on the continent","Günstige Kredite auf dem Kontinent"],
["Forgery scandal shakes the trade","Fälschungsskandal erschüttert den Kunsthandel"],
["Impressionist bubble bursts","Preisblase beim Impressionismus platzt"],
["New York discovers the Moderns","New York entdeckt die moderne Kunst"],
["Museum endowment drives Baroque prices","Museumsstiftung treibt Barockpreise hoch"],
["Renaissance scholarship pays","Neue Forschung steigert Renaissancepreise"],
["Rococo falls out of fashion","Rokoko kommt aus der Mode"],
["Secession fever in Wien","Secessionskunst begeistert Wien"],
["Tokio print craze","Japanische Druckgrafiken in Tokio gefragt"],
["Travelling exhibition lifts Romanticism","Wanderausstellung belebt die Romantik"],
["War scare empties the salerooms","Kriegsangst leert die Auktionssäle"],
["Boom","Aufschwung"],
["Crash","Kurseinbruch"],
["SingleCity","Eine Stadt"],
["AllCities","Alle Städte"],
["Region","Region"],
["Epoch","Epoche"],
["Index","Index"],
["Day","Tag"],
['New Game','Neues Spiel'],['Continue','Fortsetzen'],['How to Play','Spielanleitung'],['Data Source','Datenquelle'],
['Buy low in Amsterdam. Sell high in Berlin. Mind the fakes.','Kaufe günstig in Amsterdam. Verkaufe teuer in Berlin. Hüte dich vor Fälschungen.'],
['A hand-built art trading game · version 1.0','Ein handgefertigtes Kunsthandelsspiel · Version 1.0'],
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
pairs.push(["Sale in progress","Auktion läuft"],["Welcome to the trade.","Willkommen im Kunsthandel."],["Correct — the price is reduced.","Richtig – der Preis wird reduziert."],["Wrong answer — the price stays.","Falsche Antwort – der Preis bleibt unverändert."],["The engraved chart could not be drawn — the list below still works.","Die Karte konnte nicht angezeigt werden – die Liste darunter funktioniert weiterhin."],["Unknown","Unbekannt"],["authenticated","authentifiziert"],["unexamined","ungeprüft"],["revealed forgery","erkannte Fälschung"],["FORGERY","FÄLSCHUNG"],["Multiple fields","Mehrere Felder"],["Field details","Felddetails"],["Select all","Alle auswählen"],["Clear","Auswahl aufheben"],["Auto on","Automatik ein"],["Auto off","Automatik aus"],["✓ Auto-shipping on","✓ Automatischer Versand ein"],["Ship automatically","Automatisch verschiffen"],["Ripe — ready to harvest","Reif – erntebereit"],["You won the art race!","Du hast das Kunstrennen gewonnen!"],["Final standings","Endstand"],["Four-player race","Rennen mit vier Spielern"],["Human player","Mensch"],["Computer","Computer"],["Opponent","Gegner"],["Name of the dealer","Name des Kunsthändlers"],["Starting city","Startstadt"],["Career length","Spieldauer"],["Set up a career","Spiel vorbereiten"],["Begin career","Spiel beginnen"],["Dealer gallery","Kunstgalerie"],["Your warehouse","Dein Lagerhaus"],["Restoration studio","Restaurierungsatelier"],["Travel office","Reisebüro"],["Trade desk","Handelsplatz"],["Career report","Karrierebericht"],["No ship at sea.","Kein Schiff unterwegs."],["Sold on arrival","Bei Ankunft verkauft"],["Stored","Eingelagert"],["Auto days","Auto-Tage"],["At sea","Auf See"],["Under way","Unterwegs"],["Cocoa","Kakao"],["Tea","Tee"],["Coffee","Kaffee"],["Tobacco","Tabak"],["Textiles","Textilien"],["Tap a field to view its details. Tap it again to deselect.","Feld antippen für Details, erneut tippen zum Abwählen."],["Use the buttons above to enable or disable automation for the selected fields.","Automatik für alle ausgewählten Felder mit den Schaltflächen oben ein- oder ausschalten."],["Most paintings at the end of the career wins.","Wer am Ende die meisten Gemälde besitzt, gewinnt."],["One human player and three computer opponents. Most paintings after the career wins.","Ein Mensch und drei Computergegner. Wer am Ende die meisten Gemälde besitzt, gewinnt."]);
pairs.push(["No trade desk here — sell colonial produce in London, New York or Tokio.","Hier gibt es keinen Handelsplatz – verkaufe Kolonialwaren in London, New York oder Tokio."],["Sell all","Alles verkaufen"],["Sell 1","1 verkaufen"],["Produce prices drift with the calendar; London, New York and Tokio pay different rates.","Warenpreise ändern sich täglich; London, New York und Tokio zahlen unterschiedliche Preise."],["No news. The salerooms are quiet.","Keine Nachrichten. In den Auktionshäusern ist es ruhig."],["Bid until the room stops you, then settle the commission.","Biete mit, bis die Auktion endet, und bezahle danach die Provision."],["Sell the colonial harvest — London and New York pay different rates.","Verkaufe deine Kolonialernte – London und New York bieten unterschiedliche Preise."],["A gallery is the fast, expensive way to buy — auction rooms are cheaper, if you can wait for the hammer.","In Galerien kaufst du schnell, aber teuer. Auktionen sind günstiger, wenn du warten kannst."],["No crates yet. Buy something at the dealer, or take a chance at the auction.","Deine Kisten sind noch leer. Kaufe beim Händler oder versuche dein Glück bei einer Auktion."],["To-day is the sale: the catalogue is being hung. Come back in a moment.","Heute ist Auktionstag. Der Katalog wird vorbereitet. Komm gleich wieder."],["The sale list is being drawn up — come back tomorrow.","Die Auktionsliste wird erstellt – komm morgen wieder."],["HAMMERED TO YOU","ZUSCHLAG FÜR DICH"],["sold to the room","an einen anderen Bieter verkauft"],["Cash in hand","Bargeldbestand"],["Loans are added straight to your purse","Kredite werden direkt deinem Bargeld gutgeschrieben"],["Extra crate space","Zusätzlicher Kistenplatz"],["Nothing to restore — the warehouse is empty.","Nichts zu restaurieren – dein Lager ist leer."],["collect when the frame dries","Abholen, sobald der Rahmen trocken ist"],["Your copy","Dein Exemplar"],["Purchased","Gekauft"],["Restoring","In Restaurierung"],["In your collection","In deiner Sammlung"],["Dealer asking price","Händlerpreis"],["Auction estimate","Auktionsschätzung"],["No picture imported for this work yet","Für dieses Kunstwerk wurde noch kein Bild importiert"],["The original","Das Original"],["The painter","Der Künstler"],["Provenance","Herkunft"],["Authenticity","Echtheit"],["Condition","Zustand"],["From","Von"],["Travel time","Reisedauer"],["Fare","Fahrpreis"],["Cash afterwards","Verbleibendes Bargeld"],["Yes, sail","Ja, ablegen"],["Drag a plate onto a plot to lay out a field. That plot is then yours — and only there can the overseer take over.","Ziehe eine Pflanzkarte auf eine Parzelle. Danach gehört die Parzelle dir und kann automatisch bewirtschaftet werden."],["hired","eingestellt"],["working","im Einsatz"],["idle","frei"],["Hire worker","Arbeitskraft einstellen"],["RIPE","REIF"],["empty plot","freie Parzelle"],["Automation is controlled above for all selected fields. The overseer harvests, replants and assigns workers automatically.","Die Automatik gilt für alle ausgewählten Felder. Der Verwalter erntet, sät erneut und teilt Arbeitskräfte zu."],["Ship the harvest","Ernte verschiffen"],["Goods · ashore · exchange pays","Waren · an Land · Marktpreis"],["Loading","Verladen"],["cancel","abbrechen"],["City","Stadt"],["Colony","Kolonie"],["Trade","Handel"],["The colony is fully staffed.","Die Kolonie verfügt bereits über alle Arbeitskräfte."],["Ship automatically","Automatisch verschiffen"],["Expert question:","Expertenfrage:"],["reserve","Mindestpreis"],["bid","Gebot"],["estimate","Schätzwert"],["paid","bezahlt"],["Restocks every","Neue Ware alle"],["consignor estimate","Schätzung des Einlieferers"],["at sea","auf See"],["in hand","verfügbar"],["Day","Tag"],["day","Tag"]);
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
 .replace(/economy parameters\./,'Wirtschaftsparameter.');
 if(lang==='de') {
   result=result
    .replace(/^(\d+) of (\d+) fields selected$/, '$1 von $2 Feldern ausgewählt')
    .replace(/^(\d+)\/(\d+) selected$/, '$1/$2 ausgewählt')
    .replace(/^(\d+) (?:field|fields)\b/, '$1 Felder')
    .replace(/^(\d+) (?:worker|workers)\b/, '$1 Arbeitskräfte')
    .replace(/^(\d+) (?:crate|crates)\b/, '$1 Kisten')
    .replace(/^(\d+) (?:picture|pictures)\b/, '$1 Gemälde')
    .replace(/^Ashore /, 'An Land ')
    .replace(/^Auto: /, 'Automatik: ')
    .replace(/^Harvest (\d+) unit\(s\)/, '$1 Einheiten ernten')
    .replace(/^(\d+) day\(s\) left/, 'Noch $1 Tage')
    .replace(/^You are already en route to /, 'Du bist bereits unterwegs nach ')
    .replace(/^Cash /, 'Bargeld ')
    .replace(/^Reputation /, 'Ansehen ')
    .replace(/^Gallery in /, 'Galerie in ')
    .replace(/^Arrived in /, 'Angekommen in ')
    .replace(/^Arrived at /, 'Angekommen in ')
    .replace(/^Day (\d+) opened\./, 'Tag $1 hat begonnen.')
    .replace(/^NEWS: /, 'NACHRICHT: ')
    .replace(/^Auction in /, 'Auktion in ')
    .replace(/^Trade and travel open again once you are back in a port\.$/, 'Handel und Reisen stehen im nächsten Hafen wieder zur Verfügung.');
 }
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
function updateLanguageButtons(){
 document.querySelectorAll('.language-switch').forEach(function(button){
  button.textContent=lang.toUpperCase();
  button.setAttribute('aria-label',lang==='de'?'Sprache auswählen, aktuell Deutsch':'Choose language, currently English');
  button.setAttribute('aria-expanded','false');
  button.setAttribute('aria-haspopup','true');
 });
}
function closeLanguageMenu(){
 document.querySelectorAll('.language-choice-menu').forEach(function(menu){menu.remove();});
 document.querySelectorAll('.language-switch').forEach(function(button){button.setAttribute('aria-expanded','false');});
}
function openLanguageMenu(button){
 closeLanguageMenu();
 var menu=document.createElement('div');
 menu.className='language-choice-menu';
 menu.setAttribute('role','group');
 menu.setAttribute('aria-label','Language / Sprache');
 [['de','Deutsch'],['en','English']].forEach(function(choice){
  var option=document.createElement('button');
  option.type='button';option.className='language-choice';
  option.textContent=choice[1];option.setAttribute('data-language-choice',choice[0]);
  option.setAttribute('aria-pressed',String(lang===choice[0]));
  menu.appendChild(option);
 });
 document.body.appendChild(menu);
 var rect=button.getBoundingClientRect();
 menu.style.top=Math.min(rect.bottom+5,window.innerHeight-100)+'px';
 menu.style.left=Math.max(6,Math.min(rect.left,window.innerWidth-135))+'px';
 button.setAttribute('aria-expanded','true');
}
function setLanguage(value){
 if(value!=='de'&&value!=='en')return;
 lang=value;chosen=true;
 closeLanguageMenu();
 try{localStorage.setItem(KEY,value);}catch(e){}
 document.documentElement.lang=value;

 updateLanguageButtons();
 paint();
}
document.addEventListener('click',function(ev){
 var choice=ev.target.closest('[data-language-choice]');
 if(choice){setLanguage(choice.getAttribute('data-language-choice'));return;}
 var button=ev.target.closest('.language-switch');
 if(button){
  if(button.getAttribute('aria-expanded')==='true')closeLanguageMenu();
  else openLanguageMenu(button);
  return;
 }
 closeLanguageMenu();
});
document.addEventListener('keydown',function(ev){
 if(ev.key==='Escape')closeLanguageMenu();
});
document.addEventListener('change',function(ev){
 if(ev.target.id==='f-language')setLanguage(ev.target.value);
});
document.documentElement.lang=lang;
updateLanguageButtons();

if(typeof MutationObserver!=='undefined'){
 var observer=new MutationObserver(function(records){if(mutating)return;
 for(var i=0;i<records.length;i++){if(records[i].target.closest&&records[i].target.closest('#language-gate'))continue;paint();break;}
 });
 observer.observe(document.body,{subtree:true,childList:true,characterData:true});
}
paint();
window.ArtRaceLanguage={get:function(){return lang;},set:setLanguage};
})();