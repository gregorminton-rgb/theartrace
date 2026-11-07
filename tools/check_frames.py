import json
from PIL import Image
import numpy as np

with open('artwork-images.js', 'r', encoding='utf-8') as f:
    text = f.read()

prefix = 'window.ART_ARTWORK_IMAGES = '
data = json.loads(text[text.index(prefix) + len(prefix):].rstrip(';\n\r '))

for k, v in data['images'].items():
    if 'mucha' in k or 'munter' in k:
        print(f"{k}: {v['file']} ({v['width']}x{v['height']})")
