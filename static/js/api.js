// All calls to the Python server go through here.

async function request(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`);
  return data;
}

export const api = {
  config: () => request("GET", "/api/config"),
  uploadPhoto: (body) => request("POST", "/api/photos", body),
  messages: () => request("GET", "/api/messages"),
  postMessage: (body) => request("POST", "/api/messages", body),
  singles: () => request("GET", "/api/singles"),
  addSingle: (body) => request("POST", "/api/singles", body),
  deleteSingle: (id, token) => request("DELETE", `/api/singles/${id}?token=${encodeURIComponent(token)}`),
};
