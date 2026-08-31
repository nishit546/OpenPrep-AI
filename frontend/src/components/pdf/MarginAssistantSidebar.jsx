import React, { useState } from 'react';

const MarginAssistantSidebar = ({
  open,
  onClose,
  selectedText,
  aiState, // { loading, mode, explanation, flashcard, mcq, error }
  annotations = [],
  onSaveFlashcard,
  onSaveMCQ,
}) => {
  const [activeTab, setActiveTab] = useState('assistant'); // 'assistant' | 'highlights'
  const [selectedOption, setSelectedOption] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [flashcardFront, setFlashcardFront] = useState('');
  const [flashcardBack, setFlashcardBack] = useState('');

  if (!open) return null;

  const keyConcepts = annotations.filter((a) => a.color === '#FFE900');
  const definitions = annotations.filter((a) => a.color === '#90EE90');
  const formulas = annotations.filter((a) => a.color === '#FF9EDB');
  const notes = annotations.filter((a) => a.commentText);

  return (
    <div
      className="margin-assistant-sidebar fixed right-0 top-0 bottom-0 w-80 sm:w-96 bg-white border-l border-neutral-300 shadow-2xl z-50 flex flex-col font-sans"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-indigo-900 text-white border-b border-indigo-950">
        <div className="flex items-center gap-2">
          <span className="text-base">🤖</span>
          <h3 className="font-semibold text-sm">AI Margin Assistant</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-neutral-300 hover:text-white text-lg font-bold px-2 rounded"
          aria-label="Close Margin Assistant"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 bg-neutral-50 text-xs font-semibold select-none">
        <button
          type="button"
          onClick={() => setActiveTab('assistant')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
            activeTab === 'assistant'
              ? 'border-indigo-600 text-indigo-600 bg-white'
              : 'border-transparent text-neutral-600 hover:text-neutral-900'
          }`}
        >
          AI Copilot
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('highlights')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
            activeTab === 'highlights'
              ? 'border-indigo-600 text-indigo-600 bg-white'
              : 'border-transparent text-neutral-600 hover:text-neutral-900'
          }`}
        >
          Study Notes ({annotations.length})
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {activeTab === 'assistant' && (
          <>
            {selectedText && (
              <div className="p-3 bg-neutral-100 rounded-lg border border-neutral-200">
                <span className="font-semibold text-neutral-500 block mb-1">Selected Text</span>
                <p className="italic text-neutral-800 text-xs line-clamp-3">"{selectedText}"</p>
              </div>
            )}

            {aiState.loading && (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-indigo-600">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span className="font-medium text-xs">Analyzing PDF Selection...</span>
              </div>
            )}

            {aiState.error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                ⚠️ {aiState.error}
              </div>
            )}

            {!aiState.loading && !aiState.explanation && !aiState.flashcard && !aiState.mcq && (
              <div className="text-center py-8 text-neutral-500 space-y-2">
                <span className="text-3xl block">💡</span>
                <p className="font-medium text-xs">Select any text in the PDF to trigger instant AI actions!</p>
                <div className="text-left bg-indigo-50 p-3 rounded border border-indigo-100 text-[11px] text-indigo-800 space-y-1">
                  <div>• <b>Explain:</b> Simplifies complex academic paragraphs</div>
                  <div>• <b>Flashcard:</b> Generates active-recall front/back card</div>
                  <div>• <b>Practice MCQ:</b> Builds instant practice exam question</div>
                </div>
              </div>
            )}

            {/* Explanation View */}
            {aiState.explanation && (
              <div className="space-y-2">
                <div className="font-semibold text-neutral-700 flex items-center gap-1">
                  <span>💡</span> Simple Explanation
                </div>
                <div className="p-3 bg-amber-50/70 border border-amber-200 text-amber-950 rounded-lg whitespace-pre-wrap leading-relaxed text-xs">
                  {aiState.explanation}
                </div>
              </div>
            )}

            {/* Flashcard View */}
            {aiState.flashcard && (
              <div className="space-y-3 bg-indigo-50/50 p-3 rounded-lg border border-indigo-200">
                <div className="font-semibold text-indigo-900 flex items-center gap-1">
                  <span>🃏</span> Generated Flashcard
                </div>
                <div>
                  <label className="font-semibold text-neutral-600 block mb-1">Front (Question / Prompt)</label>
                  <textarea
                    rows={2}
                    className="w-full p-2 border border-neutral-300 rounded text-xs"
                    value={flashcardFront || aiState.flashcard.front}
                    onChange={(e) => setFlashcardFront(e.target.value)}
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-600 block mb-1">Back (Answer / Explanation)</label>
                  <textarea
                    rows={3}
                    className="w-full p-2 border border-neutral-300 rounded text-xs"
                    value={flashcardBack || aiState.flashcard.back}
                    onChange={(e) => setFlashcardBack(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onSaveFlashcard &&
                    onSaveFlashcard({
                      front: flashcardFront || aiState.flashcard.front,
                      back: flashcardBack || aiState.flashcard.back,
                    })
                  }
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded shadow transition-colors"
                >
                  Save to Flashcard Deck
                </button>
              </div>
            )}

            {/* MCQ Quiz View */}
            {aiState.mcq && (
              <div className="space-y-3 bg-emerald-50/50 p-3 rounded-lg border border-emerald-200">
                <div className="font-semibold text-emerald-900 flex items-center gap-1">
                  <span>❓</span> Generated Practice MCQ
                </div>
                <p className="font-medium text-neutral-800 text-xs">{aiState.mcq.question}</p>
                <div className="space-y-1.5">
                  {aiState.mcq.options.map((opt, idx) => {
                    const isCorrect = idx === aiState.mcq.correctAnswer;
                    const isSelected = selectedOption === idx;
                    let btnStyle = 'bg-white border-neutral-300 hover:bg-neutral-50';

                    if (showAnswer) {
                      if (isCorrect) btnStyle = 'bg-emerald-100 border-emerald-500 text-emerald-900 font-semibold';
                      else if (isSelected) btnStyle = 'bg-rose-100 border-rose-500 text-rose-900';
                    } else if (isSelected) {
                      btnStyle = 'bg-indigo-100 border-indigo-500 text-indigo-900 font-semibold';
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedOption(idx)}
                        className={`w-full text-left p-2 border rounded text-xs transition-colors flex items-start gap-2 ${btnStyle}`}
                      >
                        <span className="font-bold">{String.fromCharCode(65 + idx)}.</span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {!showAnswer ? (
                  <button
                    type="button"
                    disabled={selectedOption === null}
                    onClick={() => setShowAnswer(true)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded shadow transition-colors"
                  >
                    Check Answer
                  </button>
                ) : (
                  <div className="p-2.5 bg-white border border-neutral-200 rounded text-xs space-y-1">
                    <span className="font-semibold text-neutral-700 block">Explanation:</span>
                    <p className="text-neutral-600">{aiState.mcq.explanation || 'Option ' + String.fromCharCode(65 + aiState.mcq.correctAnswer) + ' is the correct answer.'}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'highlights' && (
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-amber-700 flex items-center gap-1 mb-2">
                <span>📌</span> Key Concepts ({keyConcepts.length})
              </h4>
              {keyConcepts.length === 0 ? (
                <p className="text-neutral-400 italic text-[11px]">No key concepts highlighted yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {keyConcepts.map((ann) => (
                    <div key={ann.id} className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-950">
                      <span className="font-semibold block mb-0.5">Page {ann.pageNumber}:</span>
                      <p className="line-clamp-5">{ann.selectedText || ann.commentText || 'Highlight'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="font-bold text-emerald-700 flex items-center gap-1 mb-2">
                <span>📖</span> Definitions ({definitions.length})
              </h4>
              {definitions.length === 0 ? (
                <p className="text-neutral-400 italic text-[11px]">No definitions highlighted yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {definitions.map((ann) => (
                    <div key={ann.id} className="p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-950">
                      <span className="font-semibold block mb-0.5">Page {ann.pageNumber}:</span>
                      <p className="line-clamp-5">{ann.selectedText || ann.commentText || 'Definition'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="font-bold text-pink-700 flex items-center gap-1 mb-2">
                <span>📐</span> Formulas ({formulas.length})
              </h4>
              {formulas.length === 0 ? (
                <p className="text-neutral-400 italic text-[11px]">No formulas highlighted yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {formulas.map((ann) => (
                    <div key={ann.id} className="p-2 bg-pink-50 border border-pink-200 rounded text-xs text-pink-950">
                      <span className="font-semibold block mb-0.5">Page {ann.pageNumber}:</span>
                      <p className="line-clamp-5">{ann.selectedText || ann.commentText || 'Formula'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="font-bold text-indigo-700 flex items-center gap-1 mb-2">
                <span>📝</span> Notes & Sticky Pins ({notes.length})
              </h4>
              {notes.length === 0 ? (
                <p className="text-neutral-400 italic text-[11px]">No sticky notes added yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {notes.map((ann) => (
                    <div key={ann.id} className="p-2 bg-indigo-50 border border-indigo-200 rounded text-xs text-indigo-950">
                      <span className="font-semibold block mb-0.5">Page {ann.pageNumber}:</span>
                      <p className="line-clamp-5 whitespace-pre-wrap">{ann.commentText}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarginAssistantSidebar;
