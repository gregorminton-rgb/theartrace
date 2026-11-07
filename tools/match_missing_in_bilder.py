import os
from PIL import Image

# The 27 paintings that need clean un-framing:
targets = [
    ('mucha_seasons_posters', 'images/art/mucha-seasons-posters.jpg', 'Alfons Mucha – Die Jahreszeiten (Farbserie, 1896).jpg'),
    ('mucha_gismonda', 'images/art/mucha-gismonda.jpg', 'Alfons Mucha – Gismonda (1894).jpg'),
    ('friedrich_monk_by_the_sea', 'images/art/friedrich-monk-by-the-sea.jpg', 'Caspar David Friedrich – Mönch am Meer (1808 bis 1810).jpg'),
    ('friedrich_chalk_cliffs', 'images/art/friedrich-chalk-cliffs.jpg', 'Caspar David Friedrich – Kreidefelsen auf Rügen (1818).jpg'),
    ('lorrain_marriage_of_isaac_and_rebekah', 'images/art/lorrain-marriage-of-isaac-and-rebekah.jpg', 'Claude Lorrain – Die Hochzeit von Isaak und Rebekka (1648).jpg'),
    ('lorrain_seaport_at_sunset', 'images/art/lorrain-seaport-at-sunset.jpg', 'Claude Lorrain – Seehafen bei Sonnenuntergang (1639).jpg'),
    ('monet_haystack', 'images/art/monet-haystack.jpg', 'Claude Monet – Heuhaufen (Heuschober, ca. 1890 bis 1891).jpg'),
    ('velazquez_cooking_eggs', 'images/art/velazquez-cooking-eggs.jpg', 'Diego Velázquez – Die Köchin (1618).jpg'),
    ('degas_at_the_races', 'images/art/degas-at-the-races.jpg', 'Edgar Degas – Auf der Rennbahn auf dem Lande (1869).jpg'),
    ('manet_folies_bergere', 'images/art/manet-folies-bergere.jpg', 'Édouard Manet – Bar in den Folies-Bergère (1882).jpg'),
    ('schiele_seated_woman', 'images/art/schiele-seated-woman.jpg', 'Egon Schiele – Sitzende Frau mit angezogenem Knie (1917).jpg'),
    ('leger_mechanic', 'images/art/leger-mechanic.jpg', 'Fernand Léger – Der Mechaniker (1920).jpg'),
    ('marc_yellow_cow', 'images/art/marc-yellow-cow.jpg', 'Franz Marc – Die gelbe Kuh (1911).jpg'),
    ('seurat_bathers_at_asnieres', 'images/art/seurat-bathers-at-asnieres.jpg', 'Georges Seurat – Badende in Asnières (1884).jpg'),
    ('seurat_circus', 'images/art/seurat-circus.jpg', 'Georges Seurat – Der Zirkus (1891).jpg'),
    ('toulouse_dance_at_moulin_rouge', 'images/art/toulouse-dance-at-moulin-rouge.jpg', 'Henri de Toulouse-Lautrec – Tanz im Moulin Rouge (1890).jpg'),
    ('matisse_red_studio', 'images/art/matisse-red-studio.jpg', 'Henri Matisse – Das rote Atelier (1911).jpg'),
    ('matisse_woman_with_a_hat', 'images/art/matisse-woman-with-a-hat.jpg', 'Henri Matisse – Frau mit Hut (1905).jpg'),
    ('fragonard_the_swing_engraved', 'images/art/fragonard-the-swing-engraved.jpg', 'Jean-Honoré Fragonard – Die Schaukel (1767).jpg'),
    ('gauguin_yellow_christ', 'images/art/gauguin-yellow-christ.jpg', 'Paul Gauguin – Der gelbe Christus (1889).jpg'),
    ('van_gogh_irises', 'images/art/van-gogh-irises.jpg', 'Vincent van Gogh – Schwertlilien (ca. 1889).jpg'),
    ('van_gogh_sunflowers', 'images/art/van-gogh-sunflowers.jpg', 'Vincent van Gogh – Sonnenblumen (ca. 1888 bis 1889).jpg'),
    ('kandinsky_yellow_red_blue', 'images/art/kandinsky-yellow-red-blue.jpg', 'Wassily Kandinsky – Gelb-Rot-Blau (1925).jpg'),
    ('turner_rain_steam_speed', 'images/art/turner-rain-steam-speed.jpg', 'William Turner – Regen, Dampf und Geschwindigkeit (1844).jpg'),
    ('munter_flowers_still_life', 'images/art/munter-flowers-still-life.jpg', 'Gabriele Münter – Blumen (ca. 1910).jpg'),
    ('munter_jawlensky', 'images/art/munter-jawlensky.jpg', 'Gabriele Münter – Jawlensky und Erbslöh (ca. 1909).jpg'),
    ('munter_boating', 'images/art/munter-boating.jpg', 'Gabriele Münter – Kahnfahrt (1910).jpg'),
]

bilder_dir = 'D:/Projekte/Ren/ArtRace3Artwork/Bilder'
found = []
missing = []

for wid, dest, bname in targets:
    # search case-insensitively
    matched = None
    for f in os.listdir(bilder_dir):
        # normalize
        b_key = bname.split('–')[0].strip().lower()
        if b_key in f.lower():
            # check title part
            t_key = bname.split('–')[1].split('(')[0].strip().lower() if '–' in bname else ''
            if not t_key or t_key in f.lower():
                matched = f
                break
    if matched:
        found.append((wid, dest, matched))
    else:
        missing.append((wid, dest, bname))

print(f"Found in Bilder: {len(found)}/{len(targets)}")
for f in found:
    print(f"  MATCH: {f[0]} -> {f[2]}")
if missing:
    print(f"Missing in Bilder: {len(missing)}")
    for m in missing:
        print(f"  MISSING: {m[0]} -> {m[2]}")
