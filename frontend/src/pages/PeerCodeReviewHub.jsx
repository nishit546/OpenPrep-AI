/**
 * @fileoverview Main hub for creating and accessing collaborative code reviews.
 */
import React, { useState, useEffect } from 'react';
import CollaborativeCodeReviewer from '../components/Code/CollaborativeCodeReviewer';
import { io } from 'socket.io-client';

const PeerCodeReviewHub = () => {
    const [activeReviewId, setActiveReviewId] = useState(null);
    const [reviewData, setReviewData] = useState(null);
    const [socket, setSocket] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Form state
    const [newReview, setNewReview] = useState({ title: '', code: '', language: 'javascript', description: '' });

    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

    useEffect(() => {
        const newSocket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');
        setSocket(newSocket);
        return () => newSocket.disconnect();
    }, []);

    const handleCreateReview = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_URL}/code-reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newReview)
            });
            const data = await response.json();
            if (data.success) {
                setActiveReviewId(data.data.id);
                setReviewData(data.data);
                setShowCreateModal(false);
            }
        } catch (error) {
            console.error('Failed to create review:', error);
        }
    };

    if (activeReviewId && reviewData) {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex flex-col">
                <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 shrink-0">
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white">{reviewData.title}</h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{reviewData.language} • {reviewData.description}</p>
                    </div>
                    <button
                        onClick={() => { setActiveReviewId(null); setReviewData(null); }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        Back to Hub
                    </button>
                </header>
                <main className="flex-1 p-4 overflow-hidden">
                    <CollaborativeCodeReviewer
                        reviewId={activeReviewId}
                        code={reviewData.code}
                        language={reviewData.language}
                        socket={socket}
                    />
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Peer Code Review</h1>
                        <p className="text-gray-600 dark:text-gray-400">Collaborate, annotate, and improve code together in real time.</p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        New Review
                    </button>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Active Reviews</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">Create a new code review to start collaborating with your study squad.</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                    >
                        Create Your First Review
                    </button>
                </div>

                {/* Create Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-700 p-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create Code Review</h2>
                            <form onSubmit={handleCreateReview} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                                    <input
                                        type="text"
                                        value={newReview.title}
                                        onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Language</label>
                                        <select
                                            value={newReview.language}
                                            onChange={(e) => setNewReview({ ...newReview, language: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="javascript">JavaScript</option>
                                            <option value="python">Python</option>
                                            <option value="java">Java</option>
                                            <option value="cpp">C++</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                        <input
                                            type="text"
                                            value={newReview.description}
                                            onChange={(e) => setNewReview({ ...newReview, description: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code</label>
                                    <textarea
                                        value={newReview.code}
                                        onChange={(e) => setNewReview({ ...newReview, code: e.target.value })}
                                        rows={8}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                        required
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
                                    <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">Create Review</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PeerCodeReviewHub;
