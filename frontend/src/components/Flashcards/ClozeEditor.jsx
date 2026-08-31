import React, { useState } from 'react';
import { 
  Sparkles, 
  Code, 
  HelpCircle, 
  Plus, 
  RotateCcw, 
  Layers, 
  Check, 
  Eye, 
  EyeOff 
} from 'lucide-react';
import API from '../../services/api';

export default function ClozeEditor({ initialText = '', onSaveCard, onClose }) {
  const [text, setText] = useState(initialText);
  const [clozeCount, setClozeCount] = useState(1);
  const [aiLoading, setAiLoading] = useState(false);
  const [generatedClozes, setGeneratedClozes] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);

  // Convert selected text into cloze deletion {{cN::text}}
  const handleInsertCloze = () => {
    const textarea = document.getElementById('cloze-source-textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = text.substring(start, end);

    if (!selectedText) {
      alert('Please highlight a word or term in the text box to create a cloze deletion.');
      return;
    }

    const nextClozeTag = `{{c${clozeCount}::${selectedText}}}`;
    const newText = text.substring(0, start) + nextClozeTag + text.substring(end);
    setText(newText);
    setClozeCount((prev) => prev + 1);
  };

  const handleAiAutoCloze = async () => {
    if (!text || text.trim().length === 0) {
      alert('Please enter or paste your study notes first.');
      return;
    }

    setAiLoading(true);
    try {
      const response = await API.post('/flashcards/ai/generate-cloze', {
        text,
        count: 5,
      });

      if (response.data?.data) {
        setGeneratedClozes(response.data.data);
      }
    } catch (err) {
      console.error('AI Cloze extraction failed:', err);
      alert('Failed to generate AI cloze cards. Using heuristic extraction.');
    } finally {
      setAiLoading(false);
    }
  };

  // Render preview replacing {{c1::Term}} with [...] or [Term]
  const renderClozePreview = (raw) => {
    return raw.replace(/\{\{c\d+::(.*?)(?:::(.*?))?\}\}/g, (_, term, hint) => {
      return previewMode ? `[${term}]` : `[...${hint ? ` (${hint})` : ''}]`;
    });
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5 max-w-2xl w-full text-gray-100 shadow-2xl">
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-mono font-bold text-sm">
            {`{ }`}
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Interactive Cloze Deletion Studio</h3>
            <p className="text-[11px] text-gray-400">Standard Anki syntax: {`{{c1::key term::hint}}`}</p>
          </div>
        </div>

        <button
          onClick={handleAiAutoCloze}
          disabled={aiLoading}
          className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Sparkles className={`w-3.5 h-3.5 ${aiLoading ? 'animate-spin' : ''}`} />
          <span>{aiLoading ? 'Detecting...' : 'AI Auto-Cloze'}</span>
        </button>
      </div>

      {/* Editor Controls */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400 font-semibold">Highlight text and click to create deletion:</span>
          <button
            onClick={handleInsertCloze}
            className="px-3 py-1 bg-primary hover:bg-blue-600 text-white rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Make Cloze [c{clozeCount}]</span>
          </button>
        </div>

        <textarea
          id="cloze-source-textarea"
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste or type study text here... e.g. Mitochondria is the powerhouse of the cell."
          className="w-full bg-gray-800/80 border border-gray-700 rounded-xl p-3 text-xs md:text-sm text-gray-200 outline-none focus:border-primary font-mono leading-relaxed"
        />
      </div>

      {/* Live Preview Toggle */}
      {text.includes('{{c') && (
        <div className="p-4 bg-gray-800/40 rounded-xl border border-gray-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-gray-300">Live Card View:</span>
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="text-primary hover:text-blue-400 flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
            >
              {previewMode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              <span>{previewMode ? 'Hide Answer' : 'Reveal Answer'}</span>
            </button>
          </div>
          <p className="text-xs text-gray-200 leading-relaxed font-sans bg-gray-900/60 p-3 rounded-lg border border-gray-800">
            {renderClozePreview(text)}
          </p>
        </div>
      )}

      {/* AI Generated Clozes Cards List */}
      {generatedClozes.length > 0 && (
        <div className="space-y-2 pt-2">
          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
            AI Generated Cloze Proposals ({generatedClozes.length})
          </span>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {generatedClozes.map((c, idx) => (
              <div
                key={idx}
                className="p-3 bg-gray-800/60 border border-gray-700 rounded-xl flex items-center justify-between text-xs gap-3"
              >
                <div className="space-y-0.5 flex-1">
                  <p className="text-gray-200 line-clamp-1">{c.front}</p>
                  <span className="text-[10px] text-gray-400">Target: {c.clozeTerm}</span>
                </div>
                <button
                  onClick={() => {
                    if (onSaveCard) onSaveCard(c);
                  }}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer shrink-0"
                >
                  Save Card
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Actions */}
      <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        )}
        <button
          onClick={() => {
            if (onSaveCard) {
              onSaveCard({
                front: text,
                back: 'Cloze Deletion Review',
                isCloze: true,
              });
            }
            if (onClose) onClose();
          }}
          disabled={!text.includes('{{c')}
          className="px-5 py-2 bg-primary hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-40"
        >
          Save Cloze Card
        </button>
      </div>
    </div>
  );
}
