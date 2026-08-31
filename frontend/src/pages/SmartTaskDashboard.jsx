/**
 * @fileoverview Main dashboard for the Eisenhower Matrix, task creation, and Focus Mode.
 */
import React, { useState, useEffect } from 'react';
import EisenhowerMatrix from '../components/Tasks/EisenhowerMatrix';
import axios from 'axios';

const SmartTaskDashboard = () => {
    const [tasks, setTasks] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false);

    // Form state
    const [newTask, setNewTask] = useState({ title: '', description: '', deadline: '' });
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            const response = await axios.get(`${API_URL}/tasks`);
            if (response.data.success) setTasks(response.data.data);
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        setIsAnalyzing(true);
        try {
            const response = await axios.post(`${API_URL}/tasks`, newTask);
            if (response.data.success) {
                setTasks([response.data.data, ...tasks]);
                setNewTask({ title: '', description: '', deadline: '' });
                setIsModalOpen(false);
            }
        } catch (error) {
            console.error('Failed to create task:', error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleMoveTask = async (taskId, newQuadrant) => {
        try {
            await axios.put(`${API_URL}/tasks/${taskId}`, { quadrant: newQuadrant });
            setTasks(tasks.map(t => t.id === taskId ? { ...t, quadrant: newQuadrant } : t));
        } catch (error) {
            console.error('Failed to move task:', error);
        }
    };

    const handleDeleteTask = async (taskId) => {
        try {
            await axios.delete(`${API_URL}/tasks/${taskId}`);
            setTasks(tasks.filter(t => t.id !== taskId));
        } catch (error) {
            console.error('Failed to delete task:', error);
        }
    };

    // Focus Mode: Top 3 tasks from Quadrant 1, then Quadrant 2, sorted by estimated time
    const focusTasks = [...tasks]
        .filter(t => (t.quadrant === 1 || t.quadrant === 2) && t.status === 'pending')
        .sort((a, b) => a.quadrant - b.quadrant || a.estimatedTimeMinutes - b.estimatedTimeMinutes)
        .slice(0, 3);

    if (isFocusMode) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8 relative">
                <button
                    onClick={() => setIsFocusMode(false)}
                    className="absolute top-6 right-6 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                    Exit Focus Mode
                </button>

                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold mb-4">Focus Mode</h1>
                    <p className="text-gray-400 text-lg">Tackle these high-priority tasks one by one.</p>
                </div>

                <div className="w-full max-w-2xl space-y-6">
                    {focusTasks.length === 0 ? (
                        <p className="text-center text-gray-500 text-xl">No high-priority tasks. Great job!</p>
                    ) : (
                        focusTasks.map((task, idx) => (
                            <div key={task.id} className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex items-center gap-4 shadow-2xl">
                                <span className="text-3xl font-bold text-blue-500 w-12 text-center">{idx + 1}</span>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold mb-1">{task.title}</h3>
                                    <p className="text-gray-400 text-sm mb-2">{task.description}</p>
                                    <div className="flex gap-3 text-xs text-gray-500">
                                        <span className="px-2 py-1 bg-gray-700 rounded">{task.quadrantName}</span>
                                        <span className="px-2 py-1 bg-gray-700 rounded">~{task.estimatedTimeMinutes} mins</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        handleMoveTask(task.id, 4); // Move to eliminate/done
                                        setTasks(prev => prev.filter(t => t.id !== task.id)); // Remove from view
                                    }}
                                    className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-xl font-bold transition-colors"
                                >
                                    Complete
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
            <div className="max-w-7xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Smart Task Matrix</h1>
                        <p className="text-gray-600 dark:text-gray-400">AI-powered prioritization for maximum productivity.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsFocusMode(true)}
                            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-purple-500/20"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            Focus Mode
                        </button>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Add Task
                        </button>
                    </div>
                </div>

                {/* Matrix */}
                <div className="flex-1 min-h-0">
                    <EisenhowerMatrix
                        tasks={tasks}
                        onMoveTask={handleMoveTask}
                        onDeleteTask={handleDeleteTask}
                    />
                </div>

                {/* Add Task Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 p-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add New Task</h2>
                            <form onSubmit={handleCreateTask} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task Title</label>
                                    <input
                                        type="text"
                                        value={newTask.title}
                                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (Be specific for better AI sorting)</label>
                                    <textarea
                                        value={newTask.description}
                                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                        rows={3}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deadline (Optional)</label>
                                    <input
                                        type="date"
                                        value={newTask.deadline}
                                        onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isAnalyzing}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                                    >
                                        {isAnalyzing ? 'Analyzing...' : 'Add & Prioritize'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SmartTaskDashboard;
