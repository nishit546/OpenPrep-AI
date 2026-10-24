import React, { useState } from 'react';
import {
  Tag,
  FolderInput,
  Download,
  Trash2,
  X,
  CheckSquare,
  Square,
  AlertTriangle,
  Folder,
  Check
} from 'lucide-react';

export default function BatchActionToolbar({
  selectedCount = 0,
  selectedIds = [],
  totalFilteredCount = 0,
  isAllSelected = false,
  onSelectAll,
  onClearSelection,
  onBatchTag,
  onBatchMove,
  onBatchExport,
  onBatchDelete,
  availableDecks = []
}) {
  const [showTagModal, setShowTagModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [tagInput, setTagInput] = useState('');
  const [selectedTargetDeck, setSelectedTargetDeck] = useState('');

  if (selectedCount === 0) return null;

  const handleApplyTag = () => {
    if (!tagInput.trim()) return;
    onBatchTag && onBatchTag(tagInput.trim());
    setTagInput('');
    setShowTagModal(false);
  };

  const handleApplyMove = () => {
    if (!selectedTargetDeck) return;
    onBatchMove && onBatchMove(selectedTargetDeck);
    setSelectedTargetDeck('');
    setShowMoveModal(false);
  };

  const handleConfirmDelete = () => {
    onBatchDelete && onBatchDelete();
    setShowDeleteModal(false);
  };

  return (
    <>
      {/* Floating Bottom Bar */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 w-full max-w-3xl px-4 animate-slideUp">
        <div className="bg-neutral-900/95 backdrop-blur-xl border border-neutral-700/80 rounded-2xl p-3 shadow-2xl flex items-center justify-between text-xs text-white">
          {/* Left section: selection counter and select-all */}
          <div className="flex items-center gap-3">
            <button
              onClick={isAllSelected ? onClearSelection : onSelectAll}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 transition cursor-pointer"
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-amber-400" />
              ) : (
                <Square className="w-4 h-4 text-neutral-400" />
              )}
              <span className="font-semibold">
                {isAllSelected ? 'Deselect All' : `Select All (${totalFilteredCount})`}
              </span>
            </button>

            <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
              {selectedCount} card{selectedCount > 1 ? 's' : ''} selected
            </span>
          </div>

          {/* Right section: Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Tag Button */}
            <button
              onClick={() => setShowTagModal(true)}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700/70 rounded-xl flex items-center gap-1.5 transition cursor-pointer text-neutral-200 hover:text-white"
              title="Add Tag to Selected"
            >
              <Tag className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Add Tag</span>
            </button>

            {/* Move to Deck Button */}
            <button
              onClick={() => setShowMoveModal(true)}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700/70 rounded-xl flex items-center gap-1.5 transition cursor-pointer text-neutral-200 hover:text-white"
              title="Move to Deck"
            >
              <FolderInput className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Move</span>
            </button>

            {/* Export Button */}
            <button
              onClick={onBatchExport}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700/70 rounded-xl flex items-center gap-1.5 transition cursor-pointer text-neutral-200 hover:text-white"
              title="Export Selected"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {/* Delete Button */}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 rounded-xl flex items-center gap-1.5 transition cursor-pointer text-red-300"
              title="Delete Selected"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">Delete</span>
            </button>

            {/* Cancel/Close Button */}
            <button
              onClick={onClearSelection}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg bg-neutral-800 transition cursor-pointer ml-1"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Tag Modal */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-400" /> Add Tag to {selectedCount} Cards
              </h4>
              <button
                onClick={() => setShowTagModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="e.g. High-Yield, Organic, Physics"
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowTagModal(false)}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyTag}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
              >
                Apply Tag
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move to Deck Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <FolderInput className="w-4 h-4 text-blue-400" /> Move {selectedCount} Cards to Deck
              </h4>
              <button
                onClick={() => setShowMoveModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <select
              value={selectedTargetDeck}
              onChange={(e) => setSelectedTargetDeck(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="">Select destination deck...</option>
              {availableDecks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name || d.title}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowMoveModal(false)}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyMove}
                disabled={!selectedTargetDeck}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold"
              >
                Move Cards
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Delete {selectedCount} Cards?</h4>
                <p className="text-xs text-neutral-400">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-neutral-300">
              Are you sure you want to permanently delete these {selectedCount} selected flashcards from your collection?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
