import urllib.request
import urllib.parse
import json
import ssl

ctx = ssl._create_unverified_context()
headers = {'User-Agent': 'ArtRace/1.0 (museum-game-educational)'}

def search(q):
    url = f"https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srsearch={urllib.parse.quote(q)}&srnamespace=6&srlimit=5"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, context=ctx) as resp:
        return json.loads(resp.read().decode('utf-8')).get('query', {}).get('search', [])

for q in [
    'Mucha The Seasons 1896',
    'Gabriele Munter Jawlensky',
    'Gabriele Munter Boating',
    'Mucha Gismonda',
    'Friedrich The Monk by the Sea',
    'Chalk Cliffs on Rügen Friedrich',
    'An Old Woman Frying Eggs Velazquez',
    'Bathers at Asnières Seurat',
    'The Circus Seurat',
    'At the Moulin Rouge, The Dance Toulouse-Lautrec',
    'The Red Studio Matisse',
    'Woman with a Hat Matisse',
    'The Swing Fragonard',
    'The Yellow Christ Gauguin',
    'Irises Van Gogh',
    'Sunflowers Van Gogh',
    'Yellow-Red-Blue Kandinsky'
]:
    res = search(q)
    print(f"Query: {q}")
    for r in res[:2]:
        print(f"  {r['title']}")
