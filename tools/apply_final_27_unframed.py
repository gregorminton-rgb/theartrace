import json
import os
import ssl
import sys
import time
import urllib.request
import urllib.parse
from PIL import Image
import numpy as np

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ctx = ssl._create_unverified_context()
headers = {'User-Agent': 'ArtRace/1.0 (museum-game-clean-art; mailto:artrace@example.org)'}

BILDER_DIR = r'D:\Projekte\Ren\ArtRace3Artwork\Bilder'

# 1. Precise local Bilder crops
BILDER_CROPS = {
    'mucha_seasons_posters': {
        'file': 'images/art/mucha-seasons-posters.jpg',
        'source': 'Alfons Mucha – Die Jahreszeiten (Farbserie, 1896).jpg',
        'box': (240, 225, 2215, 1555),
    },
    'munter_jawlensky': {
        'file': 'images/art/munter-jawlensky.jpg',
        'source': 'Gabriele Münter – Jawlensky und Erbslöh (ca. 1909).jpg',
        'box': (315, 298, 2085, 1492),
    },
    'munter_boating': {
        'file': 'images/art/munter-boating.jpg',
        'source': 'Gabriele Münter – Kahnfahrt (1910).jpg',
        'box': (145, 125, 882, 644),
    },
    'munter_flowers_still_life': {
        'file': 'images/art/munter-flowers-still-life.jpg',
        'source': 'Gabriele Münter – Blumen (ca. 1910).jpg',
        'box': (168, 218, 856, 554),
    }
}

# 2. Wikimedia Commons exact titles or search queries
WIKIMEDIA_TARGETS = {
    'degas_at_the_races': {
        'file': 'images/art/degas-at-the-races.jpg',
        'title': 'File:Edgar Degas - At the Races in the Countryside - Google Art Project.jpg'
    },
    'fragonard_the_swing_engraved': {
        'file': 'images/art/fragonard-the-swing-engraved.jpg',
        'title': 'File:The Swing (Fragonard).jpg',
        'alt_search': 'The Swing Fragonard Wallace Collection'
    },
    'friedrich_chalk_cliffs': {
        'file': 'images/art/friedrich-chalk-cliffs.jpg',
        'title': 'File:Caspar David Friedrich\'s Chalk Cliffs on Rügen.jpg'
    },
    'friedrich_monk_by_the_sea': {
        'file': 'images/art/friedrich-monk-by-the-sea.jpg',
        'title': 'File:Caspar David Friedrich - Monk by the Sea.jpg'
    },
    'gauguin_yellow_christ': {
        'file': 'images/art/gauguin-yellow-christ.jpg',
        'title': 'File:The Yellow Christ.jpg',
        'alt_search': 'The Yellow Christ Paul Gauguin Albright'
    },
    'kandinsky_yellow_red_blue': {
        'file': 'images/art/kandinsky-yellow-red-blue.jpg',
        'title': 'File:Kandinsky - Jaune Rouge Bleu.jpg'
    },
    'leger_mechanic': {
        'file': 'images/art/leger-mechanic.jpg',
        'title': 'File:Le Mécanicien (The Mechanic) - Fernand Léger.jpg'
    },
    'lorrain_marriage_of_isaac_and_rebekah': {
        'file': 'images/art/lorrain-marriage-of-isaac-and-rebekah.jpg',
        'title': 'File:The Mill, or Landscape with the Marriage of Isaac and Rebecca.jpg'
    },
    'lorrain_seaport_at_sunset': {
        'file': 'images/art/lorrain-seaport-at-sunset.jpg',
        'title': 'File:Claude Gellée - A Seaport at Sunset - 42.127 - Detroit Institute of Arts.jpg'
    },
    'manet_folies_bergere': {
        'file': 'images/art/manet-folies-bergere.jpg',
        'title': 'File:Edouard Manet, A Bar at the Folies-Bergère.jpg',
        'alt_search': 'A Bar at the Folies-Bergère Manet Courtauld'
    },
    'marc_yellow_cow': {
        'file': 'images/art/marc-yellow-cow.jpg',
        'title': 'File:Franz Marc-The Yellow Cow-1911.jpg'
    },
    'matisse_red_studio': {
        'file': 'images/art/matisse-red-studio.jpg',
        'title': 'File:L\'Atelier rouge, par Henri Matisse.jpg'
    },
    'matisse_woman_with_a_hat': {
        'file': 'images/art/matisse-woman-with-a-hat.jpg',
        'title': 'File:Matisse-Woman-with-a-Hat.jpg'
    },
    'monet_haystack': {
        'file': 'images/art/monet-haystack.jpg',
        'title': 'File:Monet - wheatstacks-end-of-summer-1891.jpg',
        'alt_search': 'Wheatstacks End of Summer Monet Art Institute of Chicago'
    },
    'mucha_gismonda': {
        'file': 'images/art/mucha-gismonda.jpg',
        'title': 'File:Alfons Mucha - 1894 - Gismonda.jpg'
    },
    'schiele_seated_woman': {
        'file': 'images/art/schiele-seated-woman.jpg',
        'title': 'File:Egon Schiele - Seated Woman with Legs Drawn Up (Adele Herms) - Google Art Project.jpg'
    },
    'seurat_bathers_at_asnieres': {
        'file': 'images/art/seurat-bathers-at-asnieres.jpg',
        'title': 'File:Bathers at Asnières by Georges Seurat.jpg',
        'alt_search': 'Bathers at Asnières Seurat National Gallery'
    },
    'seurat_circus': {
        'file': 'images/art/seurat-circus.jpg',
        'title': 'File:Georges Seurat - The Circus - Google Art Project.jpg'
    },
    'toulouse_dance_at_moulin_rouge': {
        'file': 'images/art/toulouse-dance-at-moulin-rouge.jpg',
        'title': 'File:Henri de Toulouse-Lautrec, French - At the Moulin Rouge- The Dance - Google Art Project.jpg',
        'alt_search': 'At the Moulin Rouge The Dance Toulouse-Lautrec Philadelphia'
    },
    'turner_rain_steam_speed': {
        'file': 'images/art/turner-rain-steam-speed.jpg',
        'title': 'File:Rain Steam and Speed the Great Western Railway.jpg'
    },
    'van_gogh_irises': {
        'file': 'images/art/van-gogh-irises.jpg',
        'title': 'File:Vincent van Gogh - Irises (1889).jpg'
    },
    'van_gogh_sunflowers': {
        'file': 'images/art/van-gogh-sunflowers.jpg',
        'title': 'File:Vincent van Gogh - Sunflowers (1888, National Gallery London).jpg',
        'alt_search': 'Sunflowers Van Gogh National Gallery London'
    },
    'velazquez_cooking_eggs': {
        'file': 'images/art/velazquez-cooking-eggs.jpg',
        'title': 'File:VELÁZQUEZ - Vieja friendo huevos (National Galleries of Scotland, 1618. Óleo sobre lienzo, 100.5 x 119.5 cm).jpg',
        'alt_search': 'Old Woman Frying Eggs Diego Velazquez'
    }
}

def get_image_url(file_title, width=900):
    url = f"https://commons.wikimedia.org/w/api.php?action=query&format=json&titles={urllib.parse.quote(file_title)}&prop=imageinfo&iiprop=url&iiurlwidth={width}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            pages = data.get('query', {}).get('pages', {})
            for page_id, page in pages.items():
                if int(page_id) > 0:
                    imageinfo = page.get('imageinfo', [])
                    if imageinfo:
                        return imageinfo[0].get('thumburl') or imageinfo[0].get('url')
    except Exception as e:
        print(f"  URL error for '{file_title}': {e}")
    return None

def search_wikimedia(query):
    url = f"https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srsearch={urllib.parse.quote(query)}&srnamespace=6&srlimit=3"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return data.get('query', {}).get('search', [])
    except Exception as e:
        print(f"  Search error for '{query}': {e}")
        return []

def download_and_save(url, target_path):
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            data = resp.read()
        with open(target_path, 'wb') as f:
            f.write(data)
        im = Image.open(target_path).convert('RGB')
        # Scale to max width 900 or max height 1200
        if im.width > 900 or im.height > 1200:
            scale = min(900 / im.width, 1200 / im.height)
            new_w = max(100, round(im.width * scale))
            new_h = max(100, round(im.height * scale))
            im = im.resize((new_w, new_h), Image.Resampling.LANCZOS)
        im.save(target_path, quality=88)
        return im.size
    except Exception as e:
        print(f"  Download error: {e}")
        return None

# Load artwork-images.js
with open('artwork-images.js', 'r', encoding='utf-8') as f:
    text = f.read()

prefix = 'window.ART_ARTWORK_IMAGES = '
data = json.loads(text[text.index(prefix) + len(prefix):].rstrip(';\n\r '))
images_dict = data['images']

print("--- 1. Processing Local Master Crops ---")
for w_id, info in BILDER_CROPS.items():
    src_path = os.path.join(BILDER_DIR, info['source'])
    target_path = info['file']
    print(f"Processing {w_id} from {info['source']}...")
    im = Image.open(src_path)
    cropped = im.crop(info['box'])
    # Scale width to 900
    target_w = 900
    target_h = round(target_w * cropped.height / cropped.width)
    resized = cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)
    resized.save(target_path, quality=88)
    
    file_bytes = os.path.getsize(target_path)
    if w_id in images_dict:
        images_dict[w_id]['width'] = target_w
        images_dict[w_id]['height'] = target_h
        images_dict[w_id]['bytes'] = file_bytes
    print(f"  -> Cropped {w_id}: {target_w}x{target_h} ({file_bytes} bytes)")

print("\n--- 2. Processing Wikimedia Commons Artworks ---")
for w_id, info in WIKIMEDIA_TARGETS.items():
    target_path = info['file']
    title = info['title']
    print(f"Processing {w_id} ('{title}')...")
    
    img_url = get_image_url(title, width=900)
    if not img_url and 'alt_search' in info:
        print(f"  Trying alternate search: {info['alt_search']}")
        res = search_wikimedia(info['alt_search'])
        if res:
            title = res[0]['title']
            img_url = get_image_url(title, width=900)
            
    if img_url:
        size = download_and_save(img_url, target_path)
        if size:
            file_bytes = os.path.getsize(target_path)
            if w_id in images_dict:
                images_dict[w_id]['width'] = size[0]
                images_dict[w_id]['height'] = size[1]
                images_dict[w_id]['bytes'] = file_bytes
            print(f"  -> SUCCESS {w_id}: {size[0]}x{size[1]} ({file_bytes} bytes)")
        else:
            print(f"  -> FAILED to save {w_id}")
    else:
        print(f"  -> FAILED to find URL for {w_id}")
    time.sleep(0.5)

# Save updated artwork-images.js
with open('artwork-images.js', 'w', encoding='utf-8') as f:
    f.write('/* Generated by tools/import-artwork-images.ps1 - do not edit by hand. */\n')
    f.write('window.ART_ARTWORK_IMAGES = ')
    json.dump(data, f, indent=4)
    f.write(';\n')

print("\nDONE updating all 27 artworks in artwork-images.js!")
