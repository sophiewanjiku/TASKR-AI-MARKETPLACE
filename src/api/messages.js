const BASE_URL = 'http://localhost:8000/api/auth';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('access')}`,
});

// Get all conversations for the logged-in user
export const getConversations = async () => {
  const res = await fetch(`${BASE_URL}/messages/`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

// Get all messages with a specific user
export const getThread = async (otherUserId) => {
  const res = await fetch(`${BASE_URL}/messages/${otherUserId}/`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

// Send a message
export const sendMessage = async (receiverId, body, taskId = null) => {
  const res = await fetch(`${BASE_URL}/messages/send/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ receiver_id: receiverId, body, task_id: taskId }),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};