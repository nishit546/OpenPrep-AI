import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Youtube, Sparkles, Loader, AlertCircle, CheckSquare, Square } from 'lucide-react';
import API from '../../services/api';

const GenerateFlashcardsFromYouTubeModal = ({ onClose, onImported }) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [cards, setCards] = useState([]); // [{ front, back, selected }]
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const res = await API.get('/academic/subjects');
        const list = res?.data?.data || [];
        setSubjects(list);
        if (list.length > 0) setSubjectId(list[0].id);
      } catch (err) {
        setError('Failed to load subjects.');
      } finally {
        setLoadingSubjects(false);
      }
    };
    loadSubjects();
  }, []);

  const handleGenerate = async () => {
    if (!youtubeUrl.trim() || !subjectId) return;
    setGenerating(true);
    setError(null);
    setCards([]);
    try {
      const res = await API.post('/flashcards/from-youtube', { youtubeUrl, subjectId });
      const generated = res?.data?.data || [];
      setCards(generated.map((c) => ({ ...c, selected: true })));
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to generate flashcards from this video.');
    } finally {
      setGenerating(false);
    }
  };

  const toggleCard = (idx) => {
    setCards((prev) => prev.map((c, i) => (i === idx ? { ...c, selected: !c.selected } : c)));
  };

  const editCard = (idx, field, value) => {
    setCards((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  };

  const handleImport = async () => {
    const selectedCards = cards.filter((c) => c.selected).map(({ front, back }) => ({ front, back }));
    if (selectedCards.length === 0 || !subjectId) return;

    setImporting(true);
    setError(null);
    try {
      await API.post(`/flashcards/import?subjectId=${subjectId}`, { cards: selectedCards });
      onImported?.(selectedCards.length);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to import flashcards.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Youtube className="w-5 h-5 text-red-600" /> Generate Flashcards from YouTube
            </h3>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 mb-4">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          {cards.length === 0 && (
            <div className="space-y-4 mb-2">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                  YouTube lecture URL
                </label>
                <input
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Save to subject
                </label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  disabled={loadingSubjects || subjects.length === 0}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:border-indigo-500"
                >
                  {subjects.length === 0 && <option value="">No subjects available</option>}
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating || !youtubeUrl.trim() || !subjectId}
                  className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" /> Extracting transcript&hellip;
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> Generate
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {cards.length > 0 && (
            <>
              <p className="text-sm text-slate-500 mb-4">
                Review, edit, or deselect cards before adding them to your deck.
              </p>
              <div className="space-y-3 mb-4">
                {cards.map((card, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <button type="button" onClick={() => toggleCard(idx)} className="mt-1 shrink-0">
                      {card.selected ? (
                        <CheckSquare className="w-5 h-5 text-indigo-600" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-400" />
                      )}
                    </button>
                    <div className="flex-1 space-y-2">
                      <input
                        value={card.front}
                        onChange={(e) => editCard(idx, 'front', e.target.value)}
                        className="w-full text-sm font-medium bg-transparent border-b border-slate-200 dark:border-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                      <input
                        value={card.back}
                        onChange={(e) => editCard(idx, 'back', e.target.value)}
                        className="w-full text-sm text-slate-500 bg-transparent border-b border-slate-200 dark:border-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || cards.filter((c) => c.selected).length === 0}
                  className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                >
                  {importing ? 'Importing...' : `Import Selected (${cards.filter((c) => c.selected).length})`}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GenerateFlashcardsFromYouTubeModal;