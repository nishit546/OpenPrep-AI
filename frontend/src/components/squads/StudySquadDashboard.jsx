import React, { useState, useEffect } from 'react';
import SquadLeaderboard from './SquadLeaderboard';
import SquadActivityFeed from './SquadActivityFeed';
import SquadAudioLounge from './SquadAudioLounge';
import SquadMemberManagement from './SquadMemberManagement';
import SquadAuditLogViewer from './SquadAuditLogViewer';
import { Share2, LogOut, Award, Target, Radio, Users, FileText } from 'lucide-react';
import confetti from 'canvas-confetti';
import { io } from 'socket.io-client';
import AudioLounge from './AudioLounge';

export default function StudySquadDashboard({ squadData, currentUserRole, onLeaveSquad, onRefresh }) {
  const [localChallenge, setLocalChallenge] = useState(null);
  const [isAudioLoungeOpen, setIsAudioLoungeOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, management
  
  const squad = squadData.squad;
  const activeChallenge = localChallenge || squad.SquadChallenges?.[0];
  const contributions = activeChallenge?.SquadChallengeContributions || [];

  // Find current user's membership details to check permission bits
  const currentMember = squad.SquadMembers?.find(
    (m) => m.userRef?.id === localStorage.getItem('userId')
  ) || {};
  const canViewAudit = (currentMember.permissions & 16) === 16 || currentMember.role === 'owner' || currentMember.role === 'admin';

  useEffect(() => {
    setLocalChallenge(squad.SquadChallenges?.[0]);
  }, [squad.SquadChallenges]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5001', {
      auth: { token }
    });

    socket.on('connect', () => {
      socket.emit('join_user_room', squadData.userId); // Ensure we're in the loop
    });

    socket.on('squad:progress_updated', (data) => {
      if (data.squadId === squad.id && activeChallenge && data.challengeId === activeChallenge.id) {
        setLocalChallenge(prev => ({
          ...prev,
          currentXp: data.currentXp,
          targetXp: data.targetXp,
          SquadChallengeContributions: prev.SquadChallengeContributions.map(c => 
            c.userId === data.contributions.userId 
              ? { ...c, contributedXp: data.contributions.amount }
              : c
          )
        }));
      }
    });

    socket.on('squad:achievement_unlocked', (data) => {
      if (data.squadId === squad.id) {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        onRefresh();
      }
    });
    
    socket.on('squad:challenge_completed', (data) => {
       if (data.squadId === squad.id) {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        onRefresh();
      }
    });

    return () => socket.disconnect();
  }, [squad.id, activeChallenge?.id, onRefresh]);

  const copyInvite = () => {
    navigator.clipboard.writeText(squad.inviteCode);
    alert('Invite code copied!');
  };

  return (
    <div className="w-full max-w-4xl mx-auto text-slate-100">
      
      {/* Top Banner Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 bg-slate-800 p-6 rounded-lg shadow-md border border-slate-700 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
            {squad.name}
          </h1>
          <p className="text-slate-400 mt-1">Study Squad</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsAudioLoungeOpen(!isAudioLoungeOpen)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
              isAudioLoungeOpen
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-md'
            }`}
          >
            <Radio className="w-4 h-4 animate-pulse" />
            <span>{isAudioLoungeOpen ? 'Hide Audio Lounge' : 'Join Live Audio Lounge'}</span>
          </button>

          <div className="bg-slate-700 px-4 py-2 rounded-lg flex items-center gap-3">
            <span className="text-slate-400 text-sm">Invite Code:</span>
            <code className="text-indigo-300 font-mono text-lg font-bold tracking-wider">{squad.inviteCode}</code>
            <button onClick={copyInvite} className="p-1 hover:bg-slate-600 rounded text-slate-300 transition">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
          
          <button 
            onClick={onLeaveSquad}
            className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-400/10 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Leave Squad</span>
          </button>
        </div>
      </div>

      {isAudioLoungeOpen && (
        <div className="mb-8">
          <SquadAudioLounge
            squadId={squad.id}
            squadName={squad.name}
            currentUser={squadData.user}
            onClose={() => setIsAudioLoungeOpen(false)}
          />
        </div>
      )}

      {/* Tabs navigation list */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer border ${
            activeTab === 'dashboard'
              ? 'bg-slate-800 text-indigo-400 border-slate-700 shadow'
              : 'text-slate-400 hover:text-slate-200 border-transparent'
          }`}
        >
          <Target className="w-4 h-4" />
          Dashboard & Lounge
        </button>
        <button
          onClick={() => setActiveTab('management')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer border ${
            activeTab === 'management'
              ? 'bg-slate-800 text-indigo-400 border-slate-700 shadow'
              : 'text-slate-400 hover:text-slate-200 border-transparent'
          }`}
        >
          <Users className="w-4 h-4" />
          Members & Audit Logs
        </button>
      </div>

      {activeTab === 'dashboard' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              {activeChallenge ? (
                <div className="bg-slate-800 p-6 rounded-lg shadow-md border border-slate-700">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="w-6 h-6 text-emerald-400" />
                    <h2 className="text-xl font-bold">Active Challenge</h2>
                  </div>
                  
                  <div className="mb-2 flex justify-between items-end">
                    <span className="text-slate-300 text-sm">Squad Progress</span>
                    <span className="text-lg font-bold text-emerald-400">
                      {activeChallenge.currentXp} / {activeChallenge.targetXp} XP
                    </span>
                  </div>
                  
                  <div className="w-full bg-slate-700 rounded-full h-4 mb-6 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-4 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${Math.min(100, (activeChallenge.currentXp / activeChallenge.targetXp) * 100)}%` }}
                      role="progressbar"
                      aria-valuenow={activeChallenge.currentXp}
                      aria-valuemin={0}
                      aria-valuemax={activeChallenge.targetXp}
                    ></div>
                  </div>

                  <SquadLeaderboard 
                    members={squad.SquadMembers} 
                    contributions={contributions}
                    targetXp={activeChallenge.targetXp} 
                  />
                </div>
              ) : (
                <div className="bg-slate-800 p-8 rounded-lg shadow-md border border-slate-700 text-center">
                  <Target className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-300 mb-2">No Active Challenge</h3>
                  <p className="text-slate-400">Ask the squad admin to start a new weekly challenge!</p>
                </div>
              )}
            </div>

            <div className="md:col-span-1">
              <div className="bg-slate-800 p-6 rounded-lg shadow-md border border-slate-700">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg font-bold">Squad Badges</h3>
                </div>
                
                {squad.SquadAchievements?.length > 0 ? (
                  <div className="space-y-3">
                    {squad.SquadAchievements.map(ach => (
                      <div key={ach.id} className="flex items-center gap-3 p-3 bg-slate-700 rounded-lg">
                        <div className="w-10 h-10 bg-amber-400/20 rounded-full flex items-center justify-center">
                          🏆
                        </div>
                        <div>
                          <p className="font-medium text-slate-200">Challenge Conquered</p>
                          <p className="text-xs text-slate-400">
                            {new Date(ach.unlockedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">Complete challenges to earn collaborative badges!</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <SquadActivityFeed squadId={squad.id} />
          </div>

          <AudioLounge squadId={squad.id} />
        </>
      ) : (
        /* Management tab containing members list and audit logs if allowed */
        <div className="space-y-8">
          <SquadMemberManagement
            squadId={squad.id}
            members={squad.SquadMembers}
            currentUserRole={currentUserRole}
            onRefresh={onRefresh}
          />

          {canViewAudit && (
            <SquadAuditLogViewer squadId={squad.id} />
          )}
        </div>
      )}
    </div>
  );
}
}