const BASE = '/api';

function getToken() {
  return localStorage.getItem('pickems_token');
}

async function request(method, path, body) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Auth
  login: (username, password) => request('POST', '/auth/login', { username, password }),
  me: () => request('GET', '/auth/me'),
  setup: (data) => request('POST', '/auth/setup', data),
  updateMe: (data) => request('PUT', '/auth/me', data),

  // Events
  getUserPicks: (eventId, userId) => request('GET', `/events/${eventId}/user-picks/${userId}`),
  getEvents: () => request('GET', '/events'),
  getEvent: (id) => request('GET', `/events/${id}`),
  getLeaderboard: (id) => request('GET', `/events/${id}/leaderboard`),
  getMyPicks: (id) => request('GET', `/events/${id}/my-picks`),
  getAllPicks: (id) => request('GET', `/events/${id}/all-picks`),
  getAllTimeStats: () => request('GET', '/events/stats/alltime'),

  // Picks
  savePick: (data) => request('POST', '/picks', data),
  deletePick: (categoryId) => request('DELETE', `/picks/${categoryId}`),

  // Admin - Users
  getUsers: () => request('GET', '/admin/users'),
  createUser: (data) => request('POST', '/admin/users', data),
  resetPassword: (id, password) => request('PUT', `/admin/users/${id}/password`, { password }),
  updateUser: (id, data) => request('PUT', `/admin/users/${id}`, data),
  deleteUser: (id) => request('DELETE', `/admin/users/${id}`),

  // Admin - Events
  createEvent: (data) => request('POST', '/admin/events', data),
  updateEvent: (id, data) => request('PUT', `/admin/events/${id}`, data),
  deleteEvent: (id) => request('DELETE', `/admin/events/${id}`),
  importCategories: (id, categories) => request('POST', `/admin/events/${id}/import`, { categories }),
  reimportCategories: (id, categories) => request('POST', `/admin/events/${id}/reimport`, { categories }),
  setAnswer: (categoryId, nomineeId) => request('PUT', `/admin/categories/${categoryId}/answer`, { nominee_id: nomineeId }),
};
