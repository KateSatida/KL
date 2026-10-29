// Characters that stand on the map and talk when a guest comes close
// (e.g. the bride and groom). Set in config/game.json → "npcs":
//   { "name": "Bride", "sprite": "assets/npc/bride.png", "x": 1260, "y": 1505,
//     "radius": 150, "lines": ["Hello! 👋", "Welcome! 💕"] }
import { loadImage } from "./sprites.js";

export class Npcs {
  constructor(config) {
    this.list = (config.npcs || []).map((n) => ({ radius: 150, lines: ["Hello!"], ...n, img: null, line: null, nextAt: 0, near: false }));
    for (const n of this.list) loadImage(n.sprite).then((img) => { n.img = img; });
  }

  // When I walk up they greet me, taking turns (one speech bubble at a time),
  // each time with a random line.
  update(me, now) {
    const near = this.list.filter((n) => me && Math.hypot(me.x - n.x, me.y - n.y) <= n.radius);
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
