import os
from PIL import Image
import numpy as np

for f in os.listdir('D:/Projekte/Ren/ArtRace3Artwork/Bilder'):
    if 'jahreszeiten' in f.lower() or 'seasons' in f.lower():
        path = os.path.join('D:/Projekte/Ren/ArtRace3Artwork/Bilder', f)
        im = Image.open(path).convert('RGB')
        print(f, im.size)
        w, h = im.size
        # inspect middle row and middle col
        arr = np.array(im)
        row = arr[h // 2]
        col = arr[:, w // 2]
        
        # Look for the 4 panels
        # Left edge of panels, right edge of panels, top, bottom
        for x in range(150, 450, 20):
            print(f"x={x}: {row[x]}")
        print("--- Right side ---")
        for x in range(1950, 2250, 20):
            print(f"x={x}: {row[x]}")
        print("--- Top side ---")
        for y in range(150, 450, 20):
            print(f"y={y}: {col[y]}")
        print("--- Bottom side ---")
        for y in range(1350, 1650, 20):
            print(f"y={y}: {col[y]}")
