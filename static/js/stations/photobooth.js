// Photo booth: selfie with the camera, pick a frame, type or hand-write a note,
// save to the phone, and send a copy to the couple's private admin page.
import { el, openModal, closeModal, toast } from "../ui.js";
import { api } from "../api.js";
import { loadImage } from "../sprites.js";
import { wrap } from "../world.js";

const W = 600, H = 800;                                  // photo size (3:4, same as frames)
const NOTE_BOX = { x: 60, y: 540, w: 480, maxLines: 3 }; // where the typed note goes
const INK_COLORS = ["#ffffff", "#e0708f", "#222222", "#f6c56b"];

export default function photobooth(def, game) {
  return {
    open() {
      const frames = game.config.frames;
      let frameImg = null;
      let stream = null;
      let mode = "live";              // "live" camera or "shot" (frozen photo)
      let inkColor = INK_COLORS[1];
      let running = true;

      const video = el("video", { autoplay: true, playsinline: true, muted: true });
      const shot = Object.assign(document.createElement("canvas"), { width: W, height: H });
      const ink = Object.assign(document.createElement("canvas"), { width: W, height: H });
      const inkCtx = ink.getContext("2d");
      const view = el("canvas", { width: W, height: H });
      const ctx = view.getContext("2d");
      const note = el("textarea", { rows: 2, maxlength: 200, placeholder: "Write a note for the couple 💌 (shown on the photo)" });
      const privateNote = el("textarea", { rows: 2, maxlength: 1000, placeholder: "Private message only the couple will read (optional)" });
      const status = el("p", { class: "muted" }, game.config.photobooth.intro);

      // ---- camera ----
      const startCamera = async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 } }, audio: false });
          video.srcObject = stream;
        } catch {
          status.textContent = "Camera not available. You can choose a photo instead 👇";
          fileBtn.classList.remove("hidden");
        }
      };
      const stopCamera = () => stream?.getTracks().forEach((t) => t.stop());

      const drawCover = (c, src, sw, sh, mirror) => {
        const s = Math.max(W / sw, H / sh);
        const dw = sw * s, dh = sh * s;
        c.save();
        if (mirror) { c.translate(W, 0); c.scale(-1, 1); }
        c.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh);
        c.restore();
      };

      // ---- compose the final picture ----
      const render = (target) => {
        target.fillStyle = "#222";
        target.fillRect(0, 0, W, H);
        if (mode === "live" && video.videoWidth) drawCover(target, video, video.videoWidth, video.videoHeight, true);
        else if (mode === "shot") target.drawImage(shot, 0, 0);
        target.drawImage(ink, 0, 0);
        if (note.value.trim()) {
          target.font = "600 26px Mali, sans-serif";
          const lines = wrap(target, note.value.trim(), NOTE_BOX.w - 30).slice(0, NOTE_BOX.maxLines);
          const h = lines.length * 32 + 20;
          const y = NOTE_BOX.y + (NOTE_BOX.maxLines * 32 + 20 - h);
          target.fillStyle = "#ffffffd9";
          target.beginPath();
          target.roundRect(NOTE_BOX.x, y, NOTE_BOX.w, h, 16);
          target.fill();
          target.fillStyle = "#4a3640";
          target.textAlign = "center";
          lines.forEach((l, i) => target.fillText(l, NOTE_BOX.x + NOTE_BOX.w / 2, y + 36 + i * 32));
        }
        if (frameImg) target.drawImage(frameImg, 0, 0, W, H);
      };
      const loop = () => { if (!running) return; render(ctx); requestAnimationFrame(loop); };

      // ---- hand-writing on the photo ----
      let drawing = false, last = null;
      const pos = (e) => { const r = view.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };
      view.addEventListener("pointerdown", (e) => {
        if (mode !== "shot") return;
        drawing = true; last = pos(e); view.setPointerCapture(e.pointerId);
      });
      view.addEventListener("pointermove", (e) => {
        if (!drawing) return;
        const p = pos(e);
        inkCtx.strokeStyle = inkColor; inkCtx.lineWidth = 6; inkCtx.lineCap = "round";
        inkCtx.beginPath(); inkCtx.moveTo(last.x, last.y); inkCtx.lineTo(p.x, p.y); inkCtx.stroke();
        last = p;
      });
      view.addEventListener("pointerup", () => { drawing = false; });

      // ---- buttons ----
      const snap = el("button", { class: "btn primary big", onclick: async () => {
        snap.disabled = true;
        for (const n of ["3", "2", "1"]) { status.textContent = `Get ready… ${n}`; await new Promise((r) => setTimeout(r, 700)); }
        drawCover(shot.getContext("2d"), video, video.videoWidth || W, video.videoHeight || H, true);
        setMode("shot");
      } }, "📸 Snap");
      const retake = el("button", { class: "btn", onclick: () => { inkCtx.clearRect(0, 0, W, H); setMode("live"); } }, "↺ Retake");
      const clearInk = el("button", { class: "btn small", onclick: () => inkCtx.clearRect(0, 0, W, H) }, "🧽 Clear writing");
      const save = el("button", { class: "btn primary", onclick: async () => {
        save.disabled = true;
        const out = Object.assign(document.createElement("canvas"), { width: W, height: H });
        render(out.getContext("2d"));
        const image = out.toDataURL("image/jpeg", 0.9);
        const a = el("a", { href: image, download: `wedding-photo-${Date.now()}.jpg` });
        document.body.append(a); a.click(); a.remove();
        try {
          await api.uploadPhoto({ name: game.state.name, note: [note.value, privateNote.value].filter(Boolean).join("\n\n"), image });
          toast("Saved! The couple will love it 💖");
          closeModal();
        } catch (e) { toast(e.message); save.disabled = false; }
      } }, "💾 Save photo");

      const fileInput = el("input", { type: "file", accept: "image/*", capture: "user", class: "hidden" });
      const fileBtn = el("button", { class: "btn hidden", onclick: () => fileInput.click() }, "🖼 Choose a photo");
      fileInput.addEventListener("change", async () => {
        const f = fileInput.files[0];
        if (!f) return;
        const img = await loadImage(URL.createObjectURL(f));
        if (img) { drawCover(shot.getContext("2d"), img, img.width, img.height, false); setMode("shot"); }
      });

      const inkBar = el("div", { class: "row" }, "✍️ Write on the photo:",
        ...INK_COLORS.map((c) => el("button", { class: "swatch", style: `background:${c}`, onclick: () => { inkColor = c; } })), clearInk);

      const setMode = (m) => {
        mode = m;
        snap.disabled = false;
        snap.classList.toggle("hidden", m !== "live");
        for (const n of [retake, save, inkBar]) n.classList.toggle("hidden", m !== "shot");
        status.textContent = m === "shot" ? "Looking good! Write on it with your finger, then save." : game.config.photobooth.intro;
      };

      const frameRow = el("div", { class: "frames" });
      const pickFrame = async (f, btn) => {
        frameImg = await loadImage(f.url);
        for (const b of frameRow.children) b.classList.remove("selected");
        btn.classList.add("selected");
      };
      frames.forEach((f, i) => {
        const btn = el("button", { class: "option", onclick: () => pickFrame(f, btn) }, el("img", { src: f.url, alt: f.label }), f.label);
        frameRow.append(btn);
        if (i === 0) pickFrame(f, btn);
      });

      setMode("live");
      openModal(`${def.icon} ${def.label}`, el("div", { class: "booth" },
        status, view,
        el("div", { class: "row" }, snap, retake, fileBtn, save),
        inkBar,
        el("div", { style: "width:100%" }, el("label", {}, "Frame"), frameRow),
        note, privateNote, fileInput,
      ), () => { running = false; stopCamera(); });
      startCamera();
      loop();
    },
  };
}
