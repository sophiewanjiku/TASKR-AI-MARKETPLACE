import { useState, useEffect } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { getPendingReview, reviewSubmission } from '../../api/adminApi';

const ReviewModal = ({ submission, onClose, onDone }) => {
  const [accuracy, setAccuracy] = useState('');
  const [notes, setNotes]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const handle = async (action) => {
    if (action === 'approve' && !accuracy) {
      return setError('Please enter an accuracy score');
    }
    setLoading(true);
    try {
      await reviewSubmission(submission.submission_id, action, notes, accuracy);
      onDone();
      onClose();
    } catch (err) {
      setError(err.error || 'Failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-base font-semibold text-[#0a1628] mb-1">
          Review Submission
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          {submission.worker_name} · {submission.task_title}
        </p>

        {/* Submission notes */}
        {submission.notes && (
          <div className="bg-gray-50 rounded-xl p-3 mb-4">
            <p className="text-[10px] text-gray-400 mb-1">Worker notes</p>
            <p className="text-xs text-gray-600">{submission.notes}</p>
          </div>
        )}

        {/* File link */}
        {submission.file_url && (
          <a href={submission.file_url} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 text-xs text-blue-500
              hover:underline mb-4">
            📎 View submitted file
          </a>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600
            rounded-lg p-2 text-xs mb-3">
            {error}
          </div>
        )}

        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Accuracy Score (0–100)
          </label>
          <input type="number" min="0" max="100" value={accuracy}
            onChange={e => setAccuracy(e.target.value)}
            placeholder="e.g. 95"
            className="w-full border border-gray-200 rounded-lg px-3 py-2
              text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Admin Notes (optional)
          </label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            rows={3} placeholder="Feedback for the worker..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2
              text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>

        <div className="flex gap-2">
          <button onClick={() => handle('reject')} disabled={loading}
            className="flex-1 text-xs font-medium bg-red-50 text-red-600
              border border-red-200 py-2 rounded-lg hover:bg-red-100 transition
              disabled:opacity-50">
            Reject
          </button>
          <button onClick={() => handle('approve')} disabled={loading}
            className="flex-1 text-xs font-medium bg-[#0a1628] text-white
              py-2 rounded-lg hover:bg-[#1e3a5f] transition disabled:opacity-50">
            {loading ? 'Saving...' : 'Approve'}
          </button>
        </div>
        <button onClick={onClose}
          className="w-full text-xs text-gray-400 mt-2 hover:text-gray-600">
          Cancel
        </button>
      </div>
    </div>
  );
};

export default function PendingReview() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const data = await getPendingReview();
      setSubmissions(data.submissions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f0f2f5] overflow-hidden">
      <AdminSidebar />

      {selected && (
        <ReviewModal
          submission={selected}
          onClose={() => setSelected(null)}
          onDone={() => { load(); setSelected(null); }} />
      )}

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[#0a1628]">Pending Review</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {submissions.length} submission{submissions.length !== 1 ? 's' : ''} awaiting review
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
          ) : submissions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-3xl mb-2">✅</div>
              <p className="text-sm text-gray-400">All caught up — no pending reviews!</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  {['Worker', 'Task', 'Amount', 'Notes', 'Submitted', 'Action'].map(h => (
                    <th key={h} className="text-left text-[10px] font-medium
                      text-gray-400 uppercase tracking-wide pb-2
                      border-b border-gray-50">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {submissions.map(s => (
                  <tr key={s.submission_id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#0a1628] flex
                          items-center justify-center text-[10px] font-medium
                          text-blue-400 flex-shrink-0">
                          {s.worker_name?.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-[#0a1628]">
                            {s.worker_name}
                          </p>
                          <p className="text-[10px] text-gray-400">{s.worker_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-xs font-medium text-[#0a1628]
                      max-w-[150px] truncate">
                      {s.task_title}
                    </td>
                    <td className="py-3 text-xs font-semibold text-[#0a1628]">
                      ${parseFloat(s.task_budget).toFixed(0)}
                    </td>
                    <td className="py-3 text-xs text-gray-400 max-w-[120px] truncate">
                      {s.notes || '—'}
                    </td>
                    <td className="py-3 text-xs text-gray-400">
                      {new Date(s.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => setSelected(s)}
                        className="text-[10px] font-medium bg-[#0a1628] text-white
                          px-3 py-1.5 rounded-lg hover:bg-[#1e3a5f] transition">
                        Review
                      </button>
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
