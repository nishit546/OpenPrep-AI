import React from 'react';

const HIGHLIGHT_CATEGORIES = [
  { name: 'Key Concept', value: '#FFE900', label: 'Yellow' },
  { name: 'Definition', value: '#90EE90', label: 'Green' },
  { name: 'Formula', value: '#FF9EDB', label: 'Pink' },
];

const SelectionActionPill = ({
  position,
  onHighlight,
  onAddNote,
  onExplain,
  onCreateFlashcard,
  onGenerateMCQ,
}) => {
  if (!position) return null;

  return (
    <div
      className="selection-action-pill shadow-xl border border-neutral-700 select-none"
      role="menu"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: '#1e293b',
        color: '#ffffff',
        padding: '6px 10px',
        borderRadius: '20px',
        position: 'absolute',
        top: position.top,
        left: position.left,
        zIndex: 100,
        whiteSpace: 'nowrap',
      }}
    >
      {/* Color swatches */}
      <div className="flex items-center gap-1 pr-1 border-r border-neutral-600">
        {HIGHLIGHT_CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            role="menuitem"
            style={{ backgroundColor: c.value }}
            className="w-4 h-4 rounded-full border border-neutral-300 hover:scale-125 transition-transform"
            onClick={() => onHighlight(c.value, c.name)}
            title={`Highlight as ${c.name}`}
            aria-label={`Highlight as ${c.name}`}
          />
        ))}
      </div>

      {/* AI Actions */}
      <button
        type="button"
        role="menuitem"
        onClick={onExplain}
        className="px-2 py-1 text-xs font-semibold text-amber-300 hover:text-amber-200 hover:bg-neutral-800 rounded transition-colors flex items-center gap-1"
      >
        💡 Explain
      </button>

      <button
        type="button"
        role="menuitem"
        onClick={onCreateFlashcard}
        className="px-2 py-1 text-xs font-semibold text-cyan-300 hover:text-cyan-200 hover:bg-neutral-800 rounded transition-colors flex items-center gap-1"
      >
        🃏 Flashcard
      </button>

      <button
        type="button"
        role="menuitem"
        onClick={onGenerateMCQ}
        className="px-2 py-1 text-xs font-semibold text-emerald-300 hover:text-emerald-200 hover:bg-neutral-800 rounded transition-colors flex items-center gap-1"
      >
        ❓ Practice MCQ
      </button>

      <div className="w-[1px] h-4 bg-neutral-600 my-auto" />

      <button
        type="button"
        role="menuitem"
        onClick={onAddNote}
        className="px-2 py-1 text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 rounded transition-colors"
      >
        📝 Note
      </button>
    </div>
  );
};

export default SelectionActionPill;
