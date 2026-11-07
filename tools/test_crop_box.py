from PIL import Image
import numpy as np

def detect_inner_box(im):
    arr = np.array(im.convert('RGB'))
    h, w, _ = arr.shape
    
    # 1. Wall detection from corners
    # Sample corner regions (15x15)
    corners = np.concatenate([
        arr[:15, :15].reshape(-1, 3),
        arr[:15, -15:].reshape(-1, 3),
        arr[-15:, :15].reshape(-1, 3),
        arr[-15:, -15:].reshape(-1, 3)
    ])
    wall_color = np.median(corners, axis=0)
    
    # Distance to wall color
    dist_to_wall = np.sqrt(np.sum((arr - wall_color) ** 2, axis=2))
    is_wall = dist_to_wall < 35
    
    # Find outer bounding box of the frame (non-wall)
    row_has_nonwall = np.any(~is_wall, axis=1)
    col_has_nonwall = np.any(~is_wall, axis=0)
    
    if not np.any(row_has_nonwall) or not np.any(col_has_nonwall):
        return None
    
    y_min, y_max = np.where(row_has_nonwall)[0][[0, -1]]
    x_min, x_max = np.where(col_has_nonwall)[0][[0, -1]]
    
    # The frame width is typically ~50-100 px on each side
    # Within the frame [y_min:y_max, x_min:x_max], where does the canvas start?
    # Along the horizontal centerline:
    mid_y = (y_min + y_max) // 2
    mid_x = (x_min + x_max) // 2
    
    # Let's inspect the frame profile
    return (x_min, y_min, x_max, y_max, wall_color)

test_files = [
    'images/art/durer-praying-hands.jpg',
    'images/art/durer-young-hare-after.jpg',
    'images/art/botticelli-venus-study.jpg',
    'images/art/caravaggio-bacchus.jpg',
    'images/art/cezanne-apples-oranges.jpg'
]

for f in test_files:
    im = Image.open(f)
    res = detect_inner_box(im)
    print(f, 'Outer frame bbox:', res[:4], 'Wall:', res[4].astype(int))
