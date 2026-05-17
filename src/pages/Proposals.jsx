import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getProposals, withdrawProposal } from '../api/jobs';
import { useNavigate } from 'react-router-dom';

// Status pill
const StatusPill = ({ status }) => {
  const styles = {
    pending:   'bg-amber-50 text-amber-700',
    accepted:  'bg-green-50 text-green-700',
    rejected:  'bg-red-50 text-red-700',
    withdrawn: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`text-[10px] font-medium px-2 py-1 rounded-full
      ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  );
};

const TABS = [
  { key: '',          label: 'All' },
  { key: 'pending',   label: 'Pending' },
  { key: 'accepted',  label: 'Accepted' },
  { key: 'rejected',  label: 'Rejected' },
];

export default function Proposals() {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState([]);
  const [counts, setCounts]       = useState({});
  const [activeTab, setActiveTab] = useState('');
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    loadProposals();
  }, [activeTab]);

  const loadProposals = async () => {
    setLoading(true);
    try {
      const data = await getProposals(activeTab);
      setProposals(data.proposals);
      setCounts(data.counts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (proposalId) => {
    if (!window.confirm('Are you sure you want to withdraw this proposal?')) return;
    try {
      await withdrawProposal(proposalId);
      // Update locally
      setProposals(prev =>
        prev.map(p =>
          p.id === proposalId ? { ...p, status: 'withdrawn' } : p
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-screen bg-[#f0f2f5] overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[#0a1628]">My Proposals</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Track all jobs you have applied to
            </p>
          </div>
          <button
            onClick={() => navigate('/find-jobs')}
            className="bg-[#0a1628] text-white text-xs font-medium px-4 py-2
              rounded-lg hover:bg-[#1e3a5f] transition">
            Browse Jobs
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-5">
          {[
            { label: 'Total Applied',  value: counts.all      || 0, color: 'text-blue-400' },
            { label: 'Pending',        value: counts.pending  || 0, color: 'text-amber-500' },
            { label: 'Accepted',       value: counts.accepted || 0, color: 'text-green-500' },
            { label: 'Rejected',       value: counts.rejected || 0, color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border
              border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-1">{s.label}</p>
              <p className="text-2xl font-semibold text-[#0a1628]">{s.value}</p>
              <p className={`text-xs mt-1 ${s.color}`}>proposals</p>
            </div>
          ))}
        </div>

        {/* Proposals list */}
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
                {tab.key !== '' && counts[tab.key] > 0 && (
                  <span className="ml-1.5 bg-gray-100 text-gray-500 text-[9px]
                    font-medium px-1.5 py-0.5 rounded-full">
                    {counts[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-4 flex flex-col gap-3">
            {loading ? (
              <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
            ) : proposals.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-3xl mb-3">📋</div>
                <p className="text-sm text-gray-400">No proposals yet</p>
                <button
                  onClick={() => navigate('/find-jobs')}
                  className="mt-3 text-xs text-blue-500 hover:underline">
                  Browse available jobs →
                </button>
              </div>
            ) : (
              proposals.map(p => (
                <div
                  key={p.id}
                  className={`border rounded-xl p-4 transition
                    ${p.status === 'accepted'
                      ? 'border-green-200 bg-green-50/30'
                      : p.status === 'rejected'
                      ? 'border-gray-100 opacity-70'
                      : 'border-gray-100 hover:border-blue-200'}`}>

                  {/* Top row */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-semibold text-[#0a1628]">
                        {p.task_title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Applied {new Date(p.created_at).toLocaleDateString()} ·{' '}
                        ${parseFloat(p.task_budget).toFixed(0)}{' '}
                        {p.task_type} · {p.posted_by}
                      </p>
                    </div>
                    <StatusPill status={p.status} />
                  </div>

                  {/* Cover note */}
                  {p.cover_note && (
                    <div className="bg-gray-50 border-l-2 border-gray-200
                      rounded-r-lg px-3 py-2 mb-3">
                      <p className="text-xs text-gray-500 italic leading-relaxed">
                        "{p.cover_note}"
                      </p>
                    </div>
                  )}

                  {/* Status messages */}
                  {p.status === 'accepted' && (
                    <div className="bg-green-50 border border-green-200
                      rounded-lg px-3 py-2 mb-3">
                      <p className="text-xs text-green-700 font-medium">
                        🎉 You have been accepted!
                      </p>
                      <p className="text-xs text-green-600 mt-0.5">
                        Go to Ongoing Jobs to start working.
                      </p>
                    </div>
                  )}

                  {p.status === 'rejected' && p.admin_note && (
                    <div className="bg-red-50 border border-red-200
                      rounded-lg px-3 py-2 mb-3">
                      <p className="text-xs text-red-600">{p.admin_note}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {p.status === 'accepted' && (
                      <button
                        onClick={() => navigate('/dashboard')}
                        className="text-xs font-medium bg-[#0a1628] text-white
                          px-4 py-1.5 rounded-lg hover:bg-[#1e3a5f] transition">
                        Go to Job →
                      </button>
                    )}
                    {p.status === 'pending' && (
                      <button
                        onClick={() => handleWithdraw(p.id)}
                        className="text-xs bg-red-50 text-red-600 border
                          border-red-200 px-4 py-1.5 rounded-lg
                          hover:bg-red-100 transition">
                        Withdraw
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/find-jobs`)}
                      className="text-xs bg-gray-50 text-gray-600 border
                        border-gray-200 px-4 py-1.5 rounded-lg
                        hover:bg-gray-100 transition">
                      View Job
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}