/**
 * @fileoverview Main hub for managing calendar integrations and viewing sync status.
 */
import React, { useState, useEffect } from 'react';
import CalendarSyncSettings from '../components/Settings/CalendarSyncSettings';

const CalendarIntegrationHub = () => {
    const [status, setStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const response = await fetch(`${API_URL}/calendar/status`);
            const data = await response.json();
            if (data.success) setStatus(data.data);
        } catch (err) {
            setError('Failed to load calendar status.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleConnect = async (provider) => {
        try {
            const response = await fetch(`${API_URL}/calendar/auth/${provider}`);
            const data = await response.json();
            if (data.success && data.data.authUrl) {
                // In a real app, redirect to data.data.authUrl
                // For demo, we simulate a successful connection
                setStatus({ isConnected: true, provider, isEnabled: true, daysInAdvance: 3 });
            }
        } catch (err) {
            setError('Failed to initiate connection.');
        }
    };

    const handleDisconnect = async () => {
        try {
            await fetch(`${API_URL}/calendar/disconnect`, { method: 'DELETE' });
            setStatus({ isConnected: false });
        } catch (err) {
            setError('Failed to disconnect.');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Calendar Integration</h1>
                    <p className="text-gray-600 dark:text-gray-400">Never miss a study session. Sync your spaced repetition schedule directly to your calendar.</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-center">
                        {error}
                    </div>
                )}

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
                    {!status?.isConnected ? (
                        <div className="text-center space-y-6">
                            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto">
                                <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Connect Your Calendar</h3>
                                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">Choose your preferred calendar provider to enable automatic study session scheduling.</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <button
                                    onClick={() => handleConnect('google')}
                                    className="px-6 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                                    Connect Google Calendar
                                </button>
                                <button
                                    onClick={() => handleConnect('outlook')}
                                    className="px-6 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M1 3h22v18H1V3zm2 2v14h8V5H3zm10 0v14h8V5h-8z" /></svg>
                                    Connect Outlook
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize">{status.provider} Connected</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Last synced: {new Date(status.lastSyncedAt).toLocaleString()}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleDisconnect}
                                    className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                                >
                                    Disconnect
                                </button>
                            </div>

                            <CalendarSyncSettings status={status} onStatusUpdate={setStatus} />

                            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Two-Way Sync Active
                                </h4>
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                    When you complete a study session in OpenPrep-AI, the corresponding calendar event will be automatically marked as completed or removed, keeping your schedule clean and up-to-date.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CalendarIntegrationHub;
