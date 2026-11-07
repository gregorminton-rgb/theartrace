import json
import os
import re
from PIL import Image
import numpy as np

with open('artwork-images.js', 'r', encoding='utf-8') as f:
    text = f.read()

prefix = 'window.ART_ARTWORK_IMAGES = '
data = json.loads(text[text.index(prefix) + len(prefix):].rstrip(';\n\r '))
images_dict = data['images']

with open('data.js', 'r', encoding='utf-8') as f:
    data_js = f.read()

works_json = data_js[data_js.index('window.ART_DATA = ') + len('window.ART_DATA = '):].rstrip(';\n\r ')
works_data = json.loads(re.sub(r'/\*[\s\S]*?\*/', '', works_json))
works_map = {w['id']: w for w in works_data['works']}
artists_map = {a['id']: a for a in works_data['artists']}

# Also check works-extra.js by matching { id: '...', title: '...' }
with open('works-extra.js', 'r', encoding='utf-8') as f:
    extra_js = f.read()

for match in re.finditer(r"id:\s*'([^']+)',\s*title:\s*'([^']+)'(?:,\s*description:[^,]+)?,\s*artistId:\s*'([^']+)',\s*yearCreated:\s*(\d+)", extra_js):
    w_id, title, artist_id, year = match.groups()
    works_map[w_id] = {
        'id': w_id,
        'title': title,
        'artistId': artist_id,
        'yearCreated': int(year)
    }

for match in re.finditer(r"id:\s*'([^']+)',\s*name:\s*'([^']+)'", extra_js):
    a_id, name = match.groups()
    artists_map[a_id] = {'id': a_id, 'name': name}

framed_works = []
for work_id, entry in images_dict.items():
    file_path = entry['file']
    if not os.path.exists(file_path): continue
    im = Image.open(file_path).convert('RGB')
    arr = np.array(im)
    tl = arr[min(10, arr.shape[0]-1), min(10, arr.shape[1]-1)]
    diff = max(abs(int(tl[0]) - int(tl[1])), abs(int(tl[1]) - int(tl[2])))
    is_wall = (180 <= tl[0] <= 240) and (180 <= tl[1] <= 240) and (170 <= tl[2] <= 235) and (diff < 15)
    if is_wall and im.size == (900, 672):
        w = works_map.get(work_id, {})
        a = artists_map.get(w.get('artistId'), {})
        framed_works.append({
            'work_id': work_id,
            'file': file_path,
            'title': w.get('title', work_id),
            'artist': a.get('name', 'Unknown'),
            'year': w.get('yearCreated', '')
        })

print(f'Count of works with baked-in frame: {len(framed_works)}')
with open('tools/framed_works_list.json', 'w', encoding='utf-8') as f:
    json.dump(framed_works, f, indent=2, ensure_ascii=False)

for fw in framed_works[:15]:
    print(f"  {fw['work_id']}: {fw['artist']} - {fw['title']} ({fw['year']}) -> {fw['file']}")
