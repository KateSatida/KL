// Photos from a public Google Drive folder (for Memory Lane).
// Needs the folder shared as "Anyone with the link" and a Google API key with
// the Google Drive API turned on (see README → Memory Lane photos).

export function driveFolderId(link) {
  const s = String(link || "").trim();
  return s.match(/\/folders\/([\w-]{10,})/)?.[1] || s.match(/[?&]id=([\w-]{10,})/)?.[1] || (/^[\w-]{20,}$/.test(s) ? s : null);
}

export function driveFileId(link) {
  const s = String(link || "").trim();
  return s.match(/\/file\/d\/([\w-]{10,})/)?.[1] || s.match(/[?&]id=([\w-]{10,})/)?.[1] || null;
}

// Two addresses Google serves a public Drive image from; the second is a backup.
export const driveImageUrls = (id) => [
  `https://lh3.googleusercontent.com/d/${id}=w1600`,
  `https://drive.google.com/thumbnail?id=${id}&sz=w1600`,
];

// A photo link pasted on the admin page → { image, fallback, caption }.
// Google Drive file links ("…/file/d/ID/view") become direct image addresses;
// any other https image link is used as it is.
export function photoFromLink(link, caption = "") {
  const id = driveFileId(link);
  if (id) { const [image, fallback] = driveImageUrls(id); return { image, fallback, caption }; }
  if (/^https:\/\/\S+$/.test(String(link).trim())) return { image: String(link).trim(), caption };
  return null;
}

// Photo links are stored in settings as memory_aa, memory_ab, … (one per photo)
export const memoryKey = (i) => "memory_" + String.fromCharCode(97 + Math.floor(i / 26)) + String.fromCharCode(97 + (i % 26));

// Settings key for the caption of one photo in the Drive folder, e.g. "memcap_qxbtrka"
// (settings keys may only use a-z and _, so the Drive file id is hashed into letters).
export function captionKey(id) {
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  let s = "";
  for (let i = 0; i < 7; i++) { s += String.fromCharCode(97 + (h % 26)); h = Math.floor(h / 26); }
  return "memcap_" + s;
}

// → [{ id, name, image, fallback, caption }] sorted by file name.
// caption: the one typed on the admin page, else the Drive "description", else none.
export async function listDrivePhotos(folderLink, apiKey, captions = {}) {
  const folder = driveFolderId(folderLink);
  if (!folder || !apiKey) return null;
  const q = encodeURIComponent(`'${folder}' in parents and mimeType contains 'image/' and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&key=${encodeURIComponent(apiKey)}`
    + `&fields=files(id,name,description)&orderBy=name&pageSize=200&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || `Google Drive error ${res.status}`);
  return (data.files || []).map((f) => {
    const [image, fallback] = driveImageUrls(f.id);
    return { id: f.id, name: f.name, image, fallback, caption: captions[captionKey(f.id)] || f.description || "" };
  });
}
