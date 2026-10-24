import React from 'react';
import { Tag, X, Check } from 'lucide-react';

export default function TagFilterBar({
  availableTags = [],
  activeTags = [],
  onToggleTag,
  onClearTags,
  tagCounts = {}
}) {
  const isAllActive = activeTags.length === 0;

  return (
    <div className="w-full flex items-center gap-2 overflow-x-auto py-2 px-1 scrollbar-thin scrollbar-thumb-neutral-700">
      <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-semibold flex-shrink-0 mr-1">
        <Tag className="w-3.5 h-3.5 text-amber-500" />
        <span>Filter Tags:</span>
      </div>

      {/* "All" pill */}
      <button
        onClick={onClearTags}
        className={`px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition flex items-center gap-1 cursor-pointer ${
          isAllActive
            ? 'bg-amber-500 text-black font-bold shadow-sm shadow-amber-500/20'
            : 'bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300'
        }`}
      >
        <span>All</span>
        {isAllActive && <Check className="w-3 h-3" />}
      </button>

      {/* Dynamic Tag Pills */}
      {availableTags.map((tag) => {
        const isActive = activeTags.includes(tag);
        const count = tagCounts[tag];

        return (
          <button
            key={tag}
            onClick={() => onToggleTag(tag)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
              isActive
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                : 'bg-neutral-800/60 hover:bg-neutral-800 text-neutral-300 border border-neutral-700/50'
            }`}
          >
            <span>#{tag}</span>
            {count !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? 'bg-amber-400/20 text-amber-200' : 'bg-neutral-700 text-neutral-400'
                }`}
              >
                {count}
              </span>
            )}
            {isActive && <X className="w-3 h-3 ml-0.5 opacity-80" />}
          </button>
        );
      })}

      {activeTags.length > 0 && (
        <button
          onClick={onClearTags}
          className="text-xs text-neutral-400 hover:text-white underline ml-2 flex-shrink-0 cursor-pointer"
        >
          Reset filters ({activeTags.length})
        </button>
      )}
    </div>
  );
}
