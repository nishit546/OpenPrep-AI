import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Calendar, Zap, BarChart3, Clock, Loader2, AlertCircle, CheckCircle,
  Play, Settings, Target,
} from 'lucide-react';
import {
  generateAdaptivePlan, fetchAdaptiveAdjustments, applyAdaptiveAdjustments, fetchTodayTasks,
  fetchPlanStats, clearAdaptiveError,
} from '../store/slices/adaptivePlannerSlice';
import axios from 'axios';

import PlanAdjustmentList from '../components/adaptivePlanner/PlanAdjustmentList';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const AdaptiveStudyPlanner = () => {
  const dispatch = useDispatch();
  const {
    plan, adjustments, todayTasks, todaySummary,
    planStats, generating, loading, applying, infeasibleDays, error, generatedPlan,
  } = useSelector((s) => s.adaptivePlanner);

  const [subjects, setSubjects] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [examDate, setExamDate] = useState('');
  const [dailyHours, setDailyHours] = useState(4);
  const [activeTab, setActiveTab] = useState('today');

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/academic/subjects`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (res.data?.success) setSubjects(res.data.data);
      } catch (err) { console.error(err); }
    };
    fetchSubjects();
  }, []);

  useEffect(() => {
    dispatch(fetchPlanStats());
    dispatch(fetchTodayTasks());
    dispatch(fetchAdaptiveAdjustments());
  }, [dispatch]);

  useEffect(() => {
    if (error) { const t = setTimeout(() => dispatch(clearAdaptiveError()), 5000); return () => clearTimeout(t); }
  }, [error, dispatch]);

  const handleGenerate = async () => {
    if (!examDate || !dailyHours) return;
    const result = await dispatch(generateAdaptivePlan({ examDate, dailyHours: Number(dailyHours), subjectIds: selectedSubjects }));
    if (generateAdaptivePlan.fulfilled.match(result)) {
      dispatch(fetchAdaptiveAdjustments());
      dispatch(fetchTodayTasks());
      dispatch(fetchPlanStats());
    }
  };

  const toggleSubject = (id) => {
    setSelectedSubjects((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  const tabs = [
    { id: 'today', label: "Today's Focus", icon: Play },
    { id: 'adjustments', label: 'Adjustments', icon: Zap },
    { id: 'calendar', label: 'Full Calendar', icon: Calendar },
    { id: 'generate', label: 'Generate Plan', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Adaptive Study Planner</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Weakness-driven scheduling that adapts to your performance</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            <button onClick={() => dispatch(clearAdaptiveError())} className="ml-auto text-red-500">✕</button>
          </div>
        )}

        {/* Stats row */}
        {planStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4 text-blue-500" /><span className="text-xs text-gray-500 dark:text-gray-400">Days Left</span></div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{planStats.daysRemaining}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-1"><Target className="w-4 h-4 text-emerald-500" /><span className="text-xs text-gray-500 dark:text-gray-400">Total Tasks</span></div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{planStats.totalTasks}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-1"><Zap className="w-4 h-4 text-amber-500" /><span className="text-xs text-gray-500 dark:text-gray-400">Boosted Tasks</span></div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{planStats.boostedTasks}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-1"><BarChart3 className="w-4 h-4 text-purple-500" /><span className="text-xs text-gray-500 dark:text-gray-400">Progress</span></div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{planStats.progress}%</p>
              <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1"><div className="h-full bg-purple-500 rounded-full" style={{ width: `${planStats.progress}%` }} /></div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750'}`}>
                <Icon className="w-4 h-4" />{tab.label}
              </button>
            );
          })}
        </div>

        {/* Loading */}
        {(loading || generating) && (
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <Loader2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 animate-spin" />
              <p className="text-sm text-gray-500 dark:text-gray-400">{generating ? 'Generating adaptive plan...' : 'Loading...'}</p>
            </div>
          </div>
        )}

        {/* Today's Focus */}
        {activeTab === 'today' && !loading && (
          <div className="space-y-6">
            {todaySummary && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    <Play className="w-5 h-5 inline mr-2" /> Today's Focus
                  </h3>
                  {todaySummary.date && <span className="text-sm text-gray-500 dark:text-gray-400">{todaySummary.date}</span>}
                </div>
                {todaySummary.message ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{todaySummary.message}</p>
                ) : (
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center"><p className="text-xl font-bold text-gray-900 dark:text-white">{todaySummary.totalTasks}</p><p className="text-xs text-gray-500">Tasks</p></div>
                    <div className="text-center"><p className="text-xl font-bold text-gray-900 dark:text-white">{todaySummary.totalTime}m</p><p className="text-xs text-gray-500">Total Time</p></div>
                    <div className="text-center"><p className="text-xl font-bold text-amber-600">{todaySummary.boostedCount}</p><p className="text-xs text-gray-500">Weak Boosted</p></div>
                  </div>
                )}
              </div>
            )}

            {todayTasks.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tasks</h3>
                <div className="space-y-2">
                  {todayTasks.map((task, i) => (
                    <div key={i} className={`p-3 rounded-lg border ${task.isWeaknessBoosted ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {task.isWeaknessBoosted && <Zap className="w-3.5 h-3.5 text-amber-500" />}
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{task.duration}m</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500 dark:text-gray-400 ml-5">
                        <span className="capitalize">{task.type || 'study'}</span>
                        {task.subject && <span>{task.subject}</span>}
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${task.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>{task.priority || 'medium'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {todayTasks.length === 0 && !todaySummary && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No Active Plan</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Generate a plan to get started with weakness-driven scheduling</p>
              </div>
            )}
          </div>
        )}

        {/* Adjustments */}
        {activeTab === 'adjustments' && !loading && (
          <div className="space-y-3">
            <PlanAdjustmentList adjustments={adjustments} />
            {infeasibleDays.length > 0 && (
              <p role="alert" className="text-sm text-red-600">Some days cannot fit within the available study time: {infeasibleDays.map((day) => day.date).join(', ')}.</p>
            )}
            {plan && adjustments.length > 0 && (
              <button type="button" disabled={applying || infeasibleDays.length > 0}
                onClick={async () => {
                  const result = await dispatch(applyAdaptiveAdjustments({ planId: plan.id, expectedUpdatedAt: plan.updatedAt }));
                  if (applyAdaptiveAdjustments.fulfilled.match(result)) {
                    dispatch(fetchTodayTasks());
                    dispatch(fetchPlanStats());
                  }
                }}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-50">
                {applying ? 'Applying...' : 'Apply adjustments'}
              </button>
            )}
          </div>
        )}

        {/* Full Calendar */}
        {activeTab === 'calendar' && !loading && plan && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4"><Calendar className="w-5 h-5 inline mr-2" /> Full Study Calendar</h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {(plan.dailyGoals || []).map((day, i) => (
                <div key={i} className="p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{day.date}</span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">{day.dailyFocus || ''}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(day.tasks || []).map((task, j) => (
                      <span key={j} className={`px-2 py-0.5 rounded text-[10px] font-medium ${task.isWeaknessBoosted ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                        {task.title} ({task.duration}m)
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generate Plan */}
        {activeTab === 'generate' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4"><Settings className="w-5 h-5 inline mr-2" /> Generate Adaptive Plan</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Exam Date</label>
                <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Daily Study Hours</label>
                <input type="number" min="1" max="12" value={dailyHours} onChange={(e) => setDailyHours(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subjects (optional)</label>
                <div className="flex flex-wrap gap-2">
                  {subjects.map((s) => (
                    <button key={s.id} onClick={() => toggleSubject(s.id)} className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${selectedSubjects.includes(s.id) ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 ring-1 ring-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleGenerate} disabled={generating || !examDate} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-50">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {generating ? 'Generating...' : 'Generate Adaptive Plan'}
              </button>
            </div>

            {/* Generated plan preview */}
            {generatedPlan && (
              <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Plan Generated!</span>
                </div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-2">{generatedPlan.strategy}</p>
                <p className="text-xs text-emerald-500">{generatedPlan.totalDays} days • {generatedPlan.dailyGoals?.length || 0} daily goals</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdaptiveStudyPlanner;
