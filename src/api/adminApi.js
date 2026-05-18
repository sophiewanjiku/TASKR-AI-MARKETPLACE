const BASE_URL = 'http://localhost:8000/api/auth';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('access')}`,
});

// ── Tasks ──
export const getAdminTasks = async () => {
  const res = await fetch(`${BASE_URL}/admin/tasks/`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

export const getAdminTaskDetail = async (taskId) => {
  const res = await fetch(`${BASE_URL}/admin/tasks/${taskId}/`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

export const updateTask = async (taskId, updates) => {
  const res = await fetch(`${BASE_URL}/admin/tasks/${taskId}/`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

export const deleteTask = async (taskId) => {
  const res = await fetch(`${BASE_URL}/admin/tasks/${taskId}/`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw await res.json();
};

// ── Pending review ──
export const getPendingReview = async () => {
  const res = await fetch(`${BASE_URL}/admin/review/`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

export const reviewSubmission = async (submissionId, action, admin_note, accuracy_score) => {
  const res = await fetch(`${BASE_URL}/admin/review/${submissionId}/`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ action, admin_note, accuracy_score }),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

// ── Users ──
export const getAdminUserDetail = async (userId) => {
  const res = await fetch(`${BASE_URL}/admin/users/${userId}/`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

// ── Proposals ──
export const getAdminProposals = async (status = '') => {
  const query = status ? `?status=${status}` : '';
  const res = await fetch(`${BASE_URL}/admin/proposals/${query}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

export const reviewProposal = async (proposalId, action, admin_note = '') => {
  const res = await fetch(`${BASE_URL}/admin/proposals/${proposalId}/review/`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ action, admin_note }),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

// ── Verification queue ──
export const getVerificationQueue = async () => {
  const res = await fetch(`${BASE_URL}/admin/verification/`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

export const verifyUser = async (userId, action) => {
  const res = await fetch(`${BASE_URL}/admin/verification/${userId}/`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ action }),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

// ── Analytics ──
export const getAnalytics = async () => {
  const res = await fetch(`${BASE_URL}/admin/analytics/`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

// ── Revenue ──
export const getRevenue = async () => {
  const res = await fetch(`${BASE_URL}/admin/revenue/`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

// ── Settings ──
export const getSettings = async () => {
  const res = await fetch(`${BASE_URL}/admin/settings/`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

export const updateSettings = async (updates) => {
  const res = await fetch(`${BASE_URL}/admin/settings/`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};