import { useState, useEffect } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import { getAdminPayouts, verifyPayout, sendPayout } from '../api/payouts';

// ── Status pill ──
const StatusPill = ({ status }) => {
  const styles = {
    pending:    'bg-amber-50 text-amber-700',
    approved:   'bg-blue-50 text-blue-700',
    processing: 'bg-blue-50 text-blue-700',
    paid:       'bg-green-50 text-green-700',
    failed:     'bg-red-50 text-red-700',
    rejected:   'bg-red-50 text-red-700',
  };
  const labels = {
    pending:    'Awaiting Verification',
    approved:   'Awaiting Payout',
    processing: 'Processing',
    paid:       'Paid',
    failed:     'Failed',
    rejected:   'Rejected',
  };
  return (
    <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${styles[status]}`}>
      {labels[status] || status}
    </span>
  );
};

// ── Accuracy bar ──
const AccuracyBar = ({ score }) => {
  if (!score) return <span className="text-xs text-gray-400">—</span>;
  const color = score >= 90 ? 'bg-green-500' : score >= 75 ? 'bg-amber-400' : 'bg-red-400';
  const textColor = score >= 90 ? 'text-green-600' : score >= 75 ? 'text-amber-600' : 'text-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-medium ${textColor}`}>{score}%</span>
    </div>
  );
};

// ── Verify modal — admin sets accuracy and approves/rejects ──
const VerifyModal = ({ payout, onClose, onDone }) => {
  const [accuracy, setAccuracy] = useState('');
  const [notes, setNotes]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const handle = async (action) => {
    if (!accuracy) return setError('Please enter an accuracy score');
    setLoading(true);
    setError(null);
    try {
      await verifyPayout(payout.id, action, parseFloat(accuracy), notes);
      onDone();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to update. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

        <h2 className="text-base font-semibold text-[#0a1628] mb-1">
          Verify Submission
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Review the task submission and set an accuracy score before approving
        </p>

        {/* Task + worker info */}
        <div className="bg-gray-50 rounded-xl p-3 mb-4">
          <p className="text-xs font-medium text-[#0a1628]">{payout.task}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {payout.user_name} · ${parseFloat(payout.amount).toFixed(2)}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600
            rounded-lg p-2 text-xs mb-3">
            {error}
          </div>
        )}

        {/* Accuracy score input */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Accuracy Score (0 — 100) <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={accuracy}
            onChange={e => setAccuracy(e.target.value)}
            placeholder="e.g. 95"
            className="w-full border border-gray-200 rounded-lg px-3 py-2
              text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <p className="text-[10px] text-gray-400 mt-1">
            Score below 70% will flag the submission for rejection
          </p>
        </div>

        {/* Admin notes */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Admin Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Any feedback or reason for rejection..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2
              text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div className="flex gap-2">
          {/* Reject */}
          <button
            onClick={() => handle('reject')}
            disabled={loading}
            className="flex-1 text-xs font-medium bg-red-50 text-red-600
              border border-red-200 py-2 rounded-lg hover:bg-red-100
              transition disabled:opacity-50">
            Reject
          </button>

          {/* Approve */}
          <button
            onClick={() => handle('approve')}
            disabled={loading}
            className="flex-1 text-xs font-medium bg-[#0a1628] text-white
              py-2 rounded-lg hover:bg-[#1e3a5f] transition disabled:opacity-50">
            {loading ? 'Saving...' : 'Approve & Queue Payout'}
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full text-xs text-gray-400 mt-2 hover:text-gray-600 transition">
          Cancel
        </button>
      </div>
    </div>
  );
};

// ── Send payment confirmation modal ──
const SendModal = ({ payout, onClose, onDone }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const handle = async () => {
    setLoading(true);
    setError(null);
    try {
      await sendPayout(payout.id);
      onDone();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.error || 'Failed to send payment. Check Daraja credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

        <h2 className="text-base font-semibold text-[#0a1628] mb-1">
          Confirm Payment
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          This will send the payment directly to the worker's M-Pesa via Daraja
        </p>

        {/* Payment summary */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Worker</span>
            <span className="font-medium text-[#0a1628]">{payout.user_name}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Task</span>
            <span className="font-medium text-[#0a1628] text-right max-w-[200px] truncate">
              {payout.task}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">M-Pesa number</span>
            <span className="font-medium text-[#0a1628]">{payout.masked_phone}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Accuracy</span>
            <span className="font-medium text-green-600">{payout.accuracy}%</span>
          </div>
          <div className="flex justify-between text-xs border-t border-gray-200 pt-2 mt-2">
            <span className="text-gray-400 font-medium">Amount to send</span>
            <span className="text-base font-bold text-[#0a1628]">
              KES {parseFloat(payout.amount).toFixed(2)}
            </span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600
            rounded-lg p-2 text-xs mb-3">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 text-xs text-gray-500 border border-gray-200
              py-2 rounded-lg hover:bg-gray-50 transition">
            Cancel
          </button>
          <button
            onClick={handle}
            disabled={loading}
            className="flex-1 text-xs font-medium bg-green-600 text-white
              py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50">
            {loading ? 'Sending...' : `Send KES ${parseFloat(payout.amount).toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function AdminPayouts() {
  const [payouts, setPayouts]         = useState([]);
  const [activeTab, setActiveTab]     = useState('pending');
  const [loading, setLoading]         = useState(true);
  const [selectedPayout, setSelected] = useState(null);
  const [showVerify, setShowVerify]   = useState(false);
  const [showSend, setShowSend]       = useState(false);

  // Summary counts for stat cards
  const [summary, setSummary] = useState({
    pending: 0, approved: 0, paid: 0, total_due: 0
  });

  // Load payouts whenever the active tab changes
  useEffect(() => {
    loadPayouts();
  }, [activeTab]);

  const loadPayouts = async () => {
    setLoading(true);
    try {
      // Fetch filtered by current tab status
      const data = await getAdminPayouts(activeTab);
      setPayouts(data);

      // Also fetch all to compute summary counts
      const all = await getAdminPayouts();
      setSummary({
        pending:   all.filter(p => p.status === 'pending').length,
        approved:  all.filter(p => p.status === 'approved').length,
        paid:      all.filter(p => p.status === 'paid').length,
        total_due: all
          .filter(p => ['pending', 'approved'].includes(p.status))
          .reduce((sum, p) => sum + parseFloat(p.amount), 0),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Open verify modal for a payout
  const openVerify = (payout) => {
    setSelected(payout);
    setShowVerify(true);
  };

  // Open send modal for a payout
  const openSend = (payout) => {
    setSelected(payout);
    setShowSend(true);
  };

  const tabs = [
    { key: 'pending',   label: 'Awaiting Verification', count: summary.pending },
    { key: 'approved',  label: 'Awaiting Payout',       count: summary.approved },
    { key: 'paid',      label: 'Paid Out',               count: summary.paid },
    { key: 'rejected',  label: 'Rejected',               count: null },
  ];

  return (
    <div className="flex h-screen bg-[#f0f2f5] overflow-hidden">
      <AdminSidebar />

      {/* Verify modal */}
      {showVerify && selectedPayout && (
        <VerifyModal
          payout={selectedPayout}
          onClose={() => setShowVerify(false)}
          onDone={loadPayouts}
        />
      )}

      {/* Send payment modal */}
      {showSend && selectedPayout && (
        <SendModal
          payout={selectedPayout}
          onClose={() => setShowSend(false)}
          onDone={loadPayouts}
        />
      )}

      <main className="flex-1 overflow-y-auto p-6">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[#0a1628]">
              Payout Management
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Review submissions, verify accuracy and process M-Pesa payments
            </p>
          </div>
          <button
            className="bg-white border border-gray-200 text-[#0a1628] text-xs
              font-medium px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50 transition">
            Export Report
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4 mb-5">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Awaiting Verification</p>
            <p className="text-2xl font-semibold text-[#0a1628]">{summary.pending}</p>
            <p className="text-xs text-amber-500 mt-1">Needs review</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Awaiting Payout</p>
            <p className="text-2xl font-semibold text-[#0a1628]">{summary.approved}</p>
            <p className="text-xs text-blue-400 mt-1">Verified & approved</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Total Due</p>
            <p className="text-2xl font-semibold text-[#0a1628]">
              KES {summary.total_due.toFixed(2)}
            </p>
            <p className="text-xs text-amber-500 mt-1">To be paid out</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Paid This Session</p>
            <p className="text-2xl font-semibold text-[#0a1628]">{summary.paid}</p>
            <p className="text-xs text-green-500 mt-1">Completed payouts</p>
          </div>
        </div>

        {/* Main table card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">

          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-100 mb-4">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`text-xs px-4 py-2.5 border-b-2 transition
                  ${activeTab === tab.key
                    ? 'border-[#0a1628] text-[#0a1628] font-medium'
                    : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-1.5 bg-amber-100 text-amber-700 text-[9px]
                    font-medium px-1.5 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm text-gray-400 text-center py-10">Loading...</p>
          ) : payouts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">
              No payouts in this category
            </p>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  {['Worker', 'Task', 'Amount', 'Accuracy', 'M-Pesa', 'Date', 'Status', 'Action'].map(h => (
                    <th key={h} className="text-left text-[10px] font-medium text-gray-400
                      uppercase tracking-wide pb-2 border-b border-gray-50">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payouts.map(p => (
                  <tr key={p.id} className="border-b border-gray-50 last:border-0
                    hover:bg-gray-50/50 transition">

                    {/* Worker */}
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#0a1628] flex
                          items-center justify-center text-[10px] font-medium
                          text-blue-400 flex-shrink-0">
                          {p.user_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-[#0a1628]">{p.user_name}</p>
                          <p className="text-[10px] text-gray-400">{p.user_email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Task */}
                    <td className="py-3 max-w-[140px]">
                      <p className="text-xs font-medium text-[#0a1628] truncate">{p.task}</p>
                    </td>

                    {/* Amount */}
                    <td className="py-3 text-xs font-semibold text-[#0a1628]">
                      KES {parseFloat(p.amount).toFixed(2)}
                    </td>

                    {/* Accuracy */}
                    <td className="py-3">
                      <AccuracyBar score={p.accuracy} />
                    </td>

                    {/* M-Pesa number (masked) */}
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-base">📱</span>
                        <span className="text-xs text-gray-500">
                          {p.masked_phone}
                        </span>
                      </div>
                      {!p.pm_verified && (
                        <span className="text-[9px] text-red-400">Unverified</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-3 text-xs text-gray-400">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>

                    {/* Status */}
                    <td className="py-3">
                      <StatusPill status={p.status} />
                    </td>

                    {/* Action buttons */}
                    <td className="py-3">
                      {p.status === 'pending' && (
                        <button
                          onClick={() => openVerify(p)}
                          className="text-[10px] font-medium bg-[#0a1628] text-white
                            px-3 py-1.5 rounded-lg hover:bg-[#1e3a5f] transition">
                          Verify
                        </button>
                      )}
                      {p.status === 'approved' && (
                        <button
                          onClick={() => openSend(p)}
                          className="text-[10px] font-medium bg-green-600 text-white
                            px-3 py-1.5 rounded-lg hover:bg-green-700 transition">
                          Send Payment
                        </button>
                      )}
                      {['paid', 'processing'].includes(p.status) && (
                        <span className="text-[10px] text-gray-400">
                          {p.status === 'processing' ? 'In progress...' : 'Done'}
                        </span>
                      )}
                      {p.status === 'rejected' && (
                        <span className="text-[10px] text-red-400">Rejected</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}