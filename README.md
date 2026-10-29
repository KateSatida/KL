# 💒 Wedding Guestbook Game

A small multiplayer pixel-art world for your wedding guests. They open a link
on their phone, dress up a 32×32 character, walk around, and visit stations:

| Station | What guests can do |
|---|---|
| 👗 **Character creator / Wardrobe** | Pick a character, outfit, prop and drink layer by layer, or draw their own 32×32 character (starting from their current one or a blank canvas). Set a status that floats above their head when others are near. |
| 📸 **Photo Booth** | Take a selfie, pick a frame, type a note and write on the photo with a finger, then save it. A copy goes to your private admin page. |
| 🍸 **Drink Bar** | Pick a drink to carry, scan your PromptPay QR, and talk to the bartender to leave messages on a shared wall. |
| 💘 **Single Station** | Upload a photo + Instagram. A random single shows on the big projector every few seconds. |
| 💬 **Chat** | Proximity chat: you only see messages from guests standing close to you. |
| 🌳 **Wishing Tree** | Guests hang a coloured ribbon with a wish; the ribbons appear on the tree for everyone. |
| 🖼️ **Memory Lane** | Easels with your photos and a slideshow with captions. |
| 💃 **Dance Floor** | Light-up floor (disco lights at night). Guests standing on it dance; a music button plays a tune on their phone. |
| 💐 **Bouquet Toss** | Singles stand in the circle; you press "Toss now!" on the admin page and everyone sees the bouquet fly to a random guest in it. |

**Guests don't sign up or log in.** They just type a name the first time.
After that, **each phone keeps its name**: refreshing, closing or reopening the
page takes them straight back in as the same character. A phone can't switch to
another name, and nobody else can take it (capital letters and spaces don't
count, so "Mai" and "mai" are the same name). To reset a phone, delete its name
on the admin page.

Only you log in with an email, for the admin page.

**Free hosting:**
- **GitHub Pages** hosts the game at `https://<your-username>.github.io/<repo>/`.
- **Supabase** (free plan) does the live multiplayer and stores photos, messages and singles.

There is no server to run or pay for.

```
 guest phones ──► github.io (the game files)
      │
      └────────► Supabase: Realtime (who's where, chat)
                           Database (messages, singles, booth photos + notes: private)
                           Storage  (singles' pictures: public)
```

---

## 1. Try it on your computer (demo mode, no keys needed)

You only need Python 3.

```bash
python tools/serve.py
```

- **Game:** open http://localhost:8000.
- **Multiplayer:** open a second tab in the same browser to be a second guest.
- **Admin page:** http://localhost:8000/admin.html (only works once Supabase is connected).

While `js/env.js` has no keys, the game runs in **demo mode** and shows a yellow
banner. Demo mode means:
- Everything works, but data stays in your browser.
- Only tabs in the same browser can see each other.
- Booth photos are downloaded to your computer but not uploaded.

---

## 2. Connect Supabase

Do this once, about 10 minutes.

**a) Create the tables and storage.**
1. In Supabase, open your project → **SQL Editor** → **New query**.
2. Open [`supabase/setup.sql`](supabase/setup.sql) and copy all of it into the editor.
3. Change `you@example.com` near the top to **your email**. Only this email can see the booth photos.
4. Click **Run**. You should see "Success. No rows returned".
5. Whenever this file changes (after a `git pull`), run it again. It's safe to re-run and keeps your data.

**b) Create your admin login.**
1. Go to **Authentication** → **Users** → **Add user** → **Create new user**.
2. Enter the same email and a password, and tick **Auto Confirm User**.
3. Then go to **Authentication** → **Sign In / Providers** and turn **off** "Allow new users to sign up", so nobody else can create an account.

**c) Paste your keys.**
1. In Supabase, click the **Connect** button at the top of your project (or go to **Project Settings** → **API Keys**).
2. Copy the **Project URL** and the **Publishable key** (`sb_publishable_...`, or the legacy `anon public` key).
3. Put them in [`js/env.js`](js/env.js):

```js
export const SUPABASE_URL = "https://abcdefghij.supabase.co";
export const SUPABASE_KEY = "sb_publishable_xxxxxxxxxxxx";
```

These two values are designed to be public, so committing them is fine.
**Never** put the `secret` / `service_role` key in this file.

Run `python tools/serve.py` again. The yellow banner disappears, and two
different browsers (or your computer + phone) now see each other.

---

## 3. Publish on github.io

1. The repository must be **public**. GitHub Pages is free only for public repos on a free account.
   - Change it in **Settings** → **General** → **Danger Zone** → **Change visibility**.
2. Go to **Settings** → **Pages**, and under **Build and deployment** set **Source** to **GitHub Actions**.
3. Push or merge to the `main` branch. The workflow in
   `.github/workflows/pages.yml` publishes the site automatically.
   - Watch it under the **Actions** tab. It takes about 1 minute.
4. Your game is live at **`https://<your-username>.github.io/<repo-name>/`**.
   - Admin page: the same link + `admin.html`.

Every later push to `main` updates the site.

**Tip:** turn the link into a QR code with any free QR generator and put it on the guest tables.

---

## 4. Test checklist (before the wedding)

Open the github.io link on **two phones** (or a phone + a computer):

- [ ] Both characters appear, and walking on one phone shows on the other.
- [ ] Stand close → chat works; walk far away → messages stop showing.
- [ ] Set a status → the other phone sees it above your head when close.
- [ ] Drink Bar: pick a drink (the other phone sees it), post a message, check the QR.
- [ ] Single Station: add a card → it appears on the projector on both phones.
- [ ] Photo Booth: allow the camera, snap, write, "Send to the couple", then "Save to my phone".
- [ ] `admin.html`: log in → the photo and its note are there.
- [ ] Clean up test data on the admin page (🗑 Delete).

**If something fails,** open the browser console (on a computer: F12 → Console) and read the error:
- `row-level security`: the SQL wasn't run, or the email in it is different from your login.
- `Bucket not found`: run `supabase/setup.sql` again.
- Players can't see each other: check the keys in `js/env.js`.

---

## 5. Your private admin page (`admin.html`)

Log in with the email and password from step 2b. You get:

- 📸 every photo-booth picture with the guest's name and notes (only your email can see these)
- 🍸 all bar messages, with delete buttons
- 💘 all single cards, with delete buttons
- 🌳 all wishes from the wishing tree, with delete buttons
- 🎶 dance floor song requests, with delete buttons
- 💐 the bouquet toss button
- 👥 all guest names. Delete one to free it, e.g. for a guest who switched to another phone.
- ⬇ **Download all photos (ZIP)**: photos plus `photo-notes.txt` and `bar-messages.txt`. Do this after the wedding.

Guests can remove their own single card from the same phone (Single Station →
Browse → "Remove my card").

---

## 6. Customise

**Your art.** Draw 32×32 PNGs with a transparent background and put them in
`assets/characters`, `assets/dresses`, `assets/props` or `assets/drinks`.
- New files appear automatically: `tools/serve.py` and GitHub both refresh the list (`assets/manifest.json`).
- Every layer sits on the same 32×32 grid, so draw on top of a character as a guide.
- See [`assets/README.md`](assets/README.md) for details.
- Free pixel editors: Piskel, Pixilart, Aseprite.

**Texts, date, map.** Edit [`config/game.json`](config/game.json):
- `wedding`: title, names, date, welcome text. **The names and date are examples, so change them.**
- `world`:
  - map size and walking speed
  - `chatRadius`: how close guests must be to chat
  - `statusRadius`: how close guests must be to see a status
  - `background`: set it to e.g. `"assets/map.png"` to use your own drawn map instead of the tiled floor
- `stations`: position (`x`, `y`), size (`w`, `h`), label, icon and colour of each station
- `decorations`: pixel-art pictures placed on the map (see **Decorations and day/night** below)
- `time`: when night starts and ends
- `bar.promptpay`: your QR image path and the text under it

**PromptPay QR.** Save your QR as `assets/promptpay/qr.png`, then change
`"image"` in `config/game.json` to `"assets/promptpay/qr.png"`.

**Photo frames.** Add 600×800 PNG or SVG files with a transparent centre to
`assets/frames/`. The example frames also contain the example names, so edit or replace them.
Where the typed note sits on the photo is set by `NOTE_BOX` at the top of `js/stations/photobooth.js`.

**Colours and font.** Change them at the top of `css/style.css`.

**Decorations and day/night.** The map is an outdoor lawn. Everything on it is a
pixel-art PNG in `assets/decor/` (flower backdrop, LED string lights, lamp posts,
trees, bushes, flower pots, cake). Each entry in `decorations` looks like:

```json
{ "image": "assets/decor/lamp_post.png", "night": "assets/decor/lamp_post_night.png", "x": 480, "y": 560 }
```

- `x`, `y`: the bottom-centre of the picture on the map (the map is 1600 × 1100).
- `scale`: how many times bigger to draw it (default 2).
- `night`: an optional second picture for night time. Its light-bulb pixels glow by themselves: draw the bulbs "on" in a very light yellow such as `#fff3b0` or `#fffbe0` (darker yellows like `#ffd166` don't glow). `glow` sets the glow size (default 46).
- `layer`: `"sorted"` (default: guests can walk in front of or behind it), `"ground"` (always under guests) or `"top"` (always over guests, e.g. hanging lights).

Day/night follows **each guest's phone clock**, set in `time`:
`"nightFrom": "18:00"`, `"dayFrom": "06:00"`. Set `"mode"` to `"day"` or
`"night"` to force one. To preview, add `?time=night` (or `?time=20:30`) to the
end of the game link. The top bar shows ☀️ or 🌙.

**Memory Lane photos.** Put your photos (any .jpg or .png) in
`assets/memories/` and list them under the Memory Lane station in
`config/game.json`:

```json
"photos": [
  { "image": "assets/memories/first-date.jpg", "caption": "Where it all began 🌅" },
  { "image": "assets/memories/proposal.jpg", "caption": "She said yes! 💍" }
]
```

Keep photos small (about 1000 px wide) so they load fast on phones.

**Music (Spotify / YouTube).** In `config/game.json` → `"music"`, paste share
links (playlist, album, song or video):

```json
"music": {
  "title": "Wedding playlist",
  "playlist": "https://open.spotify.com/playlist/...",       // background music: the 🎵 button in the top bar
  "danceFloor": "https://www.youtube.com/playlist?list=...", // the dance floor's "Play dance playlist"
  "addSongsLink": "https://open.spotify.com/playlist/..."    // optional: collaborative playlist guests can add to in Spotify
}
```

- The background playlist is fixed; guests can't change it. Leave it empty to hide the 🎵 button.
- On the dance floor, guests can **request songs** (a name or a Spotify/YouTube link). Everyone sees the list and can play link requests. You see them on the admin page (🎶 Song requests) and in the ZIP.
- Guests can only add to your real Spotify playlist if you make it **collaborative** in Spotify and put its link in `addSongsLink`; they need a Spotify account.
- Music plays on each guest's own phone (not in sync), in a small player that stays on screen; closing it stops the music.
- Spotify plays only 30-second previews for guests who aren't logged in to Spotify in that browser. YouTube plays full songs (sometimes with ads).
- Without a `danceFloor` link, the dance floor plays a built-in tune (or your own mp3: add `"music": "assets/music/song.mp3"` to the dance floor station).

**Bouquet toss.** On the admin page, open **💐 Bouquet toss**. It lists who is
standing in the circle right now. Press **Toss now!** and every guest sees the
bouquet fly to a random person in the circle; the winner gets the bouquet added
to their outfit. Keep the admin page open while you toss.

**Station icons.** Each station's `"sprite"` is a 32×32 PNG in
`assets/stations/`, drawn 3× bigger on the map. Remove `"sprite"` to use the
emoji `"icon"` instead (the emoji is still used on buttons and pop-ups).

`python tools/make_placeholder_art.py` re-creates the placeholder art (it never
overwrites your own files unless you add `--force`).

---

## 7. Project layout

```
index.html, admin.html     the two pages
css/style.css              look and colours
js/
  env.js                   ← YOUR SUPABASE KEYS
  main.js                  starts the game, connects everything
  config.js                loads config/game.json + the art list
  world.js                 map drawing, walking, players
  customize.js             character creator
  pixel-editor.js          32×32 drawing pad
  chat.js                  proximity chat
  ui.js                    pop-ups, tabs, small helpers
  sprites.js               stacks outfit layers into one character
  stations/                ONE FILE PER STATION (photobooth, bar, singles, projector, wardrobe)
  backend/                 where data goes
    supabase.js            online (Supabase)
    demo.js                demo mode (no keys)
  admin.js                 admin page
config/game.json           texts, map, stations
assets/                    YOUR ART (see assets/README.md)
supabase/setup.sql         database + storage + permissions (run once in Supabase)
tools/
  serve.py                 run locally
  build_manifest.py        lists the art files for the game
  make_placeholder_art.py  regenerates the placeholder pixel art
.github/workflows/         pages.yml publishes the site, tests.yml runs the tests
tests/                     `pip install pytest && pytest`
```

---

## 8. Add a new feature

**A new station** (e.g. a "Wishing Well"):

1. Create `js/stations/wishing-well.js`:
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
2. Register it in `js/stations/index.js`: add
   `import wishingWell from "./wishing-well.js";` and put `"wishing-well": wishingWell` in `STATION_TYPES`.
3. Place it on the map in `config/game.json`:
   ```json
   { "id": "well", "type": "wishing-well", "label": "Wishing Well", "icon": "⛲",
     "x": 650, "y": 400, "w": 300, "h": 160, "color": "#dff3ff" }
   ```

**Live updates between guests:**
- Send: `game.broadcast("my-event", data)`
- Receive: `game.on("my-event", (data) => ...)`

**Saving data:**
1. Add a table in `supabase/setup.sql` (copy the `messages` block).
2. Add functions for it in `js/backend/supabase.js` and `js/backend/demo.js`.
3. Call them from your station as `game.backend.yourFunction()`.

**A new outfit layer type** (e.g. "pets"):
1. Create `assets/pets/`.
2. Add `"pets"` to `LAYER_FOLDERS` in `tools/build_manifest.py`.
3. Add `"pet"` to `LAYER_ORDER` in `js/sprites.js`.
4. Add a tab in `js/customize.js`.

---

## 9. Free-plan limits and privacy

**Supabase free plan** (check https://supabase.com/pricing, these change):
- Roughly 200 phones connected at once.
- 500 MB database, which holds the booth photos: about 2,000+ of them.
- 1 GB of file storage for the singles' pictures.
- Monthly Realtime message and bandwidth quotas.
- **Free projects pause after about a week with no activity.** Open the game once a week before the wedding, or click **Restore** in the dashboard if it paused.

To stay within the Realtime quota, a guest's phone sends one small message when
they start or stop walking (not on every step), and position updates only after
they stop. With a very large crowd (100+ guests walking at the same time), test
with a few friends first and watch **Reports → Realtime** in Supabase.

**Privacy:**
- Guest photos, names and Instagram handles are personal data (PDPA).
- Booth photos are stored in a **private** table that only your admin email can read.
- Single cards and bar messages are **public** inside the game, and the stations say so.
- Chat is filtered by distance on each phone, so it is not a private channel. Don't use it for secrets.
- After the wedding, download the ZIP and delete the data (or the Supabase project).
