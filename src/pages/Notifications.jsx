import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getNotifications, markAsRead } from '../api/notifications';

// ── Icon and color per notification type ──
const NotifIcon = ({ type }) => {
  const config = {
    payment: { emoji: '💰', bg: 'bg-green-50' },
    task:    { emoji: '✅', bg: 'bg-blue-50' },
    message: { emoji: '💬', bg: 'bg-purple-50' },
    system:  { emoji: '🔔', bg: 'bg-gray-100' },
  };
  const { emoji, bg } = config[type] || config.system;
  return (
    <div className={`w-9 h-9 rounded-full ${bg} flex items-center
      justify-center text-base flex-shrink-0`}>
      {emoji}
    </div>
  );
};

const TABS = [
  { key: '',        label: 'All' },
  { key: 'payment', label: 'Payments' },
  { key: 'task',    label: 'Tasks' },
  { key: 'message', label: 'Messages' },
  { key: 'system',  label: 'System' },
];

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [activeTab, setActiveTab]         = useState('');
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    loadNotifications();
  }, [activeTab]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await getNotifications(activeTab);
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Mark a single notification as read on click
  const handleRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await markAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  // Format relative time e.g. "2 hours ago"
  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs  = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (days > 0)  return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hrs > 0)   return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
    if (mins > 0)  return `${mins} min${mins > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  // Filter unread for the tab count
  const unreadInTab = notifications.filter(n => !n.is_read).length;

  return (
    <div className="flex h-screen bg-[#f0f2f5] overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-6">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-[#0a1628]">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <span className="bg-blue-500 text-white text-[10px] font-medium
                  px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-0.5">
              Stay up to date with your activity
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-blue-500 border border-blue-200 bg-blue-50
                px-4 py-2 rounded-lg hover:bg-blue-100 transition">
              Mark all read
            </button>
          )}
        </div>

        {/* Main card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Tabs */}
          <div className="flex border-b border-gray-100 px-4 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`text-xs px-4 py-3 border-b-2 transition whitespace-nowrap
                  ${activeTab === tab.key
                    ? 'border-[#0a1628] text-[#0a1628] font-medium'
                    : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                {tab.label}
                {tab.key === '' && unreadInTab > 0 && (
                  <span className="ml-1.5 bg-blue-100 text-blue-600 text-[9px]
                    font-medium px-1.5 py-0.5 rounded-full">
                    {unreadInTab}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Notification list */}
          <div className="divide-y divide-gray-50">
            {loading ? (
              <p className="text-sm text-gray-400 text-center py-10">Loading...</p>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-3xl mb-2">🔔</div>
                <p className="text-sm text-gray-400">No notifications yet</p>
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => !notif.is_read && handleRead(notif.id)}
                  className={`flex items-start gap-3 p-4 transition cursor-pointer
                    hover:bg-gray-50
                    ${!notif.is_read ? 'bg-blue-50/30' : ''}`}>

                  <NotifIcon type={notif.type} />

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm text-[#0a1628]
                      ${!notif.is_read ? 'font-semibold' : 'font-medium'}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                      {notif.body}
                    </p>
                    <p className="text-[11px] text-gray-300 mt-1">
                      {timeAgo(notif.created_at)}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!notif.is_read && (
                    <div className="w-2 h-2 rounded-full bg-blue-500
                      flex-shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}