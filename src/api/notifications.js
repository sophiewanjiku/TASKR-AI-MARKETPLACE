const BASE_URL = 'http://localhost:8000/api/auth';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('access')}`,
});

// Get all notifications with optional type filter
export const getNotifications = async (type = '') => {
  const query = type ? `?type=${type}` : '';
  const res = await fetch(`${BASE_URL}/notifications/${query}`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

// Mark one or all notifications as read
// Pass an id to mark one, or nothing to mark all
export const markAsRead = async (id = null) => {
  const res = await fetch(`${BASE_URL}/notifications/read/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(id ? { id } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};