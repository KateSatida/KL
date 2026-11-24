"""Builds the photo-booth frames with your logo (assets/logo.png): 01-03 classic,
04/06 the pixel bride and groom, 05 your die-cut photo.

assets/frames/04_pixel_couple.svg: the pixel bride and groom standing
at the bottom of the photo with the names and date between them.

    python tools/make_couple_frame.py

Run it again after you redraw assets/npc/bride.png or groom.png. The pictures
are embedded inside the SVG because a frame can't load other files.

Die-cut photo frame: put a photo of the two of you with the background removed
(PNG with a transparent background) at assets/couple/our_photo.png. This script
then also builds assets/frames/05_our_photo.svg, with you standing in the
bottom-right corner of every booth photo. GitHub runs this script on every
push, so uploading the PNG on github.com is enough.
"""
import base64
import io
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
NAMES, DATE = "Kate &amp; Lay", "28 · 11 · 2026"
SCALE = 5                                     # 32 px sprite -> 160 px


def sprite_uri(name: str) -> str:
    im = Image.open(ROOT / "assets" / "npc" / f"{name}.png").convert("RGBA")
    im = im.resize((im.width * SCALE, im.height * SCALE), Image.NEAREST)   # keep crisp pixels
    buf = io.BytesIO()
    im.save(buf, "PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def logo(color: str, height: int, halo: bool = False):
    """assets/logo.png recoloured, as (data URI, width, height) for an SVG <image>.
    halo: a soft white edge so it stays readable on any photo."""
    src = Image.open(ROOT / "assets" / "logo.png").convert("RGBA")
    alpha = src.getchannel("A")
    k = height * 2 / src.height                                # 2x for sharp printing
    alpha = alpha.resize((round(src.width * k), height * 2), Image.LANCZOS)
    pad = 10 if halo else 0
    a = Image.new("L", (alpha.width + 2 * pad, alpha.height + 2 * pad), 0)
    a.paste(alpha, (pad, pad))
    im = Image.new("RGBA", a.size, color)
    im.putalpha(a)
    if halo:
        ring = a.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(2))
        white = Image.new("RGBA", a.size, "#ffffff")
        white.putalpha(ring)
        im = Image.alpha_composite(white, im)
    w, h = im.width // 2, im.height // 2
    return png_uri(im), w, h


def logo_tag(color, height, cx=None, x=None, y=0, halo=False):
    uri, w, h = logo(color, height, halo)
    left = round(cx - w / 2) if cx is not None else x
    return f'<image x="{left}" y="{y}" width="{w}" height="{h}" xlink:href="{uri}" href="{uri}"/>'


SVG_HEAD = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="600" height="800" viewBox="0 0 600 800">'
NAMES_PLAIN, DATE_DOTS = "Kate &amp; Lay", "28.11.2026"


def classic_frames():
    """The three simple frames (floral, gold, polaroid), each with your logo."""
    floral = f'''{SVG_HEAD}
  <!-- Photo frame: 600x800, keep the middle transparent so the photo shows through -->
  <path fill="#F7E1D7" fill-rule="evenodd" d="M0 0H600V800H0Z M30 30V700H570V30Z"/>
  <rect x="30" y="30" width="540" height="670" fill="none" stroke="#EDAFB8" stroke-width="6"/>
  <g font-size="54"><text x="0" y="70">🌸</text><text x="535" y="70">🌸</text><text x="0" y="740">🌷</text><text x="535" y="740">🌷</text></g>
  {logo_tag("#4A5759", 52, cx=300, y=708)}
  <text x="300" y="786" text-anchor="middle" font-family="Georgia, serif" font-size="26" fill="#4A5759">{NAMES_PLAIN} · {DATE_DOTS}</text>
</svg>
'''
    gold = f'''{SVG_HEAD}
  <path fill="#1f1b16" fill-rule="evenodd" d="M0 0H600V800H0Z M40 40V680H560V40Z"/>
  <rect x="40" y="40" width="520" height="640" fill="none" stroke="#d9b45a" stroke-width="8"/>
  <rect x="22" y="22" width="556" height="756" fill="none" stroke="#d9b45a" stroke-width="2"/>
  {logo_tag("#d9b45a", 50, cx=300, y=690)}
  <text x="300" y="762" text-anchor="middle" font-family="Georgia, serif" font-size="30" fill="#d9b45a" letter-spacing="6">KATE &amp; LAY</text>
  <text x="300" y="784" text-anchor="middle" font-family="Georgia, serif" font-size="15" fill="#d9b45a" letter-spacing="4">28 · 11 · 2026</text>
</svg>
'''
    polaroid = f'''{SVG_HEAD}
  <path fill="#ffffff" fill-rule="evenodd" d="M0 0H600V800H0Z M36 36V620H564V36Z"/>
  {logo_tag("#4A5759", 92, cx=300, y=642)}
  <text x="300" y="772" text-anchor="middle" font-family="'Comic Sans MS', cursive" font-size="26" fill="#85908f">♥ {NAMES_PLAIN} · {DATE_DOTS} ♥</text>
</svg>
'''
    return {"01_floral": floral, "02_gold_classic": gold, "03_polaroid": polaroid}


def png_uri(im: Image.Image) -> str:
    buf = io.BytesIO()
    im.save(buf, "PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def diecut_frame(photo: Path) -> str:
    im = Image.open(photo).convert("RGBA")
    box = im.getbbox()                                   # trim empty transparent edges
    if box:
        im = im.crop(box)
    scale = min(380 / im.height, 300 / im.width)          # fits in 300 x 380 px
    w, h = round(im.width * scale), round(im.height * scale)
    im = im.resize((w, h), Image.LANCZOS)
    uri = png_uri(im)
    x, y = 600 - w - 8, 800 - h
    return f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="600" height="800" viewBox="0 0 600 800">
  <!-- Photo frame: 600x800, transparent middle. Made by tools/make_couple_frame.py from assets/couple/our_photo.png -->
  <!-- clear background: only the two of you and the names sit on the photo -->
  {logo_tag("#4A5759", 64, x=24, y=632, halo=True)}
  <g font-family="Georgia, serif" stroke="#ffffff" stroke-linejoin="round" paint-order="stroke">
    <text x="28" y="738" font-size="38" fill="#4A5759" stroke-width="7">{NAMES}</text>
    <text x="30" y="774" font-size="22" fill="#7e9a80" stroke-width="6" letter-spacing="3">{DATE}</text>
  </g>
  <image x="{x}" y="{y}" width="{w}" height="{h}" xlink:href="{uri}" href="{uri}"/>
</svg>
'''


def main():
    for name, svg in classic_frames().items():
        (ROOT / "assets" / "frames" / f"{name}.svg").write_text(svg, "utf-8")
        print("wrote", f"assets/frames/{name}.svg")
    size = 32 * SCALE
    bride, groom = sprite_uri("bride"), sprite_uri("groom")
    hearts = "".join(f'<text x="{x}" y="{y}" font-size="{s}">{c}</text>' for x, y, s, c in (
        (18, 62, 34, "💗"), (548, 62, 34, "💚"), (285, 32, 26, "🤍")))
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="600" height="800" viewBox="0 0 600 800">
  <!-- Photo frame: 600x800, transparent middle. Made by tools/make_couple_frame.py -->
  <path fill="#F7E1D7" fill-rule="evenodd" d="M0 0H600V800H0Z M28 28V668H572V28Z"/>
  <rect x="28" y="28" width="544" height="640" fill="none" stroke="#EDAFB8" stroke-width="6"/>
  <rect x="12" y="12" width="576" height="776" fill="none" stroke="#B0C4B1" stroke-width="3" stroke-dasharray="14 8"/>
  {hearts}
  <image x="-6" y="{800 - size + 4}" width="{size}" height="{size}" xlink:href="{bride}" href="{bride}" style="image-rendering:pixelated"/>
  <image x="{606 - size}" y="{800 - size + 4}" width="{size}" height="{size}" xlink:href="{groom}" href="{groom}" style="image-rendering:pixelated"/>
  {logo_tag("#4A5759", 50, cx=300, y=676)}
  <text x="300" y="756" text-anchor="middle" font-family="Georgia, serif" font-size="32" fill="#4A5759">{NAMES}</text>
  <text x="300" y="784" text-anchor="middle" font-family="Georgia, serif" font-size="18" fill="#7e9a80" letter-spacing="3">{DATE}</text>
</svg>
'''
    out = ROOT / "assets" / "frames" / "04_pixel_couple.svg"
    out.write_text(svg, "utf-8")
    print("wrote", out.relative_to(ROOT))

    # the same couple with a clear background: no border, the photo fills the whole picture
    big = 40 * 5                                      # a little bigger: 200 px
    clear = f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="600" height="800" viewBox="0 0 600 800">
  <!-- Photo frame: 600x800, clear background. Made by tools/make_couple_frame.py -->
  <image x="-14" y="{800 - big + 6}" width="{big}" height="{big}" xlink:href="{bride}" href="{bride}" style="image-rendering:pixelated"/>
  <image x="{614 - big}" y="{800 - big + 6}" width="{big}" height="{big}" xlink:href="{groom}" href="{groom}" style="image-rendering:pixelated"/>
  {logo_tag("#4A5759", 64, cx=300, y=630, halo=True)}
  <g text-anchor="middle" font-family="Georgia, serif" stroke="#ffffff" stroke-linejoin="round" paint-order="stroke">
    <text x="300" y="736" font-size="40" fill="#4A5759" stroke-width="8">{NAMES}</text>
    <text x="300" y="774" font-size="23" fill="#7e9a80" stroke-width="6" letter-spacing="3">{DATE}</text>
  </g>
</svg>
'''
    out = ROOT / "assets" / "frames" / "06_pixel_couple_clear.svg"
    out.write_text(clear, "utf-8")
    print("wrote", out.relative_to(ROOT))

    photo = ROOT / "assets" / "couple" / "our_photo.png"
    if photo.exists():
        out = ROOT / "assets" / "frames" / "05_our_photo.svg"
        out.write_text(diecut_frame(photo), "utf-8")
        print("wrote", out.relative_to(ROOT))


if __name__ == "__main__":
    main()
