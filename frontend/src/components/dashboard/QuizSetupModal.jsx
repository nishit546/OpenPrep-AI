import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, BookOpen, Loader2, Sparkles, X } from 'lucide-react';
import API from '../../services/api';

const LANGUAGE_OPTIONS = [
  { value: 'english', label: 'English' },
  { value: 'hindi', label: 'Hindi' },
  { value: 'hinglish', label: 'Hinglish' },
  { value: 'tamil', label: 'Tamil' },
  { value: 'telugu', label: 'Telugu' },
  { value: 'marathi', label: 'Marathi' },
];

const QuizSetupModal = ({ isOpen, onClose, onQuizGenerated }) => {
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [count, setCount] = useState(5);
  const [language, setLanguage] = useState('english');
  const [loading, setLoading] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const fetchSubjects = async () => {
      try {
        setLoadingSubjects(true);
        const response = await API.get('/academic/subjects');
        const items = Array.isArray(response?.data?.data) ? response.data.data : [];
        setSubjects(items);
        if (items.length > 0 && !subjectId) {
          setSubjectId(items[0].id);
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Unable to load your subjects right now.');
      } finally {
        setLoadingSubjects(false);
      }
    };

    fetchSubjects();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !subjectId) {
      setTopics([]);
      setTopicId('');
      return;
    }

    const fetchTopics = async () => {
      try {
        const response = await API.get(`/academic/topics?subjectId=${subjectId}`);
        const items = Array.isArray(response?.data?.data) ? response.data.data : [];
        setTopics(items);
        setTopicId('');
      } catch (err) {
        setError(err.response?.data?.error || 'Unable to load topics for this subject.');
      }
    };

    fetchTopics();
  }, [isOpen, subjectId]);

  const selectedLanguageLabel = useMemo(() => {
    return LANGUAGE_OPTIONS.find((option) => option.value === language)?.label || 'English';
  }, [language]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subjectId) {
      setError('Please pick a subject before generating a quiz.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await API.post('/quizzes/generate-ai', {
        subjectId,
        topicId: topicId || undefined,
        count: Number(count) || 5,
        language,
      });

      if (onQuizGenerated) {
        onQuizGenerated(response.data.data);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate your quiz.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
                  <Sparkles className="h-4 w-4" /> AI Quiz Composer
                </p>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Generate a multilingual quiz</h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Pick a subject, optional topic, and the language you want your questions and explanations to use.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                disabled={loading}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Subject
                </label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  disabled={loading || loadingSubjects}
                >
                  {loadingSubjects ? (
                    <option value="">Loading subjects...</option>
                  ) : subjects.length === 0 ? (
                    <option value="">No subjects available yet</option>
                  ) : (
                    subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Topic (optional)
                </label>
                <select
                  value={topicId}
                  onChange={(e) => setTopicId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  disabled={loading || loadingSubjects || !subjectId}
                >
                  <option value="">General overview</option>
                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Number of questions
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Target language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    disabled={loading}
                  >
                    {LANGUAGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
                <div className="flex items-center gap-2 font-semibold">
                  <BookOpen className="h-4 w-4" />
                  <span>Preview language</span>
                </div>
                <p className="mt-1">Questions, options, and AI explanations will be generated in {selectedLanguageLabel}.</p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={loading || loadingSubjects || !subjectId}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate Quiz'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default QuizSetupModal;
