import React from 'react';

const COLOR_CATEGORIES = [
  { name: 'Key Concept', value: '#FFE900', label: 'Yellow' },
  { name: 'Definition', value: '#90EE90', label: 'Green' },
  { name: 'Formula', value: '#FF9EDB', label: 'Pink' },
];

const PDFAnnotationToolbar = ({
  pageNumber,
  numPages,
  scale,
  activeMode = 'select', // 'select' | 'highlight' | 'pen' | 'sticky'
  selectedColor = '#FFE900',
  onPrevPage,
  onNextPage,
  onZoomIn,
  onZoomOut,
  onModeChange,
  onColorChange,
  onExportHighlights,
  onToggleSidebar,
  sidebarOpen,
}) => {
  return (
    <div
      className="pdf-toolbar flex flex-wrap items-center gap-2 p-2 bg-neutral-100 border-b border-neutral-300 text-xs select-none"
    >
      {/* Navigation */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onPrevPage}
          disabled={pageNumber <= 1}
          className="px-2 py-1 bg-white border border-neutral-300 rounded hover:bg-neutral-50 disabled:opacity-50 font-medium"
        >
          Prev
        </button>
        <span className="px-1 text-neutral-700 font-semibold">
          Page {pageNumber} of {numPages || '-'}
        </span>
        <button
          type="button"
          onClick={onNextPage}
          disabled={pageNumber >= numPages}
          className="px-2 py-1 bg-white border border-neutral-300 rounded hover:bg-neutral-50 disabled:opacity-50 font-medium"
        >
          Next
        </button>
      </div>

      <div className="w-[1px] h-5 bg-neutral-300 mx-1" />

      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onZoomOut}
          className="px-2 py-1 bg-white border border-neutral-300 rounded hover:bg-neutral-50 font-bold"
        >
          -
        </button>
        <span className="px-1 text-neutral-700 font-mono">
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          onClick={onZoomIn}
          className="px-2 py-1 bg-white border border-neutral-300 rounded hover:bg-neutral-50 font-bold"
        >
          +
        </button>
      </div>

      <div className="w-[1px] h-5 bg-neutral-300 mx-1" />

      {/* Tool Mode selector */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onModeChange && onModeChange('select')}
          className={`px-2.5 py-1 rounded border font-medium transition-colors ${
            activeMode === 'select'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
          }`}
        >
          🖐 Select
        </button>
        <button
          type="button"
          onClick={() => onModeChange && onModeChange('highlight')}
          className={`px-2.5 py-1 rounded border font-medium transition-colors ${
            activeMode === 'highlight'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
          }`}
        >
          🖊 Highlight
        </button>
        <button
          type="button"
          onClick={() => onModeChange && onModeChange('pen')}
          className={`px-2.5 py-1 rounded border font-medium transition-colors ${
            activeMode === 'pen'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
          }`}
        >
          ✏️ Freehand Pen
        </button>
        <button
          type="button"
          onClick={() => onModeChange && onModeChange('sticky')}
          className={`px-2.5 py-1 rounded border font-medium transition-colors ${
            activeMode === 'sticky'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
          }`}
        >
          📝 Sticky Note
        </button>
      </div>

      {/* Color categories */}
      <div className="flex items-center gap-1.5 ml-1">
        {COLOR_CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => onColorChange && onColorChange(c.value)}
            title={`${c.name} (${c.label})`}
            className={`w-5 h-5 rounded border transition-transform ${
              selectedColor === c.value ? 'scale-125 ring-2 ring-indigo-500' : 'hover:scale-110'
            }`}
            style={{ backgroundColor: c.value, borderColor: '#ccc' }}
          />
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onExportHighlights}
          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded shadow-sm flex items-center gap-1 transition-colors"
        >
          📥 Export Highlights
        </button>
        <button
          type="button"
          onClick={onToggleSidebar}
          className={`px-3 py-1 font-medium rounded border shadow-sm flex items-center gap-1 transition-colors ${
            sidebarOpen
              ? 'bg-indigo-700 text-white border-indigo-700'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600'
          }`}
        >
          🤖 AI Assistant
        </button>
      </div>
    </div>
  );
};

export default PDFAnnotationToolbar;