import React, { useState } from 'react';
import { 
  FileText, 
  BookOpen, 
  Scissors, 
  CheckSquare, 
  Square, 
  Download, 
  Layers, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  Sparkles,
  X
} from 'lucide-react';
import API from '../../services/api';

export default function ChapterSplitSelector({ onClose, onImportToSyllabus }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [inspecting, setInspecting] = useState(false);
  const [docOutline, setDocOutline] = useState(null);
  const [selectedChapters, setSelectedChapters] = useState([]);
  const [splitting, setSplitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        setError('Please select a valid PDF textbook or document.');
        return;
      }
      setSelectedFile(file);
      setDocOutline(null);
      setSelectedChapters([]);
      setError(null);
      setSuccessMessage(null);
    }
  };

  const handleInspectTOC = async () => {
    if (!selectedFile) return;

    setInspecting(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await API.post('/pdf/inspect-toc', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.data) {
        setDocOutline(res.data.data);
        // Default select all detected chapters
        setSelectedChapters(res.data.data.chapters.map((_, idx) => idx));
      }
    } catch (err) {
      console.error('TOC inspection error:', err);
      setError(err.response?.data?.error || 'Failed to inspect PDF Table of Contents.');
    } finally {
      setInspecting(false);
    }
  };

  const toggleChapterSelection = (idx) => {
    setSelectedChapters((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const toggleSelectAll = () => {
    if (!docOutline?.chapters) return;
    if (selectedChapters.length === docOutline.chapters.length) {
      setSelectedChapters([]);
    } else {
      setSelectedChapters(docOutline.chapters.map((_, idx) => idx));
    }
  };

  const handleDownloadSplitZip = async () => {
    if (!selectedFile || selectedChapters.length === 0 || !docOutline) return;

    setSplitting(true);
    setError(null);

    const chaptersToSplit = selectedChapters.map((idx) => docOutline.chapters[idx]);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('chapters', JSON.stringify(chaptersToSplit));

    try {
      const res = await API.post('/pdf/split-chapters', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
      });

      const blob = new Blob([res.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `split_chapters_${Date.now()}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccessMessage(`Successfully sliced ${chaptersToSplit.length} chapters into separate PDF files!`);
      if (onImportToSyllabus) {
        onImportToSyllabus(chaptersToSplit);
      }
    } catch (err) {
      console.error('Split error:', err);
      setError('Failed to split PDF chapters.');
    } finally {
      setSplitting(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-2xl w-full text-gray-100 shadow-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
            <Scissors className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Smart PDF Splitter & TOC Extractor</h3>
            <p className="text-[11px] text-gray-400">Extract Table of Contents & slice heavy textbooks</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Step 1: Upload and Inspect */}
      {!docOutline && (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-700 hover:border-gray-500 rounded-xl p-6 text-center space-y-2 transition-all">
            <FileText className="w-8 h-8 text-primary mx-auto" />
            <div className="text-xs">
              <label className="text-primary hover:text-blue-400 font-bold cursor-pointer underline">
                Select Textbook PDF (up to 500+ pages)
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              <p className="text-gray-400 text-[11px] mt-1">
                {selectedFile ? selectedFile.name : 'Upload heavy textbook or PYQ compilation'}
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleInspectTOC}
            disabled={!selectedFile || inspecting}
            className="w-full py-2.5 bg-primary hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
          >
            <Sparkles className={`w-3.5 h-3.5 ${inspecting ? 'animate-spin' : ''}`} />
            <span>{inspecting ? 'Analyzing Bookmarks & TOC Structure...' : 'Inspect Bookmarks & Table of Contents'}</span>
          </button>
        </div>
      )}

      {/* Step 2: Outline Tree & Chapter Selector */}
      {docOutline && (
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between bg-gray-800/40 p-3 rounded-xl border border-gray-800">
            <div>
              <span className="font-bold text-white block">{selectedFile?.name}</span>
              <span className="text-[11px] text-gray-400">
                {docOutline.totalPages} Total Pages • {docOutline.chapterCount} Chapters/Sections Detected
              </span>
            </div>
            <button
              onClick={toggleSelectAll}
              className="text-primary hover:text-blue-400 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              {selectedChapters.length === docOutline.chapters.length ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5" /> Deselect All
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5" /> Select All ({docOutline.chapters.length})
                </>
              )}
            </button>
          </div>

          {/* Chapter Tree List */}
          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
            {docOutline.chapters.map((ch, idx) => {
              const isSelected = selectedChapters.includes(idx);
              return (
                <div
                  key={idx}
                  onClick={() => toggleChapterSelection(idx)}
                  className={`p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-primary/10 border-primary/40 text-white'
                      : 'bg-gray-800/30 border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-600 shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-200">{ch.chapterNumber}:</span>
                        <span className="text-gray-300 font-medium">{ch.title}</span>
                      </div>
                      <span className="text-[10px] text-gray-500">
                        Pages {ch.startPage} – {ch.endPage} ({ch.pageCount} pages)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {successMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Split Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-800">
            <button
              onClick={() => setDocOutline(null)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-semibold cursor-pointer"
            >
              Choose Another PDF
            </button>

            <button
              onClick={handleDownloadSplitZip}
              disabled={selectedChapters.length === 0 || splitting}
              className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40"
            >
              <Download className={`w-3.5 h-3.5 ${splitting ? 'animate-spin' : ''}`} />
              <span>
                {splitting
                  ? 'Splitting PDF Pages...'
                  : `Download ${selectedChapters.length} Split Chapters (.zip)`}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
