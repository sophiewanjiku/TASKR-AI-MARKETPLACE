const BASE_URL = 'http://localhost:8000/api/auth';

const authHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('access')}`,
});

// Get invoices, monthly chart data, and summary stats
export const getInvoices = async () => {
  const res = await fetch(`${BASE_URL}/invoices/`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

// Get completed jobs with optional status filter
export const getCompletedJobs = async (status = '') => {
  const query = status ? `?status=${status}` : '';
  const res = await fetch(`${BASE_URL}/completed-jobs/${query}`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};