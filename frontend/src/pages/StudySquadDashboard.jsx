import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, Target, Shield, Copy, Check, Users, ArrowLeft, Plus } from 'lucide-react';
import API from '../services/api';
import MobileBottomNav from '../components/common/MobileBottomNav';
import ReactMarkdown from 'react-markdown';

const StudySquadDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [squad, setSquad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // New Challenge Form State
  const [showChallengeForm, setShowChallengeForm] = useState(false);
  const [newChallenge, setNewChallenge] = useState({
    title: '',
    targetGoal: 100,
    rewardPoints: 50,
  });

  useEffect(() => {
    fetchSquadDetails();
  }, [id]);

  const fetchSquadDetails = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/squads/${id}`);
      setSquad(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch squad details.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(squad.joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateChallenge = async (e) => {
    e.preventDefault();
    try {
      await API.post(`/squads/${id}/challenges`, newChallenge);
      setShowChallengeForm(false);
      fetchSquadDetails();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create challenge');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <p className="text-neutral-500">Loading squad details...</p>
      </div>
    );
  }

  if (error || !squad) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
        <p className="text-red-500 mb-4">{error || 'Squad not found'}</p>
        <button onClick={() => navigate('/squads')} className="px-4 py-2 bg-primary-500 text-white rounded-lg">
          Back to Squads
        </button>
      </div>
    );
  }

  const isAdmin = squad.SquadMembers.some(
    member => member.userId === squad.ownerId // or check role === 'admin'
  );

  // Sort members by points descending
  const leaderboard = [...squad.SquadMembers].sort((a, b) => b.pointsContributed - a.pointsContributed);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/squads')}
              className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-neutral-200 dark:border-slate-700 hover:bg-neutral-50 dark:hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-3">
                {squad.name}
              </h1>
              <p className="text-neutral-500 dark:text-neutral-400 mt-1">
                {squad.description}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-neutral-200 dark:border-slate-700 shadow-sm">
            <div className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">Join Code:</div>
            <div className="font-mono font-bold text-primary-600 dark:text-primary-400 tracking-wider text-lg">
              {squad.joinCode}
            </div>
            <button 
              onClick={handleCopyCode}
              className="p-1.5 hover:bg-neutral-100 dark:hover:bg-slate-700 rounded-md transition-colors text-neutral-500"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content: Challenges */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                <Target className="w-6 h-6 text-orange-500" />
                Active Challenges
              </h2>
              {isAdmin && (
                <button 
                  onClick={() => setShowChallengeForm(!showChallengeForm)}
                  className="text-sm font-semibold text-primary-600 dark:text-primary-400 flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-4 h-4" /> New Challenge
                </button>
              )}
            </div>

            {showChallengeForm && isAdmin && (
              <form onSubmit={handleCreateChallenge} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-primary-200 dark:border-primary-900 shadow-sm mb-6 flex flex-col gap-4">
                <h3 className="font-bold text-neutral-800 dark:text-neutral-100">Create New Challenge</h3>
                <input
                  type="text"
                  placeholder="Challenge Title (e.g., Complete 500 Flashcards)"
                  required
                  value={newChallenge.title}
                  onChange={e => setNewChallenge({...newChallenge, title: e.target.value})}
                  className="w-full px-4 py-2 bg-neutral-50 dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-primary-500 text-neutral-800 dark:text-neutral-100"
                />
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase">Target Goal (Score)</label>
                    <input
                      type="number"
                      required
                      value={newChallenge.targetGoal}
                      onChange={e => setNewChallenge({...newChallenge, targetGoal: parseInt(e.target.value)})}
                      className="w-full mt-1 px-4 py-2 bg-neutral-50 dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-primary-500 text-neutral-800 dark:text-neutral-100"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase">Reward Points</label>
                    <input
                      type="number"
                      required
                      value={newChallenge.rewardPoints}
                      onChange={e => setNewChallenge({...newChallenge, rewardPoints: parseInt(e.target.value)})}
                      className="w-full mt-1 px-4 py-2 bg-neutral-50 dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-primary-500 text-neutral-800 dark:text-neutral-100"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <button type="button" onClick={() => setShowChallengeForm(false)} className="px-4 py-2 text-sm text-neutral-500">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold text-sm">Create Challenge</button>
                </div>
              </form>
            )}

            {squad.SquadChallenges.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl text-center border border-neutral-200 dark:border-slate-700 border-dashed">
                <Target className="w-12 h-12 text-neutral-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-neutral-500 dark:text-neutral-400 font-medium">No active challenges right now.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {squad.SquadChallenges.map(challenge => (
                  <div key={challenge.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-neutral-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                    {challenge.isCompleted && (
                      <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                        COMPLETED
                      </div>
                    )}
                    <h3 className="font-bold text-neutral-800 dark:text-neutral-100 text-lg mb-1">{challenge.title}</h3>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded-full">
                        Reward: {challenge.rewardPoints} pts
                      </span>
                    </div>
                    
                    <div className="w-full h-2.5 bg-neutral-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${challenge.isCompleted ? 'bg-green-500' : 'bg-primary-500'} rounded-full`}
                        style={{ width: `${Math.min(100, (challenge.currentProgress / challenge.targetGoal) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 mt-2 font-medium">
                      <span>{challenge.currentProgress} / {challenge.targetGoal} completed</span>
                      <span>{Math.round((challenge.currentProgress / challenge.targetGoal) * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar: Leaderboard */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-neutral-200 dark:border-slate-700 shadow-sm">
              <h3 className="font-bold text-neutral-800 dark:text-neutral-100 mb-6 flex items-center gap-2 text-xl">
                <Trophy className="w-6 h-6 text-yellow-500" />
                Squad Leaderboard
              </h3>
              
              <div className="flex flex-col gap-4">
                {leaderboard.map((member, index) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500' :
                      index === 1 ? 'bg-neutral-200 text-neutral-700 dark:bg-slate-700 dark:text-neutral-300' :
                      index === 2 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                      'bg-neutral-100 text-neutral-500 dark:bg-slate-800 dark:text-neutral-400'
                    }`}>
                      #{index + 1}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-primary-100 overflow-hidden border-2 border-white dark:border-slate-800 flex-shrink-0">
                      {member.user.avatar ? (
                        <img src={member.user.avatar} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-primary-600 font-bold bg-primary-100">
                          {member.user.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-neutral-800 dark:text-neutral-100 truncate text-sm">
                        {member.user.name}
                        {member.role === 'admin' && <span className="ml-2 text-[10px] bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 px-1.5 py-0.5 rounded uppercase font-black">Admin</span>}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                        {member.pointsContributed} pts contributed
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-primary-50 dark:bg-primary-900/10 p-5 rounded-2xl border border-primary-100 dark:border-primary-900/30">
               <h4 className="font-bold text-primary-800 dark:text-primary-400 mb-2 flex items-center gap-2">
                 <Shield className="w-4 h-4" /> Total Squad Score
               </h4>
               <div className="text-3xl font-black text-primary-600 dark:text-primary-500">
                 {squad.totalScore} <span className="text-lg font-medium text-primary-400">pts</span>
               </div>
            </div>

          </div>
        </div>
      </div>
      <MobileBottomNav />
    </div>
  );
};

export default StudySquadDashboard;
