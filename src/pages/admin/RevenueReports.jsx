import { useState, useEffect } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { getRevenue } from '../../api/adminApi';

export default function RevenueReports() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await getRevenue();
        setData(result);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Export as CSV
  const handleExport = () => {
    if (!data?.monthly) return;
    const rows = [
      ['Period', 'Tasks', 'Amount'],
      ...data.monthly.map(m => [m.period, m.count, `$${m.total.toFixed(2)}`])
    ];
    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'revenue-report.csv';
    a.click();
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#f0f2f5]">
      <p className="text-sm text-gray-400">Loading reports...</p>
    </div>
  );

  const summary = data?.summary || {};

  return (
    <div className="flex h-screen bg-[#f0f2f5] overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[#0a1628]">Revenue Reports</h1>
            <p className="text-sm text-gray-400 mt-0.5">Full financial breakdown</p>
          </div>
          <button onClick={handleExport}
            className="bg-[#0a1628] text-white text-xs font-medium px-4 py-2
              rounded-lg hover:bg-[#1e3a5f] transition">
            Export CSV
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Total Paid Out</p>
            <p className="text-2xl font-semibold text-[#0a1628]">
              KES {summary.total_paid?.toFixed(2) || '0.00'}
            </p>
            <p className="text-xs text-green-500 mt-1">All time</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Pending Payouts</p>
            <p className="text-2xl font-semibold text-[#0a1628]">
              KES {summary.total_pending?.toFixed(2) || '0.00'}
            </p>
            <p className="text-xs text-amber-500 mt-1">To be processed</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Workers Paid</p>
            <p className="text-2xl font-semibold text-[#0a1628]">
              {summary.total_workers || 0}
            </p>
            <p className="text-xs text-blue-400 mt-1">Unique workers</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">

          {/* Monthly breakdown */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h2 className="text-sm font-semibold text-[#0a1628] mb-4">
              Monthly Breakdown
            </h2>
            {!data?.monthly?.length ? (
              <p className="text-xs text-gray-400 text-center py-6">No data yet</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    {['Period', 'Tasks', 'Amount'].map(h => (
                      <th key={h} className="text-left text-[10px] font-medium
                        text-gray-400 uppercase tracking-wide pb-2
                        border-b border-gray-50">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.monthly.map((m, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="py-2.5 text-xs font-medium text-[#0a1628]">
                        {m.period}
                      </td>
                      <td className="py-2.5 text-xs text-gray-400">{m.count}</td>
                      <td className="py-2.5 text-xs font-semibold text-[#0a1628]">
                        KES {m.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* By category */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h2 className="text-sm font-semibold text-[#0a1628] mb-4">By Category</h2>
            {data?.by_category?.map((cat, i) => {
              const max = Math.max(...data.by_category.map(c => c.total));
              return (
                <div key={i} className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500 capitalize">{cat.category}</span>
                    <span className="font-medium text-[#0a1628]">
                      KES {cat.total.toFixed(0)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#0a1628] rounded-full"
                      style={{ width: `${(cat.total / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top earners */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-sm font-semibold text-[#0a1628] mb-4">Top Earners</h2>
          {!data?.top_earners?.length ? (
            <p className="text-xs text-gray-400 text-center py-6">No data yet</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  {['Worker', 'Tasks Completed', 'Total Earned'].map(h => (
                    <th key={h} className="text-left text-[10px] font-medium
                      text-gray-400 uppercase tracking-wide pb-2
                      border-b border-gray-50">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.top_earners.map((e, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5">
                      <p className="text-xs font-medium text-[#0a1628]">{e.name}</p>
                      <p className="text-[10px] text-gray-400">{e.email}</p>
                    </td>
                    <td className="py-2.5 text-xs text-gray-400">{e.tasks}</td>
                    <td className="py-2.5 text-xs font-semibold text-[#0a1628]">
                      KES {e.total.toFixed(2)}
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