# 💒 Wedding Guestbook Game

A small multiplayer pixel-art world for your wedding guests. They open a link
on their phone, dress up a 32×32 character, walk around, and visit stations:

| Station | What guests can do |
|---|---|
| 👗 **Character creator / Wardrobe** | Pick a character, outfit, prop and drink layer by layer, or draw their own 32×32 layer. Set a status that floats above their head when others are near. |
| 📸 **Photo Booth** | Take a selfie, pick a frame, type a note and write on the photo with a finger, then save it. A copy goes to your private admin page. |
| 🍸 **Drink Bar** | Pick a drink to carry, scan your PromptPay QR, and talk to the bartender to leave messages on a shared wall. |
| 💘 **Single Station** | Upload a photo + Instagram. A random single shows on the big projector every few seconds. |
| 💬 **Chat** | Proximity chat: messages only reach guests standing close to you. |

Built with **Python (FastAPI + WebSockets)** for the server and plain
JavaScript (no build step) for the game.

---

## 1. Run it on your computer

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open http://localhost:8000. Open a second browser window to see two players.
Your admin page is http://localhost:8000/admin (any username, password `change-me`
locally).

Run the tests with `pip install -r requirements-dev.txt && pytest`.

---

## 2. Project layout (where to edit what)

```
config/game.json        ← texts, date, map size, station positions, PromptPay text
assets/                 ← YOUR ART (see assets/README.md)
  characters/ dresses/ props/ drinks/   32×32 PNG layers
  frames/               photo-booth frames (600×800)
  promptpay/            your QR code
  npc/                  bartender sprite
static/                 the game in the browser
  index.html            page layout
  css/style.css         colours and look (theme colours at the top)
  js/main.js            starts the game, connects everything
  js/world.js           map drawing, movement, players
  js/customize.js       character creator
  js/pixel-editor.js    32×32 drawing pad
  js/chat.js            proximity chat
  js/stations/          ONE FILE PER STATION (photobooth, bar, singles, projector, wardrobe)
  admin.html, js/admin.js   your private dashboard
app/                    the Python server
  main.py               starts the server, lists all routes
  settings.py           password, folders, upload limits
  realtime.py           multiplayer (positions, status, chat)
  storage.py            saves uploads to the data folder
  routes/               one file per feature (photos, bar, singles, admin, game)
data/                   guest uploads (created automatically, never committed)
tools/make_placeholder_art.py   regenerates the placeholder pixel art
```

---

## 3. Customise

**Your art.** Draw 32×32 PNGs with a transparent background and drop them into
`assets/characters`, `assets/dresses`, `assets/props` or `assets/drinks`. They
show up automatically after a browser refresh. Every layer sits on the same
32×32 grid, so use a character as a guide layer while drawing. Details are in
[`assets/README.md`](assets/README.md). Free pixel editors: Piskel, Pixilart,
Aseprite.

**Texts, date, map.** Edit `config/game.json`:
- `wedding`: title, names, date, welcome text
- `world`: map size, walking speed, `chatRadius` (how close you must be to chat),
  `statusRadius` (how close to see someone's status), `background` (set to e.g.
  `"/assets/map.png"` to use your own drawn map instead of the tiled floor)
- `stations`: position (`x`, `y`), size (`w`, `h`), label, icon and colour of each station
- `decorations`: emoji placed on the map
- `bar.promptpay`: your QR image path and the text under it

**PromptPay QR.** Save your QR as `assets/promptpay/qr.png` and change
`"image"` in `config/game.json` to `"/assets/promptpay/qr.png"`.

**Photo frames.** Add 600×800 PNG (or SVG) files with a transparent centre to
`assets/frames/`. Where the typed note appears is `NOTE_BOX` at the top of
`static/js/stations/photobooth.js`.

**Colours / font.** Top of `static/css/style.css`.

---

## 4. Your private admin page

Go to `https://<your-site>/admin`. The browser asks for a username (type
anything) and the password you set as `ADMIN_PASSWORD`.

- 📸 every photo-booth picture with the guest's name and note (only you can see these)
- 🍸 all bar messages, with delete buttons
- 💘 all single cards, with delete buttons
- ⬇ **Download everything (ZIP)**: do this after the wedding to keep a backup

Guests can remove their own single card from the same phone (Single Station →
Browse → "Remove my card").

---

## 5. Deploy (code on GitHub, game on Render)

GitHub Pages can only host static files. It cannot run Python or the live
multiplayer connection, so the code lives on GitHub and runs on
**[Render](https://render.com)**, which redeploys automatically on every push.

1. Push this repository to GitHub (already done if you're reading this there).
2. Sign up at https://render.com with your GitHub account.
3. Click **New → Blueprint**, choose this repository. Render reads `render.yaml`.
4. When asked, type a strong `ADMIN_PASSWORD`.
5. Click **Apply**. After a few minutes you get a link like
   `https://wedding-guestbook.onrender.com`. Share it as a QR code on the tables.

**About cost and keeping photos safe.** `render.yaml` uses the *Starter* plan
with a 1 GB disk, so uploads survive restarts and redeploys (about US$7/month
plus a small disk fee at the time of writing; check Render's pricing page).
The free plan works for testing, but it **deletes all uploads whenever the
server restarts or sleeps** (after ~15 min without visitors), so don't use it
on the wedding day. Either way, download the ZIP from `/admin` after the party.

The camera only works over HTTPS, which Render provides automatically.

**Other hosts.** A `Dockerfile` is included for Railway, Fly.io or any VPS.
Mount a persistent volume and set `DATA_DIR` to it, and set `ADMIN_PASSWORD`.
Run **one** instance only: who's online is kept in memory.

---

## 6. Add a new feature

**A new station** (e.g. a "Wishing Well"):

1. Create `static/js/stations/wishing-well.js`:
   ```js
   import { el, openModal } from "../ui.js";

   export default function wishingWell(def, game) {
     return {
       open() {
         openModal(`${def.icon} ${def.label}`, el("p", {}, `Make a wish, ${game.state.name}!`));
       },
       // optional: draw(ctx, def, now, world) to draw it differently on the map
       // optional: onClick(point) to react when the station is tapped
     };
   }
   ```
2. Register it in `static/js/stations/index.js`:
   `import wishingWell from "./wishing-well.js";` and add `"wishing-well": wishingWell` to `STATION_TYPES`.
3. Place it on the map in `config/game.json`:
   ```json
   { "id": "well", "type": "wishing-well", "label": "Wishing Well", "icon": "⛲",
     "x": 650, "y": 400, "w": 300, "h": 160, "color": "#dff3ff" }
   ```

If it needs to save data, add a file in `app/routes/` (copy `bar.py`), include
it in `app/main.py`, and add a call to `static/js/api.js`.

**A new outfit layer type** (e.g. "pets"): create `assets/pets/`, add `"pets"`
to the list in `app/routes/game.py`, add `"pet"` to `LAYER_ORDER` in
`static/js/sprites.js` and to `clean_look` in `app/realtime.py`, and add a tab in
`static/js/customize.js`.

---

## 7. Privacy

Guest photos, names and Instagram handles are personal data (PDPA). Photo-booth
pictures are only visible on your password-protected admin page. Single cards
are public inside the game, which the station explains before guests upload.
Delete the server's data (or the Render service) once you've downloaded your
backup.
