import { Check, AlertCircle, RefreshCw } from 'lucide-react';

const Shimmer = ({ className = '' }) => (
  <div className={`animate-pulse bg-neutral-300/60 rounded ${className}`} />
);

const PinnedTasks = ({ tasks = [], loading = false, error = null, onRetry, onToggle }) => {
  if (loading) {
    return (
      <div className="relative bg-[#fdfaf3] shadow-[4px_6px_15px_rgba(0,0,0,0.15)] rounded-sm p-6 max-w-sm mx-auto transform rotate-1 hover:rotate-0 transition-transform">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-600 rounded-full shadow-[inset_-2px_-2px_4px_rgba(0,0,0,0.5),2px_4px_4px_rgba(0,0,0,0.3)] z-10">
          <div className="absolute top-1 left-1 w-1 h-1 bg-white/50 rounded-full" />
          <div className="absolute top-4 left-1 w-0.5 h-3 bg-black/20 origin-top rotate-45 pointer-events-none" />
        </div>
        <h3 className="font-playfair font-bold text-2xl text-red-800/80 text-center mb-4 border-b border-red-800/20 pb-2">To-Do List</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Shimmer className="w-5 h-5 shrink-0" />
              <Shimmer className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative bg-[#fdfaf3] shadow-[4px_6px_15px_rgba(0,0,0,0.15)] rounded-sm p-6 max-w-sm mx-auto transform rotate-1 hover:rotate-0 transition-transform">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-600 rounded-full" />
        <h3 className="font-playfair font-bold text-2xl text-red-800/80 text-center mb-4 border-b border-red-800/20 pb-2">To-Do List</h3>
        <div className="flex flex-col items-center text-neutral-500 py-4">
          <AlertCircle className="w-8 h-8 mb-2" />
          <p className="text-sm text-center mb-3">Could not load tasks</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-1 text-red-800 hover:text-red-900 font-semibold text-xs uppercase tracking-wider"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="relative bg-[#fdfaf3] shadow-[4px_6px_15px_rgba(0,0,0,0.15)] rounded-sm p-6 max-w-sm mx-auto transform rotate-1 hover:rotate-0 transition-transform">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-600 rounded-full shadow-[inset_-2px_-2px_4px_rgba(0,0,0,0.5),2px_4px_4px_rgba(0,0,0,0.3)] z-10">
          <div className="absolute top-1 left-1 w-1 h-1 bg-white/50 rounded-full" />
          <div className="absolute top-4 left-1 w-0.5 h-3 bg-black/20 origin-top rotate-45 pointer-events-none" />
        </div>
        <h3 className="font-playfair font-bold text-2xl text-red-800/80 text-center mb-4 border-b border-red-800/20 pb-2">To-Do List</h3>
        <p className="text-center text-neutral-500 italic py-6 text-sm">
          No tasks for today — generate a study plan to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="relative bg-[#fdfaf3] shadow-[4px_6px_15px_rgba(0,0,0,0.15)] rounded-sm p-6 max-w-sm mx-auto transform rotate-1 hover:rotate-0 transition-transform">
      {/* Torn Top Edge Effect */}
      <div className="absolute top-0 left-0 right-0 h-3 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAiIHByZXNlcnZlQXNwZWN0UmF0aW89Im5vbmUiPjxwYXRoIGQ9Ik0wIDEwTDIwIDBMNDAgMTBMNjAgMEw4MCAxMEwxMDAgMFYxMEgwWiIgZmlsbD0iI2ZkZmFmMyIvPjwvc3ZnPg==')] -translate-y-full" />

      {/* Red Pushpin */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-600 rounded-full shadow-[inset_-2px_-2px_4px_rgba(0,0,0,0.5),2px_4px_4px_rgba(0,0,0,0.3)] z-10">
        <div className="absolute top-1 left-1 w-1 h-1 bg-white/50 rounded-full" />
        {/* Pin shadow on paper */}
        <div className="absolute top-4 left-1 w-0.5 h-3 bg-black/20 origin-top rotate-45 pointer-events-none" />
      </div>

      <h3 className="font-playfair font-bold text-2xl text-red-800/80 text-center mb-4 border-b border-red-800/20 pb-2">To-Do List</h3>

      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-start cursor-pointer group"
            onClick={() => onToggle?.(task.id)}
          >
            <div className={`mt-1 w-5 h-5 border-2 rounded-sm flex items-center justify-center shrink-0 transition-colors ${task.completed ? 'border-green-600 bg-green-50' : 'border-neutral-400 bg-white group-hover:border-neutral-600'}`}>
              {task.completed && <Check className="w-3 h-3 text-green-600 font-bold" />}
            </div>
            <span className={`ml-3 font-inter text-neutral-800 ${task.completed ? 'line-through text-neutral-400' : ''}`}>
              {task.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PinnedTasks;
