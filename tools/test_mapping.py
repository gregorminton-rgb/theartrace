import json

GERMAN_TITLES = {
    # Botticelli
    "botticelli_dante_comedy": "Illustration zu Dantes Göttlicher Komödie",
    "botticelli_mars_and_venus": "Venus und Mars",
    "botticelli_primavera_detail": "Primavera (Frühling)",
    "botticelli_venus_study": "Die Geburt der Venus",
    
    # Caravaggio
    "caravaggio_bacchus": "Bacchus",
    "caravaggio_calling_of_saint_matthew": "Die Berufung des Matthäus",
    "caravaggio_judith": "Judith und Holofernes",
    "caravaggio_medusa": "Medusa",
    
    # Cézanne
    "cezanne_apples_oranges": "Äpfel und Orangen",
    "cezanne_card_players": "Die Kartenspieler",
    "cezanne_large_bathers": "Die großen Badenden",
    "cezanne_sainte_victoire": "Mont Sainte-Victoire",
    
    # Chagall
    "chagall_birthday": "Der Geburtstag",
    "chagall_i_and_the_village": "Ich und das Dorf",
    "chagall_over_the_town": "Über der Stadt",
    "chagall_paris_through_the_window": "Paris durch das Fenster",
    
    # Degas
    "degas_at_the_races": "Auf der Rennbahn",
    "degas_little_dancer": "Kleine vierzehnjährige Tänzerin",
    "degas_the_ballet_class": "Die Tanzklasse",
    "degas_the_star": "Der Star (Die Tänzerin auf der Bühne)",
    
    # Delacroix
    "delacroix_barque_of_dante": "Die Dantebarke",
    "delacroix_death_of_sardanapalus": "Der Tod des Sardanapal",
    "delacroix_liberty_leading_people": "Die Freiheit führt das Volk",
    "delacroix_lion_hunt": "Löwenjagd",
    
    # Dürer
    "durer_fur_coat_self_portrait": "Selbstbildnis im Pelzrock",
    "durer_melencolia": "Melencolia I",
    "durer_praying_hands": "Betende Hände",
    "durer_young_hare_after": "Feldhase",
    
    # Fragonard
    "fragonard_gentleman_portrait": "Bildnis eines Herrn",
    "fragonard_stolen_kiss": "Der gestohlene Kuss",
    "fragonard_the_swing_engraved": "Die Schaukel",
    "fragonard_young_girl_reading": "Die Lesende",
    
    # Caspar David Friedrich
    "friedrich_chalk_cliffs": "Kreidefelsen auf Rügen",
    "friedrich_monk_by_the_sea": "Der Mönch am Meer",
    "friedrich_sea_of_ice": "Das Eismeer",
    "friedrich_wanderer": "Der Wanderer über dem Nebelmeer",
    
    # Gauguin
    "gauguin_breton_sketch": "Bretonisches Dorf im Schnee",
    "gauguin_tahitian_beach": "Frauen von Tahiti am Strand",
    "gauguin_where_do_we_come_from": "Woher kommen wir? Wer sind wir? Wohin gehen wir?",
    "gauguin_yellow_christ": "Der gelbe Christus",
    
    # Goya
    "goya_maja_study": "Die nackte Maja",
    "goya_sleep_of_reason": "Der Schlaf der Vernunft gebiert Ungeheuer",
    "goya_the_colossus": "Der Koloss",
    "goya_third_of_may": "Der 3. Mai 1808",
    
    # Hokusai
    "hokusai_great_wave": "Die große Welle vor Kanagawa",
    "hokusai_red_fuji": "Roter Fuji (Morgenchiffre bei klarem Wetter)",
    "hokusai_sketchbook": "Hokusai-Manga (Skizzenbuch)",
    "hokusai_waterfall_ono": "Der Ono-Wasserfall an der Kisokaido-Straße",
    
    # Kandinsky
    "kandinsky_composition_vii": "Komposition VII",
    "kandinsky_improvisation_26": "Improvisation 26 (Rudern)",
    "kandinsky_murnau_street": "Murnau – Straße mit Kirche",
    "kandinsky_yellow_red_blue": "Gelb-Rot-Blau",
    
    # Klimt
    "klimt_adele_study": "Adele Bloch-Bauer I",
    "klimt_judith_i": "Judith I (Judith und Holofernes)",
    "klimt_the_kiss_study": "Der Kuss",
    "klimt_tree_of_life": "Der Lebensbaum",
    
    # Léger
    "leger_city": "Die Stadt (La Ville)",
    "leger_mechanic": "Der Mechaniker (Le Mécanicien)",
    "leger_nudes_in_the_forest": "Nackte Männer im Wald",
    "leger_three_women": "Drei Frauen (Le Grand Déjeuner)",
    
    # Leonardo da Vinci
    "leonardo_lady_with_an_ermine": "Dame mit dem Hermelin",
    "leonardo_mona_lisa": "Mona Lisa",
    "leonardo_st_john_the_baptist: ": "Johannes der Täufer",
    "leonardo_st_john_the_baptist": "Johannes der Täufer",
    "leonardo_virgin_of_the_rocks": "Felsgrottenmadonna",
    
    # Claude Lorrain
    "lorrain_apollo_and_muses": "Landschaft mit Apollo und den Musen",
    "lorrain_marriage_of_isaac_and_rebekah": "Landschaft mit der Hochzeit von Isaak und Rebekka",
    "lorrain_queen_of_sheba": "Die Einschiffung der Königin von Saba",
    "lorrain_seaport_at_sunset": "Seehafen bei Sonnenuntergang",
    
    # Manet
    "manet_folies_bergere": "Bar in den Folies-Bergère",
    "manet_luncheon_on_the_grass": "Das Frühstück im Grünen",
    "manet_olympia_study": "Olympia",
    "manet_peonies": "Pfingstrosen in einer Vase",
    
    # Franz Marc
    "marc_blue_horse": "Blaues Pferd I",
    "marc_fate_of_the_animals": "Tierschicksale",
    "marc_tower_of_blue_horses": "Der Turm der blauen Pferde",
    "marc_yellow_cow": "Die gelbe Kuh",
    
    # Matisse
    "matisse_open_window": "Offenes Fenster, Collioure",
    "matisse_red_studio": "Das rote Atelier (L’Atelier rouge)",
    "matisse_the_dance": "Der Tanz",
    "matisse_woman_with_a_hat": "Frau mit Hut (La femme au chapeau)",
    
    # Modigliani
    "modigliani_jeanne_hebuterne": "Porträt der Jeanne Hébuterne",
    "modigliani_leopold_zborowski": "Porträt von Léopold Zborowski",
    "modigliani_reclining_nude": "Liegender Akt (Nu couché)",
    "modigliani_woman_with_fan": "Frau mit Fächer",
    
    # Monet
    "monet_haystack": "Heuhaufen bei Giverny",
    "monet_impression_variant": "Impression, Sonnenaufgang",
    "monet_water_lilies": "Seerosen",
    "monet_woman_with_parasol": "Frau mit Sonnenschirm",
    
    # Mucha
    "mucha_gismonda": "Gismonda (Theaterplakat)",
    "mucha_job": "JOB Zigarettenpapier (Werbeplakat)",
    "mucha_seasons_posters": "Die Jahreszeiten (Vierteilige Serie)",
    "mucha_slav_epic_note": "Das Slawische Epos (Apotheose)",
    
    # Munch
    "munch_madonna": "Madonna",
    "munch_sick_child": "Das kranke Kind",
    "munch_the_scream": "Der Schrei",
    "munch_vampire": "Vampir (Liebe und Schmerz)",
    
    # Münter
    "munter_boating": "Kahnfahrt (Kandinsky auf dem See)",
    "munter_country_road_winter": "Landstraße im Winter",
    "munter_flowers_still_life": "Blumenstillleben",
    "munter_jawlensky": "Jawlensky und Erbslöh",
    
    # Picasso
    "picasso_demoiselles": "Les Demoiselles d’Avignon",
    "picasso_old_guitarist": "Der alte Gitarrist",
    "picasso_portrait_gertrude_stein": "Porträt von Gertrude Stein",
    "picasso_three_musicians": "Drei Musikanten",
    
    # Pissarro
    "pissarro_apple_harvest": "Apfelernte in Éragny-sur-Epte",
    "pissarro_boulevard_montmartre": "Boulevard Montmartre bei Nacht",
    "pissarro_hoarfrost": "Raureif (Gelée blanche)",
    "pissarro_red_roofs": "Die roten Dächer (Dorfwinkel im Winter)",
    
    # Raphael
    "raphael_castiglione": "Porträt des Baldassare Castiglione",
    "raphael_school_of_athens": "Die Schule von Athen",
    "raphael_sistine_madonna": "Sixtinische Madonna",
    "raphael_three_graces": "Die drei Grazien",
    
    # Rembrandt
    "rembrandt_anatomy_lesson": "Die Anatomie des Dr. Tulp",
    "rembrandt_night_watch_sketch": "Die Nachtwache",
    "rembrandt_self_portrait": "Selbstbildnis an der Staffelei",
    "rembrandt_three_trees": "Die drei Bäume",
    
    # Renoir
    "renoir_boating_party": "Das Frühstück der Ruderer",
    "renoir_large_bathers": "Die großen Badenden",
    "renoir_moulin_galette": "Tanz im Moulin de la Galette",
    "renoir_two_sisters": "Zwei Schwestern (Auf der Terrasse)",
    
    # Rubens
    "rubens_elevation_of_cross": "Die Kreuzaufrichtung",
    "rubens_fall_of_the_damned": "Der Höllensturz der Verdammten",
    "rubens_judgement_of_paris": "Das Urteil des Paris",
    "rubens_three_graces": "Die drei Grazien",
    
    # Schiele
    "schiele_death_and_maiden": "Tod und Mädchen",
    "schiele_krumau": "Krumau an der Moldau",
    "schiele_seated_woman": "Sitzende Frau mit angezogenem Knie",
    "schiele_self_portrait_physalis": "Selbstbildnis mit Lampionfrucht",
    
    # Seurat
    "seurat_bathers_at_asnieres": "Badende bei Asnières",
    "seurat_circus": "Der Zirkus",
    "seurat_grande_jatte": "Ein Sonntagnachmittag auf der Insel La Grande Jatte",
    "seurat_the_models": "Die Modelle (Les Poseuses)",
    
    # Toulouse-Lautrec
    "toulouse_dance_at_moulin_rouge": "Im Moulin Rouge: Der Tanz",
    "toulouse_jane_avril": "Jane Avril (Plakat)",
    "toulouse_moulin_rouge": "Im Moulin Rouge",
    "toulouse_the_toilette": "Die Toilette (Rousse)",
    
    # Turner
    "turner_rain_steam_speed": "Regen, Dampf und Geschwindigkeit",
    "turner_slave_ship": "Das Sklavenschiff",
    "turner_temeraire": "Die letzte Fahrt der Fighting Temeraire",
    "turner_venice_laguna": "Venedig von der Lagune aus",
    
    # Van Gogh
    "van_gogh_cafe_terrace": "Caféterrasse am Abend",
    "van_gogh_irises": "Schwertlilien (Irises)",
    "van_gogh_starry_night_study": "Sternennacht",
    "van_gogh_sunflowers": "Sonnenblumen (Arles)",
    
    # Velázquez
    "velazquez_cooking_eggs": "Die Eierköchin (Alte Frau beim Eierbraten)",
    "velazquez_man_in_black": "Bildnis eines Herrn in Schwarz",
    "velazquez_meninas_bozzetto": "Las Meninas (Die Hofdamen)",
    "velazquez_surrender_of_breda": "Die Übergabe von Breda (Die Lanzen)",
    
    # Vermeer
    "vermeer_love_letter": "Der Liebesbrief",
    "vermeer_music_lesson_study": "Die Musikstunde (Herr und Dame am Virginal)",
    "vermeer_pearl_earring_copy": "Das Mädchen mit dem Perlenohrring",
    "vermeer_the_milkmaid": "Die Dienstmagd mit dem Milchkrug",
    
    # Watteau
    "watteau_cythera_reduction": "Einschiffung nach Kythera",
    "watteau_fete_champetre": "Fête champêtre (Ländliches Fest)",
    "watteau_gersaints_shopsign": "Das Firmenschild des Kunsthändlers Gersaint",
    "watteau_harlequin_study": "Der Harlekin"
}

with open('tools/all_works.json', 'r', encoding='utf-8') as f:
    works = json.load(f)

missing = []
for w in works:
    wid = w['id']
    if wid not in GERMAN_TITLES:
        missing.append((wid, w['title']))

print(f"Total mapped: {len(GERMAN_TITLES)}")
print(f"Missing: {len(missing)}")
if missing:
    for m in missing:
        print("  Missing:", m)
else:
    print("ALL 156 WORKS ARE 100% COVERED!")
