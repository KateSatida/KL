"""Creates simple placeholder 32x32 pixel art so the game works before you
draw your own. Run:  python tools/make_placeholder_art.py

Your own art: just drop 32x32 PNG files (transparent background) into
assets/characters, assets/dresses, assets/props or assets/drinks.
This script never overwrites files that already exist unless you pass --force.
"""
import struct
import sys
import zlib
from pathlib import Path

ASSETS = Path(__file__).resolve().parent.parent / "assets"
FORCE = "--force" in sys.argv
OUT = "#3b2a2a"  # outline colour


def hexrgba(c):
    c = c.lstrip("#")
    return (int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16), 255)


class Sprite:
    def __init__(self, w=32, h=32):
        self.w, self.h = w, h
        self.px = [[(0, 0, 0, 0)] * w for _ in range(h)]

    def set(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[y][x] = hexrgba(c)

    def get(self, x, y):
        return self.px[y][x] if 0 <= x < self.w and 0 <= y < self.h else (0, 0, 0, 0)

    def disc(self, cx, cy, r, c):
        for y in range(int(cy - r) - 1, int(cy + r) + 2):
            for x in range(int(cx - r) - 1, int(cx + r) + 2):
                if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                    self.set(x, y, c)

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.set(x, y, c)

    def outline(self, c=OUT):
        """Draw a 1px outline around every filled pixel."""
        filled = {(x, y) for y in range(self.h) for x in range(self.w) if self.px[y][x][3]}
        for x, y in filled:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                if (x + dx, y + dy) not in filled:
                    self.set(x + dx, y + dy, c)
        return self

    def save(self, path: Path):
        if path.exists() and not FORCE:
            return
        path.parent.mkdir(parents=True, exist_ok=True)
        raw = b"".join(b"\x00" + b"".join(bytes(p) for p in row) for row in self.px)
        chunk = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d))
        png = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", self.w, self.h, 8, 6, 0, 0, 0))
               + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))
        path.write_bytes(png)
        print("created", path.relative_to(ASSETS.parent))


# ---- characters --------------------------------------------------------------

def character(skin, hair, style, shirt="#f2f2f2"):
    s = Sprite()
    s.rect(11, 5, 20, 14, skin)                 # head
    s.rect(12, 15, 19, 24, shirt)               # body / undershirt
    s.rect(10, 16, 11, 22, skin)                # arms
    s.rect(20, 16, 21, 22, skin)
    s.rect(13, 25, 14, 28, "#4a4a5a")           # legs
    s.rect(17, 25, 18, 28, "#4a4a5a")
    s.rect(12, 29, 14, 29, "#2a2a2a")           # shoes
    s.rect(17, 29, 19, 29, "#2a2a2a")
    s.rect(11, 3, 20, 6, hair)                  # hair
    if style == "long":
        s.rect(10, 5, 11, 17, hair)
        s.rect(20, 5, 21, 17, hair)
    elif style == "bun":
        s.rect(13, 1, 18, 2, hair)
        s.rect(10, 5, 10, 9, hair)
        s.rect(21, 5, 21, 9, hair)
    else:  # short
        s.rect(10, 4, 10, 8, hair)
        s.rect(21, 4, 21, 8, hair)
    s.outline()
    s.set(13, 10, "#2a1d1d")                    # eyes
    s.set(18, 10, "#2a1d1d")
    s.set(12, 12, "#f4a3a3")                    # blush
    s.set(19, 12, "#f4a3a3")
    s.rect(15, 12, 16, 12, "#c45c5c")           # smile
    return s


CHARACTERS = {
    "01_short_dark_hair": ("#f7d2b3", "#3a2a22", "short"),
    "02_long_dark_hair": ("#f7d2b3", "#2b1d18", "long"),
    "03_bun_brown_hair": ("#e8b892", "#6b4226", "bun"),
    "04_short_light_hair": ("#ffe0c7", "#d9a441", "short"),
    "05_long_pink_hair": ("#d9a07a", "#e48bb0", "long"),
    "06_short_deep_skin": ("#9c6644", "#1f1a17", "short"),
}

# ---- dresses (drawn on top of the body) ---------------------------------------

def suit(color, tie):
    s = Sprite()
    s.rect(12, 15, 19, 24, color)
    s.rect(10, 16, 11, 22, color)
    s.rect(20, 16, 21, 22, color)
    s.rect(13, 25, 14, 28, color)
    s.rect(17, 25, 18, 28, color)
    s.outline()
    s.rect(15, 15, 16, 19, "#ffffff")
    s.rect(15, 16, 16, 16, tie)
    s.set(14, 16, tie)
    s.set(17, 16, tie)
    return s


def gown(color, trim):
    s = Sprite()
    s.rect(12, 15, 19, 19, color)
    for i, y in enumerate(range(20, 30)):
        w = 4 + i // 2
        s.rect(16 - w, y, 15 + w, y, color)
    s.outline()
    s.rect(12, 19, 19, 19, trim)
    return s


def dress(color, trim):
    s = Sprite()
    s.rect(12, 15, 19, 20, color)
    for i, y in enumerate(range(21, 26)):
        s.rect(11 - i // 2, y, 20 + i // 2, y, color)
    s.outline()
    s.rect(12, 20, 19, 20, trim)
    return s


def thai_dress(color, sash):
    s = gown(color, color)
    for i in range(8):                        # diagonal sabai
        s.set(12 + i, 15 + i // 2, sash)
        s.set(12 + i, 16 + i // 2, sash)
    return s


DRESSES = {
    "black_suit": suit("#2d2d38", "#d0465a"),
    "navy_suit": suit("#2a3d6b", "#e8c25a"),
    "white_gown": gown("#ffffff", "#f2c4d0"),
    "blush_gown": gown("#f6c6cf", "#ffffff"),
    "red_dress": dress("#d23a4a", "#ffd166"),
    "sky_dress": dress("#8ec9f0", "#ffffff"),
    "thai_gold": thai_dress("#d9a441", "#a33a3a"),
}

# ---- props ----------------------------------------------------------------------

def glasses(color):
    s = Sprite()
    s.rect(12, 9, 14, 11, color)
    s.rect(17, 9, 19, 11, color)
    s.rect(15, 10, 16, 10, color)
    s.set(13, 10, "#bfe3ff")
    s.set(18, 10, "#bfe3ff")
    return s


def flower_crown():
    s = Sprite()
    for i, x in enumerate(range(11, 21, 2)):
        s.set(x, 4, ["#ff8fab", "#ffd166", "#ffffff", "#ff8fab", "#b5e48c"][i])
        s.set(x + 1, 4, "#6a994e")
    return s


def top_hat():
    s = Sprite()
    s.rect(9, 3, 22, 3, "#222222")
    s.rect(12, -3, 19, 2, "#222222")
    s.rect(12, 1, 19, 1, "#d0465a")
    return s


def veil():
    s = Sprite()
    s.rect(10, 2, 21, 3, "#ffffff")
    s.rect(8, 4, 9, 22, "#f3f3ff")
    s.rect(22, 4, 23, 22, "#f3f3ff")
    return s


def bouquet():
    s = Sprite()
    s.rect(23, 21, 23, 25, "#6a994e")
    for (x, y, c) in [(22, 18, "#ff8fab"), (24, 18, "#ffffff"), (23, 17, "#ffd166"),
                      (22, 20, "#ffffff"), (24, 20, "#ff8fab"), (23, 19, "#ff5d8f")]:
        s.set(x, y, c)
    s.rect(22, 22, 24, 22, "#ffffff")
    return s


def heart_balloon():
    s = Sprite()
    s.rect(25, 3, 27, 5, "#ff5d8f")
    s.rect(28, 3, 30, 5, "#ff5d8f")
    s.rect(26, 6, 29, 7, "#ff5d8f")
    s.rect(27, 8, 28, 8, "#ff5d8f")
    s.outline()
    s.rect(27, 10, 27, 18, "#888888")
    return s


PROPS = {
    "black_glasses": glasses("#222222"),
    "pink_glasses": glasses("#ff5d8f"),
    "flower_crown": flower_crown(),
    "top_hat": top_hat(),
    "veil": veil(),
    "bouquet": bouquet(),
    "heart_balloon": heart_balloon(),
}

# ---- drinks (held in the left hand) -----------------------------------------------

def wine(color):
    s = Sprite()
    s.rect(6, 15, 9, 17, color)
    s.rect(7, 18, 8, 18, color)
    s.rect(7, 19, 8, 21, "#e8f4ff")
    s.rect(6, 22, 9, 22, "#e8f4ff")
    return s.outline("#7a8a99")


def beer():
    s = Sprite()
    s.rect(5, 16, 9, 22, "#f2b134")
    s.rect(5, 15, 9, 15, "#ffffff")
    s.rect(4, 18, 4, 20, "#cccccc")
    return s.outline("#7a5a2a")


def cocktail():
    s = Sprite()
    for i, y in enumerate(range(15, 18)):
        s.rect(5 + i, y, 10 - i, y, "#ff7eb6")
    s.rect(7, 18, 8, 21, "#e8f4ff")
    s.rect(6, 22, 9, 22, "#e8f4ff")
    s.outline("#7a8a99")
    s.set(10, 14, "#ffd166")
    return s


def coconut():
    s = Sprite()
    s.rect(5, 16, 10, 22, "#8b5a2b")
    s.rect(6, 15, 9, 15, "#f5f5dc")
    s.outline("#4a2f17")
    s.rect(9, 12, 9, 14, "#ff5d8f")
    return s


DRINKS = {
    "red_wine": wine("#8e1b3a"),
    "champagne": wine("#f7e08a"),
    "beer": beer(),
    "pink_cocktail": cocktail(),
    "coconut": coconut(),
}


def bartender():
    s = character("#f0c8a0", "#222222", "short", shirt="#ffffff")
    s.rect(15, 16, 16, 16, "#222222")         # bow tie
    s.rect(12, 19, 19, 24, "#3a3a3a")         # vest
    return s


# ---- outdoor decorations (assets/decor) ----------------------------------------
# Sizes are in pixels; the game draws them 2x bigger (see "scale" in config/game.json).
# A "_night" version is shown after dark; its bright yellow pixels glow automatically.

import random

GREENS = ["#4f7a3a", "#6a994e", "#7fb35f"]
FLOWERS = ["#ff8fab", "#ffffff", "#ffd6a5", "#ff5d8f", "#fff1b8"]


def flower_backdrop():
    s = Sprite(64, 48)
    rnd = random.Random(7)
    s.rect(8, 10, 55, 47, "#fff4e6")                     # cream drape
    for x in range(11, 55, 7):
        s.rect(x, 12, x, 47, "#f3e1cc")                  # folds
    s.rect(4, 8, 7, 47, "#8b5a2b")                       # posts
    s.rect(56, 8, 59, 47, "#8b5a2b")
    s.rect(4, 6, 59, 9, "#8b5a2b")                       # beam
    s.outline()
    spots = [(x, rnd.randint(3, 11)) for x in range(2, 62, 3)]
    spots += [(rnd.choice([3, 4, 7, 8, 55, 56, 59, 60]), y) for y in range(10, 44, 3)]
    for x, y in spots:                                    # greenery + flowers
        s.disc(x, y, 2, rnd.choice(GREENS))
    for x, y in spots:
        if rnd.random() < 0.55:
            s.disc(x + rnd.choice([-1, 0, 1]), y, 1, rnd.choice(FLOWERS))
    return s


def led_string(on):
    s = Sprite(64, 16)
    def sag(x): return 3 + round(8 * (1 - ((x - 31.5) / 32) ** 2))
    for x in range(64):
        s.set(x, sag(x), "#3b3b3b")
    for x in range(4, 64, 8):
        y = sag(x) + 1
        if on:
            s.rect(x - 1, y, x + 1, y + 2, "#ffd166")
            s.set(x, y + 1, "#fffbe0")
            s.set(x, y + 3, "#ffe9a8")
        else:
            s.rect(x - 1, y, x + 1, y + 2, "#d9cfa0")
            s.set(x, y + 1, "#bfb38a")
    return s


def lamp_post(on):
    s = Sprite(16, 48)
    s.rect(7, 14, 8, 44, "#3a3a46")                      # pole
    s.rect(5, 44, 10, 47, "#3a3a46")                     # base
    s.rect(4, 5, 11, 13, "#3a3a46")                      # lamp box
    s.rect(6, 2, 9, 4, "#3a3a46")                        # cap
    s.rect(5, 6, 10, 12, "#fff1a8" if on else "#b8c4cc")  # glass
    if on:
        s.rect(7, 8, 8, 10, "#fffbe0")
    return s


def tree():
    s = Sprite(48, 64)
    s.rect(21, 38, 26, 63, "#7a4b2a")
    s.rect(23, 40, 24, 63, "#8f5b34")
    for cx, cy, r, c in [(24, 22, 17, "#4f7a3a"), (15, 26, 10, "#4f7a3a"), (33, 26, 10, "#4f7a3a"),
                         (24, 18, 13, "#6a994e"), (18, 22, 7, "#6a994e"), (30, 21, 7, "#6a994e"),
                         (21, 13, 5, "#7fb35f"), (29, 16, 4, "#7fb35f")]:
        s.disc(cx, cy, r, c)
    return s.outline("#2f4a24")


def bush():
    s = Sprite(32, 24)
    rnd = random.Random(3)
    for cx, cy, r, c in [(16, 15, 9, "#4f7a3a"), (8, 17, 6, "#4f7a3a"), (24, 17, 6, "#4f7a3a"),
                         (14, 12, 6, "#6a994e"), (21, 13, 5, "#6a994e")]:
        s.disc(cx, cy, r, c)
    s.outline("#2f4a24")
    for _ in range(6):
        s.set(rnd.randint(6, 25), rnd.randint(9, 19), rnd.choice(FLOWERS))
    return s


def flower_pot():
    s = Sprite(16, 16)
    s.rect(4, 9, 11, 15, "#c96f4a")
    s.rect(3, 8, 12, 9, "#b25c3a")
    for cx, cy, c in [(5, 5, "#ff8fab"), (10, 5, "#ffffff"), (8, 3, "#ff5d8f"), (7, 6, "#ffd6a5")]:
        s.disc(cx, cy, 1.5, c)
    s.rect(7, 6, 8, 8, "#6a994e")
    return s.outline()


def cake():
    s = Sprite(32, 32)
    s.rect(6, 29, 25, 30, "#c9b8a6")                     # stand
    s.rect(14, 26, 17, 28, "#c9b8a6")
    s.rect(7, 19, 24, 25, "#ffffff")                     # tiers
    s.rect(10, 13, 21, 18, "#ffffff")
    s.rect(13, 8, 18, 12, "#ffffff")
    s.outline()
    for y in (19, 13, 8):
        for x in range(6, 26, 2):
            if s.get(x, y)[:3] == (255, 255, 255):
                s.set(x, y, "#ff8fab")                   # pink trim
    s.set(15, 5, "#ff5d8f"); s.set(16, 5, "#ff5d8f"); s.rect(15, 6, 16, 7, "#ff5d8f")  # heart topper
    return s


# ---- station icons (assets/stations) ----------------------------------------------

def icon_camera():
    s = Sprite()
    s.rect(4, 10, 27, 25, "#3a3a46")
    s.rect(8, 7, 13, 9, "#3a3a46")
    s.rect(4, 13, 27, 14, "#5a5a6a")
    s.outline()
    s.disc(16, 18, 5.5, "#1f1f29")
    s.disc(16, 18, 4, "#8ec9f0")
    s.disc(15, 17, 1.5, "#ffffff")
    s.rect(23, 11, 25, 12, "#ff5d8f")
    return s


def icon_cocktail():
    s = Sprite()
    for i, y in enumerate(range(6, 16)):
        s.rect(5 + i, y, 26 - i, y, "#e8f4ff" if y < 8 else "#ff7eb6")
    s.rect(15, 16, 16, 25, "#e8f4ff")
    s.rect(10, 26, 21, 27, "#e8f4ff")
    s.outline("#7a8a99")
    s.disc(21, 5, 2, "#6a994e")
    s.set(21, 5, "#d23a4a")
    return s


def icon_heart():
    s = Sprite()
    s.disc(11, 12, 6, "#ff5d8f")
    s.disc(20, 12, 6, "#ff5d8f")
    for i, y in enumerate(range(13, 27)):
        s.rect(5 + i, y, 26 - i, y, "#ff5d8f")
    s.outline()
    s.rect(9, 9, 11, 10, "#ffc2d4")
    for i in range(22):                                   # arrow
        s.set(3 + i, 25 - i, "#8b5a2b")
    s.rect(25, 2, 27, 4, "#ffd166")
    return s


def icon_dress():
    s = Sprite()
    s.rect(15, 2, 16, 4, "#8b5a2b")                      # hanger
    s.rect(8, 5, 23, 6, "#8b5a2b")
    s.rect(12, 7, 19, 13, "#8ec9f0")
    for i, y in enumerate(range(14, 29)):
        w = 4 + i // 2 + i // 4
        s.rect(16 - w, y, 15 + w, y, "#8ec9f0")
    s.outline()
    s.rect(12, 13, 19, 13, "#ffffff")
    return s


# ---- station buildings (assets/stations), 96x80, drawn 3x bigger ------------------

def ellipse(s, cx, cy, rx, ry, c):
    for y in range(int(cy - ry), int(cy + ry) + 1):
        for x in range(int(cx - rx), int(cx + rx) + 1):
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1:
                s.set(x, y, c)


def camera_icon(s, x0, y0):
    s.rect(x0, y0 + 2, x0 + 11, y0 + 8, "#3a3a46")
    s.rect(x0 + 2, y0, x0 + 5, y0 + 1, "#3a3a46")
    s.disc(x0 + 6, y0 + 5, 2.2, "#8ec9f0")
    s.set(x0 + 5, y0 + 4, "#ffffff")
    s.set(x0 + 10, y0 + 3, "#ff5d8f")


def photobooth_building(night):
    s = Sprite(96, 80)
    s.rect(30, 22, 73, 77, "#f4a6b8")                    # cabinet
    s.rect(66, 22, 73, 77, "#d98aa0")                    # side shade
    s.rect(26, 15, 77, 21, "#c2577a")                    # roof
    s.rect(28, 12, 75, 14, "#c2577a")
    s.rect(36, 30, 58, 75, "#3a2a3a")                    # dark inside
    s.rect(36, 30, 50, 75, "#d23a4a")                    # curtain (half open)
    for x in range(38, 51, 3):
        s.rect(x, 30, x, 75, "#a82c3a")
    s.rect(52, 64, 57, 66, "#8b5a2b")                    # stool inside
    s.rect(54, 67, 55, 75, "#8b5a2b")
    s.rect(61, 34, 70, 44, "#2a2a36")                    # screen
    s.rect(62, 35, 69, 43, "#8ec9f0")
    s.rect(62, 52, 69, 54, "#3a3a46")                    # photo-strip slot
    s.rect(63, 55, 68, 66, "#ffffff")
    for y in (57, 61, 65):
        s.rect(64, y - 1, 67, y, "#cfd6dc")
    s.outline()
    for x in range(30, 74, 4):                           # marquee bulbs
        s.rect(x, 17, x + 1, 18, "#fff3b0" if night else "#e8d9a8")
    s.rect(10, 40, 12, 77, "#8b5a2b")                    # sign post
    s.rect(2, 26, 25, 41, "#b07a45")                     # wooden sign
    for y in (30, 35):
        s.rect(2, y, 25, y, "#8b5a2b")
    s.rect(1, 25, 26, 25, "#6b4226"); s.rect(1, 42, 26, 42, "#6b4226")
    s.rect(1, 25, 1, 42, "#6b4226"); s.rect(26, 25, 26, 42, "#6b4226")
    camera_icon(s, 8, 28)
    return s


def cupid_fountain(night):
    s = Sprite(96, 80)
    ellipse(s, 48, 68, 44, 11, "#aeb7bf")                # basin rim
    ellipse(s, 48, 67, 40, 8, "#8ec9f0")                 # water
    ellipse(s, 44, 66, 14, 3, "#bfe6ff")
    s.rect(43, 36, 52, 66, "#cfd6dc")                    # pedestal
    s.rect(45, 36, 46, 66, "#e6ebef")
    ellipse(s, 48, 36, 18, 5, "#aeb7bf")                 # upper bowl
    ellipse(s, 48, 35, 15, 3, "#8ec9f0")
    for x in (32, 35, 61, 64):                           # water streams
        for y in range(39, 64):
            if (y + x) % 3:
                s.set(x, y, "#bfe6ff")
    s.rect(45, 17, 51, 30, "#f7d2b3")                    # cupid body
    s.rect(44, 29, 46, 32, "#f7d2b3"); s.rect(50, 29, 52, 32, "#f7d2b3")
    s.disc(48, 12, 4, "#f7d2b3")                         # head
    s.rect(44, 7, 52, 9, "#ffd166")                      # curls
    s.rect(37, 15, 43, 22, "#ffffff"); s.rect(53, 15, 59, 22, "#ffffff")   # wings
    s.rect(44, 23, 52, 25, "#ffffff")                    # cloth
    s.outline("#6d7680")
    s.set(46, 12, "#3b2a2a"); s.set(50, 12, "#3b2a2a")
    for i in range(9):                                   # bow + arrow
        s.set(55 + i // 3, 12 + i, "#8b5a2b")
    for x in range(52, 66):
        s.set(x, 16, "#8b5a2b")
    s.rect(66, 15, 67, 17, "#ff5d8f")
    for cx, cy in ((72, 6), (24, 10), (80, 18)):         # floating hearts
        s.rect(cx, cy, cx + 1, cy, "#ff5d8f"); s.rect(cx + 3, cy, cx + 4, cy, "#ff5d8f")
        s.rect(cx, cy + 1, cx + 4, cy + 1, "#ff5d8f"); s.rect(cx + 1, cy + 2, cx + 3, cy + 2, "#ff5d8f")
        s.set(cx + 2, cy + 3, "#ff5d8f")
    if night:                                            # rim lights
        for x in range(10, 88, 8):
            y = 68 + round(10 * (1 - ((x - 48) / 44) ** 2) ** 0.5)
            s.rect(x, y - 1, x + 1, y, "#fff3b0")
    return s


def bar_back(night):
    s = Sprite(96, 80)
    s.rect(6, 14, 89, 62, "#8b5a2b")                     # back wall
    for y in (28, 42):
        s.rect(8, y, 87, y + 1, "#6b4226")               # shelves
    colors = ["#2a9d8f", "#d23a4a", "#f4a261", "#8ec9f0", "#6a994e", "#ffd166", "#a77bd6"]
    for i, x in enumerate(range(10, 86, 6)):             # bottles
        for row, base in enumerate((27, 41)):
            c = colors[(i + row * 3) % len(colors)]
            h = 6 + (i + row) % 3
            s.rect(x, base - h, x + 2, base, c)
            s.rect(x + 1, base - h - 2, x + 1, base - h - 1, c)
    s.outline()
    for x in range(2, 94):                               # striped awning
        stripe = "#ff8fab" if (x // 6) % 2 else "#ffffff"
        s.rect(x, 4, x, 12, stripe)
        if x % 6 in (2, 3):
            s.set(x, 13, stripe)
    s.rect(2, 3, 93, 3, "#c2577a")
    for x in range(6, 92, 7):                            # string lights under awning
        s.rect(x, 15, x + 1, 16, "#fff3b0" if night else "#d9cfa0")
    return s


def bar_front():
    s = Sprite(96, 80)
    s.rect(4, 58, 91, 77, "#b07a45")                     # counter
    s.rect(2, 54, 93, 57, "#d9a066")                     # counter top
    for x in range(16, 90, 14):
        s.rect(x, 60, x, 75, "#8b5a2b")                  # panels
    s.outline()
    for x in (20, 50, 74):                               # glasses on the counter
        s.rect(x, 49, x + 3, 50, "#ff7eb6"); s.rect(x + 1, 51, x + 2, 53, "#e8f4ff")
    return s


def closet():
    s = Sprite(96, 80)
    s.rect(4, 6, 91, 77, "#f6ead8")                      # back wall
    s.rect(4, 6, 91, 8, "#b07a45"); s.rect(4, 6, 6, 77, "#b07a45"); s.rect(89, 6, 91, 77, "#b07a45")
    s.rect(7, 70, 88, 77, "#e3cdb0")                     # floor
    ellipse(s, 30, 74, 18, 3, "#e8a7b8")                 # rug
    s.rect(8, 15, 56, 16, "#8b5a2b")                     # clothes rail
    garments = [("#d23a4a", "dress"), ("#2d2d38", "suit"), ("#8ec9f0", "dress"), ("#ffd166", "shirt"),
                ("#a77bd6", "dress"), ("#ffffff", "dress")]
    for i, (c, kind) in enumerate(garments):
        x = 10 + i * 8
        s.set(x + 3, 17, "#555555")                      # hanger hook
        s.rect(x, 18, x + 6, 19, "#555555")
        if kind == "dress":
            for j, y in enumerate(range(20, 44)):
                w = 2 + j // 8
                s.rect(x + 3 - w, y, x + 3 + w, y, c)
        else:
            s.rect(x, 20, x + 6, 36 if kind == "suit" else 30, c)
    s.rect(10, 56, 56, 58, "#b07a45")                    # shoe shelf
    for i, c in enumerate(["#d23a4a", "#2d2d38", "#ff8fab", "#8b5a2b", "#ffffff"]):
        s.rect(12 + i * 9, 53, 16 + i * 9, 55, c)
    s.rect(60, 9, 90, 10, "#8b5a2b")                     # curtain rod
    s.rect(62, 11, 88, 69, "#3a2a3a")                    # changing booth inside
    s.rect(62, 11, 79, 69, "#c38fd6")                    # curtain, half drawn
    for x in range(64, 80, 3):
        s.rect(x, 11, x, 69, "#a46fbb")
    s.rect(84, 30, 87, 50, "#bfe6ff")                    # mirror inside
    s.outline()
    return s


def wishing_tree(night):
    s = Sprite(96, 96)
    s.rect(42, 58, 53, 93, "#7a4b2a")                    # trunk
    s.rect(45, 60, 47, 93, "#8f5b34")
    s.rect(36, 90, 59, 93, "#7a4b2a")                    # roots
    for i in range(10):                                   # branches
        s.set(41 - i, 58 - i // 2, "#7a4b2a"); s.set(54 + i, 58 - i // 2, "#7a4b2a")
    for cx, cy, r, c in [(48, 34, 30, "#4f7a3a"), (24, 42, 16, "#4f7a3a"), (72, 42, 16, "#4f7a3a"),
                         (48, 28, 24, "#6a994e"), (30, 34, 12, "#6a994e"), (66, 34, 12, "#6a994e"),
                         (42, 18, 8, "#7fb35f"), (58, 22, 7, "#7fb35f"), (28, 30, 5, "#7fb35f")]:
        s.disc(cx, cy, r, c)
    s.outline("#2f4a24")
    rnd = random.Random(11)                               # lanterns
    for x, y in ((20, 50), (34, 56), (62, 56), (76, 50), (30, 14), (66, 14), (48, 8)):
        s.set(x, y - 2, "#3b3b3b")
        s.rect(x - 1, y - 1, x + 1, y + 1, "#fff3b0" if night else "#e8a7b8")
        if night:
            s.set(x, y, "#fffbe0")
    return s


def easel():
    s = Sprite(24, 36)
    for i in range(16):                                   # legs
        s.set(6 - i // 6, 20 + i, "#8b5a2b"); s.set(17 + i // 6, 20 + i, "#8b5a2b")
        s.set(12, 20 + i, "#6b4226")
    s.rect(1, 1, 22, 20, "#b07a45")                      # frame (photo drawn inside in game)
    s.rect(3, 3, 20, 18, "#fff4e6")
    s.rect(0, 21, 23, 22, "#8b5a2b")                     # ledge
    return s.outline()


def memory_sign():
    s = Sprite(40, 40)
    s.rect(4, 14, 6, 39, "#8b5a2b"); s.rect(33, 14, 35, 39, "#8b5a2b")
    s.rect(1, 4, 38, 16, "#b07a45")
    s.rect(1, 9, 38, 9, "#8b5a2b")
    s.outline()
    s.rect(17, 6, 18, 6, "#ff5d8f"); s.rect(21, 6, 22, 6, "#ff5d8f")      # heart
    s.rect(16, 7, 23, 8, "#ff5d8f"); s.rect(17, 9, 22, 10, "#ff5d8f"); s.rect(18, 11, 21, 11, "#ff5d8f")
    s.rect(19, 12, 20, 12, "#ff5d8f")
    return s


def toss_stage():
    s = Sprite(64, 40)
    ellipse(s, 32, 30, 30, 8, "#8b5a2b")                 # round wooden stage
    ellipse(s, 32, 27, 30, 8, "#d9a066")
    for x in range(6, 60, 6):
        s.rect(x, 22, x, 32, "#b07a45")
    s.rect(29, 6, 34, 24, "#ffffff")                     # pillar
    ellipse(s, 32, 6, 6, 2, "#e6ebef")
    s.outline()
    for cx, cy, c in [(30, 2, "#ff8fab"), (34, 2, "#ffffff"), (32, 0, "#ff5d8f"), (28, 4, "#ffd6a5"), (36, 4, "#ff8fab")]:
        s.disc(cx, cy, 1.3, c)                            # bouquet on the pillar
    for i, x in enumerate(range(4, 62, 5)):               # petals around the edge
        s.set(x, 34 + (i % 2), ["#ff8fab", "#ffffff", "#ffd6a5"][i % 3])
    return s


def speaker():
    s = Sprite(16, 28)
    s.rect(1, 1, 14, 26, "#2a2a36")
    s.disc(7.5, 8, 4, "#4a4a5a"); s.disc(7.5, 8, 2, "#1a1a22")
    s.disc(7.5, 19, 5, "#4a4a5a"); s.disc(7.5, 19, 2.5, "#1a1a22")
    return s.outline()


def disco_ball(night):
    s = Sprite(16, 20)
    s.rect(7, 0, 8, 3, "#888888")
    s.disc(7.5, 11, 7, "#c9d1d9")
    for y in range(5, 18, 3):
        for x in range(1, 15, 3):
            if s.get(x, y)[3]:
                s.set(x, y, "#fffbe0" if night and (x + y) % 2 else "#8e9aa6")
    return s


def memory_photo(kind):
    s = Sprite(64, 48)
    if kind == "sunset":
        for y in range(48):
            s.rect(0, y, 63, y, ["#ffb385", "#ff8fab", "#c38fd6"][min(2, y // 12)] if y < 30 else "#4a7ab8")
        s.disc(32, 30, 9, "#ffd166"); s.rect(0, 30, 63, 47, "#4a7ab8")
        for y in range(32, 47, 3): s.rect(20, y, 44, y, "#7fa8d8")
    elif kind == "mountains":
        s.rect(0, 0, 63, 47, "#bfe6ff")
        for x in range(64):
            h1 = 30 - abs(x - 20) * 0.9; h2 = 26 - abs(x - 46) * 0.8
            s.rect(x, int(max(h1, 8)) if h1 > 0 else 40, x, 47, "#6a8a9e")
            if h2 > 0: s.rect(x, int(max(h2, 6)) + 6, x, 47, "#4f6f80")
        s.rect(0, 40, 63, 47, "#6a994e")
    elif kind == "ring":
        s.rect(0, 0, 63, 47, "#fff0f4")
        s.disc(32, 26, 11, "#ffd166"); s.disc(32, 26, 8, "#fff0f4")
        s.disc(32, 13, 4, "#bfe6ff"); s.set(31, 12, "#ffffff")
        for x, y in ((10, 8), (52, 10), (12, 38), (50, 38)): s.disc(x, y, 2, "#ff8fab")
    else:  # hearts
        s.rect(0, 0, 63, 47, "#ffe3ea")
        for cx, c in ((24, "#ff5d8f"), (40, "#c2577a")):
            s.disc(cx - 4, 20, 5, c); s.disc(cx + 4, 20, 5, c)
            for i, y in enumerate(range(21, 32)): s.rect(cx - 9 + i, y, cx + 9 - i, y, c)
    return s


BUILDINGS = {
    "wishing_tree": wishing_tree(False), "wishing_tree_night": wishing_tree(True),
    "easel": easel(), "memory_sign": memory_sign(), "toss_stage": toss_stage(),
    "speaker": speaker(), "disco_ball": disco_ball(False), "disco_ball_night": disco_ball(True),
    "photobooth_building": photobooth_building(False), "photobooth_building_night": photobooth_building(True),
    "cupid_fountain": cupid_fountain(False), "cupid_fountain_night": cupid_fountain(True),
    "bar_back": bar_back(False), "bar_back_night": bar_back(True), "bar_front": bar_front(),
    "closet": closet(),
}

MEMORIES = {f"0{i + 1}_{k}": memory_photo(k) for i, k in enumerate(["sunset", "mountains", "ring", "hearts"])}

DECOR = {
    "flower_backdrop": flower_backdrop(),
    "led_string": led_string(False), "led_string_night": led_string(True),
    "lamp_post": lamp_post(False), "lamp_post_night": lamp_post(True),
    "tree": tree(), "bush": bush(), "flower_pot": flower_pot(), "cake": cake(),
}
STATION_ICONS = {"camera": icon_camera(), "cocktail": icon_cocktail(), "heart": icon_heart(), "dress": icon_dress()}


def main():
    for name, args in CHARACTERS.items():
        character(*args).save(ASSETS / "characters" / f"{name}.png")
    bartender().save(ASSETS / "npc" / "bartender.png")
    for folder, items in (("dresses", DRESSES), ("props", PROPS), ("drinks", DRINKS),
                          ("decor", DECOR), ("stations", STATION_ICONS), ("stations", BUILDINGS),
                          ("memories", MEMORIES)):
        for name, sprite in items.items():
            sprite.save(ASSETS / folder / f"{name}.png")


if __name__ == "__main__":
    main()
