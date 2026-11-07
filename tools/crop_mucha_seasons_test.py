from PIL import Image

path = 'D:/Projekte/Ren/ArtRace3Artwork/Bilder/Alfons Mucha \u2013 Die Jahreszeiten (Farbserie, 1896).jpg'
im = Image.open(path).convert('RGB')

crop_box = (240, 225, 2215, 1555)
cropped = im.crop(crop_box)
scale = 900 / cropped.width
new_h = round(cropped.height * scale)
scaled = cropped.resize((900, new_h), Image.Resampling.LANCZOS)

out_test = 'C:/Users/Gregor/.gemini/antigravity/brain/8494e200-4a1a-4e57-a79f-bf728369184a/test_mucha_seasons_clean.jpg'
scaled.save(out_test, quality=90)
print('Saved test mucha seasons clean to:', out_test, 'Size:', scaled.size)
