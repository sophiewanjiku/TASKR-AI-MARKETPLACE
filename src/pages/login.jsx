import { useState } from 'react';
import { loginUser } from '../api/auth';
import { useNavigate } from 'react-router-dom';
import { getPaymentMethod } from '../api/payouts';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const data = await loginUser(formData);

      // Store tokens so the user stays authenticated across pages
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('access', data.access);
      localStorage.setItem('refresh', data.refresh);

  if (!data.user.is_verified) {
    // Send to verify email first
    localStorage.setItem('pending_email', data.user.email);
    navigate('/verify-email', { state: { email: data.user.email } });
  } else {
    // Check payment method then profile
    const pmData = await getPaymentMethod();
    if (!pmData.connected) {
      navigate('/setup/mpesa');
    } else {
      navigate('/dashboard');
    }
  }
      
// Check if user has connected their M-Pesa
    const pmData = await getPaymentMethod();
    if (!pmData.connected) {
      // New user — send to setup page first
      navigate('/setup/mpesa');
    } else {
      navigate('/dashboard');
    }      
    
    setMessage(`Welcome back, ${data.user.full_name}!`);

      // TODO: redirect to dashboard after login
    } catch (err) {
      setError(err.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white shadow-md rounded-xl p-8 w-full max-w-md">

        {/* Page heading */}
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Welcome back</h1>
        <p className="text-sm text-gray-500 mb-6">Log in to your account</p>

        {/* Success message */}
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 mb-4 text-sm">
            {message}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="jane@example.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Your password"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm transition disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        {/* Link to register page */}
        <p className="text-sm text-center text-gray-500 mt-4">
          Don't have an account?{' '}
          <a href="/register" className="text-blue-600 hover:underline font-medium">Sign up</a>
        </p>
      </div>
    </div>
  );
}