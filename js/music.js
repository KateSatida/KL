// A tiny looping chiptune made in the browser (no music file needed).
// Or set "music": "assets/music/song.mp3" on the dance floor in config/game.json.

let audio = null;          // { ctx, timer } while the chiptune plays
let fileAudio = null;      // <audio> when a music file is used

const CHORDS = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]];   // C G Am F
const freq = (midi) => 440 * 2 ** ((midi - 69) / 12);

function note(ctx, type, f, t, len, vol) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g).connect(ctx.destination);
  o.start(t); o.stop(t + len);
}

function hat(ctx, t) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource(), g = ctx.createGain();
  g.gain.value = 0.04;
  src.buffer = buf; src.connect(g).connect(ctx.destination); src.start(t);
}

function startChiptune() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const step = 60 / 128 / 2;                // eighth notes at 128 BPM
  let n = 0, next = ctx.currentTime + 0.1;
  const timer = setInterval(() => {
    while (next < ctx.currentTime + 0.3) {
      const chord = CHORDS[Math.floor(n / 8) % CHORDS.length];
      const arp = chord[n % 3] + (n % 8 >= 4 ? 12 : 0);
      note(ctx, "square", freq(arp + 12), next, step * 0.9, 0.035);
      if (n % 4 === 0) note(ctx, "triangle", freq(chord[0] - 12), next, step * 3.5, 0.12);
      if (n % 2 === 1) hat(ctx, next);
      next += step; n++;
    }
  }, 50);
  return { ctx, timer };
}

export const isPlaying = () => Boolean(audio || fileAudio);

export function toggleMusic(file) {
  if (isPlaying()) { stopMusic(); return false; }
  if (file) {
    fileAudio = new Audio(file);
    fileAudio.loop = true;
    fileAudio.volume = 0.6;
    fileAudio.play().catch(() => { fileAudio = null; });
  } else {
    audio = startChiptune();
  }
  return true;
}

export function stopMusic() {
  if (audio) { clearInterval(audio.timer); audio.ctx.close(); audio = null; }
  if (fileAudio) { fileAudio.pause(); fileAudio = null; }
}
