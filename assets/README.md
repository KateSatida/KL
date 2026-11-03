# Your art goes here

| Folder        | What                                    | Size                     |
|---------------|-----------------------------------------|--------------------------|
| `bodies/`     | Bodies without hair (pick one, required) | 32×32 PNG, transparent  |
| `hairs/`      | Hairstyles, drawn over the dress        | 32×32 PNG, transparent   |
| `dresses/`    | Outfits drawn over the body             | 32×32 PNG, transparent   |
| `props/`      | Glasses, flowers, hats…                 | 32×32 PNG, transparent   |
| `drinks/`     | Drinks guests pick at the bar           | 32×32 PNG, transparent   |
| `frames/`     | Photo-booth frames                      | 600×800 PNG or SVG, transparent middle |
| `bouquets/`   | Bouquet toss prizes (right hand)        | 32×32 PNG, transparent   |
| `charms/`     | Horoscope lucky items (top-right corner, x 22–31, y 0–11) | 32×32 PNG, transparent |
| `npc/`        | Bride, groom and bartender              | 32×32 PNG                |

Layers are stacked bottom to top: **body → dress → hair → prop → drink →
bouquet → lucky item**.

Every layer is drawn on the **same 32×32 grid** on top of each other, so draw
each dress/prop in the exact spot it should sit on the body. Easiest way:
open a body (and a hairstyle) PNG in your pixel editor as a guide layer, draw the
new item on a separate layer, hide the guide, and export only the item.

File names become labels: `03_pink_gown.png` → "Pink Gown" (the number only sets the order).
Delete the placeholder files you don't want.

`manifest.json` in this folder is the list of files the game reads. It is
rebuilt automatically by `python tools/serve.py` and by GitHub on every push,
so you never need to edit it by hand.
