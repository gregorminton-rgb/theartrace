import os
from PIL import Image
import numpy as np

src_dir = 'D:/Projekte/Ren/ArtRace3Artwork/Bilder'
files = [f for f in os.listdir(src_dir) if f.endswith('.jpg') and not f.startswith('Auktion')][:10]

for name in files:
    path = os.path.join(src_dir, name)
    im = Image.open(path).convert('RGB')
    arr = np.array(im)
    w, h = im.size
    
    # Check top edge, bottom edge, left edge, right edge
    # The wall is near the border (0..100)
    # The frame is around the painting
    # Find the rectangular inner shadow where the frame meets the canvas
    # Let's inspect along center horizontal line and center vertical line
    row = arr[h//2]
    col = arr[:, w//2]
    
    print(f"{name[:45]}: size=({w},{h})")
