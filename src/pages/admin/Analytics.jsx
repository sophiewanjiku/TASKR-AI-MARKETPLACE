import { useState, useEffect } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { getAnalytics } from '../../api/adminApi';

// Simple SVG bar chart
const BarChart = ({ data, color = '#0a1628', label }) => {
  if (!data || Object.keys(data).length === 0) return (
    <p className="text-xs text-gray-400 text-center py-6">No data yet</p>
  );
  const entries = Object.entries(data);
  const max     = Math.max(...entries.map(([, v]) => v));
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-3">{label}</p>
      <div className="flex items-end gap-2 h-28">
        {entries.slice(-8).map(([key, val], i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[9px] text-gray-400">{val}</span>
            <div
              className="w-full rounded-t-sm transition-all"
              style={{
                height:     `${(val / max) * 100}%`,
                background: color,
                minHeight:  '4px',
              }} />
            <span className="text-[9px] text-gray-400 truncate w-full text-center">
              {key.split(' ')[0]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function Analytics() {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await getAnalytics();
        setData(result);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#f0f2f5]">
      <p className="text-sm text-gray-400">Loading analytics...</p>
    </div>
  );

  const totals = data?.totals || {};

  return (
    <div className="flex h-screen bg-[#f0f2f5] overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[#0a1628]">Analytics</h1>
          <p className="text-sm text-gray-400 mt-0.5">Platform performance overview</p>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[
            { label: 'Total Users',       value: totals.users,       sub: 'Registered' },
            { label: 'Total Tasks',       value: totals.tasks,       sub: 'Published' },
            { label: 'Total Proposals',   value: totals.proposals,   sub: 'Submitted' },
            { label: 'Submissions',       value: totals.submissions, sub: 'Received' },
            { label: 'Total Revenue',     value: `$${totals.revenue?.toFixed(0) || 0}`, sub: 'Paid out' },
            { label: 'Avg Accuracy',      value: `${data?.avg_accuracy || 0}%`, sub: 'Platform avg' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-1">{s.label}</p>
              <p className="text-2xl font-semibold text-[#0a1628]">{s.value}</p>
              <p className="text-xs text-blue-400 mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* User growth chart */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h2 className="text-sm font-semibold text-[#0a1628] mb-4">User Growth</h2>
            <BarChart data={data?.user_growth} color="#0a1628" label="New users per month" />
          </div>

          {/* Revenue chart */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h2 className="text-sm font-semibold text-[#0a1628] mb-4">Monthly Revenue</h2>
            <BarChart data={data?.revenue} color="#4a90d9" label="KES paid out per month" />
          </div>
        </div>

        {/* Category breakdown */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-sm font-semibold text-[#0a1628] mb-4">Task Categories</h2>
          {data?.categories && Object.entries(data.categories).map(([cat, count]) => {
            const max = Math.max(...Object.values(data.categories));
            return (
              <div key={cat} className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span className="capitalize">{cat}</span>
                  <span className="font-medium text-[#0a1628]">{count} tasks</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0a1628] rounded-full"
                    style={{ width: `${(count / max) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}