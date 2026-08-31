import React, { useState, useEffect } from 'react';
import API from '../services/api';
import SyllabusUploaderModal from '../components/planner/SyllabusUploaderModal';
import SyllabusCoverageMatrix from '../components/planner/SyllabusCoverageMatrix';
import AdaptiveLearningPath from '../components/dashboard/AdaptiveLearningPath';
import ChapterSplitSelector from '../components/pdf/ChapterSplitSelector';
import { FaBookOpen, FaPlus, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { Loader2, Scissors } from 'lucide-react';

export default function StudyPlanner() {
  const [syllabi, setSyllabi] = useState([]);
  const [selectedSyllabus, setSelectedSyllabus] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [isSplitterOpen, setIsSplitterOpen] = useState(false);
  const [error, setError] = useState('');

  const fetchSyllabi = async () => {
    setLoading(true);
    try {
      const res = await API.get('/syllabus');
      if (res.data?.success) {
        setSyllabi(res.data.data || []);
        if (res.data.data.length > 0) {
          // Select the first syllabus by default
          handleSelectSyllabus(res.data.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load syllabus list.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSyllabus = async (id) => {
    setLoadingAnalysis(true);
    setError('');
    try {
      const res = await API.get(`/syllabus/${id}/gap-analysis`);
      if (res.data?.success) {
        setSelectedSyllabus(id);
        setAnalysisData(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load syllabus analysis details.');
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleImportSuccess = (newData) => {
    setSyllabi((prev) => [...prev, newData]);
    setSelectedSyllabus(newData.syllabusId);
    setAnalysisData(newData);
  };

  useEffect(() => {
    fetchSyllabi();
  }, []);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-inter py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Title bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-neutral-800 pb-6 gap-4">
          <div>
            <h1 className="text-3xl font-black font-playfair tracking-tight text-white">
              AI Syllabus Planner
            </h1>
            <p className="text-stone-400 text-xs mt-1">
              Cross-reference university syllabi against notes and quiz histories to identify preparation gaps.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setIsSplitterOpen(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg hover:shadow-emerald-500/10 cursor-pointer flex items-center gap-1.5"
            >
              <Scissors className="w-3.5 h-3.5" /> Split Textbook PDF
            </button>
            <button
              onClick={() => setIsUploaderOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg hover:shadow-indigo-500/10 cursor-pointer flex items-center gap-1.5"
            >
              <FaPlus /> Import PDF Syllabus
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-400 font-semibold">
            <FaExclamationCircle className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <AdaptiveLearningPath />

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
            <p className="text-xs text-stone-400 font-semibold">Scanning curriculum catalogs...</p>
          </div>
        ) : syllabi.length === 0 ? (
          /* Empty state */
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-2xl space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-850 rounded-full text-indigo-400">
              <FaBookOpen className="text-3xl" />
            </div>
            <div className="space-y-2">
              <h2 className="text-stone-100 font-extrabold font-playfair text-xl">Optimize Your Curriculum</h2>
              <p className="text-stone-400 text-xs leading-relaxed">
                Scan your official university syllabus PDF to instantly cross-reference it against your actual study notes and quiz scores. Detect knowledge blind spots before exam day.
              </p>
            </div>
            <button
              onClick={() => setIsUploaderOpen(true)}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition shadow-lg hover:shadow-indigo-500/10 cursor-pointer"
            >
              Upload Your First Syllabus PDF
            </button>
          </div>
        ) : (
          /* Active state with syllabus catalog selector & matrix view */
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Catalog Selector */}
            <div className="lg:col-span-1 space-y-4">
              <h3 className="text-stone-400 font-black text-[10px] uppercase tracking-widest">Syllabus Catalog</h3>
              <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
                {syllabi.map((s) => (
                  <button
                    key={s.id || s.syllabusId}
                    onClick={() => handleSelectSyllabus(s.id || s.syllabusId)}
                    className={`w-full text-left px-4 py-3 rounded-2xl border text-xs font-bold transition cursor-pointer shrink-0 sm:shrink ${
                      selectedSyllabus === (s.id || s.syllabusId)
                        ? 'bg-neutral-800 border-indigo-500 text-white'
                        : 'bg-neutral-900/60 border-neutral-850 text-stone-400 hover:border-neutral-750 hover:text-stone-200'
                    }`}
                  >
                    📖 {s.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Analysis details */}
            <div className="lg:col-span-3">
              {loadingAnalysis ? (
                <div className="flex flex-col items-center justify-center py-20 bg-neutral-900 border border-neutral-800 rounded-3xl min-h-[300px]">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
                  <p className="text-xs text-stone-400 font-semibold">Stitching notes & quiz attempts...</p>
                </div>
              ) : analysisData ? (
                <SyllabusCoverageMatrix
                  syllabusName={analysisData.name}
                  initialCoverage={analysisData.coveragePercentage}
                  initialTopics={analysisData.topics}
                  syllabusId={selectedSyllabus}
                />
              ) : null}
            </div>

          </div>
        )}

        <SyllabusUploaderModal
          isOpen={isUploaderOpen}
          onClose={() => setIsUploaderOpen(false)}
          onImported={handleImportSuccess}
        />

        {isSplitterOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <ChapterSplitSelector
              onClose={() => setIsSplitterOpen(false)}
              onImportToSyllabus={(splitChapters) => {
                fetchSyllabi();
              }}
            />
          </div>
        )}

      </div>
    </div>
  );
}
