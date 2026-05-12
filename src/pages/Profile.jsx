import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import {
  getProfile, updateProfile, addEducation, deleteEducation,
  addExperience, deleteExperience, changeEmail,
  changePassword, deleteAccount
} from '../api/profile';
import { useNavigate } from 'react-router-dom';

// ── Tab button ──
const Tab = ({ label, active, onClick }) => (
  <button onClick={onClick}
    className={`text-xs px-4 py-2.5 border-b-2 transition whitespace-nowrap
      ${active
        ? 'border-[#0a1628] text-[#0a1628] font-medium'
        : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
    {label}
  </button>
);

// ── Field wrapper ──
const Field = ({ label, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-medium text-gray-500">{label}</label>
    {children}
  </div>
);

export default function Profile() {
  const navigate    = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState(null);
  const [error, setError]         = useState(null);

  // Profile data
  const [user, setUser]         = useState({});
  const [profile, setProfileData] = useState({});
  const [education, setEducation] = useState([]);
  const [experience, setExperience] = useState([]);

  // Edit fields
  const [editInfo, setEditInfo] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [skillsInput, setSkillsInput] = useState('');

  // Account management fields
  const [emailForm, setEmailForm]     = useState({ email: '', password: '' });
  const [pwForm, setPwForm]           = useState({ old_password: '', new_password: '', confirm: '' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Education / Experience add forms
  const [newEdu, setNewEdu] = useState({ degree: '', institution: '', year: '', grade: '' });
  const [newExp, setNewExp] = useState({ job_title: '', company: '', from_date: '', to_date: '', description: '' });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getProfile();
        setUser(data.user);
        setProfileData(data.profile);
        setEducation(data.profile.education || []);
        setExperience(data.profile.experience || []);
        setEditInfo({
          full_name:      data.user.full_name,
          location:       data.profile.location,
          about:          data.profile.about,
          date_of_birth:  data.profile.date_of_birth,
        });
        setSkillsInput(data.profile.skills || '');
        if (data.profile.photo_url) setPhotoPreview(data.profile.photo_url);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const showMsg = (text, isError = false) => {
    isError ? setError(text) : setMsg(text);
    setTimeout(() => { setMsg(null); setError(null); }, 4000);
  };

  // Save basic profile info
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(editInfo).forEach(([k, v]) => v && fd.append(k, v));
      fd.append('skills', skillsInput);
      if (photoFile) fd.append('photo', photoFile);
      await updateProfile(fd);
      showMsg('Profile updated successfully');
    } catch (err) {
      showMsg(err.error || 'Failed to save', true);
    } finally {
      setSaving(false);
    }
  };

  // Add education
  const handleAddEdu = async () => {
    if (!newEdu.degree || !newEdu.institution) return;
    try {
      const result = await addEducation(newEdu);
      setEducation(prev => [...prev, { ...newEdu, id: result.id }]);
      setNewEdu({ degree: '', institution: '', year: '', grade: '' });
      showMsg('Education added');
    } catch (err) {
      showMsg('Failed to add education', true);
    }
  };

  // Delete education
  const handleDeleteEdu = async (id) => {
    try {
      await deleteEducation(id);
      setEducation(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      showMsg('Failed to delete', true);
    }
  };

  // Add experience
  const handleAddExp = async () => {
    if (!newExp.job_title || !newExp.company) return;
    try {
      const result = await addExperience(newExp);
      setExperience(prev => [...prev, { ...newExp, id: result.id }]);
      setNewExp({ job_title: '', company: '', from_date: '', to_date: '', description: '' });
      showMsg('Experience added');
    } catch (err) {
      showMsg('Failed to add experience', true);
    }
  };

  // Delete experience
  const handleDeleteExp = async (id) => {
    try {
      await deleteExperience(id);
      setExperience(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      showMsg('Failed to delete', true);
    }
  };

  // Change email
  const handleChangeEmail = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await changeEmail(emailForm.email, emailForm.password);
      showMsg('Email updated — please verify your new address');
      setEmailForm({ email: '', password: '' });
    } catch (err) {
      showMsg(err.error || 'Failed to update email', true);
    } finally {
      setSaving(false);
    }
  };

  // Change password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) {
      return showMsg('New passwords do not match', true);
    }
    setSaving(true);
    try {
      await changePassword(pwForm.old_password, pwForm.new_password);
      showMsg('Password changed successfully');
      setPwForm({ old_password: '', new_password: '', confirm: '' });
    } catch (err) {
      showMsg(err.error || 'Failed to change password', true);
    } finally {
      setSaving(false);
    }
  };

  // Delete account
  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      localStorage.clear();
      navigate('/register');
    } catch (err) {
      showMsg('Failed to delete account', true);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#f0f2f5]">
      <p className="text-sm text-gray-400">Loading profile...</p>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f0f2f5] overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-6">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[#0a1628]">My Profile</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Manage your account and profile details
            </p>
          </div>
          {!profile.is_complete && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl
              px-4 py-2 flex items-center gap-3">
              <span className="text-xs text-amber-700">
                ⚠️ Your profile is incomplete — complete it to be assigned tasks
              </span>
              <button
                onClick={() => navigate('/setup/profile')}
                className="text-xs font-medium bg-amber-500 text-white px-3
                  py-1.5 rounded-lg hover:bg-amber-600 transition">
                Complete Profile
              </button>
            </div>
          )}
        </div>

        {/* Toast messages */}
        {msg && (
          <div className="bg-green-50 border border-green-200 text-green-700
            rounded-xl p-3 mb-4 text-sm">
            {msg}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600
            rounded-xl p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Profile header card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-[#0a1628] flex
                items-center justify-center text-blue-400 font-semibold text-xl
                overflow-hidden flex-shrink-0">
                {photoPreview
                  ? <img src={photoPreview} alt="avatar"
                      className="w-full h-full object-cover" />
                  : user.full_name?.[0]}
              </div>
              <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500
                rounded-full flex items-center justify-center cursor-pointer
                hover:bg-blue-600 transition">
                <span className="text-white text-xs">✎</span>
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => {
                    const f = e.target.files[0];
                    setPhotoFile(f);
                    setPhotoPreview(URL.createObjectURL(f));
                  }} />
              </label>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[#0a1628]">
                  {user.full_name}
                </h2>
                {user.is_verified && (
                  <span className="text-[10px] bg-green-50 text-green-700
                    font-medium px-2 py-0.5 rounded-full border border-green-200">
                    ✓ Verified
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400">{user.email}</p>
              {profile.location && (
                <p className="text-xs text-gray-400 mt-0.5">📍 {profile.location}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Profile completion</p>
              <p className={`text-sm font-semibold mt-0.5
                ${profile.is_complete ? 'text-green-600' : 'text-amber-500'}`}>
                {profile.is_complete ? '100% Complete' : `${profile.onboarding_step * 14}%`}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100 px-4 overflow-x-auto">
            {['profile', 'education', 'experience', 'account'].map(tab => (
              <Tab key={tab} label={tab.charAt(0).toUpperCase() + tab.slice(1)}
                active={activeTab === tab}
                onClick={() => setActiveTab(tab)} />
            ))}
          </div>

          <div className="p-5">

            {/* ── Profile tab ── */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Full Name">
                    <input type="text" value={editInfo.full_name || ''}
                      onChange={e => setEditInfo({...editInfo, full_name: e.target.value})}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm
                        focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
                  </Field>
                  <Field label="Date of Birth">
                    <input type="date" value={editInfo.date_of_birth || ''}
                      onChange={e => setEditInfo({...editInfo, date_of_birth: e.target.value})}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm
                        focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
                  </Field>
                </div>
                <Field label="Location">
                  <input type="text" value={editInfo.location || ''}
                    onChange={e => setEditInfo({...editInfo, location: e.target.value})}
                    placeholder="e.g. Nairobi, Kenya"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
                </Field>
                <Field label="About">
                  <textarea value={editInfo.about || ''}
                    onChange={e => setEditInfo({...editInfo, about: e.target.value})}
                    rows={3} placeholder="A short bio..."
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm
                      resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
                </Field>
                <Field label="Skills (comma separated)">
                  <input type="text" value={skillsInput}
                    onChange={e => setSkillsInput(e.target.value)}
                    placeholder="e.g. Python, Image labeling, Transcription"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
                </Field>
                <button onClick={handleSaveProfile} disabled={saving}
                  className="bg-[#0a1628] text-white text-xs font-medium px-6 py-2.5
                    rounded-lg hover:bg-[#1e3a5f] transition disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}

            {/* ── Education tab ── */}
            {activeTab === 'education' && (
              <div>
                {education.map(edu => (
                  <div key={edu.id} className="flex items-start gap-3 p-3
                    border border-gray-100 rounded-xl mb-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#0a1628]">{edu.degree}</p>
                      <p className="text-xs text-gray-400">{edu.institution} · {edu.year}</p>
                      {edu.grade && <p className="text-xs text-gray-400">{edu.grade}</p>}
                    </div>
                    <button onClick={() => handleDeleteEdu(edu.id)}
                      className="text-xs text-red-400 hover:text-red-600 transition">
                      Remove
                    </button>
                  </div>
                ))}
                <div className="border border-dashed border-gray-200 rounded-xl p-4 mt-2">
                  <p className="text-xs font-medium text-gray-500 mb-3">
                    + Add qualification
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <Field label="Degree">
                      <input type="text" value={newEdu.degree}
                        onChange={e => setNewEdu({...newEdu, degree: e.target.value})}
                        placeholder="BSc Computer Science"
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm
                          focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
                    </Field>
                    <Field label="Institution">
                      <input type="text" value={newEdu.institution}
                        onChange={e => setNewEdu({...newEdu, institution: e.target.value})}
                        placeholder="University of Nairobi"
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm
                          focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
                    </Field>
                    <Field label="Year">
                      <input type="number" value={newEdu.year}
                        onChange={e => setNewEdu({...newEdu, year: e.target.value})}
                        placeholder="2021"
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm
                          focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
                    </Field>
                    <Field label="Grade">
                      <input type="text" value={newEdu.grade}
                        onChange={e => setNewEdu({...newEdu, grade: e.target.value})}
                        placeholder="Second Upper"
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm
                          focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
                    </Field>
                  </div>
                  <button onClick={handleAddEdu}
                    className="text-xs font-medium bg-[#0a1628] text-white px-4
                      py-2 rounded-lg hover:bg-[#1e3a5f] transition">
                    Add Education
                  </button>
                </div>
              </div>
            )}

            {/* ── Experience tab ── */}
            {activeTab === 'experience' && (
              <div>
                {experience.map(exp => (
                  <div key={exp.id} className="flex items-start gap-3 p-3
                    border border-gray-100 rounded-xl mb-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#0a1628]">{exp.job_title}</p>
                      <p className="text-xs text-gray-400">{exp.company}</p>
                      {exp.from_date && (
                        <p className="text-xs text-gray-400">
                          {exp.from_date} → {exp.is_current ? 'Present' : exp.to_date}
                        </p>
                      )}
                    </div>
                    <button onClick={() => handleDeleteExp(exp.id)}
                      className="text-xs text-red-400 hover:text-red-600 transition">
                      Remove
                    </button>
                  </div>
                ))}
                <div className="border border-dashed border-gray-200 rounded-xl p-4 mt-2">
                  <p className="text-xs font-medium text-gray-500 mb-3">+ Add experience</p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <Field label="Job Title">
                      <input type="text" value={newExp.job_title}
                        onChange={e => setNewExp({...newExp, job_title: e.target.value})}
                        placeholder="Data Annotator"
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm
                          focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
                    </Field>
                    <Field label="Company">
                      <input type="text" value={newExp.company}
                        onChange={e => setNewExp({...newExp, company: e.target.value})}
                        placeholder="Remotasks Kenya"
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm
                          focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
                    </Field>
                    <Field label="From">
                      <input type="month" value={newExp.from_date}
                        onChange={e => setNewExp({...newExp, from_date: e.target.value})}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm
                          focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
                    </Field>
                    <Field label="To">
                      <input type="month" value={newExp.to_date}
                        onChange={e => setNewExp({...newExp, to_date: e.target.value})}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm
                          focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
                    </Field>
                  </div>
                  <Field label="Description">
                    <textarea value={newExp.description}
                      onChange={e => setNewExp({...newExp, description: e.target.value})}
                      rows={2} placeholder="Brief description..."
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm
                        resize-none focus:outline-none focus:ring-2 focus:ring-blue-400
                        bg-gray-50 mb-3" />
                  </Field>
                  <button onClick={handleAddExp}
                    className="text-xs font-medium bg-[#0a1628] text-white px-4
                      py-2 rounded-lg hover:bg-[#1e3a5f] transition">
                    Add Experience
                  </button>
                </div>
              </div>
            )}

            {/* ── Account tab ── */}
            {activeTab === 'account' && (
              <div className="space-y-5">

                {/* Change email */}
                <div>
                  <h3 className="text-sm font-semibold text-[#0a1628] mb-3">
                    Change Email
                  </h3>
                  <form onSubmit={handleChangeEmail} className="space-y-3">
                    <Field label="New Email Address">
                      <input type="email" value={emailForm.email}
                        onChange={e => setEmailForm({...emailForm, email: e.target.value})}
                        required placeholder="new@email.com"
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm
                          focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
                    </Field>
                    <Field label="Current Password (to confirm)">
                      <input type="password" value={emailForm.password}
                        onChange={e => setEmailForm({...emailForm, password: e.target.value})}
                        required placeholder="Enter your password"
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm
                          focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
                    </Field>
                    <button type="submit" disabled={saving}
                      className="text-xs font-medium bg-[#0a1628] text-white px-4 py-2
                        rounded-lg hover:bg-[#1e3a5f] transition disabled:opacity-50">
                      Update Email
                    </button>
                  </form>
                </div>

                <div className="border-t border-gray-100 pt-5">
                  <h3 className="text-sm font-semibold text-[#0a1628] mb-3">
                    Change Password
                  </h3>
                  <form onSubmit={handleChangePassword} className="space-y-3">
                    <Field label="Current Password">
                      <input type="password" value={pwForm.old_password}
                        onChange={e => setPwForm({...pwForm, old_password: e.target.value})}
                        required placeholder="Current password"
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm
                          focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
                    </Field>
                    <Field label="New Password">
                      <input type="password" value={pwForm.new_password}
                        onChange={e => setPwForm({...pwForm, new_password: e.target.value})}
                        required placeholder="Min 8 characters"
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm
                          focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
                    </Field>
                    <Field label="Confirm New Password">
                      <input type="password" value={pwForm.confirm}
                        onChange={e => setPwForm({...pwForm, confirm: e.target.value})}
                        required placeholder="Repeat new password"
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm
                          focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
                    </Field>
                    <button type="submit" disabled={saving}
                      className="text-xs font-medium bg-[#0a1628] text-white px-4 py-2
                        rounded-lg hover:bg-[#1e3a5f] transition disabled:opacity-50">
                      Change Password
                    </button>
                  </form>
                </div>

                {/* Danger zone */}
                <div className="border-t border-red-100 pt-5">
                  <h3 className="text-sm font-semibold text-red-600 mb-1">
                    Danger Zone
                  </h3>
                  <p className="text-xs text-gray-400 mb-3">
                    Permanently delete your account and all associated data.
                    This cannot be undone.
                  </p>
                  {!showDeleteConfirm ? (
                    <button onClick={() => setShowDeleteConfirm(true)}
                      className="text-xs font-medium bg-red-50 text-red-600
                        border border-red-200 px-4 py-2 rounded-lg
                        hover:bg-red-100 transition">
                      Delete Account
                    </button>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-xs font-medium text-red-700 mb-3">
                        Are you sure? This will permanently delete everything.
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => setShowDeleteConfirm(false)}
                          className="text-xs text-gray-500 border border-gray-200
                            px-4 py-2 rounded-lg hover:bg-gray-50 transition">
                          Cancel
                        </button>
                        <button onClick={handleDeleteAccount}
                          className="text-xs font-medium bg-red-600 text-white
                            px-4 py-2 rounded-lg hover:bg-red-700 transition">
                          Yes, delete my account
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}