// Picks where data goes: Supabase (online) or demo mode (this browser only).
// Every station talks to `backend`, never to Supabase directly, so you can
// swap the service later by writing one new file with the same functions.
import { SUPABASE_URL, SUPABASE_KEY } from "../env.js";

export const isOnline = Boolean(SUPABASE_URL && SUPABASE_KEY);

export const backend = isOnline
  ? await import("./supabase.js").then((m) => m.createSupabaseBackend(SUPABASE_URL, SUPABASE_KEY))
  : await import("./demo.js").then((m) => m.createDemoBackend());
