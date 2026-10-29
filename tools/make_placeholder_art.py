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
                          ("decor", DECOR), ("stations", STATION_ICONS)):
        for name, sprite in items.items():
            sprite.save(ASSETS / folder / f"{name}.png")


if __name__ == "__main__":
    main()
