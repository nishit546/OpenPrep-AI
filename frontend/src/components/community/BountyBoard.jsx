import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { 
  Award, Filter, PlusCircle, ArrowUp, ArrowDown, 
  CheckCircle, Calendar, Tag, ChevronRight, MessageSquare, AlertCircle
} from 'lucide-react';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001',
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  },
});

// Render KaTeX helper component
function Latex({ math, block }) {
  const containerRef = useRef(null);
  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(math, containerRef.current, {
          displayMode: !!block,
          throwOnError: false,
        });
      } catch (err) {
        containerRef.current.textContent = math;
      }
    }
  }, [math, block]);
  return <span ref={containerRef} />;
}

export default function BountyBoard() {
  const [bounties, setBounties] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedBounty, setSelectedBounty] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Filters & selections
  const [selectedSubject, setSelectedSubject] = useState('');
  const [filterType, setFilterType] = useState('newest'); // newest, highest_bounty, expiring_soon, unanswered

  // Post Bounty Modal State
  const [showPostModal, setShowPostModal] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postProblemText, setPostProblemText] = useState('');
  const [postBountyXp, setPostBountyXp] = useState(50);
  const [postExpirationDate, setPostExpirationDate] = useState('');
  const [postSubjectId, setPostSubjectId] = useState('');
  const [postDiagramUrl, setPostDiagramUrl] = useState('');

  // Submit Solution State
  const [solutionText, setSolutionText] = useState('');
  const [previewSolution, setPreviewSolution] = useState(false);

  // Status & Error Messages
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Load Initial Data
  const loadData = async () => {
    try {
      // Get current user profile
      const userRes = await api.get('/api/users/profile');
      setCurrentUser(userRes.data.data || userRes.data);

      // Get subjects list
      const subjectsRes = await api.get('/api/academic/subjects');
      setSubjects(subjectsRes.data.data || subjectsRes.data);

      // Fetch Bounties list
      fetchBounties();
    } catch (err) {
      console.error('[BountyBoard] Data load failed:', err);
    }
  };

  const fetchBounties = async () => {
    try {
      const res = await api.get('/api/bounties', {
        params: {
          subjectId: selectedSubject || undefined,
          filter: filterType,
        },
      });
      const list = res.data.bounties || [];
      setBounties(list);
      
      // Keep selected bounty updated if it's currently viewed
      if (selectedBounty) {
        const updated = list.find((b) => b.id === selectedBounty.id);
        if (updated) {
          fetchBountyDetails(updated.id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBountyDetails = async (id) => {
    try {
      const res = await api.get(`/api/bounties/${id}`);
      setSelectedBounty(res.data.bounty);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSubject, filterType]);

  // Split text into normal and math segments
  const renderContentWithMath = (content) => {
    if (!content) return null;
    const parts = content.split(/(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        return <Latex key={idx} math={part.slice(2, -2)} block />;
      }
      if (part.startsWith('$') && part.endsWith('$')) {
        return <Latex key={idx} math={part.slice(1, -1)} />;
      }
      return <span key={idx} className="whitespace-pre-line">{part}</span>;
    });
  };

  // Submit a new bounty question (Escrowed XP deduction)
  const handlePostBounty = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!postTitle || !postProblemText || !postBountyXp || !postExpirationDate) {
      setErrorMsg('All fields except diagram URL are required');
      return;
    }

    try {
      const res = await api.post('/api/bounties', {
        title: postTitle,
        problemText: postProblemText,
        bountyXp: parseInt(postBountyXp, 10),
        expirationDate: postExpirationDate,
        subjectId: postSubjectId || null,
        diagramUrl: postDiagramUrl || null,
      });

      setSuccessMsg('Bounty posted successfully! XP has been locked in escrow.');
      setShowPostModal(false);
      // Reset form
      setPostTitle('');
      setPostProblemText('');
      setPostBountyXp(50);
      setPostExpirationDate('');
      setPostSubjectId('');
      setPostDiagramUrl('');
      // Reload lists
      fetchBounties();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to post bounty. Check your XP balance.');
    }
  };

  // Submit a peer solution
  const handleSubmitSolution = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!solutionText) {
      setErrorMsg('Solution text cannot be empty');
      return;
    }

    try {
      await api.post(`/api/bounties/${selectedBounty.id}/answers`, {
        answerText: solutionText,
      });

      setSuccessMsg('Solution posted successfully!');
      setSolutionText('');
      setPreviewSolution(false);
      fetchBountyDetails(selectedBounty.id);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to submit solution');
    }
  };

  // Accept a solution
  const handleAcceptSolution = async (answerId) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.put(`/api/bounties/${selectedBounty.id}/accept/${answerId}`);
      setSuccessMsg('Solution accepted! XP disbursed to answerer.');
      fetchBountyDetails(selectedBounty.id);
      fetchBounties();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to accept solution');
    }
  };

  // Upvote/Downvote solution
  const handleVote = async (answerId, voteType) => {
    try {
      await api.post(`/api/bounties/answers/${answerId}/vote`, { voteType });
      fetchBountyDetails(selectedBounty.id);
    } catch (err) {
      console.warn('Voting failed:', err);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 text-slate-100 font-inter min-h-screen">
      
      {/* Top Banner Row */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl">
            <Award className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              Peer-to-Peer Study Bounty Board
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Ask tricky proof questions or help peers solve past papers to earn XP!
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          {currentUser && (
            <div className="bg-slate-800 border border-slate-750 px-4 py-2 rounded-xl text-xs flex items-center gap-2">
              <span className="text-slate-400">Your Balance:</span>
              <span className="font-extrabold text-amber-400">{currentUser.xp} XP</span>
            </div>
          )}
          <button
            onClick={() => setShowPostModal(true)}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg hover:shadow-indigo-500/10 transition cursor-pointer shrink-0 ml-auto"
          >
            <PlusCircle className="w-4 h-4" />
            Post Question Bounty
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-xs mb-6 font-semibold">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs mb-6 font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {errorMsg}
        </div>
      )}

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Bounties list and filtering */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md space-y-4">
            <h3 className="font-bold text-sm text-slate-200 flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-indigo-400" />
              Filter & Sort
            </h3>

            {/* Subject Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Subject Tag</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3 py-2 text-slate-200 outline-none text-xs"
              >
                <option value="">All Subjects</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>
            </div>

            {/* Filter buttons */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { type: 'newest', label: 'Newest' },
                { type: 'highest_bounty', label: 'Highest XP' },
                { type: 'expiring_soon', label: 'Expiring Soon' },
                { type: 'unanswered', label: 'Unanswered' },
              ].map((btn) => (
                <button
                  key={btn.type}
                  onClick={() => setFilterType(btn.type)}
                  className={`py-2 px-3 rounded-lg border text-center font-bold transition cursor-pointer ${
                    filterType === btn.type
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-950 border-slate-750 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bounties List */}
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {bounties.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center text-slate-400 text-xs">
                No active bounties found. Post one to get started!
              </div>
            ) : (
              bounties.map((b) => (
                <div
                  key={b.id}
                  onClick={() => fetchBountyDetails(b.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer text-left shadow-sm ${
                    selectedBounty?.id === b.id
                      ? 'bg-indigo-600/10 border-indigo-500 shadow-indigo-500/5'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] bg-slate-800 text-indigo-300 border border-slate-700 px-2 py-0.5 rounded-full font-bold">
                      {b.subjectRef?.name || 'Subject'}
                    </span>
                    <span className="text-xs font-black text-amber-400">{b.bountyXp} XP</span>
                  </div>
                  
                  <h4 className="font-bold text-sm text-slate-100 line-clamp-1">{b.title}</h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{b.problemText}</p>
                  
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-3 pt-3 border-t border-slate-800/60">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Exp: {new Date(b.expirationDate).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1 font-bold">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                      {b.answers?.length || 0} solutions
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Selected Bounty Details */}
        <div className="lg:col-span-8">
          {selectedBounty ? (
            <div className="space-y-6">
              
              {/* Question Detail Panel */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-md text-left space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-[10px] bg-slate-800 border border-slate-700 text-indigo-300 px-2 py-1 rounded-full font-bold">
                      {selectedBounty.subjectRef?.name || 'General Subject'}
                    </span>
                    <h2 className="text-xl font-extrabold text-white mt-2">{selectedBounty.title}</h2>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <div className="text-xs text-slate-400">Escrow Reward</div>
                    <div className="text-2xl font-black text-amber-400">{selectedBounty.bountyXp} XP</div>
                  </div>
                </div>

                {/* Question LaTeX Statement */}
                <div className="text-sm text-slate-200 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                  {renderContentWithMath(selectedBounty.problemText)}
                </div>

                {selectedBounty.diagramUrl && (
                  <div className="rounded-xl overflow-hidden border border-slate-800 max-h-64 flex justify-center bg-slate-950">
                    <img src={selectedBounty.diagramUrl} alt="Attached Diagram" className="object-contain max-h-full" />
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-850 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300">
                      {selectedBounty.creator?.avatar ? (
                        <img src={selectedBounty.creator.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        selectedBounty.creator?.name?.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <span>Asked by <strong className="text-slate-300">{selectedBounty.creator?.name}</strong></span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Expires: {new Date(selectedBounty.expirationDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Answers / Solutions section */}
              <div className="space-y-4 text-left">
                <h3 className="font-extrabold text-md text-slate-200">
                  Peer Solutions ({selectedBounty.answers?.length || 0})
                </h3>

                {selectedBounty.answers?.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center text-slate-400 text-xs">
                    No solutions posted yet. Be the first to solve and claim the bounty!
                  </div>
                ) : (
                  selectedBounty.answers.map((ans) => {
                    // Hide flagged spam solutions for non-creators unless accepted
                    if (ans.isFlagged && !ans.isAccepted && selectedBounty.userId !== currentUser?.id) {
                      return null;
                    }

                    return (
                      <div
                        key={ans.id}
                        className={`p-5 rounded-2xl border flex gap-4 ${
                          ans.isAccepted
                            ? 'bg-emerald-500/5 border-emerald-500/30'
                            : ans.isFlagged
                            ? 'bg-red-500/5 border-red-500/20 opacity-70'
                            : 'bg-slate-900 border-slate-800'
                        }`}
                      >
                        {/* Vote Action Sidebar */}
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleVote(ans.id, 'upvote')}
                            className={`p-1.5 rounded hover:bg-slate-800 transition ${
                              ans.upvotedUserIds?.includes(currentUser?.id) ? 'text-indigo-400' : 'text-slate-500'
                            }`}
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <span className="text-xs font-bold">{ans.upvotes - ans.downvotes}</span>
                          <button
                            onClick={() => handleVote(ans.id, 'downvote')}
                            className={`p-1.5 rounded hover:bg-slate-800 transition ${
                              ans.downvotedUserIds?.includes(currentUser?.id) ? 'text-red-400' : 'text-slate-500'
                            }`}
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>

                          {ans.isAccepted && (
                            <div className="mt-3 text-emerald-400" title="Accepted Solution">
                              <CheckCircle className="w-5 h-5" />
                            </div>
                          )}
                        </div>

                        {/* Solution Text Content */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between gap-3 text-[11px] text-slate-400">
                            <span className="font-bold text-slate-300">
                              By {ans.author?.name}
                            </span>
                            <span>{new Date(ans.createdAt).toLocaleDateString()}</span>
                          </div>

                          <div className="text-sm text-slate-200 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-slate-850/60">
                            {renderContentWithMath(ans.answerText)}
                          </div>

                          {ans.isFlagged && (
                            <span className="inline-block text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-bold">
                              FLAGGED SPAM
                            </span>
                          )}

                          {/* Accept solution button for question creator */}
                          {selectedBounty.userId === currentUser?.id && selectedBounty.status === 'OPEN' && ans.userId !== currentUser.id && (
                            <button
                              onClick={() => handleAcceptSolution(ans.id)}
                              className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center gap-1"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Accept Solution & Award Bounty
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Submit new solution form (Only for open questions not created by current user) */}
              {selectedBounty.status === 'OPEN' && selectedBounty.userId !== currentUser?.id && (
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-left space-y-4">
                  <h3 className="font-bold text-sm text-slate-200">Submit Your Solution</h3>
                  
                  <form onSubmit={handleSubmitSolution} className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-400 uppercase block">
                          Solution Markdown / LaTeX
                        </label>
                        <button
                          type="button"
                          onClick={() => setPreviewSolution(!previewSolution)}
                          className="text-[10px] font-bold text-indigo-400 hover:underline transition"
                        >
                          {previewSolution ? 'Edit Mode' : 'Live Preview'}
                        </button>
                      </div>

                      {previewSolution ? (
                        <div className="w-full bg-slate-950 border border-slate-750 rounded-xl p-3 text-xs text-slate-350 min-h-36">
                          {renderContentWithMath(solutionText || '*No preview text typed yet.*')}
                        </div>
                      ) : (
                        <textarea
                          value={solutionText}
                          onChange={(e) => setSolutionText(e.target.value)}
                          placeholder="Explain proofs or equations using LaTeX tags (e.g. $E=mc^2$ or $$\int_0^1 x dx$$)"
                          className="w-full bg-slate-950 border border-slate-750 rounded-xl p-3 text-xs text-slate-100 outline-none min-h-36 font-mono"
                        />
                      )}
                    </div>

                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer"
                    >
                      Post Solution
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full min-h-80 flex flex-col items-center justify-center bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center text-slate-400 text-xs">
              <Award className="w-12 h-12 text-slate-500 mb-3 animate-pulse" />
              <span>Select a bounty from the list to view its details, solutions, and post answers.</span>
            </div>
          )}
        </div>
      </div>

      {/* Post Bounty Modal Dialog */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg text-left space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-lg font-extrabold text-white flex items-center gap-1.5">
              <PlusCircle className="text-indigo-400 w-5 h-5" />
              Post New Bounty Question
            </h2>
            
            <form onSubmit={handlePostBounty} className="space-y-4">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Question Title</label>
                <input
                  type="text"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="e.g. Prove the convergence of this infinite series"
                  className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3 py-2 text-slate-200 outline-none text-xs"
                />
              </div>

              {/* Problem statement Text */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Problem LaTeX & Markdown</label>
                <textarea
                  value={postProblemText}
                  onChange={(e) => setPostProblemText(e.target.value)}
                  placeholder="Insert mathematical formulas using single $ for inline, and $$ for block equations."
                  className="w-full bg-slate-950 border border-slate-750 rounded-xl p-3 text-xs text-slate-200 outline-none min-h-24"
                />
              </div>

              {/* Subject Dropdown */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Subject Tag</label>
                  <select
                    value={postSubjectId}
                    onChange={(e) => setPostSubjectId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3 py-2 text-slate-200 outline-none text-xs"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">XP Bounty Amount</label>
                  <input
                    type="number"
                    value={postBountyXp}
                    onChange={(e) => setPostBountyXp(e.target.value)}
                    min="1"
                    className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3 py-2 text-slate-200 outline-none text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Expiration Date</label>
                  <input
                    type="date"
                    value={postExpirationDate}
                    onChange={(e) => setPostExpirationDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3 py-2 text-slate-200 outline-none text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Diagram URL (Optional)</label>
                  <input
                    type="text"
                    value={postDiagramUrl}
                    onChange={(e) => setPostDiagramUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3 py-2 text-slate-200 outline-none text-xs"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer"
                >
                  Post & Escrow XP
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowPostModal(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
