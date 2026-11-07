import json
import os
from PIL import Image
import numpy as np

with open('artwork-images.js', 'r', encoding='utf-8') as f:
    text = f.read()

prefix = 'window.ART_ARTWORK_IMAGES = '
data = json.loads(text[text.index(prefix) + len(prefix):].rstrip(';\n\r '))

images = data['images']

suspicious = []

for k, v in images.items():
    file_path = v['file']
    if not os.path.exists(file_path): continue
    im = Image.open(file_path).convert('RGB')
    arr = np.array(im)
    h, w, _ = arr.shape
    
    # 1. Any image of size (900, 672) is from the old set!
    if (w, h) == (900, 672):
        suspicious.append((k, file_path, "Size (900, 672)"))
        continue
        
    # 2. Check the three Münter works that were cropped with inner-crop fallback
    if 'munter' in k and h == 509:
        suspicious.append((k, file_path, "Münter height 509"))
        continue
        
    # 3. Check for border uniformity:
    # A frame typically has a continuous horizontal strip at top/bottom and vertical strip at sides
    # Check top 8% and bottom 8% rows
    top_strip = arr[:max(5, round(h * 0.05)), :]
    bot_strip = arr[-max(5, round(h * 0.05)):, :]
    left_strip = arr[:, :max(5, round(w * 0.05))]
    right_strip = arr[:, -max(5, round(w * 0.05)):]
    
    # Check if edge strips are very dark (wood/black) or neutral grey/beige (wall)
    top_mean = np.mean(top_strip, axis=(0, 1))
    bot_mean = np.mean(bot_strip, axis=(0, 1))
    
    # If top and bottom are both very dark (wood frame, e.g. < 40 or gold ~ 120-140 with low variance)
    top_std = np.std(top_strip)
    bot_std = np.std(bot_strip)
    
    # Check corners: if all 4 corners have almost identical color (wall or frame)
    c1 = np.mean(arr[:12, :12], axis=(0, 1))
    c2 = np.mean(arr[:12, -12:], axis=(0, 1))
    c3 = np.mean(arr[-12:, :12], axis=(0, 1))
    c4 = np.mean(arr[-12:, -12:], axis=(0, 1))
    corner_diff = np.max([np.linalg.norm(c1 - c2), np.linalg.norm(c1 - c3), np.linalg.norm(c1 - c4)])
    
    # If all 4 corners are very similar in color (e.g. diff < 25) and low saturation or dark
    if corner_diff < 20 and (np.mean(c1) < 55 or np.mean(c1) > 175):
        suspicious.append((k, file_path, f"Corner match: {c1.astype(int)}, diff={corner_diff:.1f}"))

print(f"Total suspicious: {len(suspicious)}")
for s in suspicious:
    print(f"  {s[0]}: {s[1]} ({s[2]})")
