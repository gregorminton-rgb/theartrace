import json
import os
from PIL import Image

with open('artwork-images.js', 'r', encoding='utf-8') as f:
    text = f.read()

prefix = 'window.ART_ARTWORK_IMAGES = '
data = json.loads(text[text.index(prefix) + len(prefix):].rstrip(';\n\r '))

images = data['images']
print(f"Total images in catalog: {len(images)}")

# Create a contact sheet image of ALL 156 images so we can visually inspect all of them at a glance!
# 12 columns x 13 rows = 156 images
cols = 12
rows = 13
thumb_w = 140
thumb_h = 110
sheet = Image.new('RGB', (cols * thumb_w, rows * thumb_h), (20, 20, 20))

files_list = []
idx = 0
for k, v in images.items():
    file_path = v['file']
    c = idx % cols
    r = idx // cols
    x = c * thumb_w
    y = r * thumb_h
    
    if os.path.exists(file_path):
        im = Image.open(file_path).convert('RGB')
        # fit in thumb
        im.thumbnail((thumb_w - 4, thumb_h - 18), Image.Resampling.LANCZOS)
        tx = x + (thumb_w - im.width) // 2
        ty = y + 2
        sheet.paste(im, (tx, ty))
    files_list.append((idx, k, file_path))
    idx += 1

out_path = 'C:/Users/Gregor/.gemini/antigravity/brain/8494e200-4a1a-4e57-a79f-bf728369184a/all_156_artworks_contact_sheet.jpg'
sheet.save(out_path, quality=90)
print(f"Contact sheet saved to: {out_path}")
