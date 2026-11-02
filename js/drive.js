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

// "01_Where it all began.jpg" -> "Where it all began"
const captionFrom = (name) => name.replace(/\.[a-z0-9]+$/i, "").replace(/^\d+[\s._-]*/, "").replace(/[_]+/g, " ").trim();

// → [{ image, fallback, caption }] sorted by file name
export async function listDrivePhotos(folderLink, apiKey) {
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
    return { image, fallback, caption: f.description || captionFrom(f.name) };
  });
}
