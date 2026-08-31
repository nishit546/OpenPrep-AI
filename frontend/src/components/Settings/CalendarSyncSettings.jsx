/**
 * @fileoverview Settings component for managing calendar sync preferences.
 */
import React, { useState } from 'react';

const CalendarSyncSettings = ({ status, onStatusUpdate }) => {
    const [isEnabled, setIsEnabled] = useState(status?.isEnabled ?? false);
    const [daysInAdvance, setDaysInAdvance] = useState(status?.daysInAdvance ?? 3);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/calendar/preferences`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isEnabled, daysInAdvance })
            });
            const data = await response.json();
            if (data.success) {
                onStatusUpdate({ ...status, isEnabled, daysInAdvance });
            }
        } catch (error) {
            console.error('Failed to save preferences:', error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!status?.isConnected) return null;

    return (
        <div className="mt-6 p-5 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Sync Preferences
            </h4>

            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Enable Calendar Sync</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Automatically add due flashcards to your calendar.</p>
                </div>
                <button
                    onClick={() => setIsEnabled(!isEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>

            {isEnabled && (
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <label className="text-sm font-medium text-gray-900 dark:text-white">Days in Advance</label>
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{daysInAdvance} days</span>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max="14"
                        value={daysInAdvance}
                        onChange={(e) => setDaysInAdvance(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Schedule reviews up to {daysInAdvance} days before they are due.</p>
                </div>
            )}

            <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors"
            >
                {isSaving ? 'Saving...' : 'Save Preferences'}
            </button>
        </div>
    );
};

export default CalendarSyncSettings;
