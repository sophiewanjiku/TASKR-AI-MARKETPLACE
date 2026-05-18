import { useState, useEffect } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { fetchAdminUsers, toggleUserActive } from '../../api/admin';
import { getAdminUserDetail } from '../../api/adminApi';

export default function AllUsers() {
  const [users, setUsers]         = useState([]);
  const [selected, setSelected]   = useState(null);
  const [detail, setDetail]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const data = await fetchAdminUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openUser = async (user) => {
    setSelected(user);
    try {
      const data = await getAdminUserDetail(user.id);
      setDetail(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggle = async (userId) => {
    try {
      const result = await toggleUserActive(userId);
      setUsers(prev =>
        prev.map(u => u.id === userId ? { ...u, is_active: result.is_active } : u)
      );
      if (detail?.id === userId) {
        setDetail(prev => ({ ...prev, is_active: result.is_active }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#f0f2f5] overflow-hidden">
      <AdminSidebar />

      <div className="flex-1 flex overflow-hidden">

        {/* Users list */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold text-[#0a1628]">All Users</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {users.length} registered users
              </p>
            </div>
          </div>

          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2
              text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4" />

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            {loading ? (
              <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    {['User', 'Joined', 'Verified', 'Active', 'Actions'].map(h => (
                      <th key={h} className="text-left text-[10px] font-medium
                        text-gray-400 uppercase tracking-wide pb-2
                        border-b border-gray-50">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(user => (
                    <tr key={user.id}
                      className="border-b border-gray-50 last:border-0
                        hover:bg-gray-50/50 cursor-pointer"
                      onClick={() => openUser(user)}>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#0a1628] flex
                            items-center justify-center text-[10px] font-medium
                            text-blue-400 flex-shrink-0">
                            {user.full_name?.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-[#0a1628]">
                              {user.full_name}
                            </p>
                            <p className="text-[10px] text-gray-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-xs text-gray-400">
                        {new Date(user.date_joined).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <span className={`text-[10px] font-medium px-2 py-1 rounded-full
                          ${user.is_verified
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-100 text-gray-500'}`}>
                          {user.is_verified ? 'Verified' : 'Unverified'}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`text-[10px] font-medium px-2 py-1 rounded-full
                          ${user.is_active
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-red-50 text-red-600'}`}>
                          {user.is_active ? 'Active' : 'Flagged'}
                        </span>
                      </td>
                      <td className="py-3" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggle(user.id)}
                          className={`text-[10px] font-medium px-3 py-1.5 rounded-lg
                            transition ${user.is_active
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                          {user.is_active ? 'Flag' : 'Restore'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* User detail panel */}
        {selected && detail && (
          <div className="w-72 flex-shrink-0 bg-white border-l border-gray-100
            overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#0a1628]">User Detail</h2>
              <button onClick={() => { setSelected(null); setDetail(null); }}
                className="text-xs text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {/* Avatar */}
            <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-[#0a1628] flex
                items-center justify-center text-sm font-medium text-blue-400">
                {detail.full_name?.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <p className="text-sm font-medium text-[#0a1628]">{detail.full_name}</p>
                <p className="text-xs text-gray-400">{detail.email}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { label: 'Proposals',  value: detail.stats?.total_proposals },
                { label: 'Accepted',   value: detail.stats?.accepted },
                { label: 'Completed',  value: detail.stats?.completed_tasks },
                { label: 'Earned',     value: `$${detail.stats?.total_earned?.toFixed(0)}` },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-sm font-semibold text-[#0a1628]">{s.value}</p>
                  <p className="text-[10px] text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Profile */}
            {detail.profile && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 mb-2">Profile</p>
                <div className="space-y-1.5">
                  {detail.profile.location && (
                    <p className="text-xs text-gray-400">📍 {detail.profile.location}</p>
                  )}
                  {detail.profile.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {detail.profile.skills.slice(0, 4).map((s, i) => (
                        <span key={i} className="text-[10px] bg-blue-50 text-blue-600
                          px-1.5 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payment */}
            {detail.payment && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 mb-2">Payment Method</p>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <span>📱</span>
                  <div>
                    <p className="text-xs font-medium text-[#0a1628]">
                      {detail.payment.account_name}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {detail.payment.masked_phone}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}