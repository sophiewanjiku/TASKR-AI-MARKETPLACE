import { useState, useEffect } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { getVerificationQueue, verifyUser } from '../../api/adminApi';

export default function VerificationQueue() {
  const [queue, setQueue]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg]         = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const data = await getVerificationQueue();
      setQueue(data.queue);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handle = async (userId, action) => {
    try {
      await verifyUser(userId, action);
      setQueue(prev => prev.filter(u => u.user_id !== userId));
      setMsg(`User ${action === 'verify' ? 'verified' : 'unverified'} successfully`);
      setTimeout(() => setMsg(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-screen bg-[#f0f2f5] overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[#0a1628]">Verification Queue</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {queue.length} user{queue.length !== 1 ? 's' : ''} awaiting verification
          </p>
        </div>

        {msg && (
          <div className="bg-green-50 border border-green-200 text-green-700
            rounded-xl p-3 mb-4 text-sm">
            {msg}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
          ) : queue.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
              <div className="text-3xl mb-2">✅</div>
              <p className="text-sm text-gray-400">All users verified — queue is empty!</p>
            </div>
          ) : (
            queue.map(user => (
              <div key={user.user_id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0a1628] flex
                      items-center justify-center text-sm font-medium text-blue-400">
                      {user.full_name?.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#0a1628]">
                        {user.full_name}
                      </p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                      {user.location && (
                        <p className="text-xs text-gray-400">📍 {user.location}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handle(user.user_id, 'verify')}
                      className="text-xs font-medium bg-green-600 text-white
                        px-4 py-2 rounded-lg hover:bg-green-700 transition">
                      Verify
                    </button>
                    <button
                      onClick={() => handle(user.user_id, 'unverify')}
                      className="text-xs font-medium bg-gray-100 text-gray-600
                        px-4 py-2 rounded-lg hover:bg-gray-200 transition">
                      Reject
                    </button>
                  </div>
                </div>
                {user.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {user.skills.map((s, i) => (
                      <span key={i} className="text-[10px] bg-blue-50 text-blue-600
                        font-medium px-2 py-0.5 rounded-full">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-gray-400 mt-2">
                  Submitted {new Date(user.submitted_at).toLocaleDateString()} ·
                  Terms accepted: {user.terms_accepted ? 'Yes' : 'No'}
                </p>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}