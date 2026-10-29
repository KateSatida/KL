// Demo mode (no Supabase keys yet): everything stays in this browser.
// Open the game in two tabs of the same browser to try multiplayer and chat.
import { store } from "../ui.js";

const blobToDataUrl = (blob) => new Promise((resolve) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.readAsDataURL(blob);
});

export function createDemoBackend() {
  const now = () => new Date().toISOString();
  const id = () => Math.random().toString(36).slice(2, 12);

  return {
    online: false,

    joinRoom({ id: me, state, onPlayers, onEvent, onStatus }) {
      const bus = new BroadcastChannel("wedding-demo");
      const players = new Map([[me, { ...state, id: me, seen: Date.now() }]]);
      const publish = () => onPlayers([...players.values()]);
      const announce = (kind) => bus.postMessage({ kind, id: me, state: players.get(me) });

      bus.onmessage = ({ data }) => {
        if (data.kind === "game") return onEvent(data.t, data.d);
        if (data.kind === "bye") players.delete(data.id);
        else players.set(data.id, { ...data.state, id: data.id, seen: Date.now() });
        if (data.kind === "hello") announce("state");
        publish();
      };
      // Forget tabs that were closed without saying bye
      setInterval(() => {
        announce("state");
        for (const [pid, p] of players) if (pid !== me && Date.now() - p.seen > 10000) players.delete(pid);
        publish();
      }, 3000);
      addEventListener("pagehide", () => announce("bye"));

      announce("hello");
      setTimeout(() => { onStatus(true); publish(); });
      return {
        update(next) { players.set(me, { ...next, id: me }); announce("state"); publish(); },
        broadcast(t, d) { bus.postMessage({ kind: "game", t, d }); },
      };
    },

    async claimName(name, token) {
      const names = store.get("demo.names", {});        // {lower-case name: token}
      const key = name.toLowerCase();
      if (names[key] && names[key] !== token) return false;
      if (Object.entries(names).some(([k, t]) => t === token && k !== key)) return false;  // one name per phone
      names[key] = token;
      store.set("demo.names", names);
      return true;
    },

    async uploadPhoto() {
      // Nothing is uploaded in demo mode; the photo is still downloaded to the device.
    },

    async listMessages() { return store.get("demo.messages", []); },
    async postMessage({ name, text }) {
      const list = store.get("demo.messages", []);
      list.unshift({ id: id(), created_at: now(), name, text });
      store.set("demo.messages", list.slice(0, 100));
    },

    async listSingles() { return store.get("demo.singles", []); },
    async addSingle({ name, instagram, bio, blob }) {
      const row = { id: id(), created_at: now(), name, instagram, bio, image: await blobToDataUrl(blob) };
      store.set("demo.singles", [row, ...store.get("demo.singles", [])]);
      return { id: row.id, token: "demo" };
    },
    async deleteSingle(sid) {
      store.set("demo.singles", store.get("demo.singles", []).filter((s) => s.id !== sid));
    },

    admin: {
      async session() { return null; },
      async signIn() { throw new Error("Demo mode: add your Supabase keys in js/env.js first (see README)."); },
      async signOut() {},
    },
  };
}
