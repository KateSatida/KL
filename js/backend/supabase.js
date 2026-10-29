// Online backend: Supabase Realtime (multiplayer), Database (messages, singles,
// photo notes) and Storage (images). Tables and permissions: supabase/setup.sql
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.3/+esm";

const ROOM = "wedding-world";

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = reject;
  r.readAsDataURL(blob);
});

const uuid = () => crypto.randomUUID?.() ||
  "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (Math.random() * 16) >> (c / 4)).toString(16));

function check({ data, error }) {
  if (error) throw new Error(error.message || String(error));
  return data;
}

export function createSupabaseBackend(url, key) {
  const db = createClient(url, key, { realtime: { params: { eventsPerSecond: 10 } } });
  const singleUrl = (path) => db.storage.from("singles").getPublicUrl(path).data.publicUrl;

  return {
    online: true,

    // ---- multiplayer ---------------------------------------------------------
    // onPlayers(list): everyone in the world (from presence)
    // onEvent(type, data): something another guest broadcast
    joinRoom({ id, state, onPlayers, onEvent, onStatus }) {
      let current = state;
      const channel = db.channel(ROOM, { config: { presence: { key: id }, broadcast: { self: false } } });
      channel.on("presence", { event: "sync" }, () => {
        const all = channel.presenceState();
        onPlayers(Object.entries(all).map(([key, metas]) => ({ ...metas[metas.length - 1], id: key })));
      });
      channel.on("broadcast", { event: "game" }, ({ payload }) => onEvent(payload.t, payload.d));
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") { channel.track(current); onStatus(true); }
        else onStatus(false);
      });
      return {
        // Full player info (name, look, status, resting position). Sent rarely.
        update(next) { current = next; channel.track(current); },
        // Small, frequent things (walking, chat, "new message" pings).
        broadcast(t, d) { channel.send({ type: "broadcast", event: "game", payload: { t, d } }); },
      };
    },

    // ---- guest names (no sign-up; each name belongs to one phone) -------------
    // Returns true if the name is free or already this phone's.
    async claimName(name, token) {
      return check(await db.rpc("claim_name", { p_name: name, p_token: token }));
    },

    // ---- photo booth (private: only the admin can read) ----------------------
    // The JPEG is stored in the photos table itself: guests may insert rows but
    // never read them, which file storage doesn't allow.
    async uploadPhoto({ name, note, blob }) {
      check(await db.from("photos").insert({ name, note, image: await blobToDataUrl(blob) }));
    },

    // ---- bar message wall ----------------------------------------------------
    async listMessages() {
      return check(await db.from("messages").select("id, created_at, name, text")
        .order("created_at", { ascending: false }).limit(100));
    },
    async postMessage({ name, text }) {
      check(await db.from("messages").insert({ name, text }));
    },

    // ---- wishing tree ----------------------------------------------------------
    async listWishes() {
      return check(await db.from("wishes").select("id, created_at, name, text, color")
        .order("created_at", { ascending: false }).limit(200));
    },
    async addWish({ name, text, color }) {
      check(await db.from("wishes").insert({ name, text, color }));
    },

    // ---- settings the couple edits on the admin page ----------------------------
    async getSettings() {
      const rows = check(await db.from("settings").select("key, value"));
      return Object.fromEntries(rows.map((r) => [r.key, r.value]));
    },

    // ---- dance floor song requests ----------------------------------------------
    async listSongs() {
      return check(await db.from("song_requests").select("id, created_at, name, song")
        .order("created_at", { ascending: false }).limit(100));
    },
    async addSong({ name, song }) {
      check(await db.from("song_requests").insert({ name, song }));
    },

    // ---- single station --------------------------------------------------------
    async listSingles() {
      const rows = check(await db.from("singles").select("id, created_at, name, instagram, bio, path")
        .order("created_at", { ascending: false }));
      return rows.map((r) => ({ ...r, image: singleUrl(r.path) }));
    },
    async addSingle({ name, instagram, bio, blob }) {
      const path = `${uuid()}.jpg`;
      check(await db.storage.from("singles").upload(path, blob, { contentType: "image/jpeg" }));
      return check(await db.rpc("add_single", { p_name: name, p_instagram: instagram, p_bio: bio, p_path: path }));
    },
    async deleteSingle(id, token) {
      if (!check(await db.rpc("delete_own_single", { p_id: id, p_token: token }))) throw new Error("Not your card");
    },

    // ---- admin (needs login) -------------------------------------------------
    admin: {
      // See who is in the world (without appearing in it) and send events, e.g. the bouquet toss.
      watchRoom({ onPlayers }) {
        const channel = db.channel(ROOM, { config: { broadcast: { self: false } } });
        channel.on("presence", { event: "sync" }, () => {
          onPlayers(Object.entries(channel.presenceState()).map(([key, metas]) => ({ ...metas[metas.length - 1], id: key })));
        });
        const ready = new Promise((resolve) => channel.subscribe((status) => { if (status === "SUBSCRIBED") resolve(); }));
        // wait until connected, otherwise the message would be lost
        return { broadcast(t, d) { return ready.then(() => channel.send({ type: "broadcast", event: "game", payload: { t, d } })); } };
      },
      async saveSettings(values) {
        const rows = Object.entries(values).map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }));
        check(await db.from("settings").upsert(rows));
      },
      async songs() {
        return check(await db.from("song_requests").select("*").order("created_at", { ascending: false }));
      },
      async wishes() {
        return check(await db.from("wishes").select("*").order("created_at", { ascending: false }));
      },
      async session() { return check(await db.auth.getSession()).session; },
      async signIn(email, password) { check(await db.auth.signInWithPassword({ email, password })); },
      async signOut() { await db.auth.signOut(); },
      // List without the pictures (fast); load each picture with photoImage().
      async photos() {
        return check(await db.from("photos").select("id, created_at, name, note, path").order("created_at", { ascending: false }));
      },
      async photoImage(row) {
        if (row.path) return check(await db.storage.from("photos").createSignedUrl(row.path, 3600)).signedUrl;
        return check(await db.from("photos").select("image").eq("id", row.id).single()).image;
      },
      async messages() {
        return check(await db.from("messages").select("*").order("created_at", { ascending: false }));
      },
      async guests() {
        return check(await db.from("guest_names").select("id, name, created_at").order("created_at", { ascending: false }));
      },
      async singles() {
        const rows = check(await db.from("singles").select("id, created_at, name, instagram, bio, path")
          .order("created_at", { ascending: false }));
        return rows.map((r) => ({ ...r, image: singleUrl(r.path) }));
      },
      async remove(kind, row) {
        check(await db.from(kind).delete().eq("id", row.id));
        if (row.path) await db.storage.from(kind).remove([row.path]);
      },
    },
  };
}
