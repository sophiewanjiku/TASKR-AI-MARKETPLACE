import { useState, useEffect } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { getAdminTasks, deleteTask, updateTask } from '../../api/adminApi';
import { useNavigate } from 'react-router-dom';

const StatusPill = ({ published }) => (
  <span className={`text-[10px] font-medium px-2 py-1 rounded-full
    ${published ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
    {published ? 'Published' : 'Draft'}
  </span>
);

export default function AllTasks() {
  const navigate = useNavigate();
  const [tasks, setTasks]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const data = await getAdminTasks();
      setTasks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Delete this task? This cannot be undone.')) return;
    try {
      await deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePublish = async (task) => {
    try {
      const updated = await updateTask(task.id, { is_published: !task.is_published });
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_published: updated.is_published } : t));
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = tasks.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter ? t.category === filter : true;
    return matchSearch && matchFilter;
  });

  return (
    <div className="flex h-screen bg-[#f0f2f5] overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[#0a1628]">All Tasks</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Manage all tasks on the platform
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/upload')}
            className="bg-[#0a1628] text-white text-xs font-medium px-4 py-2
              rounded-lg hover:bg-[#1e3a5f] transition">
            + Upload Task
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2
              text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm
              bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">All categories</option>
            <option value="labeling">Data Labeling</option>
            <option value="transcription">Transcription</option>
            <option value="verification">Verification</option>
            <option value="annotation">Annotation</option>
            <option value="review">Dataset Review</option>
          </select>
        </div>

        {/* Tasks table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No tasks found</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  {['Title', 'Category', 'Budget', 'Type', 'Proposals', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left text-[10px] font-medium
                      text-gray-400 uppercase tracking-wide pb-2
                      border-b border-gray-50">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(task => (
                  <tr key={task.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="py-3 text-xs font-medium text-[#0a1628]
                      max-w-[180px] truncate">
                      {task.title}
                    </td>
                    <td className="py-3 text-xs text-gray-400 capitalize">
                      {task.category}
                    </td>
                    <td className="py-3 text-xs font-semibold text-[#0a1628]">
                      ${parseFloat(task.budget).toFixed(0)}
                    </td>
                    <td className="py-3 text-xs text-gray-400 capitalize">
                      {task.job_type}
                    </td>
                    <td className="py-3 text-xs text-gray-400">
                      {task.proposal_counts?.total || 0}
                    </td>
                    <td className="py-3">
                      <StatusPill published={task.is_published} />
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleTogglePublish(task)}
                          className="text-[10px] text-blue-500 hover:underline">
                          {task.is_published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="text-[10px] text-red-400 hover:underline">
                          Delete
                        </button>
                      </div>
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