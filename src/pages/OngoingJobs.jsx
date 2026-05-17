import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getOngoingJobs, getOngoingJobDetail, submitWork } from '../api/jobs';

// Status pill
const StatusPill = ({ status }) => {
  const styles = {
    submitted: 'bg-blue-50 text-blue-700',
    approved:  'bg-green-50 text-green-700',
    rejected:  'bg-red-50 text-red-700',
  };
  return (
    <span className={`text-[10px] font-medium px-2 py-1 rounded-full
      ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  );
};

// Job list item in the left panel
const JobListItem = ({ job, active, onClick }) => (
  <div
    onClick={onClick}
    className={`p-3 cursor-pointer border-l-2 transition
      ${active
        ? 'bg-blue-50/50 border-blue-400'
        : 'border-transparent hover:bg-gray-50'}`}>
    <p className={`text-xs truncate mb-0.5
      ${active ? 'font-semibold text-[#0a1628]' : 'font-medium text-[#0a1628]'}`}>
      {job.task_title}
    </p>
    <p className="text-[10px] text-gray-400">
      ${parseFloat(job.task_budget).toFixed(0)} ·{' '}
      {job.task_category}
    </p>
    {job.submission && (
      <StatusPill status={job.submission.status} />
    )}
  </div>
);

export default function OngoingJobs() {
  const [jobs, setJobs]           = useState([]);
  const [selected, setSelected]   = useState(null);
  const [detail, setDetail]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile]           = useState(null);
  const [notes, setNotes]         = useState('');
  const [submitMsg, setSubmitMsg] = useState(null);
  const [submitErr, setSubmitErr] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getOngoingJobs();
        setJobs(data);
        if (data.length > 0) openJob(data[0]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openJob = async (job) => {
    setSelected(job);
    setSubmitMsg(null);
    setSubmitErr(null);
    try {
      const data = await getOngoingJobDetail(job.proposal_id);
      setDetail(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setSubmitErr(null);
    setSubmitMsg(null);
    try {
      await submitWork(selected.proposal_id, notes, file);
      setSubmitMsg('Work submitted successfully! Admin will review shortly.');
      setNotes('');
      setFile(null);
      // Refresh detail
      const data = await getOngoingJobDetail(selected.proposal_id);
      setDetail(data);
    } catch (err) {
      console.error(err);
      setSubmitErr(err.error || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#f0f2f5]">
      <p className="text-sm text-gray-400">Loading ongoing jobs...</p>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f0f2f5] overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex overflow-hidden">

        {/* Jobs list panel */}
        <div className="w-56 flex-shrink-0 bg-white border-r border-gray-100
          flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex-shrink-0">
            <h2 className="text-sm font-semibold text-[#0a1628]">Ongoing Jobs</h2>
            <p className="text-xs text-gray-400 mt-0.5">{jobs.length} active</p>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {jobs.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8 px-4">
                No ongoing jobs — apply to tasks to get started!
              </p>
            ) : (
              jobs.map(job => (
                <JobListItem
                  key={job.proposal_id}
                  job={job}
                  active={selected?.proposal_id === job.proposal_id}
                  onClick={() => openJob(job)} />
              ))
            )}
          </div>
        </div>

        {/* Job detail */}
        {detail ? (
          <div className="flex-1 overflow-y-auto p-5">

            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <h1 className="text-lg font-semibold text-[#0a1628]">
                  {detail.task_title}
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  ${parseFloat(detail.task_budget).toFixed(0)} ·{' '}
                  {detail.posted_by} ·{' '}
                  Due {new Date(detail.accepted_at).toLocaleDateString()}
                </p>
              </div>
              <span className="text-[10px] bg-blue-50 text-blue-700 font-medium
                px-3 py-1.5 rounded-full border border-blue-200">
                Active
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">

              {/* Task details */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <h2 className="text-sm font-semibold text-[#0a1628] mb-2">
                  Task Details
                </h2>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">
                  {detail.task_desc}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[detail.task_category, detail.task_data_type, detail.task_experience].map((tag, i) => (
                    <span key={i} className="text-[10px] bg-blue-50 text-blue-700
                      font-medium px-2 py-0.5 rounded-full capitalize">
                      {tag}
                    </span>
                  ))}
                </div>
                {detail.task_skills?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] text-gray-400 mb-1">Required skills</p>
                    <div className="flex flex-wrap gap-1">
                      {detail.task_skills.map((s, i) => (
                        <span key={i} className="text-[10px] bg-gray-50
                          border border-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {detail.task_instructions && (
                  <div className="mt-3 p-2.5 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-[10px] font-medium text-blue-700 mb-1">
                      💡 Admin Instructions
                    </p>
                    <p className="text-[10px] text-blue-600 leading-relaxed">
                      {detail.task_instructions}
                    </p>
                  </div>
                )}
              </div>

              {/* Submit work */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <h2 className="text-sm font-semibold text-[#0a1628] mb-3">
                  Submit Work
                </h2>

                {/* Previous submissions */}
                {detail.submissions?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[10px] text-gray-400 mb-2">
                      Previous submissions
                    </p>
                    {detail.submissions.map(sub => (
                      <div key={sub.id} className="flex items-center gap-2
                        p-2 bg-gray-50 rounded-lg mb-1.5">
                        <StatusPill status={sub.status} />
                        <span className="text-[10px] text-gray-400">
                          {new Date(sub.created_at).toLocaleDateString()}
                        </span>
                        {sub.admin_note && (
                          <span className="text-[10px] text-red-500 ml-auto">
                            {sub.admin_note}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {submitMsg && (
                  <div className="bg-green-50 border border-green-200 text-green-700
                    rounded-lg p-2.5 text-xs mb-3">
                    {submitMsg}
                  </div>
                )}
                {submitErr && (
                  <div className="bg-red-50 border border-red-200 text-red-600
                    rounded-lg p-2.5 text-xs mb-3">
                    {submitErr}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* File upload */}
                  <label className="cursor-pointer block">
                    <div className={`border-2 border-dashed rounded-xl p-4
                      text-center transition-all
                      ${file
                        ? 'border-green-400 bg-green-50'
                        : 'border-gray-200 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'}`}>
                      {file ? (
                        <>
                          <div className="text-xl mb-1">✅</div>
                          <p className="text-xs font-medium text-green-700">{file.name}</p>
                          <p className="text-[10px] text-green-600">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="text-xl mb-1">📁</div>
                          <p className="text-xs text-gray-500">
                            Drop files or <span className="text-blue-500">browse</span>
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            CSV, ZIP, JSON · Max 50MB
                          </p>
                        </>
                      )}
                    </div>
                    <input type="file" className="hidden"
                      onChange={e => setFile(e.target.files[0])} />
                  </label>

                  {/* Notes */}
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Add notes about your submission..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2
                      text-sm resize-none focus:outline-none focus:ring-2
                      focus:ring-blue-400 bg-gray-50" />

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#0a1628] text-white text-xs font-medium
                      py-2.5 rounded-lg hover:bg-[#1e3a5f] transition
                      disabled:opacity-50">
                    {submitting ? 'Submitting...' : 'Submit Work'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-3">💼</div>
              <p className="text-sm text-gray-400">
                {jobs.length === 0
                  ? 'No ongoing jobs yet — apply to tasks to get started!'
                  : 'Select a job to view details'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}