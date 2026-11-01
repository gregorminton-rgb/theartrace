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
pairs.push(["Gallery markup","Galerieaufschlag"],["over market value","über dem Marktwert"],["buy-backs pay","Beim Rückkauf zahlt der Händler"],["of value.","des Marktwerts."],["days · gallery markup","Tage · Galerieaufschlag"],["Restocks every","Neue Ware alle"],["The dealer’s shelves are bare until the next restock (day","Der Händler hat bis zur nächsten Lieferung keine Kunstwerke (Tag"],["No auction house in","Kein Auktionshaus in"],["No restoration studio in","Kein Restaurierungsatelier in"],["Nothing to restore — the warehouse is empty.","Keine Gemälde zum Restaurieren – das Lager ist leer."],["Restoration booked · ready day","Restaurierung beauftragt · fertig an Tag"],["if sold now","bei sofortigem Verkauf"],["dealer bids","Händler bietet"],["paid","gekauft für"],["studio · day","Atelier · Tag"],["estimate","Schätzwert"],["The room is dark: the hammer falls in","Das Auktionshaus ist geschlossen. Die nächste Auktion ist in"],["The hammer has fallen. The next sale in","Die Auktion ist beendet. Die nächste Auktion in"],["The sale list is being drawn up — come back tomorrow.","Der Auktionskatalog wird vorbereitet – komm morgen wieder."],["No crates yet. Buy something at the dealer, or take a chance at the auction.","Deine Sammlung ist noch leer. Kaufe Kunst beim Händler oder biete in einer Auktion."],["original total","ursprünglicher Gesamtpreis"],["Original total:","Ursprünglicher Gesamtpreis:"],["Current price:","Aktueller Preis:"],["Quiz complete. Final price:","Quiz abgeschlossen. Endpreis:"],["Expert quiz · Round","Expertenquiz · Runde"],["Correct:","Richtig:"],["Wrong:","Falsch:"],["Saved:","Gespart:"],["Surcharge:","Aufpreis:"],["The studio","Das Atelier"],["per +0.01 condition","pro +1 % Zustand"],["at least","mindestens"],["ready day","fertig an Tag"],["collect when the frame dries","Nach der Restaurierung abholen"],["Restore","Restaurieren"],["Crates your plantations shipped here are waiting on the dock — sell them at today’s price.","Deine Plantagenwaren sind im Hafen angekommen – verkaufe sie zum heutigen Marktpreis."],["Produce prices drift with the calendar; London, New York and Tokio pay different rates. Percent changes compare today with yesterday at this port.","Warenpreise ändern sich täglich. London, New York und Tokio zahlen unterschiedlich. Die Prozentzahl zeigt die Änderung seit gestern in diesem Hafen."],["Percent changes compare today with yesterday at this port.","Die Prozentwerte vergleichen die Preise mit gestern in diesem Hafen."],["crate(s) on the dock","Kisten im Hafen"],["unit(s)","Einheiten"],["crates","Kisten"],["each","pro Stück"],["bought","gekauft"],["sold","verkauft"],["Days used","Vergangene Tage"],["Market indices","Kunstmarktpreise"],["Price level","Preisniveau"],["Day change","Tagesänderung"],["Normal price level","Normales Preisniveau"],["Dealer asking price","Händlerverkaufspreis"],["Auction estimate","Auktionsschätzung"],["On the market here","Marktpreise hier"],["The painter","Der Künstler"],["The original","Das Original"],["Painted","Entstanden"],["Painter","Künstler"],["Kind","Bildgattung"],["Medium","Maltechnik"],["Size","Größe"],["Rarity","Seltenheit"],["Life","Lebensdaten"],["School","Kunstschule"],["Hangs today","Heutiger Standort"],["Original medium","Originaltechnik"],["Original size","Originalgröße"],["a known masterpiece","ein berühmtes Meisterwerk"],["forgeries of this work circulate","Fälschungen dieses Werkes sind im Umlauf"],["excellent","hervorragend"],["good","gut"],["worn","abgenutzt"],["damaged","beschädigt"],["authenticated by an expert","durch Experten geprüft"],["revealed forgery","als Fälschung erkannt"],["not yet examined","noch nicht untersucht"],["Your copy","Dein Exemplar"],["In your collection","In deiner Sammlung"],["Restoring","Wird restauriert"],["Purchased","Gekauft"],["Provenance","Herkunft"],["Original price including commission:","Ursprünglicher Gesamtpreis mit Provision:"],["Correct: −20% · Wrong: +10% of the original total. Up to 60% discount.","Richtig: −20 % · Falsch: +10 % des ursprünglichen Gesamtpreises. Bis zu 60 % Rabatt."],["Gallery wall at night","Galeriewand bei Nacht"],["No picture imported for this work yet","Für dieses Werk ist noch kein Bild vorhanden"],["Most collection points win","Die meisten Sammlungspunkte gewinnen"],["Collection points","Sammlungspunkte"],["Paintings","Gemälde"],["Final standings","Endstand"]);
pairs.push(
 ['Pictures','Gemälde'],['Normal','Normal'],['Speed','Geschwindigkeit'],['Note','Hinweis'],
 ['Base','Standort'],['Collection value','Sammlungswert'],['Best flip','Bester Verkauf'],['Seed','Zufallsstartwert'],
 ['Repay all','Alles zurückzahlen'],['Catalogue on view','Katalog liegt aus'],['by rail','Mit dem Zug'],
 ['From here','Von hier'],['Passage','Überfahrt'],['Afterwards','Danach'],['Not enough cash','Nicht genügend Bargeld'],
 ['Picture failed to load','Bild konnte nicht geladen werden'],['no picture imported yet','Kein Bild verfügbar'],
 ['stand-in','Ersatzabbildung'],['trade hub','Handelszentrum'],['colony','Kolonie'],
 ['the plate shows a different original by the same painter','Die Abbildung zeigt ein anderes Original desselben Künstlers'],
 ['A stand-in plate: a different original by the same painter.','Ersatzabbildung: ein anderes Original desselben Künstlers.'],
 ['Pick a city on the map or in the list to move the gallery there. Gold colony pins can be sailed to.','Wähle eine Stadt auf der Karte oder in der Liste als Reiseziel. Goldene Koloniemarkierungen erreichst du per Schiff.'],
 ['The fare is more than your cash — this crossing cannot be booked.','Dein Bargeld reicht für diese Überfahrt nicht aus.'],
 ['Four player standings','Rangliste der vier Spieler'],['Change language','Sprache ändern'],
 ['Baroque','Barock'],['Rococo','Rokoko'],['Romanticism','Romantik'],['Impressionism','Impressionismus'],
 ['Most collection points win: below 80% = 1 point, 80–89% = 2, 90–100% = 3 per painting.','Wer die meisten Sammlungspunkte erreicht, gewinnt: unter 80 % = 1 Punkt, 80–89 % = 2, 90–100 % = 3 Punkte je Gemälde.'],
 ['rivals -1','Konkurrenten −1'],['rivals +0','Konkurrenten +0'],['rivals +2','Konkurrenten +2'],
 ['fees ×0.75','Gebühren ×0,75'],['fees ×1','Gebühren ×1'],['fees ×1.25','Gebühren ×1,25'],
 ['start ','Startkapital '],['Language / Sprache','Sprache'],['You','Du'],['Human','Mensch'],
 ['short (90 days)','Kurz (90 Tage)'],['medium (180 days)','Mittel (180 Tage)'],['long (365 days)','Lang (365 Tage)'],
 ['VERY GOOD','SEHR GUT'],['EXCELLENT','AUSGEZEICHNET'],['GOOD','GUT'],['POOR','MANGELHAFT'],['FAIR','ORDENTLICH'],['PRISTINE','MAKELLOS'],['RUINED','RUINIERT'],
 ['Amsterdam dealer stock','Lager des Händlers in Amsterdam'],['Private collection','Privatsammlung'],
 ['Plantation','Plantage'],['Colonies','Kolonien'],['Art-trade cities','Kunsthandelsstädte'],['Trade cities','Handelsstädte'],
 ['Cocoa','Kakao'],['Textiles','Textilien'],['Coffee','Kaffee'],['Tea','Tee'],['Tobacco','Tabak'],
 ['From here','Von hier'],['at sea','auf See'],
 ['PostImpressionism','Postimpressionismus'],['Expressionism','Expressionismus'],['Modernism','Moderne'],
 ['Netherlands','Niederlande'],['Germany','Deutschland'],['France','Frankreich'],['Italy','Italien'],
 ['Austria','Österreich'],['England','England'],['United Kingdom','Vereinigtes Königreich'],['United States','Vereinigte Staaten'],
 ['Europe','Europa'],['North America','Nordamerika'],['South America','Südamerika'],['Asia','Asien'],['Africa','Afrika'],
 ['Auction house, morning view','Auktionshaus am Morgen'],['Auction house, the hammer falls','Auktionshaus beim Zuschlag'],
 ['Auction house, bidding from the back row','Auktionshaus, Gebote aus der hinteren Reihe'],
 ['Auction house, catalogue on view','Auktionshaus mit ausgelegtem Katalog'],['Auction house, crates leaving','Abtransport der Kisten aus dem Auktionshaus']
);
pairs.push(
 ['Zoom in','Vergrößern'],['Zoom out','Verkleinern'],['Modern','Moderne'],['Contemporary','Zeitgenössische Kunst'],
 ['Oil on canvas','Öl auf Leinwand'],['Portrait','Porträt'],['Landscape','Landschaft'],['Still Life','Stillleben'],
 ['Behind the painting','Hintergrundgeschichte'],['Museum source','Museumsquelle'],
 ['This original is already owned and has been removed from the dealer shelf.','Dieses Original ist bereits im Besitz eines Sammlers und wurde aus dem Angebot entfernt.'],
 ['That piece is still on the easel at the studio.','Dieses Gemälde wird noch im Atelier restauriert.'],
 ['You have bought every crate slot you are allowed.','Du hast bereits alle verfügbaren Kistenplätze gekauft.'],
 ['The warehouse is as big as it gets.','Das Lager hat seine maximale Größe erreicht.'],
 ['Not enough cash for another crate slot.','Nicht genügend Bargeld für einen weiteren Kistenplatz.'],
 ['Nothing to repay.','Es gibt nichts zurückzuzahlen.'],['No restoration studio here.','Hier gibt es kein Restaurierungsatelier.'],
 ['Already in the studio.','Bereits im Atelier.'],['Nothing left to restore on that piece.','Dieses Gemälde muss nicht restauriert werden.'],
 ['You are ashore on the plantation — sail back to port first.','Du bist auf einer Plantage – reise zuerst zurück in eine Hafenstadt.'],
 ['The hammer is still — bids are only taken on the sale day, in the room.','Gebote sind nur am Auktionstag im Auktionshaus möglich.'],
 ['The room is not taking bids to-day.','Heute nimmt das Auktionshaus keine Gebote an.'],
 ['This auction lot is no longer available.','Dieses Auktionslos ist nicht mehr verfügbar.'],
 ['This lot has already been sold. Choose another open lot.','Dieses Los wurde bereits verkauft. Wähle ein anderes offenes Los.'],
 ['This original is already in a collection; the duplicate lot was withdrawn.','Dieses Original gehört bereits zu einer Sammlung; das doppelte Los wurde zurückgezogen.'],
 ['Ruined','Ruiniert'],['Poor','Mangelhaft'],['Fair','Ordentlich'],['Good','Gut'],['Very Good','Sehr gut'],['Excellent','Ausgezeichnet'],['Pristine','Makellos'],
 ['Switzerland','Schweiz'],['Spain','Spanien'],['Bohemia','Böhmen'],['Americas','Amerika'],['USA','Vereinigte Staaten'],['Brazil','Brasilien'],
 ['Gold Coast','Goldküste'],['India','Indien'],['Jamaica','Jamaika'],['Cuba','Kuba'],['Bengal','Bengalen'],['Dutch East Indies','Niederländisch-Indien'],['Australia','Australien'],
 ['Muenchen','München'],['Zuerich','Zürich'],['Firenze','Florenz'],['Roma','Rom'],
 ['🌱 Colonies','🌱 Kolonien'],['🖼️ Art-trade cities','🖼️ Kunsthandelsstädte'],['🪙 Trade cities','🪙 Handelsstädte'],
 ['Your player name','Dein Spielername']
);
var map=Object.create(null),reverse=Object.create(null);
pairs.forEach(function(p){map[p[0]]=p[1];if(!(p[1] in reverse))reverse[p[1]]=p[0];});
var originals=new WeakMap(), rendered=new WeakMap(),mutating=false;
function dynamicText(text){
 return text
 .replace(/^Continue — day (\d+) of (\d+)/,'Fortsetzen — Tag $1 von $2')
 .replace(/^Pictures (\d+) \/ (\d+)/,'Gemälde $1 / $2')
 .replace(/^Goal: earn the most collection points when the (\d+)-day career ends — condition below 80%: 1 point, 80–89%: 2, 90%\+: 3 per painting\. Starting crates (\d+) of (\d+)\.$/,'Ziel: Sammle bis zum Ende der $1-tägigen Karriere die meisten Sammlungspunkte. Zustand unter 80 %: 1 Punkt, 80–89 %: 2, ab 90 %: 3 Punkte je Gemälde. Startkapazität: $2 von $3 Kisten.')
 .replace(/^(short|medium|long) \((\d+) days\)$/,function(_,duration,days){return ({short:'Kurz',medium:'Mittel',long:'Lang'})[duration]+' ('+days+' Tage)';})
 .replace(/^(Easy|Normal|Hard) — start (.+), rivals ([+-]\d+), fees (×[\d.]+)$/,function(_,difficulty,cash,rivals,fees){return map[difficulty]+' — Startkapital '+cash+', Konkurrenten '+rivals+', Gebühren '+fees.replace('.',',');})
 .replace(/^(.+) (\d+) of (\d+) crates$/,'$1: $2 von $3 Kisten')
 .replace(/^(.+) dealer stock$/,function(_,city){return 'Händlerangebot in '+(map[city]||city);})
 .replace(/^(\d+)d$/,function(_,days){return days+(days==='1'?' Tag':' Tage');})
 .replace(/^Computer opponent (\d+) name$/,'Name von Computergegner $1')
 .replace(/^([^,]+), ([^,]+)$/,function(all,city,country){return map[country]?(map[city]||city)+', '+map[country]:all;})
 .replace(/^Anbau: (.+)$/,function(_,goods){return 'Anbau: '+goods.split(', ').map(function(good){return map[good]||good;}).join(', ');})
 .replace(/^(Ruined|Poor|Fair|Good|Very Good|Excellent|Pristine) (\d+)$/,function(_,condition,value){return map[condition]+' '+value;})
 .replace(/^Career begins in (.+) with (.+) and (\d+) days to fill the crates\.$/,function(_,city,cash,days){return 'Deine Karriere beginnt in '+(map[city]||city)+' mit '+cash+'. Du hast '+days+' Tage, um deine Sammlung aufzubauen.';})
 .replace(/^Debt (.+)$/,'Schulden $1')
 .replace(/^day (\d+) of (\d+)$/,'Tag $1 von $2')
 .replace(/^consignor estimate (.+)$/,'Schätzung des Einlieferers $1')
 .replace(/^estimate (.+)$/,'Schätzwert $1')
 .replace(/^Restocks every (\d+) days/,'Neue Ware alle $1 Tage')
 .replace(/^gallery markup (.+) over market value$/,'Galerieaufschlag $1 über dem Marktwert')
 .replace(/^buy-backs pay (.+) of value\.$/,'Beim Rückkauf zahlt der Händler $1 des Marktwerts.')
 .replace(/^The dealer’s shelves are bare until the next restock \(day (\d+)\)\.$/,'Der Händler erhält erst an Tag $1 neue Kunstwerke.')
 .replace(/^Warehouse value at today’s indices: (.+)$/,'Sammlungswert zu heutigen Marktpreisen: $1')
 .replace(/^condition slips (.+) every day\.$/,'Der Zustand verschlechtert sich täglich um $1.')
 .replace(/^The room is dark: the hammer falls in (\d+) day\(s\), on day (\d+)\. Travel on and come back then — bids are only taken on the sale day\.$/,'Die nächste Auktion findet in $1 Tagen statt, an Tag $2. Reise weiter und kehre dann zurück – Gebote sind nur am Auktionstag möglich.')
 .replace(/^No auction house in (.+)\. The rooms are in (.+)\.$/,'Kein Auktionshaus in $1. Auktionshäuser gibt es in $2.')
 .replace(/^The hammer has fallen\. The next sale in (.+) is on day (\d+)\.$/,'Die Auktion ist beendet. Die nächste Auktion in $1 findet an Tag $2 statt.')
 .replace(/^hammer on day (\d+)$/,'Zuschlag an Tag $1')
 .replace(/^buyer’s premium (.+)$/,'Käuferprovision $1')
 .replace(/^increment (.+)\.$/,'Gebotsschritt $1.')
 .replace(/^(\d+) bidders in the room$/,'$1 Bieter im Saal')
 .replace(/^bids open on day (\d+)$/,'Gebote ab Tag $1')
 .replace(/^Reputation (\d+) buys a ceiling of (.+) \((.+) drawn, (.+) available\)\. Interest (.+) per day = (.+) accruing\. A late fee of (.+) starts once the debt is older than (\d+) days, and the bank calls in crates at (\d+)\.$/,'Ansehen $1 ermöglicht einen Kreditrahmen von $2 ($3 genutzt, $4 verfügbar). Zinsen: $5 pro Tag, derzeit $6. Nach $8 Tagen fällt eine tägliche Verzugsgebühr von $7 an. Ab Tag $9 pfändet die Bank Gemälde.')
 .replace(/^over (\d+) days the bank calls in your crates$/,'Nach $1 Tagen pfändet die Bank deine Gemälde')
 .replace(/^(\d+) of (\d+) max$/,'$1 von maximal $2')
 .replace(/^(\d+) of (\d+) purchases used$/,'$1 von $2 Käufen genutzt')
 .replace(/^(.+) charges (.+) per \+0\.01 condition, max (.+) per job, at least (\d+) day\(s\)\.$/,'$1 verlangt $2 pro +1 % Zustand, maximal $3 je Auftrag, mindestens $4 Tage.')
 .replace(/^Tickets cost (.+) \+ (.+) per map unit$/,'Fahrpreis: $1 + $2 pro Karteneinheit')
 .replace(/^(.+) freight per crate · a long ride can knock a painting about\. Click a pin or a city on the chart for its picture\.$/,'$1 Frachtkosten pro Kiste · Lange Reisen können Gemälde beschädigen. Tippe auf eine Markierung oder Stadt auf der Karte, um ihr Bild zu sehen.')
 .replace(/^Restoration booked · ready day (\d+)$/,'Restaurierung beauftragt · fertig an Tag $1')
 .replace(/^Restoring: (.+) when ready$/,'Restaurierung: $1 nach Abschluss')
 .replace(/^(.+% → .+%) in (\d+) day\(s\)$/,'$1 in $2 Tagen')
 .replace(/^([+-]?[$€£][\d.,]+) if sold now$/,'$1 bei sofortigem Verkauf')
 .replace(/^([+-]?[\d.,]+%) vs yesterday$/,'$1 gegenüber gestern')
 .replace(/^(\d+) crate\(s\) on the dock/,'$1 Kisten im Hafen')
 .replace(/^(.+) pays (.+) each$/,'$1 zahlt $2 pro Stück')
 .replace(/^(\d+) of (\d+) fields selected$/,'$1 von $2 Feldern ausgewählt')
 .replace(/^(\d+)\/(\d+) selected$/,'$1/$2 ausgewählt')
 .replace(/^Harvest (\d+) unit\(s\)/,'$1 Einheiten ernten')
 .replace(/^(\d+) day\(s\) left$/,'Noch $1 Tage')
 .replace(/^(\d+) (?:day\(s\)|days)$/,'$1 Tage')
 .replace(/^(\d+) of (\d+) crates$/,'$1 von $2 Kisten')
 .replace(/^(\d+\/\d+|\d+) (?:crate\(s\)|crates?)$/,'$1 Kisten')
 .replace(/^(\d+) (?:field|fields)\b/,'$1 Felder')
 .replace(/^(\d+) (?:worker|workers)\b/,'$1 Arbeitskräfte')
 .replace(/^(\d+) (?:picture|pictures)\b/,'$1 Gemälde')
 .replace(/^(\d+) unit\(s\)$/,'$1 Einheiten')
 .replace(/^(\d+) (artists|cities|artworks|market events|economy parameters)\.?$/,function(_,n,kind){return n+' '+({'artists':'Künstler','cities':'Städte','artworks':'Kunstwerke','market events':'Marktereignisse','economy parameters':'Wirtschaftsparameter'})[kind];})
 .replace(/^(\d+) bought$/,'$1 gekauft').replace(/^(\d+) sold$/,'$1 verkauft').replace(/^(\d+) hammer wins$/,'$1 Auktionszuschläge')
 .replace(/^slots bought (\d+)$/,'$1 Kistenplätze gekauft')
 .replace(/^day (\d+) of (\d+)$/,'Tag $1 von $2')
 .replace(/^day (\d+)$/,'Tag $1').replace(/^ready (?:on )?day (\d+)$/,'fertig an Tag $1')
 .replace(/^(\d+) — (excellent|good|worn|damaged)$/,function(_,n,condition){return n+' — '+map[condition];})
 .replace(/^(excellent|good|worn|damaged) (\d+)$/,function(_,condition,n){return map[condition]+' '+n;})
 .replace(/^Career begins in (.+) with (.+)\. Good hunting\.$/,'Deine Karriere beginnt in $1 mit $2. Viel Erfolg!')
 .replace(/^Goal: earn the most collection points when the (\d+)-day career ends\.$/,'Ziel: Sammle bis zum Ende der $1-tägigen Karriere die meisten Sammlungspunkte.')
 .replace(/^No free crate space — buy a slot at the bank for (.+)\.$/,'Kein Kistenplatz frei – kaufe bei der Bank einen weiteren Platz für $1.')
 .replace(/^Cannot afford (.+) at (.+)\.$/,'Nicht genügend Bargeld für $1 zum Preis von $2.')
 .replace(/^Bought (.+) for (.+)\.$/,'$1 für $2 gekauft.')
 .replace(/^Sold (.+) for (.+) \(profit (.+)\)\.$/,'$1 für $2 verkauft (Gewinn $3).')
 .replace(/^Sold (.+) for (.+) \(loss (.+)\)\.$/,'$1 für $2 verkauft (Verlust $3).')
 .replace(/^Borrowed (.+)\. Debt (.+) at (.+)\/day\.$/,'$1 geliehen. Schulden: $2 bei $3 Zinsen pro Tag.')
 .replace(/^Repaid (.+)\. Debt (.+)\.$/,'$1 zurückgezahlt. Schulden: $2.')
 .replace(/^Arrived (?:in|at) (.+) on day (\d+)\.$/,'An Tag $2 in $1 angekommen.')
 .replace(/^Bank interest \+(.+) on your debt\.$/,'Kreditzinsen: +$1 Schulden.')
 .replace(/^Day (\d+) opened\.$/,'Tag $1 hat begonnen.')
 .replace(/^NEWS: (.+) \((.+), until day (\d+)\)$/,function(_,headline,change,day){return 'NACHRICHT: '+(map[headline]||headline)+' ('+change+', bis Tag '+day+')';})
 .replace(/^Sailing to /,'Unterwegs nach ').replace(/^You are already en route to /,'Du bist bereits unterwegs nach ')
 .replace(/^Ashore /,'An Land ').replace(/^Auto: /,'Automatik: ').replace(/^Gallery in /,'Galerie in ')
 .replace(/^No restoration studio in /,'Kein Restaurierungsatelier in ').replace(/^Auction in /,'Auktion in ')
 .replace(/^Trade and travel open again once you are back in a port\.$/,'Handel und Reisen stehen im nächsten Hafen wieder zur Verfügung.')
 .replace(/^(.+) plantation$/,'Plantage $1')
 .replace(/^(.+) in hand$/,'$1 verfügbar')
 .replace(/^(Cash|Reputation|Goal|Borrow|Repay|Restore|Expert|Bid|bid|reserve|paid|dealer bids|debt|net|worst|rarity) (?=[+$€£\d-])/,function(_,label){return ({Cash:'Bargeld',Reputation:'Ansehen',Goal:'Ziel',Borrow:'Leihen',Repay:'Zurückzahlen',Restore:'Restaurieren',Expert:'Gutachten',Bid:'Bieten',bid:'Gebot',reserve:'Mindestpreis',paid:'Kaufpreis','dealer bids':'Händlergebot',debt:'Schulden',net:'netto',worst:'schlechtester Verkauf',rarity:'Seltenheit'})[label]+' ';});
}
function convert(s){
 if(lang!=='de')return s;
 var match=/^(\s*)([\s\S]*?)(\s*)$/.exec(s);if(!match||!match[2])return s;
 var text=match[2], result=map[text]||dynamicText(text);
 // Translate complete sentences first, then independent labels around separators.
 if(result===text && text.indexOf(' · ')!==-1)result=text.split(' · ').map(convert).join(' · ');
 else if(result!==text && result.indexOf(' · ')!==-1)result=result.split(' · ').map(function(part){return map[part]||dynamicText(part);}).join(' · ');
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