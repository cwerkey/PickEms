const BASE = '/api';

function getToken() { return localStorage.getItem('pickems_token'); }

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
  login: (u, p) => request('POST', '/auth/login', { username: u, password: p }),
  me: () => request('GET', '/auth/me'),
  setup: (d) => request('POST', '/auth/setup', d),
  updateMe: (d) => request('PUT', '/auth/me', d),

  // Events
  getEvents: () => request('GET', '/events'),
  getEvent: (id) => request('GET', `/events/${id}`),
  getLeaderboard: (id) => request('GET', `/events/${id}/leaderboard`),
  getMyPicks: (id) => request('GET', `/events/${id}/my-picks`),
  getAllPicks: (id) => request('GET', `/events/${id}/all-picks`),
  getUserPicks: (eventId, userId) => request('GET', `/events/${eventId}/user-picks/${userId}`),
  getAllTimeStats: () => request('GET', '/events/stats/alltime'),
  joinEvent: (id) => request('POST', `/events/${id}/join`),
  leaveEvent: (id) => request('POST', `/events/${id}/leave`),

  // Picks
  savePick: (d) => request('POST', '/picks', d),
  deletePick: (categoryId) => request('DELETE', `/picks/${categoryId}`),

  // Admin - Users
  getUsers: () => request('GET', '/admin/users'),
  createUser: (d) => request('POST', '/admin/users', d),
  resetPassword: (id, password) => request('PUT', `/admin/users/${id}/password`, { password }),
  updateUser: (id, d) => request('PUT', `/admin/users/${id}`, d),
  deleteUser: (id) => request('DELETE', `/admin/users/${id}`),

  // Admin - Events
  createEvent: (d) => request('POST', '/admin/events', d),
  updateEvent: (id, d) => request('PUT', `/admin/events/${id}`, d),
  deleteEvent: (id) => request('DELETE', `/admin/events/${id}`),
  importCategories: (id, categories) => request('POST', `/admin/events/${id}/import`, { categories }),
  reimportCategories: (id, categories) => request('POST', `/admin/events/${id}/reimport`, { categories }),

  // Admin - Categories & Nominees
  addCategory: (eventId, name) => request('POST', `/admin/events/${eventId}/categories`, { name }),
  updateCategory: (id, d) => request('PUT', `/admin/categories/${id}`, d),
  deleteCategory: (id) => request('DELETE', `/admin/categories/${id}`),
  addNominee: (categoryId, d) => request('POST', `/admin/categories/${categoryId}/nominees`, d),
  updateNominee: (id, d) => request('PUT', `/admin/nominees/${id}`, d),
  deleteNominee: (id) => request('DELETE', `/admin/nominees/${id}`),
  setAnswer: (categoryId, nomineeId) => request('PUT', `/admin/categories/${categoryId}/answer`, { nominee_id: nomineeId }),

  // Admin - Participants
  getParticipants: (eventId) => request('GET', `/admin/events/${eventId}/participants`),
  getParticipantMatrix: () => request('GET', '/admin/participants/matrix'),
  addParticipant: (eventId, userId) => request('POST', `/admin/events/${eventId}/participants`, { user_id: userId }),
  removeParticipant: (eventId, userId) => request('DELETE', `/admin/events/${eventId}/participants/${userId}`),
};
