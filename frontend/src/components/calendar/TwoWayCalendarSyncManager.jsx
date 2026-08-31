/**
 * @fileoverview Two-Way Calendar Synchronization Hub Component.
 * Manages Google Calendar, Microsoft Outlook, and Apple iCal (.ics) webcal feed subscriptions,
 * push notification webhooks, and calendar conflict resolution.
 */
import React, { useState, useEffect } from 'react';
import { getCalendarSyncStatus, linkOutlookCalendar, checkCalendarConflicts } from '../../services/api';
import { Calendar, CheckCircle2, RefreshCw, Copy, Check, ExternalLink, ShieldAlert, Sparkles, Sliders, Smartphone } from 'lucide-react';

const TwoWayCalendarSyncManager = () => {
  const [syncStatus, setSyncStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedFeed, setCopiedFeed] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await getCalendarSyncStatus();
      if (res.data && res.data.success) {
        setSyncStatus(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch calendar sync status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyICalFeed = () => {
    if (!syncStatus?.appleICal?.webcalUrl) return;
    navigator.clipboard.writeText(syncStatus.appleICal.webcalUrl);
    setCopiedFeed(true);
    setTimeout(() => setCopiedFeed(false), 2500);
  };

  const handleLinkOutlook = async () => {
    try {
      const res = await linkOutlookCalendar({ code: 'mock_outlook_auth_code_123' });
      if (res.data && res.data.success) {
        fetchStatus();
      }
    } catch (err) {
      console.error('Failed to link Outlook:', err);
    }
  };

  const handleRunConflictAnalysis = async () => {
    setCheckingConflicts(true);
    try {
      const mockProposed = [
        { id: '1', summary: 'Biology Cell Structure Study', start: new Date(Date.now() + 3600000).toISOString(), end: new Date(Date.now() + 7200000).toISOString() },
      ];
      const mockExisting = [
        { id: '2', summary: 'University Chemistry Lab Lecture', start: new Date(Date.now() + 4000000).toISOString(), end: new Date(Date.now() + 8000000).toISOString() },
      ];

      const res = await checkCalendarConflicts({ proposedEvents: mockProposed, existingEvents: mockExisting });
      if (res.data && res.data.success) {
        setConflictData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to check conflicts:', err);
    } finally {
      setCheckingConflicts(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center bg-neutral-900 border border-neutral-800 rounded-3xl">
        <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mx-auto mb-2" />
        <span className="text-xs text-stone-400 font-mono">Loading Two-Way Calendar Sync Engine...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-neutral-900 to-slate-950 p-6 rounded-3xl border border-indigo-500/30 shadow-xl space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold font-mono">
          <Calendar className="w-3.5 h-3.5" />
          Two-Way Calendar Synchronization Engine
        </div>
        <h2 className="text-2xl font-black text-stone-100 font-playfair tracking-tight">
          Seamless Calendar Integration
        </h2>
        <p className="text-stone-400 text-xs max-w-2xl leading-relaxed">
          Synchronize your study plans, exam countdowns, and revision blocks across Google Calendar, Microsoft Outlook, and Apple iCal with automated 2-way change ingestion and conflict avoidance.
        </p>
      </div>

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Google Calendar */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400 text-sm">
                  G
                </div>
                <div>
                  <h3 className="text-stone-100 font-extrabold text-sm">Google Calendar</h3>
                  <span className="text-[10px] text-stone-400">OAuth2 Push Sync</span>
                </div>
              </div>

              {syncStatus?.googleCalendar?.connected ? (
                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </span>
              ) : (
                <span className="text-[10px] bg-neutral-800 text-stone-500 px-2 py-0.5 rounded-full font-bold">
                  Not Linked
                </span>
              )}
            </div>

            <p className="text-xs text-stone-400 mt-3 leading-relaxed">
              Bi-directional Google Calendar API sync. Changes made in Google Calendar automatically reschedule OpenPrep AI study tasks.
            </p>
          </div>

          <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
            <span className="text-[11px] text-stone-400">Auto-Sync Enabled</span>
            <input
              type="checkbox"
              checked={syncStatus?.googleCalendar?.autoSync || false}
              onChange={() => {}}
              className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* 2. Microsoft Outlook */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-400 text-sm">
                  O
                </div>
                <div>
                  <h3 className="text-stone-100 font-extrabold text-sm">Microsoft Outlook</h3>
                  <span className="text-[10px] text-stone-400">Microsoft Graph API</span>
                </div>
              </div>

              {syncStatus?.outlookCalendar?.connected ? (
                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </span>
              ) : (
                <span className="text-[10px] bg-neutral-800 text-stone-500 px-2 py-0.5 rounded-full font-bold">
                  Not Linked
                </span>
              )}
            </div>

            <p className="text-xs text-stone-400 mt-3 leading-relaxed">
              Syncs study sessions with Outlook and Office 365. Listens to Microsoft Graph webhook notifications.
            </p>
          </div>

          <button
            onClick={handleLinkOutlook}
            className="w-full py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-stone-200 text-xs font-bold transition flex items-center justify-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
            {syncStatus?.outlookCalendar?.connected ? 'Reconnect Outlook' : 'Connect Outlook Calendar'}
          </button>
        </div>

        {/* 3. Apple iCal Subscribable Feed */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-sm">
                  🍏
                </div>
                <div>
                  <h3 className="text-stone-100 font-extrabold text-sm">Apple iCal Feed</h3>
                  <span className="text-[10px] text-stone-400">RFC 5545 Webcal Feed</span>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                <CheckCircle2 className="w-3 h-3" /> Ready
              </span>
            </div>

            <p className="text-xs text-stone-400 mt-3 leading-relaxed">
              Subscribe on iPhone, Mac, or iPad via live Webcal URL. Automatically refreshes study schedule events every hour.
            </p>
          </div>

          <button
            onClick={handleCopyICalFeed}
            className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md"
          >
            {copiedFeed ? <Check className="w-3.5 h-3.5 text-amber-300" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedFeed ? 'Webcal Feed URL Copied!' : 'Copy Apple iCal Webcal URL'}
          </button>
        </div>
      </div>

      {/* Conflict Avoidance & Resolution Engine Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h3 className="text-stone-100 font-extrabold text-sm">Conflict Avoidance &amp; Schedule Resolution Engine</h3>
          </div>

          <button
            onClick={handleRunConflictAnalysis}
            disabled={checkingConflicts}
            className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-stone-200 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            {checkingConflicts ? 'Analyzing Overlaps...' : 'Check Schedule Overlaps'}
          </button>
        </div>

        {conflictData && (
          <div className="p-4 rounded-2xl bg-neutral-950 border border-amber-500/40 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" /> Detected {conflictData.conflictCount} Schedule Conflict(s)
              </span>
              <span className="text-[10px] text-stone-400 font-mono">Auto-Shifted to Buffer Windows</span>
            </div>

            {conflictData.conflicts.map((c, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs space-y-1">
                <div className="font-bold text-stone-200">{c.event?.summary}</div>
                <div className="text-[11px] text-stone-400">
                  <span className="text-red-400">Conflicted With:</span> {c.conflictWith}
                </div>
                <div className="text-[11px] text-teal-300 pt-1 border-t border-neutral-800/60 font-mono">
                  ➜ Resolved New Time: {new Date(c.resolvedStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TwoWayCalendarSyncManager;
