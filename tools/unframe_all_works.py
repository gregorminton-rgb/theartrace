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

def search_wikimedia(query):
    url = f"https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srsearch={urllib.parse.quote(query)}&srnamespace=6&srlimit=6"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=8) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return data.get('query', {}).get('search', [])
    except Exception as e:
        print(f"  Search error for '{query}': {e}")
        return []

def get_image_url(file_title, width=900):
    url = f"https://commons.wikimedia.org/w/api.php?action=query&format=json&titles={urllib.parse.quote(file_title)}&prop=imageinfo&iiprop=url&iiurlwidth={width}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=8) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            pages = data.get('query', {}).get('pages', {})
            for page_id, page in pages.items():
                imageinfo = page.get('imageinfo', [])
                if imageinfo:
                    return imageinfo[0].get('thumburl') or imageinfo[0].get('url')
    except Exception as e:
        print(f"  URL error for '{file_title}': {e}")
    return None

def download_image(url, target_path):
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=12) as resp:
            data = resp.read()
        with open(target_path, 'wb') as f:
            f.write(data)
        im = Image.open(target_path).convert('RGB')
        # Ensure max width 900
        if im.width > 900 or im.height > 1200:
            scale = min(900 / im.width, 1200 / im.height)
            new_w = max(100, round(im.width * scale))
            new_h = max(100, round(im.height * scale))
            im = im.resize((new_w, new_h), Image.Resampling.LANCZOS)
        im.save(target_path, quality=85)
        return im.size
    except Exception as e:
        print(f"  Download error: {e}")
        return None

def crop_inner_canvas_fallback(file_path):
    try:
        im = Image.open(file_path).convert('RGB')
        arr = np.array(im)
        h, w, _ = arr.shape
        
        corners = np.concatenate([
            arr[:20, :20].reshape(-1, 3),
            arr[:20, -20:].reshape(-1, 3),
            arr[-20:, :20].reshape(-1, 3),
            arr[-20:, -20:].reshape(-1, 3)
        ])
        wall = np.median(corners, axis=0)
        dist = np.sqrt(np.sum((arr - wall) ** 2, axis=2))
        is_wall = dist < 32
        
        row_has = np.any(~is_wall, axis=1)
        col_has = np.any(~is_wall, axis=0)
        
        if not np.any(row_has) or not np.any(col_has):
            return im.size
            
        y0, y1 = np.where(row_has)[0][[0, -1]]
        x0, x1 = np.where(col_has)[0][[0, -1]]
        
        fw = (x1 - x0)
        fh = (y1 - y0)
        
        inset_x = round(fw * 0.11)
        inset_y = round(fh * 0.12)
        
        crop_x0 = max(0, x0 + inset_x)
        crop_y0 = max(0, y0 + inset_y)
        crop_x1 = min(w, x1 - inset_x)
        crop_y1 = min(h, y1 - inset_y)
        
        cropped = im.crop((crop_x0, crop_y0, crop_x1, crop_y1))
        cropped.save(file_path, quality=85)
        return cropped.size
    except Exception as e:
        print(f"  Crop fallback error: {e}")
        return None

# Load the list of 84 framed works
with open('tools/framed_works_list.json', 'r', encoding='utf-8') as f:
    framed_works = json.load(f)

# Load artwork-images.js
with open('artwork-images.js', 'r', encoding='utf-8') as f:
    text = f.read()

prefix = 'window.ART_ARTWORK_IMAGES = '
data = json.loads(text[text.index(prefix) + len(prefix):].rstrip(';\n\r '))
images_dict = data['images']

print(f"Continuing un-framing for remaining paintings...")

success_fetch = 0
success_crop = 0
skipped = 0

for i, item in enumerate(framed_works):
    w_id = item['work_id']
    file_path = item['file']
    title = item['title']
    artist = item['artist'] if item['artist'] != 'Unknown' else ''
    
    # Check if already processed (not 900x672 with wall)
    if os.path.exists(file_path):
        im_check = Image.open(file_path)
        arr_check = np.array(im_check.convert('RGB'))
        tl = arr_check[min(10, arr_check.shape[0]-1), min(10, arr_check.shape[1]-1)]
        diff = max(abs(int(tl[0]) - int(tl[1])), abs(int(tl[1]) - int(tl[2])))
        is_wall = (180 <= tl[0] <= 240) and (180 <= tl[1] <= 240) and (170 <= tl[2] <= 235) and (diff < 15)
        if not is_wall or im_check.size != (900, 672):
            print(f"[{i+1}/{len(framed_works)}] {w_id}: Already clean ({im_check.size[0]}x{im_check.size[1]})")
            images_dict[w_id]['width'] = im_check.size[0]
            images_dict[w_id]['height'] = im_check.size[1]
            images_dict[w_id]['bytes'] = os.path.getsize(file_path)
            skipped += 1
            continue
            
    clean_title = title.split(',')[0].split('(')[0].replace('study', '').replace('sketch', '').replace('copy', '').strip()
    query = f"{clean_title} {artist}".strip()
    
    print(f"[{i+1}/{len(framed_works)}] {w_id}: '{query}'")
    
    size = None
    results = search_wikimedia(query)
    
    candidates = []
    bad_words = ['frame', 'detail', 'in_situ', 'exhibition', 'sculpture', 'stamp', 'coin', 'museum', 'room', 'room_']
    for r in results:
        t_low = r['title'].lower()
        if not any(bw in t_low for bw in bad_words) and (t_low.endswith('.jpg') or t_low.endswith('.jpeg') or t_low.endswith('.png')):
            candidates.append(r['title'])
    
    if not candidates and results:
        for r in results:
            if r['title'].lower().endswith('.jpg') or r['title'].lower().endswith('.png'):
                candidates.append(r['title'])
                
    for cand in candidates[:2]:
        img_url = get_image_url(cand, width=900)
        if img_url:
            size = download_image(img_url, file_path)
            if size:
                clean_cand = cand.encode('ascii', errors='replace').decode('ascii')
                print(f"  -> Fetched clean image: {clean_cand} ({size[0]}x{size[1]})")
                success_fetch += 1
                break
    
    if not size:
        print(f"  -> Fetch didn't find candidate, using inner-crop fallback")
        size = crop_inner_canvas_fallback(file_path)
        if size:
            print(f"  -> Cropped inner canvas: {size[0]}x{size[1]}")
            success_crop += 1
    
    if size and w_id in images_dict:
        images_dict[w_id]['width'] = size[0]
        images_dict[w_id]['height'] = size[1]
        images_dict[w_id]['bytes'] = os.path.getsize(file_path)
    
    time.sleep(0.3)

# Write updated artwork-images.js
with open('artwork-images.js', 'w', encoding='utf-8') as f:
    f.write('/* Generated by tools/import-artwork-images.ps1 - do not edit by hand. */\n')
    f.write('window.ART_ARTWORK_IMAGES = ')
    json.dump(data, f, indent=4)
    f.write(';\n')

print(f"\nCOMPLETED UN-FRAMING ALL WORKS:")
print(f"  Already clean: {skipped}")
print(f"  Newly fetched clean museum scans: {success_fetch}")
print(f"  Inner-crop fallbacks: {success_crop}")
print(f"  Total: {skipped + success_fetch + success_crop}/{len(framed_works)}")
