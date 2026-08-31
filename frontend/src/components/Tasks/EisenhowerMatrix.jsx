/**
 * @fileoverview Interactive 4-quadrant Eisenhower Matrix for task visualization and management.
 */
import React from 'react';

const quadrants = [
    { id: 1, name: 'Do First', color: 'red', desc: 'Urgent & Important' },
    { id: 2, name: 'Schedule', color: 'blue', desc: 'Not Urgent & Important' },
    { id: 3, name: 'Delegate', color: 'yellow', desc: 'Urgent & Not Important' },
    { id: 4, name: 'Eliminate', color: 'gray', desc: 'Not Urgent & Not Important' }
];

const EisenhowerMatrix = ({ tasks, onMoveTask, onDeleteTask }) => {
    const getTasksByQuadrant = (quadrantId) => tasks.filter(t => t.quadrant === quadrantId && t.status === 'pending');

    const getColorClasses = (color) => {
        const map = {
            red: 'border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10',
            blue: 'border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/10',
            yellow: 'border-yellow-200 dark:border-yellow-900/50 bg-yellow-50/50 dark:bg-yellow-900/10',
            gray: 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50'
        };
        return map[color] || map.gray;
    };

    const getBadgeClasses = (color) => {
        const map = {
            red: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
            blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
            yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
            gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
        };
        return map[color] || map.gray;
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
            {quadrants.map(q => (
                <div key={q.id} className={`rounded-xl border-2 p-4 flex flex-col ${getColorClasses(q.color)}`}>
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">{q.name}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{q.desc}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${getBadgeClasses(q.color)}`}>
                            {getTasksByQuadrant(q.id).length}
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px]">
                        {getTasksByQuadrant(q.id).length === 0 ? (
                            <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8 italic">No tasks here</p>
                        ) : (
                            getTasksByQuadrant(q.id).map(task => (
                                <div key={task.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm group relative">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-semibold text-sm text-gray-900 dark:text-white pr-6">{task.title}</h4>
                                        <button
                                            onClick={() => onDeleteTask(task.id)}
                                            className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Delete task"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{task.description}</p>

                                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            {task.estimatedTimeMinutes}m
                                        </span>

                                        {/* Move Controls */}
                                        <div className="flex gap-1">
                                            {quadrants.filter(qOpt => qOpt.id !== q.id).map(targetQ => (
                                                <button
                                                    key={targetQ.id}
                                                    onClick={() => onMoveTask(task.id, targetQ.id)}
                                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase hover:opacity-80 transition-opacity ${getBadgeClasses(targetQ.color)}`}
                                                    title={`Move to ${targetQ.name}`}
                                                >
                                                    {targetQ.name.split(' ')[0]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default EisenhowerMatrix;
