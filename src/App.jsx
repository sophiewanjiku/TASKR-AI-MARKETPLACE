import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// Auth pages
import Register     from './pages/Register';
import Login        from './pages/Login';
import VerifyEmail  from './pages/VerifyEmail';

// Setup pages
import MpesaSetup   from './pages/MpesaSetup';
import ProfileSetup from './pages/ProfileSetup';

// Worker pages
import Dashboard     from './pages/Dashboard';
import FindJobs      from './pages/FindJobs';
import Proposals     from './pages/Proposals';
import OngoingJobs   from './pages/OngoingJobs';
import CompletedJobs from './pages/CompletedJobs';
import Messages      from './pages/Messages';
import Notifications from './pages/Notifications';
import Invoices      from './pages/Invoices';
import Payouts       from './pages/Payouts';
import Profile       from './pages/Profile';

// Admin pages
import AdminDashboard    from './pages/AdminDashboard';
import AdminPayouts      from './pages/AdminPayouts';
import UploadTask        from './pages/UploadTask';
import AllTasks          from './pages/admin/AllTasks';
import PendingReview     from './pages/admin/PendingReview';
import AllUsers          from './pages/admin/AllUsers';
import VerificationQueue from './pages/admin/VerificationQueue';
import Analytics         from './pages/admin/Analytics';
import RevenueReports    from './pages/admin/RevenueReports';
import Settings          from './pages/admin/Settings';
// Protects routes that require login
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('access');
  return token ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Public routes ── */}
        <Route path="/register"    element={<Register />} />
        <Route path="/login"       element={<Login />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        {/* ── Setup routes ── */}
        <Route path="/setup/mpesa"   element={<PrivateRoute><MpesaSetup /></PrivateRoute>} />
        <Route path="/setup/profile" element={<PrivateRoute><ProfileSetup /></PrivateRoute>} />

        {/* ── Worker routes ── */}
        <Route path="/dashboard"     element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/find-jobs"     element={<PrivateRoute><FindJobs /></PrivateRoute>} />
        <Route path="/proposals"     element={<PrivateRoute><Proposals /></PrivateRoute>} />
        <Route path="/ongoing-jobs"  element={<PrivateRoute><OngoingJobs /></PrivateRoute>} />
        <Route path="/completed"     element={<PrivateRoute><CompletedJobs /></PrivateRoute>} />
        <Route path="/messages"      element={<PrivateRoute><Messages /></PrivateRoute>} />
        <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
        <Route path="/invoices"      element={<PrivateRoute><Invoices /></PrivateRoute>} />
        <Route path="/payouts"       element={<PrivateRoute><Payouts /></PrivateRoute>} />
        <Route path="/profile"       element={<PrivateRoute><Profile /></PrivateRoute>} />

        {/* ── Admin routes ── */}
        <Route path="/admin/dashboard"    element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
        <Route path="/admin/payouts"      element={<PrivateRoute><AdminPayouts /></PrivateRoute>} />
        <Route path="/admin/upload"       element={<PrivateRoute><UploadTask /></PrivateRoute>} />
        <Route path="/admin/tasks"        element={<PrivateRoute><AllTasks /></PrivateRoute>} />
        <Route path="/admin/review"       element={<PrivateRoute><PendingReview /></PrivateRoute>} />
        <Route path="/admin/users"        element={<PrivateRoute><AllUsers /></PrivateRoute>} />
        <Route path="/admin/flagged"      element={<PrivateRoute><AllUsers /></PrivateRoute>} />
        <Route path="/admin/verification" element={<PrivateRoute><VerificationQueue /></PrivateRoute>} />
        <Route path="/admin/analytics"    element={<PrivateRoute><Analytics /></PrivateRoute>} />
        <Route path="/admin/reports"      element={<PrivateRoute><RevenueReports /></PrivateRoute>} />
        <Route path="/admin/settings"     element={<PrivateRoute><Settings /></PrivateRoute>} />

        {/* ── Default redirect ── */}
        <Route path="/" element={
          localStorage.getItem('access')
            ? <Navigate to="/dashboard" replace />
            : <Navigate to="/login" replace />
        } />
        <Route path="*" element={
          localStorage.getItem('access')
            ? <Navigate to="/dashboard" replace />
            : <Navigate to="/login" replace />
        } />

      </Routes>
    </BrowserRouter>
  );
}

export default App;