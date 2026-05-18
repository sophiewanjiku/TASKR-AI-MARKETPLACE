import { useState, useEffect } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { getSettings, updateSettings } from '../../api/adminApi';

const Toggle = ({ label, sub, checked, onChange }) => (
  <div className="flex items-center justify-between py-3
    border-b border-gray-50 last:border-0">
    <div>
      <p className="text-sm text-[#0a1628]">{label}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onChange}
        className="sr-only peer" />
      <div className="w-9 h-5 bg-gray-200 peer-checked:bg-[#0a1628]
        rounded-full transition-colors after:content-[''] after:absolute
        after:top-0.5 after:left-0.5 after:bg-white after:rounded-full
        after:w-4 after:h-4 after:transition-all peer-checked:after:translate-x-4" />
    </label>
  </div>
);

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getSettings();
        setSettings(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(settings);
      setMsg('Settings saved successfully');
      setTimeout(() => setMsg(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#f0f2f5]">
      <p className="text-sm text-gray-400">Loading settings...</p>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f0f2f5] overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[#0a1628]">Settings</h1>
            <p className="text-sm text-gray-400 mt-0.5">Platform configuration</p>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="bg-[#0a1628] text-white text-xs font-medium px-4 py-2
              rounded-lg hover:bg-[#1e3a5f] transition disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {msg && (
          <div className="bg-green-50 border border-green-200 text-green-700
            rounded-xl p-3 mb-4 text-sm">
            {msg}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">

          {/* General */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-[#0a1628] mb-4">General</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Platform Name
                </label>
                <input type="text" value={settings.platform_name || ''}
                  onChange={e => setSettings({...settings, platform_name: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Support Email
                </label>
                <input type="email" value={settings.support_email || ''}
                  onChange={e => setSettings({...settings, support_email: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Min Accuracy Threshold (%)
                </label>
                <input type="number" min="0" max="100"
                  value={settings.min_accuracy_threshold || 70}
                  onChange={e => setSettings({
                    ...settings,
                    min_accuracy_threshold: parseInt(e.target.value)
                  })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Max Proposals per Task
                </label>
                <input type="number" min="1"
                  value={settings.max_proposals_per_task || 50}
                  onChange={e => setSettings({
                    ...settings,
                    max_proposals_per_task: parseInt(e.target.value)
                  })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-[#0a1628] mb-4">
              Platform Rules
            </h2>
            <Toggle
              label="Auto Payout"
              sub="Automatically send payouts when submissions are approved"
              checked={settings.auto_payout || false}
              onChange={e => setSettings({...settings, auto_payout: e.target.checked})}
            />
            <Toggle
              label="Require Profile Completion"
              sub="Users must complete their profile before applying to tasks"
              checked={settings.require_profile_complete || true}
              onChange={e => setSettings({
                ...settings,
                require_profile_complete: e.target.checked
              })}
            />
          </div>
        </div>
      </main>
    </div>
  );
}