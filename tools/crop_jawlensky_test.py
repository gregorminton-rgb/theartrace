from PIL import Image

path = 'D:/Projekte/Ren/ArtRace3Artwork/Bilder/Gabriele M\u00fcnter \u2013 Jawlensky und Erbsl\u00f6h (ca. 1909).jpg'
im = Image.open(path).convert('RGB')

# Exact inner canvas coordinates
# Let's verify precision by inspecting pixels around 312, 295, 2088, 1495
crop_box = (315, 298, 2085, 1492)
cropped = im.crop(crop_box)
# scale to width 900
scale = 900 / cropped.width
new_h = round(cropped.height * scale)
scaled = cropped.resize((900, new_h), Image.Resampling.LANCZOS)

out_test = 'C:/Users/Gregor/.gemini/antigravity/brain/8494e200-4a1a-4e57-a79f-bf728369184a/test_jawlensky_clean.jpg'
scaled.save(out_test, quality=90)
print('Saved test jawlensky clean to:', out_test, 'Size:', scaled.size)
