import numpy as np, cv2 as cv
from skimage.morphology import skeletonize

bin_img = cv.imread('depth.jpg', 0)
fg = (bin_img >= 128).astype(np.uint8)
bg = 1 - fg

# 骨架（前景/背景分别取）
fg_skel = skeletonize(fg.astype(bool)).astype(np.uint8)
bg_skel = skeletonize(bg.astype(bool)).astype(np.uint8)

# 距离变换：到边界（同 B）
distF = cv.distanceTransform(fg, cv.DIST_L2, 5)
distB = cv.distanceTransform(bg, cv.DIST_L2, 5)

# 到骨架的距离（把骨架作为“障碍=0”、其它=1，然后做 DT 的 trick）
inv_fg_skel = 1 - fg_skel  #骨架=0
toFgSkel = cv.distanceTransform(inv_fg_skel, cv.DIST_L2, 5)
inv_bg_skel = 1 - bg_skel
toBgSkel = cv.distanceTransform(inv_bg_skel, cv.DIST_L2, 5)

# 相对距离（骨架→0, 边界→1）
eps = 1e-6
relF = distF / (distF + toFgSkel + eps)
relB = distB / (distB + toBgSkel + eps)

# 映射到高度（同上）
hfs, hfc = 1.0, 0.6
hbs, hbc = 0.4, 0.0
gamma = 1.0
hf = hfs - np.power(relF, gamma) * (hfs - hfc)
hb = hbs - np.power(relB, gamma) * (hbs - hbc)
height = hf * fg + hb * bg

out = np.clip(height * 255.0, 0, 255).astype(np.uint8)
cv.imwrite('heightmap.png', out)
