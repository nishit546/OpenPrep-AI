/**
 * @fileoverview Split-screen interface for real-time code review with inline comments and AI review.
 */
import React, { useState, useEffect, useRef } from 'react';

const CollaborativeCodeReviewer = ({ reviewId, code, language, socket }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [selectedLine, setSelectedLine] = useState(null);
    const [aiReview, setAiReview] = useState(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

    useEffect(() => {
        if (!socket || !reviewId) return;

        socket.emit('review:join', { reviewId, userId: 'user_1', username: 'Reviewer_A' });

        socket.on('review:sync', ({ comments: syncedComments }) => {
            setComments(syncedComments);
        });

        socket.on('review:comment_added', (comment) => {
            setComments(prev => [...prev, comment]);
        });

        socket.on('review:comment_resolved', ({ commentId }) => {
            setComments(prev => prev.map(c => c.id === commentId ? { ...c, isResolved: true } : c));
        });

        return () => {
            socket.off('review:sync');
            socket.off('review:comment_added');
            socket.off('review:comment_resolved');
        };
    }, [socket, reviewId]);

    const handleLineClick = (lineNumber) => {
        setSelectedLine(selectedLine === lineNumber ? null : lineNumber);
    };

    const handleAddComment = () => {
        if (!newComment.trim() || !selectedLine) return;

        socket.emit('review:add_comment', {
            lineNumber: selectedLine,
            text: newComment.trim()
        });
        setNewComment('');
        setSelectedLine(null);
    };

    const handleResolve = (commentId) => {
        socket.emit('review:resolve_comment', { commentId });
    };

    const handleAiReview = async () => {
        setIsAiLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/code-reviews/${reviewId}/ai-review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, language })
            });
            const data = await response.json();
            if (data.success) setAiReview(data.data);
        } catch (error) {
            console.error('AI review failed:', error);
        } finally {
            setIsAiLoading(false);
        }
    };

    const lines = code.split('\n');

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Code Editor Side */}
            <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
                    <span className="text-sm font-medium text-gray-300 uppercase">{language}</span>
                    <button
                        onClick={handleAiReview}
                        disabled={isAiLoading}
                        className="px-3 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded-lg transition-colors flex items-center gap-1"
                    >
                        {isAiLoading ? 'Analyzing...' : '✨ Request AI Review'}
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-4 font-mono text-sm">
                    {lines.map((line, idx) => {
                        const lineNumber = idx + 1;
                        const lineComments = comments.filter(c => c.lineNumber === lineNumber && !c.isResolved);

                        return (
                            <div key={idx} className="flex group">
                                <div
                                    onClick={() => handleLineClick(lineNumber)}
                                    className={`w-10 text-right pr-4 select-none cursor-pointer transition-colors ${selectedLine === lineNumber ? 'text-blue-400 font-bold bg-gray-800' : 'text-gray-600 hover:text-gray-400'
                                        }`}
                                >
                                    {lineNumber}
                                </div>
                                <div className="flex-1 relative">
                                    <pre className="text-gray-300 whitespace-pre-wrap break-all">{line || ' '}</pre>
                                    {lineComments.length > 0 && (
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex -space-x-2">
                                            {lineComments.map((c, i) => (
                                                <div key={c.id} className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center border-2 border-gray-900" title={c.authorName}>
                                                    {c.authorName[0]}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Inline Comment Input */}
                {selectedLine && (
                    <div className="p-4 bg-gray-800 border-t border-gray-700">
                        <p className="text-xs text-gray-400 mb-2">Commenting on line {selectedLine}</p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Write your feedback..."
                                className="flex-1 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                            />
                            <button onClick={handleAddComment} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
                                Post
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Comments & AI Review Side */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Feedback & AI Insights</h3>
                </div>
                <div className="flex-1 overflow-auto p-4 space-y-4">
                    {aiReview && (
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800 mb-4">
                            <h4 className="font-bold text-purple-900 dark:text-purple-100 mb-2 flex items-center gap-2">
                                <span>🤖</span> AI Review Summary
                            </h4>
                            <p className="text-sm text-purple-800 dark:text-purple-200 mb-3">{aiReview.summary}</p>
                            <ul className="space-y-2">
                                {aiReview.suggestions.map((suggestion, idx) => (
                                    <li key={idx} className="text-sm text-purple-700 dark:text-purple-300 flex items-start gap-2">
                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0"></span>
                                        {suggestion}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {comments.length === 0 && !aiReview && (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-8">No comments yet. Click a line number to start reviewing.</p>
                    )}

                    {comments.filter(c => !c.isResolved).map(comment => (
                        <div key={comment.id} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">
                                        {comment.authorName[0]}
                                    </span>
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{comment.authorName}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Line {comment.lineNumber}</span>
                                </div>
                                <button
                                    onClick={() => handleResolve(comment.id)}
                                    className="text-xs text-green-600 dark:text-green-400 hover:underline font-medium"
                                >
                                    Resolve
                                </button>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 pl-8">{comment.text}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CollaborativeCodeReviewer;
