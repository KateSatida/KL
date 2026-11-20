"""Builds assets/frames/04_pixel_couple.svg: the pixel bride and groom standing
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

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
NAMES, DATE = "Kate &amp; Lay", "28 · 11 · 2026"
SCALE = 5                                     # 32 px sprite -> 160 px


def sprite_uri(name: str) -> str:
    im = Image.open(ROOT / "assets" / "npc" / f"{name}.png").convert("RGBA")
    im = im.resize((im.width * SCALE, im.height * SCALE), Image.NEAREST)   # keep crisp pixels
    buf = io.BytesIO()
    im.save(buf, "PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


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
  <g font-family="Georgia, serif" stroke="#ffffff" stroke-linejoin="round" paint-order="stroke">
    <text x="28" y="738" font-size="38" fill="#c2577a" stroke-width="7">{NAMES}</text>
    <text x="30" y="774" font-size="22" fill="#4f8a5b" stroke-width="6" letter-spacing="3">{DATE}</text>
  </g>
  <image x="{x}" y="{y}" width="{w}" height="{h}" xlink:href="{uri}" href="{uri}"/>
</svg>
'''


def main():
    size = 32 * SCALE
    bride, groom = sprite_uri("bride"), sprite_uri("groom")
    hearts = "".join(f'<text x="{x}" y="{y}" font-size="{s}">{c}</text>' for x, y, s, c in (
        (18, 62, 34, "💗"), (548, 62, 34, "💚"), (285, 32, 26, "🤍")))
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="600" height="800" viewBox="0 0 600 800">
  <!-- Photo frame: 600x800, transparent middle. Made by tools/make_couple_frame.py -->
  <path fill="#fff6ec" fill-rule="evenodd" d="M0 0H600V800H0Z M28 28V668H572V28Z"/>
  <rect x="28" y="28" width="544" height="640" fill="none" stroke="#e98aa6" stroke-width="6"/>
  <rect x="12" y="12" width="576" height="776" fill="none" stroke="#6aa57a" stroke-width="3" stroke-dasharray="14 8"/>
  {hearts}
  <image x="-6" y="{800 - size + 4}" width="{size}" height="{size}" xlink:href="{bride}" href="{bride}" style="image-rendering:pixelated"/>
  <image x="{606 - size}" y="{800 - size + 4}" width="{size}" height="{size}" xlink:href="{groom}" href="{groom}" style="image-rendering:pixelated"/>
  <text x="300" y="728" text-anchor="middle" font-family="Georgia, serif" font-size="38" fill="#c2577a">{NAMES}</text>
  <text x="300" y="764" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="#4f8a5b" letter-spacing="3">{DATE}</text>
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
  <g text-anchor="middle" font-family="Georgia, serif" stroke="#ffffff" stroke-linejoin="round" paint-order="stroke">
    <text x="300" y="736" font-size="40" fill="#c2577a" stroke-width="8">{NAMES}</text>
    <text x="300" y="774" font-size="23" fill="#4f8a5b" stroke-width="6" letter-spacing="3">{DATE}</text>
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
