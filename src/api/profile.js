const BASE_URL = 'http://localhost:8000/api/auth';

const authHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('access')}`,
});

const authJsonHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('access')}`,
});

// Verify email with 6-digit code
export const verifyEmail = async (email, code) => {
  const res = await fetch(`${BASE_URL}/verify-email/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

// Resend verification code
export const resendCode = async (email) => {
  const res = await fetch(`${BASE_URL}/resend-code/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

// Get full profile
export const getProfile = async () => {
  const res = await fetch(`${BASE_URL}/profile/`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

// Update profile — handles both JSON fields and file uploads
export const updateProfile = async (formData) => {
  const res = await fetch(`${BASE_URL}/profile/`, {
    method: 'PATCH',
    headers: authHeaders(), // No Content-Type — let browser set multipart boundary
    body: formData,         // FormData object handles files + text together
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

// Add education entry
export const addEducation = async (data) => {
  const res = await fetch(`${BASE_URL}/profile/education/`, {
    method: 'POST',
    headers: authJsonHeaders(),
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw result;
  return result;
};

// Delete education entry
export const deleteEducation = async (id) => {
  const res = await fetch(`${BASE_URL}/profile/education/${id}/`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw await res.json();
};

// Add work experience entry
export const addExperience = async (data) => {
  const res = await fetch(`${BASE_URL}/profile/experience/`, {
    method: 'POST',
    headers: authJsonHeaders(),
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw result;
  return result;
};

// Delete work experience entry
export const deleteExperience = async (id) => {
  const res = await fetch(`${BASE_URL}/profile/experience/${id}/`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw await res.json();
};

// Change email — requires password confirmation
export const changeEmail = async (email, password) => {
  const res = await fetch(`${BASE_URL}/account/change-email/`, {
    method: 'POST',
    headers: authJsonHeaders(),
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

// Change password
export const changePassword = async (old_password, new_password) => {
  const res = await fetch(`${BASE_URL}/account/change-password/`, {
    method: 'POST',
    headers: authJsonHeaders(),
    body: JSON.stringify({ old_password, new_password }),
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
};

// Delete account permanently
export const deleteAccount = async () => {
  const res = await fetch(`${BASE_URL}/account/delete/`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw await res.json();
};