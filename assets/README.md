# Your art goes here

| Folder        | What                                    | Size                     |
|---------------|-----------------------------------------|--------------------------|
| `characters/` | Base bodies (pick one, required)        | 32×32 PNG, transparent   |
| `dresses/`    | Outfits drawn over the body             | 32×32 PNG, transparent   |
| `props/`      | Glasses, flowers, hats…                 | 32×32 PNG, transparent   |
| `drinks/`     | Drinks guests pick at the bar           | 32×32 PNG, transparent   |
| `frames/`     | Photo-booth frames                      | 600×800 PNG or SVG, transparent middle |
| `npc/`        | Bartender sprite                        | 32×32 PNG                |
| `promptpay/`  | Your PromptPay QR code                  | any size PNG             |

Every layer is drawn on the **same 32×32 grid** on top of each other, so draw
each dress/prop in the exact spot it should sit on the body. Easiest way:
open one of the character PNGs in your pixel editor as a guide layer, draw the
new item on a separate layer, hide the guide, and export only the item.

File names become labels: `03_pink_gown.png` → "Pink Gown" (the number only sets the order).
Delete the placeholder files you don't want.

`manifest.json` in this folder is the list of files the game reads. It is
rebuilt automatically by `python tools/serve.py` and by GitHub on every push,
so you never need to edit it by hand.
