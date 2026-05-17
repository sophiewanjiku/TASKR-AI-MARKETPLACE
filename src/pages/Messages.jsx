import { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import { getConversations, getThread, sendMessage } from '../api/messages';

// Format relative time
const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0)  return `${days}d ago`;
  if (hrs > 0)   return `${hrs}h ago`;
  if (mins > 0)  return `${mins}m ago`;
  return 'Just now';
};

export default function Messages() {
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv]       = useState(null);
  const [thread, setThread]               = useState([]);
  const [newMsg, setNewMsg]               = useState('');
  const [loading, setLoading]             = useState(true);
  const [sending, setSending]             = useState(false);
  const [search, setSearch]               = useState('');
  const bottomRef                         = useRef(null);

  // Load conversations on mount
  useEffect(() => {
    const load = async () => {
      try {
        const data = await getConversations();
        setConversations(data);
        // Auto-open first conversation
        if (data.length > 0) openConversation(data[0]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  const openConversation = async (conv) => {
    setActiveConv(conv);
    try {
      const data = await getThread(conv.other_user_id);
      setThread(data.messages);
      // Update unread count locally
      setConversations(prev =>
        prev.map(c =>
          c.other_user_id === conv.other_user_id
            ? { ...c, unread_count: 0 }
            : c
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !activeConv) return;
    setSending(true);
    try {
      const msg = await sendMessage(activeConv.other_user_id, newMsg.trim());
      // Append new message to thread
      setThread(prev => [...prev, msg]);
      setNewMsg('');
      // Update latest message in sidebar
      setConversations(prev =>
        prev.map(c =>
          c.other_user_id === activeConv.other_user_id
            ? { ...c, latest_message: newMsg.trim(), latest_time: new Date().toISOString() }
            : c
        )
      );
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  // Get user initials for avatar
  const initials = (name) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

  // Filter conversations by search
  const filteredConvs = conversations.filter(c =>
    c.other_user_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#f0f2f5] overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex overflow-hidden">

        {/* Conversations sidebar */}
        <div className="w-64 flex-shrink-0 bg-white border-r border-gray-100
          flex flex-col overflow-hidden">

          {/* Header */}
          <div className="p-4 border-b border-gray-100">
            <h1 className="text-sm font-semibold text-[#0a1628] mb-3">Messages</h1>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2
                text-xs bg-gray-50 focus:outline-none focus:ring-2
                focus:ring-blue-400 focus:bg-white" />
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="text-xs text-gray-400 text-center py-6">Loading...</p>
            ) : filteredConvs.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">
                No conversations yet
              </p>
            ) : (
              filteredConvs.map(conv => (
                <div
                  key={conv.other_user_id}
                  onClick={() => openConversation(conv)}
                  className={`flex items-start gap-3 p-3 cursor-pointer
                    transition border-l-2
                    ${activeConv?.other_user_id === conv.other_user_id
                      ? 'bg-blue-50/50 border-blue-400'
                      : 'border-transparent hover:bg-gray-50'}`}>

                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-[#0a1628] flex
                    items-center justify-center text-[10px] font-medium
                    text-blue-400 flex-shrink-0">
                    {initials(conv.other_user_name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className={`text-xs truncate
                        ${conv.unread_count > 0 ? 'font-semibold text-[#0a1628]' : 'font-medium text-[#0a1628]'}`}>
                        {conv.other_user_name}
                        {conv.other_is_admin && (
                          <span className="ml-1 text-[9px] bg-blue-100 text-blue-600
                            px-1.5 py-0.5 rounded-full">Admin</span>
                        )}
                      </p>
                      <span className="text-[10px] text-gray-400 flex-shrink-0 ml-1">
                        {timeAgo(conv.latest_time)}
                      </span>
                    </div>
                    {conv.task_title && (
                      <p className="text-[10px] text-blue-400 truncate mb-0.5">
                        Re: {conv.task_title}
                      </p>
                    )}
                    <p className="text-[11px] text-gray-400 truncate">
                      {conv.latest_message}
                    </p>
                  </div>

                  {/* Unread badge */}
                  {conv.unread_count > 0 && (
                    <div className="w-4 h-4 rounded-full bg-blue-500 flex
                      items-center justify-center flex-shrink-0">
                      <span className="text-[9px] text-white font-medium">
                        {conv.unread_count}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat area */}
        {activeConv ? (
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Chat header */}
            <div className="bg-white border-b border-gray-100 px-5 py-3
              flex items-center gap-3 flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-[#0a1628] flex
                items-center justify-center text-[10px] font-medium text-blue-400">
                {initials(activeConv.other_user_name)}
              </div>
              <div>
                <p className="text-sm font-medium text-[#0a1628]">
                  {activeConv.other_user_name}
                  {activeConv.other_is_admin && (
                    <span className="ml-2 text-[9px] bg-blue-100 text-blue-600
                      px-1.5 py-0.5 rounded-full">Admin</span>
                  )}
                </p>
                <p className="text-xs text-green-500">● Online</p>
              </div>
              {activeConv.task_title && (
                <div className="ml-auto text-xs text-gray-400 bg-gray-50
                  border border-gray-100 rounded-lg px-3 py-1.5">
                  Re: {activeConv.task_title}
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 bg-[#f8f9fa]
              flex flex-col gap-4">
              {thread.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">
                  No messages yet — say hello!
                </p>
              ) : (
                thread.map(msg => (
                  <div key={msg.id}
                    className={`flex gap-2 items-end
                      ${msg.is_mine ? 'flex-row-reverse' : 'flex-row'}`}>

                    {/* Avatar */}
                    <div className={`w-6 h-6 rounded-full flex items-center
                      justify-content text-[9px] font-medium flex-shrink-0
                      flex items-center justify-center
                      ${msg.is_mine ? 'bg-[#0a1628] text-blue-400' : 'bg-[#1e3a5f] text-blue-300'}`}>
                      {initials(msg.sender_name)}
                    </div>

                    <div className={`max-w-xs ${msg.is_mine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      {/* Bubble */}
                      <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed
                        ${msg.is_mine
                          ? 'bg-[#0a1628] text-white rounded-br-sm'
                          : 'bg-white text-[#0a1628] border border-gray-100 rounded-bl-sm shadow-sm'}`}>
                        {msg.body}
                      </div>
                      {/* Time */}
                      <span className="text-[10px] text-gray-400 px-1">
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: '2-digit', minute: '2-digit'
                        })}
                        {msg.is_mine && ' ✓'}
                      </span>
                    </div>
                  </div>
                ))
              )}
              {/* Scroll anchor */}
              <div ref={bottomRef} />
            </div>

            {/* Message input */}
            <form onSubmit={handleSend}
              className="bg-white border-t border-gray-100 px-4 py-3
                flex items-center gap-3 flex-shrink-0">
              <input
                type="text"
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 border border-gray-200 rounded-full px-4 py-2
                  text-sm bg-gray-50 focus:outline-none focus:ring-2
                  focus:ring-blue-400 focus:bg-white" />
              <button
                type="submit"
                disabled={sending || !newMsg.trim()}
                className="bg-[#0a1628] text-white text-xs font-medium
                  px-5 py-2 rounded-full hover:bg-[#1e3a5f] transition
                  disabled:opacity-50">
                {sending ? '...' : 'Send'}
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#f8f9fa]">
            <div className="text-center">
              <div className="text-4xl mb-3">💬</div>
              <p className="text-sm text-gray-400">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}