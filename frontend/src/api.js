const BASE = '/api';

async function handle(res) {
  if (!res.ok) {
    // An expired/invalid session on a protected call drops us back to login.
    // (Login and change-pin return 401 for a wrong PIN — handle those inline.)
    if (res.status === 401 && !/\/auth\/(login|change-pin)$/.test(new URL(res.url).pathname)) {
      sessionStorage.removeItem('stylist_user');
      window.location.reload();
      return new Promise(() => {}); // halt; the reload takes over
    }
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  getUsers: () => fetch(`${BASE}/auth/users`).then(handle),
  login: (userId, passcode) =>
    fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, passcode }),
    }).then(handle),
  me: () => fetch(`${BASE}/auth/me`).then(handle),
  logout: () => fetch(`${BASE}/auth/logout`, { method: 'POST' }).then(handle),
  changePin: (currentPin, newPin) =>
    fetch(`${BASE}/auth/change-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPin, newPin }),
    }).then(handle),

  getWardrobe: (ownerId, filters = {}) => {
    const params = new URLSearchParams({ ownerId, ...filters });
    return fetch(`${BASE}/wardrobe?${params}`).then(handle);
  },
  tagPhoto: (file) => {
    const form = new FormData();
    form.append('photo', file);
    return fetch(`${BASE}/wardrobe/tag-photo`, { method: 'POST', body: form }).then(handle);
  },
  tagOutfitPhoto: (file) => {
    const form = new FormData();
    form.append('photo', file);
    return fetch(`${BASE}/wardrobe/tag-outfit-photo`, { method: 'POST', body: form }).then(handle);
  },
  createItem: (item) =>
    fetch(`${BASE}/wardrobe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    }).then(handle),
  updateItem: (id, fields) =>
    fetch(`${BASE}/wardrobe/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    }).then(handle),
  deleteItem: (id) => fetch(`${BASE}/wardrobe/${id}`, { method: 'DELETE' }).then(handle),

  getLatestLook: (ownerId) => fetch(`${BASE}/looks/latest?ownerId=${ownerId}`).then(handle),
  getLookHistory: (ownerId, limit = 50) => fetch(`${BASE}/looks/history?ownerId=${ownerId}&limit=${limit}`).then(handle),
  getPreferenceHistory: (ownerId) => fetch(`${BASE}/looks/preference-history?ownerId=${ownerId}`).then(handle),
  getPreferenceSummary: (ownerId) => fetch(`${BASE}/looks/preference-summary?ownerId=${ownerId}`).then(handle),
  updatePreferenceSummary: (ownerId, summary) =>
    fetch(`${BASE}/looks/preference-summary`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerId, summary }),
    }).then(handle),
  regenerateLook: (ownerId, { occasion, cue, refineFromLookId } = {}) =>
    fetch(`${BASE}/looks/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerId, occasion, cue, refineFromLookId }),
    }).then(handle),
  sendFeedback: (lookId, ownerId, status, note) =>
    fetch(`${BASE}/looks/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lookId, ownerId, status, note }),
    }).then(handle),

  getWornOutfits: (ownerId) => fetch(`${BASE}/looks/worn-outfits?ownerId=${ownerId}`).then(handle),
  saveWornOutfit: (ownerId, photoUrl, itemIds, status, note) =>
    fetch(`${BASE}/looks/worn-outfits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerId, photoUrl, itemIds, status, note }),
    }).then(handle),

  getInspiration: () => fetch(`${BASE}/inspiration`).then(handle),
  addInspirationPhoto: (file, caption) => {
    const form = new FormData();
    form.append('photo', file);
    if (caption) form.append('caption', caption);
    return fetch(`${BASE}/inspiration`, { method: 'POST', body: form }).then(handle);
  },
  addInspirationUrl: (sourceUrl, caption) =>
    fetch(`${BASE}/inspiration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_url: sourceUrl, caption }),
    }).then(handle),
  inspirationFeedback: (id, status, note) =>
    fetch(`${BASE}/inspiration/${id}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note }),
    }).then(handle),
  wearInspiration: (id) => fetch(`${BASE}/inspiration/${id}/wear`, { method: 'POST' }).then(handle),
  deleteInspiration: (id) => fetch(`${BASE}/inspiration/${id}`, { method: 'DELETE' }).then(handle),
};
