import json
import os
from PIL import Image

with open('artwork-images.js', 'r', encoding='utf-8') as f:
    text = f.read()

prefix = 'window.ART_ARTWORK_IMAGES = '
data = json.loads(text[text.index(prefix) + len(prefix):].rstrip(';\n\r '))

images = data['images']

still_900_672 = []
cropped_small = []
other_sizes = []

for k, v in images.items():
    file_path = v['file']
    if not os.path.exists(file_path):
        continue
    im = Image.open(file_path)
    if im.size == (900, 672):
        still_900_672.append((k, file_path))
    elif im.size[1] == 509:
        cropped_small.append((k, file_path, im.size))
    else:
        other_sizes.append((k, file_path, im.size))

print(f"Still (900, 672): {len(still_900_672)}")
for k, p in still_900_672:
    print(f"  {k} -> {p}")

print(f"\nCropped small (height 509): {len(cropped_small)}")
for k, p, s in cropped_small:
    print(f"  {k} -> {p} {s}")

print(f"\nOther sizes: {len(other_sizes)}")
