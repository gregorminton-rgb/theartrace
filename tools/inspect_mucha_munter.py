from PIL import Image
import numpy as np

def check_image(path):
    im = Image.open(path).convert('RGB')
    arr = np.array(im)
    h, w, _ = arr.shape
    print(f"{path}: {w}x{h}")
    # Sample edges: top 15 rows, bottom 15 rows, left 15 cols, right 15 cols
    top = np.mean(arr[:15, :], axis=(0, 1))
    bot = np.mean(arr[-15:, :], axis=(0, 1))
    left = np.mean(arr[:, :15], axis=(0, 1))
    right = np.mean(arr[:, -15:], axis=(0, 1))
    print(f"  Edge means: Top={top.astype(int)}, Bot={bot.astype(int)}, Left={left.astype(int)}, Right={right.astype(int)}")

check_image('images/art/mucha-seasons-posters.jpg')
check_image('images/art/munter-jawlensky.jpg')
check_image('images/art/mucha-gismonda.jpg')
