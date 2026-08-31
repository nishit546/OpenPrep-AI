import React, { useState, useEffect } from 'react';
import { getQueuedMutations } from '../services/offlineStorage';
import { initSyncManager } from '../services/syncManager';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    async function checkPending() {
      try {
        const mutations = await getQueuedMutations();
        setPendingCount(mutations.length);
      } catch (e) {
        setPendingCount(0);
      }
    }
    checkPending();

    initSyncManager(({ isOnline: onlineStatus }) => {
      setIsOnline(onlineStatus);
      checkPending();
    });
  }, []);

  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 px-4 py-2.5 rounded-2xl shadow-xl text-white text-xs font-semibold flex items-center space-x-2.5 z-50 backdrop-blur-md border border-white/10 ${
        isOnline ? 'bg-indigo-600/90' : 'bg-amber-600/90'
      }`}
    >
      <span className="relative flex h-2.5 w-2.5">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            isOnline ? 'bg-indigo-300' : 'bg-amber-300'
          }`}
        />
        <span
          className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
            isOnline ? 'bg-indigo-400' : 'bg-amber-400'
          }`}
        />
      </span>
      <span>
        {isOnline
          ? `Syncing changes... (${pendingCount} pending)`
          : `Offline Mode (${pendingCount} pending reviews)`}
      </span>
    </div>
  );
}
