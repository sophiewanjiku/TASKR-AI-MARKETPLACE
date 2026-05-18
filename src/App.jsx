import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import FindJobs from './pages/FindJobs';
import UploadTask from './pages/UploadTask';
import MpesaSetup from './pages/MpesaSetup';
import Payouts from './pages/Payouts';
import AdminPayouts from './pages/AdminPayouts';
import VerifyEmail   from './pages/VerifyEmail';
import ProfileSetup  from './pages/ProfileSetup';
import Profile  from './pages/Profile';
import Invoices       from './pages/Invoices';
import CompletedJobs  from './pages/CompletedJobs';
import Notifications  from './pages/Notifications';
import Messages    from './pages/Messages';
import OngoingJobs from './pages/OngoingJobs';
import Proposals   from './pages/Proposals';
import AllTasks          from './pages/admin/AllTasks';
import PendingReview     from './pages/admin/PendingReview';
import AllUsers          from './pages/admin/AllUsers';
import VerificationQueue from './pages/admin/VerificationQueue';
import Analytics         from './pages/admin/Analytics';
import RevenueReports    from './pages/admin/RevenueReports';
import Settings          from './pages/admin/Settings';

// ── Protects routes that require login ──
// If no access token exists in localStorage, redirect to /login
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('access');
  return token ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes — no login required */}
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email"   element={<VerifyEmail />} />

        {/* Protected route — only accessible when logged in */}
        <Route path="/dashboard" element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } />

        {/* Placeholder routes for pages we'll build next */}
        <Route path="/messages" element={<PrivateRoute><Messages /></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><OngoingJobs /></PrivateRoute>} />
        <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
        <Route path="/find-jobs" element={<PrivateRoute><FindJobs /></PrivateRoute>} />
        <Route path="/proposals" element={<PrivateRoute><Proposals /></PrivateRoute>} />
        <Route path="/completed" element={<PrivateRoute><CompletedJobs /></PrivateRoute>} />
        <Route path="/invoices" element={<PrivateRoute><Invoices /></PrivateRoute>} />
        <Route path="/payouts" element={<PrivateRoute><Payouts /></PrivateRoute>} />
        <Route path="/setup/mpesa" element={<PrivateRoute><MpesaSetup /></PrivateRoute>} />
        <Route path="/setup/profile" element={<PrivateRoute><ProfileSetup /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

        {/* Admin routes — protected, only accessible when logged in */}
        <Route path="/admin/dashboard"    element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
        <Route path="/admin/analytics"    element={<PrivateRoute><Analytics /></PrivateRoute>} />
        <Route path="/admin/review"       element={<PrivateRoute><PendingReview /></PrivateRoute>} />
        <Route path="/admin/review"       element={<PrivateRoute><PendingReview /></PrivateRoute>} />
        <Route path="/admin/upload" element={<PrivateRoute><UploadTask /></PrivateRoute>} />  
        <Route path="/admin/users"        element={<PrivateRoute><AllUsers /></PrivateRoute>} />
        <Route path="/admin/flagged"      element={<PrivateRoute><div className="p-8 text-gray-400">Flagged Accounts — coming soon</div></PrivateRoute>} />
        <Route path="/admin/verification" element={<PrivateRoute><VerificationQueue /></PrivateRoute>} />
        <Route path="/admin/payouts" element={<PrivateRoute><AdminPayouts /></PrivateRoute>} />
        <Route path="/admin/reports"      element={<PrivateRoute><RevenueReports /></PrivateRoute>} />
        <Route path="/admin/settings"     element={<PrivateRoute><Settings /></PrivateRoute>} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;