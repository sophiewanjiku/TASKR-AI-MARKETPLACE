import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getInvoices } from '../api/reports';

// ── Earnings line chart — pure SVG, no library needed ──
const EarningsChart = ({ data }) => {
  if (!data || Object.keys(data).length === 0) return (
    <div className="flex items-center justify-center h-32 text-sm text-gray-400">
      No earnings data yet
    </div>
  );

  const entries  = Object.entries(data); // [["Nov 2025", 120], ...]
  const values   = entries.map(([, v]) => v);
  const maxVal   = Math.max(...values);
  const minVal   = 0;
  const width    = 500;
  const height   = 120;
  const padLeft  = 40;
  const padRight = 20;
  const padTop   = 15;
  const padBot   = 25;
  const chartW   = width - padLeft - padRight;
  const chartH   = height - padTop - padBot;

  // Convert data values to SVG coordinates
  const points = entries.map(([, v], i) => {
    const x = padLeft + (i / (entries.length - 1)) * chartW;
    const y = padTop + (1 - (v - minVal) / (maxVal - minVal || 1)) * chartH;
    return { x, y };
  });

  // Build SVG path string
  const linePath = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`
  ).join(' ');

  // Area fill path — closes below the line
  const areaPath = linePath +
    ` L${points[points.length - 1].x},${padTop + chartH}` +
    ` L${points[0].x},${padTop + chartH} Z`;

  // Y-axis grid labels
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(pct => ({
    y:     padTop + (1 - pct) * chartH,
    label: `$${Math.round(maxVal * pct)}`,
  }));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: 140 }}>
      {/* Grid lines */}
      {gridLines.map((g, i) => (
        <g key={i}>
          <line x1={padLeft} y1={g.y} x2={width - padRight} y2={g.y}
            stroke="#f0f2f5" strokeWidth="1" />
          <text x={padLeft - 4} y={g.y + 3} fontSize="8"
            fill="#9ca3af" textAnchor="end">{g.label}</text>
        </g>
      ))}

      {/* Area fill */}
      <path d={areaPath} fill="#4a90d9" fillOpacity="0.08" />

      {/* Line */}
      <path d={linePath} fill="none" stroke="#0a1628" strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round" />

      {/* Dots + tooltips */}
      {points.map((p, i) => {
        const isMax = values[i] === maxVal;
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={isMax ? 5 : 3.5}
              fill={isMax ? '#4a90d9' : '#0a1628'}
              stroke="white" strokeWidth={isMax ? 2 : 1} />
            {isMax && (
              <g>
                <rect x={p.x - 22} y={p.y - 22} width={44} height={15}
                  rx="4" fill="#0a1628" />
                <text x={p.x} y={p.y - 11} fontSize="8" fill="white"
                  textAnchor="middle">${values[i]}</text>
              </g>
            )}
            {/* X-axis labels */}
            <text x={p.x} y={height - 4} fontSize="8" fill="#9ca3af"
              textAnchor="middle">
              {entries[i][0].split(' ')[0]}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// ── Status pill ──
const StatusPill = ({ status }) => {
  const styles = {
    paid:    'bg-green-50 text-green-700',
    pending: 'bg-amber-50 text-amber-700',
  };
  return (
    <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export default function Invoices() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange]     = useState('6'); // months to show on chart

  useEffect(() => {
    const load = async () => {
      try {
        const result = await getInvoices();
        setData(result);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Slice chart data based on selected range
  const chartData = data?.monthly_chart
    ? Object.fromEntries(
        Object.entries(data.monthly_chart).slice(-parseInt(range))
      )
    : {};

  // Export invoices as CSV
  const handleExport = () => {
    if (!data?.invoices) return;
    const rows = [
      ['Invoice', 'Period', 'Tasks', 'Amount', 'Status'],
      ...data.invoices.map(inv => [
        inv.number, inv.period, inv.tasks, `$${inv.amount}`, inv.status
      ])
    ];
    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'taskr-invoices.csv';
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
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-6">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[#0a1628]">Invoices & Reports</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Your full earnings history and downloadable invoices
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={range}
              onChange={e => setRange(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-2
                bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="3">Last 3 months</option>
              <option value="6">Last 6 months</option>
              <option value="12">This year</option>
            </select>
            <button
              onClick={handleExport}
              className="bg-[#0a1628] text-white text-xs font-medium px-4 py-2
                rounded-lg hover:bg-[#1e3a5f] transition">
              Export CSV
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4 mb-5">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Total Earned</p>
            <p className="text-2xl font-semibold text-[#0a1628]">
              ${summary.total_earned?.toFixed(2) || '0.00'}
            </p>
            <p className="text-xs text-green-500 mt-1">All time</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">This Month</p>
            <p className="text-2xl font-semibold text-[#0a1628]">
              ${summary.this_month?.toFixed(2) || '0.00'}
            </p>
            <p className="text-xs text-blue-400 mt-1">Current period</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Avg per Task</p>
            <p className="text-2xl font-semibold text-[#0a1628]">
              ${summary.avg_per_task?.toFixed(2) || '0.00'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Per completed job</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Best Month</p>
            <p className="text-2xl font-semibold text-[#0a1628]">
              ${summary.best_month_val?.toFixed(2) || '0.00'}
            </p>
            <p className="text-xs text-gray-400 mt-1">{summary.best_month || '—'}</p>
          </div>
        </div>

        {/* Earnings chart */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-[#0a1628]">Monthly Earnings</h2>
            <p className="text-xs text-gray-400">
              {Object.keys(chartData).length} months shown
            </p>
          </div>
          <EarningsChart data={chartData} />
        </div>

        {/* Invoices table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#0a1628]">Invoices</h2>
            <p className="text-xs text-gray-400">
              {data?.invoices?.length || 0} invoices
            </p>
          </div>

          {!data?.invoices?.length ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No invoices yet — complete tasks to generate your first invoice!
            </p>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  {['Invoice', 'Period', 'Tasks', 'Amount', 'Status', ''].map(h => (
                    <th key={h} className="text-left text-[10px] font-medium
                      text-gray-400 uppercase tracking-wide pb-2
                      border-b border-gray-50">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((inv, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 text-xs font-semibold text-[#0a1628] font-mono">
                      #{inv.number}
                    </td>
                    <td className="py-3 text-xs text-gray-400">{inv.period}</td>
                    <td className="py-3 text-xs text-gray-400">{inv.tasks} tasks</td>
                    <td className="py-3 text-xs font-semibold text-[#0a1628]">
                      ${inv.amount.toFixed(2)}
                    </td>
                    <td className="py-3"><StatusPill status={inv.status} /></td>
                    <td className="py-3">
                      {/* Download single invoice as CSV */}
                      <button
                        onClick={() => {
                          const csv  = `Invoice,${inv.number}\nPeriod,${inv.period}\nTasks,${inv.tasks}\nAmount,$${inv.amount}\nStatus,${inv.status}`;
                          const blob = new Blob([csv], { type: 'text/csv' });
                          const url  = URL.createObjectURL(blob);
                          const a    = document.createElement('a');
                          a.href     = url;
                          a.download = `${inv.number}.csv`;
                          a.click();
                        }}
                        className="text-xs text-blue-500 hover:underline">
                        Download
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