import React, { useState, useEffect } from 'react';
import LazyImage from '../common/LazyImage';
import { api } from '../../utils/api';
import { toast } from 'react-toastify';
import { Target, Bell, Zap, Calendar, Activity } from 'lucide-react';
import { io } from 'socket.io-client';

export default function SquadHabitGrid({ squadId, currentUserId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nudging, setNudging] = useState({});
  const [memberStatuses, setMemberStatuses] = useState({});
  const [myStatus, setMyStatus] = useState('online');

  useEffect(() => {
    fetchHabits();
    
    const token = localStorage.getItem('token');
    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5001', {
      auth: { token }
    });

    socket.on('connect', () => {
      socket.emit('join_user_room', currentUserId);
      socket.emit('join_squad_room', { squadId });
    });

    socket.on('squad:member_status', ({ userId, status }) => {
      setMemberStatuses(prev => ({ ...prev, [userId]: status }));
    });

    socket.on('squad:nudge_received', (nudgeData) => {
      if (nudgeData.squadId === squadId) {
        toast.info(`You were nudged by a teammate to keep up your habits!`, {
          icon: <Bell className="text-amber-400" />
        });
      }
    });

    return () => {
      socket.emit('leave_squad_room', { squadId });
      socket.disconnect();
    };
  }, [squadId, currentUserId]);

  const toggleMyStatus = () => {
    const nextStatus = myStatus === 'online' ? 'studying' : (myStatus === 'studying' ? 'offline' : 'online');
    setMyStatus(nextStatus);
    const token = localStorage.getItem('token');
    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5001', { auth: { token }});
    socket.emit('squad:set_status', { status: nextStatus });
    setMemberStatuses(prev => ({ ...prev, [currentUserId]: nextStatus }));
  };

  const fetchHabits = async () => {
    try {
      const res = await api.get(`/squads/${squadId}/habits`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch habit matrix', err);
      toast.error('Could not load squad habits');
    } finally {
      setLoading(false);
    }
  };

  const handleNudge = async (targetUserId) => {
    if (nudging[targetUserId]) return;
    setNudging(prev => ({ ...prev, [targetUserId]: true }));
    try {
      await api.post(`/squads/${squadId}/nudge`, { targetUserId });
      toast.success('Nudge sent!');
    } catch (err) {
      if (err.response?.status === 429) {
        toast.warning('You can only nudge this teammate once per day');
      } else {
        toast.error('Failed to nudge teammate');
      }
    } finally {
      setNudging(prev => ({ ...prev, [targetUserId]: false }));
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-400 animate-pulse">Loading habit matrix...</div>;
  }

  if (!data) return null;

  // Generate last 7 days array
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 p-6 rounded-lg shadow-md border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-100">7-Day Habit Matrix</h2>
          </div>
          <button 
            onClick={toggleMyStatus}
            className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all ${
              myStatus === 'studying' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50' : 
              myStatus === 'online' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50' : 
              'bg-slate-700 text-slate-400 border border-slate-600'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${
              myStatus === 'studying' ? 'bg-purple-400 animate-pulse' : 
              myStatus === 'online' ? 'bg-emerald-400' : 
              'bg-slate-400'
            }`}></div>
            {myStatus === 'studying' ? 'Studying Now' : myStatus === 'online' ? 'Online' : 'Offline'}
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="p-3 text-slate-400 font-medium">Member</th>
                {last7Days.map((date, idx) => {
                  const d = new Date(date);
                  return (
                    <th key={date} className="p-3 text-slate-400 font-medium text-center">
                      <div className="text-xs">{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                      <div>{d.getDate()}</div>
                    </th>
                  );
                })}
                <th className="p-3 text-slate-400 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(data.matrix).map(memberData => (
                <tr key={memberData.user.id} className="border-t border-slate-700/50">
                  <td className="p-3">
                    <div className="flex items-center gap-3 relative">
                      <div className="relative">
                        <LazyImage 
                          src={memberData.user.avatar || '/default-avatar.png'}
                          alt={memberData.user.name}
                          fallbackSrc="/default-avatar.png"
                          className="w-8 h-8 rounded-full"
                        />
                        <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-800 ${
                          memberStatuses[memberData.user.id] === 'studying' ? 'bg-purple-500 animate-pulse' :
                          memberStatuses[memberData.user.id] === 'online' ? 'bg-emerald-500' : 'bg-slate-500'
                        }`} title={memberStatuses[memberData.user.id] || 'offline'}></div>
                      </div>
                      <span className="text-slate-200 font-medium">{memberData.user.name}</span>
                    </div>
                  </td>
                  
                  {last7Days.map(date => {
                    const count = memberData.habitsByDate[date] || 0;
                    let bgClass = "bg-slate-700";
                    if (count > 0) bgClass = count > 2 ? "bg-emerald-500" : "bg-emerald-500/50";
                    
                    return (
                      <td key={date} className="p-3 text-center">
                        <div className={`w-6 h-6 mx-auto rounded ${bgClass} transition-colors hover:ring-2 hover:ring-emerald-300`} title={`${count} habits completed`}></div>
                      </td>
                    );
                  })}

                  <td className="p-3 text-center">
                    {memberData.user.id !== currentUserId ? (
                      <button 
                        onClick={() => handleNudge(memberData.user.id)}
                        disabled={nudging[memberData.user.id]}
                        className="p-2 rounded-full bg-slate-700 hover:bg-amber-500/20 text-amber-400 transition-colors disabled:opacity-50"
                        title="Nudge Teammate"
                      >
                        <Zap className={`w-4 h-4 ${nudging[memberData.user.id] ? 'animate-pulse' : ''}`} />
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500 italic">You</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-lg shadow-md border border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-bold text-slate-100">Squad Level</h2>
          </div>
          
          <div className="mb-2 flex justify-between items-end">
            <span className="text-slate-300 text-sm">Level {data.squadProgress.level} Progress</span>
            <span className="text-lg font-bold text-emerald-400">
              {data.squadProgress.currentLevelXp} / {data.squadProgress.nextLevelXp} XP
            </span>
          </div>
          
          <div className="w-full bg-slate-700 rounded-full h-4 mb-2 overflow-hidden">
            <div 
              className="bg-emerald-500 h-4 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(100, (data.squadProgress.currentLevelXp / data.squadProgress.nextLevelXp) * 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-400 text-right">Total XP: {data.squadProgress.totalXp}</p>
        </div>

        <div className="bg-slate-800 p-6 rounded-lg shadow-md border border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-6 h-6 text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-100">Weekly Leaderboard</h2>
          </div>
          
          <div className="space-y-4">
            {data.leaderboard.map((u, idx) => (
              <div key={u.user.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-bold w-4">{idx + 1}.</span>
                  <LazyImage 
                    src={u.user.avatar || '/default-avatar.png'}
                    alt={u.user.name}
                    fallbackSrc="/default-avatar.png"
                    className="w-8 h-8 rounded-full"
                  />
                  <div>
                    <p className="text-slate-200 font-medium">{u.user.name}</p>
                    <p className="text-xs text-slate-400">Consistency: {u.consistency}%</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-indigo-400 font-bold">{u.xp}</span>
                  <span className="text-slate-400 text-xs ml-1">XP</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
