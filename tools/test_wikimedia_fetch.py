import urllib.request
import urllib.parse
import json
import ssl

ctx = ssl._create_unverified_context()
headers = {'User-Agent': 'ArtRace/1.0 (museum-game-educational)'}

def search_wikimedia(query):
    url = f"https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srsearch={urllib.parse.quote(query)}&srnamespace=6&srlimit=5"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, context=ctx) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        return data.get('query', {}).get('search', [])

def get_image_url(file_title, width=900):
    url = f"https://commons.wikimedia.org/w/api.php?action=query&format=json&titles={urllib.parse.quote(file_title)}&prop=imageinfo&iiprop=url&iiurlwidth={width}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, context=ctx) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        pages = data.get('query', {}).get('pages', {})
        for page_id, page in pages.items():
            imageinfo = page.get('imageinfo', [])
            if imageinfo:
                return imageinfo[0].get('thumburl') or imageinfo[0].get('url')
    return None

test_queries = [
    'Mona Lisa Leonardo da Vinci',
    'The Starry Night Vincent van Gogh',
    'The Scream Edvard Munch'
]

for q in test_queries:
    results = search_wikimedia(q)
    print(f"Query: {q}")
    if results:
        title = results[0]['title']
        print(f"  Found title: {title}")
        img_url = get_image_url(title, 900)
        print(f"  Thumb URL: {img_url}")
    else:
        print("  No results")
