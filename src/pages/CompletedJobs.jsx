import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getCompletedJobs } from '../api/reports';

// ── Accuracy bar ──
const AccuracyBar = ({ score }) => {
  if (!score) return <span className="text-xs text-gray-400">—</span>;
  const color     = score >= 90 ? 'bg-green-500' : score >= 75 ? 'bg-amber-400' : 'bg-red-400';
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

// ── Status pill ──
const StatusPill = ({ status }) => {
  const styles = {
    paid:       'bg-green-50 text-green-700',
    approved:   'bg-amber-50 text-amber-700',
    processing: 'bg-blue-50 text-blue-700',
    rejected:   'bg-red-50 text-red-700',
  };
  const labels = {
    paid:       'Paid',
    approved:   'Awaiting Payout',
    processing: 'Processing',
    rejected:   'Rejected',
  };
  return (
    <span className={`text-[10px] font-medium px-2 py-1 rounded-full
      ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
      {labels[status] || status}
    </span>
  );
};

const TABS = [
  { key: '',           label: 'All' },
  { key: 'paid',       label: 'Paid' },
  { key: 'approved',   label: 'Awaiting Payout' },
  { key: 'rejected',   label: 'Rejected' },
];

export default function CompletedJobs() {
  const [jobs, setJobs]         = useState([]);
  const [summary, setSummary]   = useState({});
  const [activeTab, setActiveTab] = useState('');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    loadJobs();
  }, [activeTab]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await getCompletedJobs(activeTab);
      setJobs(data.jobs);
      setSummary(data.summary);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f0f2f5] overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-6">

        {/* Top bar */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[#0a1628]">Completed Jobs</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Your work history and accuracy performance
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4 mb-5">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Jobs Completed</p>
            <p className="text-2xl font-semibold text-[#0a1628]">
              {summary.total_completed || 0}
            </p>
            <p className="text-xs text-blue-400 mt-1">All time</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Avg Accuracy</p>
            <p className="text-2xl font-semibold text-[#0a1628]">
              {summary.avg_accuracy || 0}%
            </p>
            <p className="text-xs text-green-500 mt-1">
              {summary.avg_accuracy >= 90 ? 'Above average' : 'Keep improving'}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Total Earned</p>
            <p className="text-2xl font-semibold text-[#0a1628]">
              ${summary.total_earned?.toFixed(2) || '0.00'}
            </p>
            <p className="text-xs text-green-500 mt-1">Paid out</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Jobs Paid</p>
            <p className="text-2xl font-semibold text-[#0a1628]">
              {summary.total_paid || 0}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              of {summary.total_completed || 0} completed
            </p>
          </div>
        </div>

        {/* Jobs table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Tabs */}
          <div className="flex border-b border-gray-100 px-4">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`text-xs px-4 py-3 border-b-2 transition whitespace-nowrap
                  ${activeTab === tab.key
                    ? 'border-[#0a1628] text-[#0a1628] font-medium'
                    : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-4">
            {loading ? (
              <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
            ) : jobs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                No completed jobs yet — finish a task to see it here!
              </p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    {['Job Title', 'Category', 'Completed', 'Accuracy', 'Amount', 'M-Pesa Ref', 'Status'].map(h => (
                      <th key={h} className="text-left text-[10px] font-medium
                        text-gray-400 uppercase tracking-wide pb-2
                        border-b border-gray-50">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(job => (
                    <tr key={job.id} className="border-b border-gray-50 last:border-0
                      hover:bg-gray-50/50 transition">
                      <td className="py-3 text-xs font-medium text-[#0a1628]
                        max-w-[160px] truncate">
                        {job.task_title}
                      </td>
                      <td className="py-3 text-xs text-gray-400 capitalize">
                        {job.category}
                      </td>
                      <td className="py-3 text-xs text-gray-400">
                        {new Date(job.completed_at).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <AccuracyBar score={job.accuracy} />
                      </td>
                      <td className="py-3 text-xs font-semibold text-[#0a1628]">
                        ${parseFloat(job.amount).toFixed(2)}
                      </td>
                      <td className="py-3 text-xs text-gray-400 font-mono">
                        {job.mpesa_ref || '—'}
                      </td>
                      <td className="py-3">
                        <StatusPill status={job.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}