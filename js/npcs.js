// Characters that stand on the map and talk when a guest comes close
// (e.g. the bride and groom). Set in config/game.json → "npcs":
//   { "name": "Bride", "sprite": "assets/npc/bride.png", "x": 1260, "y": 1505,
//     "radius": 150, "lines": ["Hello! 👋", "Welcome! 💕"] }
import { loadImage } from "./sprites.js";

//
// "npcWalk" in config/game.json makes them stroll around the map together:
//   { "enabled": true, "speed": 50, "seconds": 16, "area": [x, y, w, h] }
// The route comes from the clock, so every guest sees them in the same spot.

// small seeded random numbers: the same seed gives the same number on every phone
function rand(seed) {
  let s = seed >>> 0;
  s = Math.imul(s ^ (s >>> 15), 0x2c1b3c6d); s = Math.imul(s ^ (s >>> 12), 0x297a2d39); s ^= s >>> 15;
  return (s >>> 0) / 4294967296;
}

export class Npcs {
  constructor(config) {
    this.list = (config.npcs || []).map((n) => ({ radius: 150, lines: ["Hello!"], ...n, homeX: n.x, homeY: n.y, img: null, line: null, nextAt: 0, near: false }));
    for (const n of this.list) loadImage(n.sprite).then((img) => { n.img = img; });
    const w = config.npcWalk || {};
    this.walk = w.enabled === false || !this.list.length ? null : {
      speed: w.speed || 50, seg: (w.seconds || 16) * 1000,
      area: w.area || [100, 180, config.world.width - 200, config.world.height - 260],
      avoid: (config.stations || []).map((s) => [s.x - 20, s.y - 20, s.w + 40, s.h + 40]),
    };
    this.points = []; this.day = null;
  }

  // waypoint i of today's stroll (0 = where they normally stand)
  waypoint(i) {
    while (this.points.length <= i) {
      const k = this.points.length, prev = this.points[k - 1] || { x: this.list[0].homeX, y: this.list[0].homeY };
      const home = { x: this.list[0].homeX, y: this.list[0].homeY };
      // the day starts and ends at their usual spot, so there's no jump at midnight
      if (k === 0 || k >= Math.floor(86400000 / this.walk.seg)) { this.points.push(home); continue; }
      const gap = Math.max(0, ...this.list.map((n) => n.homeX - this.list[0].homeX));
      const [ax, ay, aw, ah] = this.walk.area;
      let p = prev;
      for (let tries = 0; tries < 30; tries++) {
        const r1 = rand(this.day * 7919 + k * 131 + tries), r2 = rand(this.day * 104729 + k * 977 + tries * 7);
        const ang = r1 * Math.PI * 2, dist = 140 + r2 * 360;
        const x = Math.min(ax + aw, Math.max(ax, prev.x + Math.cos(ang) * dist));
        const y = Math.min(ay + ah, Math.max(ay, prev.y + Math.sin(ang) * dist));
        p = { x, y };
        const hit = (px) => this.walk.avoid.some(([sx, sy, sw, sh]) => px > sx && px < sx + sw && y > sy && y < sy + sh);
        if (!hit(x) && !hit(x + gap) && !hit(x - gap)) break;    // neither of them stops on a building
      }
      this.points.push(p);
    }
    return this.points[i];
  }

  // where the pair is right now: walk to the next point, then stop and chat a bit
  stroll(clock) {
    const day = Math.floor(clock / 86400000);
    if (day !== this.day) { this.day = day; this.points = []; }
    const t = clock - day * 86400000, k = Math.floor(t / this.walk.seg), s = (t % this.walk.seg) / 1000;
    const a = this.waypoint(k), b = this.waypoint(k + 1);
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const walkFor = Math.min(dist / this.walk.speed, this.walk.seg / 1000 - 3);
    const f = walkFor > 0 ? Math.min(1, s / walkFor) : 1;
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, moving: f < 1, dir: b.x < a.x ? -1 : 1 };
  }

  // When I walk up they greet me, taking turns (one speech bubble at a time),
  // each time with a random line.
  // onlineRoles: roles of real players online (e.g. the bride logged in), whose
  // stand-in character steps away while they're here
  visible(onlineRoles) { return this.list.filter((n) => !n.role || !onlineRoles.has(n.role)); }

  update(me, now, onlineRoles = new Set()) {
    if (this.walk) {
      const p = this.stroll(Date.now());
      const lead = this.list[0];
      // partner(s) walk beside the leader, on the side that stays inside the area
      this.list.forEach((n, i) => {
        const gap = n.homeX - lead.homeX;
        const side = p.x + gap > this.walk.area[0] + this.walk.area[2] ? -1 : 1;
        n.x = p.x + gap * side; n.y = p.y + (n.homeY - lead.homeY);
        n.moving = p.moving;
        // walking: both face the way they go; standing: they face each other
        n.dir = p.moving ? p.dir : (i === 0 ? side : -side);
      });
    }
    const shown = this.visible(onlineRoles);
    const near = shown.filter((n) => me && Math.hypot(me.x - n.x, me.y - n.y) <= n.radius);
    const turn = 2400;                                   // ms each one talks
    near.forEach((n, i) => {
      if (!n.near) n.speakAt = now + i * turn;           // just arrived: first one talks now
      if (now >= n.speakAt) {
        const options = n.lines.length > 1 ? n.lines.filter((l) => l !== n.lastLine) : n.lines;
        n.lastLine = options[Math.floor(Math.random() * options.length)];
        n.speakAt += turn * Math.max(near.length, 2);
        n.until = now + turn;
      }
      n.line = now < n.until ? n.lastLine : null;
      n.near = true;
    });
    for (const n of this.list) if (!near.includes(n)) { n.near = false; n.line = null; n.until = 0; }
  }
}
