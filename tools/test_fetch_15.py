import urllib.request
import urllib.parse
import json
import ssl
import time

ctx = ssl._create_unverified_context()
headers = {'User-Agent': 'ArtRaceGame/2.0 (museum-game-hd; contact: greg@example.org)'}

def search_first(query):
    url = f"https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srsearch={urllib.parse.quote(query)}&srnamespace=6&srlimit=3"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=8) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            res = data.get('query', {}).get('search', [])
            return res[0]['title'] if res else None
    except Exception as e:
        print(f"Error {query}: {e}")
        return None

queries = [
    ("friedrich_monk_by_the_sea", "Caspar David Friedrich Monk by the Sea"),
    ("friedrich_chalk_cliffs", "Chalk Cliffs on Rügen Friedrich"),
    ("lorrain_marriage_of_isaac_and_rebekah", "Claude Lorrain Marriage of Isaac and Rebecca"),
    ("lorrain_seaport_at_sunset", "Claude Lorrain Seaport at Sunset"),
    ("velazquez_cooking_eggs", "Old Woman Frying Eggs Velazquez"),
    ("degas_at_the_races", "At the Races in the Countryside Degas"),
    ("schiele_seated_woman", "Egon Schiele Seated Woman with Bent Knee"),
    ("leger_mechanic", "Fernand Leger Le Mecanicien"),
    ("marc_yellow_cow", "Franz Marc The Yellow Cow 1911"),
    ("seurat_bathers_at_asnieres", "Bathers at Asnieres Seurat"),
    ("seurat_circus", "The Circus Seurat Google Art Project"),
    ("toulouse_dance_at_moulin_rouge", "At the Moulin Rouge The Dance Toulouse-Lautrec"),
    ("matisse_red_studio", "The Red Studio Matisse"),
    ("matisse_woman_with_a_hat", "Woman with a Hat Matisse 1905"),
    ("kandinsky_yellow_red_blue", "Kandinsky Yellow-Red-Blue 1925"),
]

for wid, q in queries:
    title = search_first(q)
    print(f"{wid}: {title}")
    time.sleep(1.0)
