import os
from PIL import Image
import numpy as np

path = 'D:/Projekte/Ren/ArtRace3Artwork/Bilder/Gabriele M\u00fcnter \u2013 Jawlensky und Erbsl\u00f6h (ca. 1909).jpg'
im = Image.open(path).convert('RGB')
arr = np.array(im)
w, h = im.size

print("Image size:", w, h)

# In the user's screenshot of Jawlensky:
# The two men (Jawlensky and Erbslöh) are sitting on green grass.
# The frame around it has dark brown wood moulding.
# Let's inspect along middle row (y = h // 2) and middle col (x = w // 2)
row = arr[h // 2]
col = arr[:, w // 2]

# Where is the green grass?
# The green grass has high green channel (G > R and G > B)
# The frame has R > G > B (wood)
for x in range(200, 800, 40):
    print(f"x={x}: {row[x]}")

print("--- Right side ---")
for x in range(1600, 2200, 40):
    print(f"x={x}: {row[x]}")

print("--- Top side ---")
for y in range(150, 600, 40):
    print(f"y={y}: {col[y]}")

print("--- Bottom side ---")
for y in range(1200, 1700, 40):
    print(f"y={y}: {col[y]}")
