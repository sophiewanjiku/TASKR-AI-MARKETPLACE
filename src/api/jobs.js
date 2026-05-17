const BASE_URL = 'http://localhost:8000/api/auth';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('access')}`,
});

const fileHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('access')}`,
});

// Submit a proposal for a task
export const submitProposal = async (taskId, cover_note) => {
  const res = await fetch(`${BASE_URL}/tasks/${taskId}/apply/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ cover_note }),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

// Get all proposals for the logged-in worker
export const getProposals = async (status = '') => {
  const query = status ? `?status=${status}` : '';
  const res = await fetch(`${BASE_URL}/proposals/${query}`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

// Withdraw a proposal
export const withdrawProposal = async (proposalId) => {
  const res = await fetch(`${BASE_URL}/proposals/${proposalId}/withdraw/`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

// Get all ongoing jobs for the logged-in worker
export const getOngoingJobs = async () => {
  const res = await fetch(`${BASE_URL}/ongoing-jobs/`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

// Get a single ongoing job detail
export const getOngoingJobDetail = async (proposalId) => {
  const res = await fetch(`${BASE_URL}/ongoing-jobs/${proposalId}/`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

// Submit work for an ongoing job
export const submitWork = async (proposalId, notes, file) => {
  const fd = new FormData();
  fd.append('notes', notes);
  if (file) fd.append('file', file);

  const res = await fetch(`${BASE_URL}/ongoing-jobs/${proposalId}/submit/`, {
    method: 'POST',
    headers: fileHeaders(),
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};