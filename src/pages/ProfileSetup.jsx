import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  updateProfile, addEducation, addExperience,
  deleteEducation, deleteExperience
} from '../api/profile';

// ── Progress bar at the top ──
const StepBar = ({ current, total }) => (
  <div className="flex gap-1.5">
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300
        ${i < current ? 'bg-white/50' : i === current ? 'bg-blue-400' : 'bg-white/20'}`} />
    ))}
  </div>
);

// ── Reusable field wrapper ──
const Field = ({ label, required, hint, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-medium text-gray-500">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
    {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
  </div>
);

const TOTAL_STEPS = 7;

export default function ProfileSetup() {
  const navigate  = useNavigate();
  const [step, setStep]     = useState(0); // 0-indexed
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  // Step 1 — T&C
  const [tcChecked, setTcChecked]   = useState(false);
  const [ageChecked, setAgeChecked] = useState(false);

  // Step 2 — Personal info
  const [photo, setPhoto]           = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [personalInfo, setPersonalInfo] = useState({
    full_name: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).full_name : '',
    date_of_birth: '',
    location: '',
    about: '',
  });

  // Step 3 — Skills
  const SKILL_OPTIONS = {
    'Data & Annotation': ['Image labeling', 'Text annotation', 'Video annotation', 'Audio labeling', 'Data verification'],
    'Languages & Transcription': ['English', 'Swahili', 'French', 'Arabic', 'Transcription'],
    'Technical': ['Python', 'SQL', 'Excel', 'CVAT', 'JavaScript'],
  };
  const [selectedSkills, setSelectedSkills] = useState([]);

  // Step 4 — Education
  const [educationList, setEducationList]   = useState([]);
  const [newEdu, setNewEdu]                 = useState({ degree: '', institution: '', year: '', grade: '' });

  // Step 5 — Work experience
  const [expList, setExpList]     = useState([]);
  const [newExp, setNewExp]       = useState({ job_title: '', company: '', from_date: '', to_date: '', description: '', is_current: false });

  // Step 6 — CV upload
  const [cv, setCv] = useState(null);

  const toggleSkill = (skill) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleNext = async () => {
    setError(null);

    // Validate current step before advancing
    if (step === 0 && (!tcChecked || !ageChecked)) {
      return setError('Please accept both checkboxes to continue');
    }
    if (step === 1 && (!personalInfo.full_name || !personalInfo.date_of_birth)) {
      return setError('Full name and date of birth are required');
    }

    setSaving(true);
    try {
      // Save data for each step as user progresses
      if (step === 0) {
        // Save terms accepted
        const fd = new FormData();
        fd.append('terms_accepted', 'true');
        fd.append('onboarding_step', '1');
        await updateProfile(fd);
      }

      if (step === 1) {
        // Save personal info + optional photo
        const fd = new FormData();
        fd.append('full_name',      personalInfo.full_name);
        fd.append('date_of_birth',  personalInfo.date_of_birth);
        fd.append('location',       personalInfo.location);
        fd.append('about',          personalInfo.about);
        fd.append('onboarding_step', '2');
        if (photo) fd.append('photo', photo);
        await updateProfile(fd);
      }

      if (step === 2) {
        // Save skills
        const fd = new FormData();
        fd.append('skills', selectedSkills.join(', '));
        fd.append('onboarding_step', '3');
        await updateProfile(fd);
      }

      if (step === 3 && newEdu.degree && newEdu.institution) {
        // Save education entry if filled
        await addEducation(newEdu);
      }

      if (step === 4 && newExp.job_title && newExp.company) {
        // Save work experience entry if filled
        await addExperience(newExp);
      }

      if (step === 5 && cv) {
        // Save CV upload
        const fd = new FormData();
        fd.append('cv', cv);
        fd.append('onboarding_step', '6');
        await updateProfile(fd);
      }

      if (step === TOTAL_STEPS - 1) {
        // Mark profile as complete on final step
        const fd = new FormData();
        fd.append('is_complete', 'true');
        fd.append('onboarding_step', '7');
        await updateProfile(fd);
        navigate('/dashboard');
        return;
      }

      setStep(prev => prev + 1);
    } catch (err) {
      console.error(err);
      setError(err.error || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    // Mark as skipped and go to dashboard with incomplete profile
    navigate('/dashboard');
  };

  const stepTitles = [
    'Terms & Conditions',
    'Personal Info',
    'Your Skills',
    'Education',
    'Work Experience',
    'Upload CV',
    'All Done!',
  ];

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="bg-[#0a1628] px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="3.5" fill="#4a90d9"/>
                  <path d="M9 2v2M9 14v2M2 9h2M14 9h2"
                    stroke="#4a90d9" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="text-white text-sm font-medium">Taskr AI</span>
            </div>
            <span className="text-white/50 text-xs">Step {step + 1} of {TOTAL_STEPS}</span>
          </div>
          <StepBar current={step} total={TOTAL_STEPS} />
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="mb-5">
            <p className="text-xs text-blue-500 font-medium uppercase tracking-wide mb-1">
              Step {step + 1} — {stepTitles[step]}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600
              rounded-xl p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          {/* ── Step 0: Terms ── */}
          {step === 0 && (
            <div>
              <h2 className="text-lg font-semibold text-[#0a1628] mb-1">
                Review our terms
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Please read through before continuing
              </p>
              <div className="border border-gray-100 rounded-xl p-4 h-36
                overflow-y-auto text-xs text-gray-500 leading-relaxed bg-gray-50 mb-4">
                <strong className="text-gray-700">1. Eligibility</strong><br/>
                You must be 18 years or older to use Taskr AI.<br/><br/>
                <strong className="text-gray-700">2. Work Quality</strong><br/>
                All submitted work must meet the accuracy standards defined per task.
                Submissions below the threshold may be rejected without payment.<br/><br/>
                <strong className="text-gray-700">3. Payments</strong><br/>
                Payouts are processed via M-Pesa upon task approval.
                Processing times may vary between 1–3 business days.<br/><br/>
                <strong className="text-gray-700">4. Account Integrity</strong><br/>
                Duplicate accounts are prohibited. Fraud or misrepresentation
                will result in immediate account suspension.<br/><br/>
                <strong className="text-gray-700">5. Data Usage</strong><br/>
                Your submitted work becomes property of Taskr AI and its
                clients upon payment confirmation.
              </div>
              <label className="flex items-start gap-3 text-sm text-gray-700 mb-3 cursor-pointer">
                <input type="checkbox" checked={tcChecked}
                  onChange={e => setTcChecked(e.target.checked)}
                  className="mt-0.5 accent-[#0a1628]" />
                I have read and agree to the{' '}
                <span className="text-blue-500">Terms & Conditions</span>{' '}
                and <span className="text-blue-500">Privacy Policy</span>
              </label>
              <label className="flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={ageChecked}
                  onChange={e => setAgeChecked(e.target.checked)}
                  className="mt-0.5 accent-[#0a1628]" />
                I confirm I am 18 years of age or older
              </label>
            </div>
          )}

          {/* ── Step 1: Personal Info ── */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-semibold text-[#0a1628] mb-1">
                Tell us about yourself
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                This helps us match you with the right tasks
              </p>

              {/* Photo upload */}
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-[#0a1628] flex
                    items-center justify-center text-blue-400 font-semibold text-lg
                    overflow-hidden">
                    {photoPreview
                      ? <img src={photoPreview} alt="preview"
                          className="w-full h-full object-cover" />
                      : (personalInfo.full_name?.[0] || 'U')}
                  </div>
                </div>
                <div>
                  <label className="cursor-pointer text-xs font-medium text-blue-500
                    hover:underline">
                    Upload profile photo
                    <input type="file" accept="image/*" className="hidden"
                      onChange={handlePhotoChange} />
                  </label>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    JPG or PNG · Max 5MB
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <Field label="Full Name" required>
                  <input type="text" value={personalInfo.full_name}
                    onChange={e => setPersonalInfo({...personalInfo, full_name: e.target.value})}
                    placeholder="Jane Doe"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
                </Field>
                <Field label="Date of Birth" required hint="Must be 18 or older">
                  <input type="date" value={personalInfo.date_of_birth}
                    onChange={e => setPersonalInfo({...personalInfo, date_of_birth: e.target.value})}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
                </Field>
              </div>
              <div className="mb-3">
                <Field label="Location">
                  <input type="text" value={personalInfo.location}
                    onChange={e => setPersonalInfo({...personalInfo, location: e.target.value})}
                    placeholder="e.g. Nairobi, Kenya"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
                </Field>
              </div>
              <Field label="About You">
                <textarea value={personalInfo.about}
                  onChange={e => setPersonalInfo({...personalInfo, about: e.target.value})}
                  rows={3} placeholder="A short bio about yourself..."
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm
                    resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
              </Field>
            </div>
          )}

          {/* ── Step 2: Skills ── */}
          {step === 2 && (
            <div>
              <h2 className="text-lg font-semibold text-[#0a1628] mb-1">
                What are your skills?
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Select all that apply — determines which tasks you see
              </p>
              {Object.entries(SKILL_OPTIONS).map(([category, skills]) => (
                <div key={category} className="mb-4">
                  <p className="text-xs text-gray-400 font-medium mb-2">{category}</p>
                  <div className="flex flex-wrap gap-2">
                    {skills.map(skill => (
                      <button key={skill} type="button"
                        onClick={() => toggleSkill(skill)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition
                          ${selectedSkills.includes(skill)
                            ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                        {selectedSkills.includes(skill) ? '✓ ' : ''}{skill}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {selectedSkills.length > 0 && (
                <p className="text-xs text-green-600 mt-2">
                  {selectedSkills.length} skill{selectedSkills.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          )}

          {/* ── Step 3: Education ── */}
          {step === 3 && (
            <div>
              <h2 className="text-lg font-semibold text-[#0a1628] mb-1">
                Education background
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Add your highest level of education
              </p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <Field label="Degree / Qualification">
                  <input type="text" value={newEdu.degree}
                    onChange={e => setNewEdu({...newEdu, degree: e.target.value})}
                    placeholder="e.g. BSc Computer Science"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
                </Field>
                <Field label="Institution">
                  <input type="text" value={newEdu.institution}
                    onChange={e => setNewEdu({...newEdu, institution: e.target.value})}
                    placeholder="e.g. University of Nairobi"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
                </Field>
                <Field label="Year Completed">
                  <input type="number" value={newEdu.year}
                    onChange={e => setNewEdu({...newEdu, year: e.target.value})}
                    placeholder="e.g. 2021"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
                </Field>
                <Field label="Grade / GPA">
                  <input type="text" value={newEdu.grade}
                    onChange={e => setNewEdu({...newEdu, grade: e.target.value})}
                    placeholder="e.g. Second Upper"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
                </Field>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                You can add more qualifications from your Profile page later.
              </p>
            </div>
          )}

          {/* ── Step 4: Work Experience ── */}
          {step === 4 && (
            <div>
              <h2 className="text-lg font-semibold text-[#0a1628] mb-1">
                Work experience
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Add your most relevant experience
              </p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <Field label="Job Title">
                  <input type="text" value={newExp.job_title}
                    onChange={e => setNewExp({...newExp, job_title: e.target.value})}
                    placeholder="e.g. Data Annotator"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
                </Field>
                <Field label="Company">
                  <input type="text" value={newExp.company}
                    onChange={e => setNewExp({...newExp, company: e.target.value})}
                    placeholder="e.g. Remotasks Kenya"
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
                    disabled={newExp.is_current}
                    onChange={e => setNewExp({...newExp, to_date: e.target.value})}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50
                      disabled:opacity-50" />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                <input type="checkbox" checked={newExp.is_current}
                  onChange={e => setNewExp({...newExp, is_current: e.target.checked})}
                  className="accent-[#0a1628]" />
                I currently work here
              </label>
              <Field label="Description">
                <textarea value={newExp.description}
                  onChange={e => setNewExp({...newExp, description: e.target.value})}
                  rows={3} placeholder="Brief description of your responsibilities..."
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm
                    resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50" />
              </Field>
            </div>
          )}

          {/* ── Step 5: CV Upload ── */}
          {step === 5 && (
            <div>
              <h2 className="text-lg font-semibold text-[#0a1628] mb-1">
                Upload your CV
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Optional but recommended — helps get higher-paying tasks
              </p>
              <label className="cursor-pointer block">
                <div className={`border-2 border-dashed rounded-xl p-8 text-center
                  transition-all hover:border-blue-400 hover:bg-blue-50
                  ${cv ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                  {cv ? (
                    <>
                      <div className="text-3xl mb-2">✅</div>
                      <p className="text-sm font-medium text-green-700">{cv.name}</p>
                      <p className="text-xs text-green-600 mt-1">
                        {(cv.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="text-3xl mb-2">📄</div>
                      <p className="text-sm font-medium text-gray-600">
                        Drop your CV here or click to browse
                      </p>
                      <p className="text-xs text-gray-400 mt-1">PDF or DOCX · Max 5MB</p>
                    </>
                  )}
                </div>
                <input type="file" accept=".pdf,.docx" className="hidden"
                  onChange={e => setCv(e.target.files[0])} />
              </label>
            </div>
          )}

          {/* ── Step 6: All done ── */}
          {step === 6 && (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-xl font-bold text-[#0a1628] mb-2">
                You're all set!
              </h2>
              <p className="text-sm text-gray-400 mb-6">
                Your profile is complete. You can now browse tasks,
                apply, and start earning on Taskr AI.
              </p>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-left">
                <p className="text-xs font-medium text-blue-700 mb-2">
                  What happens next?
                </p>
                <ul className="text-xs text-blue-600 space-y-1">
                  <li>✓ Your profile will be reviewed by our team</li>
                  <li>✓ You'll be matched with tasks that fit your skills</li>
                  <li>✓ Complete tasks and get paid via M-Pesa</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)}
                className="text-xs text-gray-500 border border-gray-200 px-4 py-2
                  rounded-lg hover:bg-gray-50 transition">
                ← Back
              </button>
            )}
            {step < 6 && (
              <button onClick={handleSkip}
                className="text-xs text-gray-400 hover:text-gray-600 underline transition">
                Skip for now
              </button>
            )}
          </div>
          <button
            onClick={handleNext}
            disabled={saving}
            className="bg-[#0a1628] hover:bg-[#1e3a5f] text-white text-xs
              font-medium px-6 py-2.5 rounded-lg transition disabled:opacity-50">
            {saving ? 'Saving...' : step === 6 ? 'Go to Dashboard →' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}