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
    def __init__(self):
        self.px = [[(0, 0, 0, 0)] * 32 for _ in range(32)]

    def set(self, x, y, c):
        if 0 <= x < 32 and 0 <= y < 32:
            self.px[y][x] = hexrgba(c)

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.set(x, y, c)

    def outline(self, c=OUT):
        """Draw a 1px outline around every filled pixel."""
        filled = {(x, y) for y in range(32) for x in range(32) if self.px[y][x][3]}
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
        png = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 32, 32, 8, 6, 0, 0, 0))
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


def main():
    for name, args in CHARACTERS.items():
        character(*args).save(ASSETS / "characters" / f"{name}.png")
    bartender().save(ASSETS / "npc" / "bartender.png")
    for folder, items in (("dresses", DRESSES), ("props", PROPS), ("drinks", DRINKS)):
        for name, sprite in items.items():
            sprite.save(ASSETS / folder / f"{name}.png")


if __name__ == "__main__":
    main()
