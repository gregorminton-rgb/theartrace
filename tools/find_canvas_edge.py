from PIL import Image
import numpy as np

def find_inner_canvas(image_path):
    im = Image.open(image_path).convert('RGB')
    arr = np.array(im)
    h, w, _ = arr.shape
    
    # Let's inspect along middle column (x = w//2)
    col = arr[:, w//2]
    # Along middle row (y = h//2)
    row = arr[h//2, :]
    
    # We want to find the exact transition from the frame to the canvas
    # The frame has wood moulding. The inner edge of the frame has an inner shadow (dark strip)
    # followed by the canvas.
    return (w, h, row.shape, col.shape)

print(find_inner_canvas('D:/Projekte/Ren/ArtRace3Artwork/Bilder/Albrecht Dürer – Feldhase (ca. 1502).jpg'))
print(find_inner_canvas('D:/Projekte/Ren/ArtRace3Artwork/Bilder/Caspar David Friedrich – Der Wanderer über dem Nebelmeer.jpg'))
