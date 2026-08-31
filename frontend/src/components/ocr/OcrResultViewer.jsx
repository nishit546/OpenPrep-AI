import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import axios from 'axios';
import { Sparkles, Plus, Check, GraduationCap, AlertCircle, Copy } from 'lucide-react';
import SentryErrorBoundary from '../common/SentryErrorBoundary';
import 'katex/dist/katex.min.css';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001',
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  },
});

export default function OcrResultViewer({ result, originalImageSrc }) {
  const [editedLatex, setEditedLatex] = useState(result.latex || '');
  const [editedSolution, setEditedSolution] = useState(result.solution || '');
  const [tags, setTags] = useState(result.conceptTags || []);
  const [newTag, setNewTag] = useState('');

  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [topics, setTopics] = useState([]);

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setEditedLatex(result.latex || '');
    setEditedSolution(result.solution || '');
    setTags(result.conceptTags || []);
  }, [result]);

  // Load user subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await api.get('/api/subjects');
        setSubjects(res.data.data || []);
        if (res.data.data?.length > 0) {
          setSelectedSubjectId(res.data.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load subjects:', err);
      }
    };
    fetchSubjects();
  }, []);

  // Fetch topics when subject changes
  useEffect(() => {
    if (!selectedSubjectId) return;
    const fetchTopics = async () => {
      try {
        const res = await api.get(`/api/subjects/${selectedSubjectId}`);
        setTopics(res.data.data?.topics || []);
        if (res.data.data?.topics?.length > 0) {
          setSelectedTopicId(res.data.data.topics[0].id);
        } else {
          setSelectedTopicId('');
        }
      } catch (err) {
        console.error('Failed to load topics:', err);
      }
    };
    fetchTopics();
  }, [selectedSubjectId]);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(editedLatex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddToFlashcards = async () => {
    if (!selectedSubjectId) {
      setErrorMsg('Please select a subject to assign the flashcard.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await api.post('/api/flashcards', {
        front: `Handwritten LaTeX:\n\n${editedLatex}`,
        back: editedSolution || 'Transcribed STEM concepts.',
        subject: selectedSubjectId,
        topic: selectedTopicId || null,
        tags: tags,
      });

      setSuccessMsg('Successfully created flashcard from this STEM solver card!');
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to create flashcard');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 text-slate-100 text-left">
      
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Pane: Original Image Preview & LaTeX Editor */}
        <div className="space-y-4 flex flex-col">
          <div className="space-y-2">
            <span className="text-xs font-black text-slate-450 uppercase tracking-widest">Original Cropped Input</span>
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-2 flex items-center justify-center max-h-[220px] overflow-hidden">
              <img
                src={originalImageSrc}
                alt="Handwritten STEM Input"
                className="max-h-[200px] object-contain rounded-lg"
              />
            </div>
          </div>

          <div className="space-y-2 flex-1 flex flex-col">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-slate-450 uppercase tracking-widest">Extracted LaTeX Math</span>
              <button
                onClick={handleCopyToClipboard}
                className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                {copied ? 'Copied!' : 'Copy LaTeX'}
              </button>
            </div>
            <textarea
              value={editedLatex}
              onChange={(e) => setEditedLatex(e.target.value)}
              className="w-full flex-1 min-h-[140px] bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:border-indigo-500 focus:outline-none resize-y"
            />
          </div>
        </div>

        {/* Right Pane: Live KaTeX Renderer & Concept Tags */}
        <div className="space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <span className="text-xs font-black text-slate-450 uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              KaTeX Render & Solution
            </span>

            {/* Markdown + KaTeX rendering area */}
            <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 overflow-y-auto max-h-[300px] min-h-[180px] prose prose-invert prose-xs text-slate-350">
              <SentryErrorBoundary fallback={
                <div className="text-red-400 p-2 border border-red-500/20 bg-red-500/10 rounded">
                  <p className="font-bold mb-2">Error rendering equation. Raw text:</p>
                  <pre className="whitespace-pre-wrap font-mono text-[10px]">{editedSolution || editedLatex}</pre>
                </div>
              }>
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {editedSolution || editedLatex || '*No equations or solutions generated*'}
                </ReactMarkdown>
              </SentryErrorBoundary>
            </div>
          </div>

          {/* Subject & Topic Selector */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Subject</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl text-xs font-bold focus:border-indigo-500 focus:outline-none"
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Topic</label>
              <select
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl text-xs font-bold focus:border-indigo-500 focus:outline-none"
              >
                <option value="">(None)</option>
                {topics.map((top) => (
                  <option key={top.id} value={top.id}>{top.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Concept Tags</span>
            <div className="flex flex-wrap gap-1.5 min-h-[32px] items-center">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-slate-800 border border-slate-750 text-slate-300 font-semibold rounded text-[10px] flex items-center gap-1"
                >
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-400 cursor-pointer">×</button>
                </span>
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="Add tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  className="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-[10px] focus:outline-none focus:border-indigo-500 w-16"
                />
                <button
                  onClick={handleAddTag}
                  className="p-1 bg-slate-800 rounded hover:bg-slate-700 cursor-pointer"
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action triggers */}
      <div className="flex justify-end pt-4 border-t border-slate-850">
        <button
          onClick={handleAddToFlashcards}
          disabled={saving}
          className="px-5 py-3 bg-indigo-600 hover:bg-indigo-550 disabled:opacity-40 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer"
        >
          <GraduationCap className="w-4.5 h-4.5" /> Add to Flashcards Deck
        </button>
      </div>
    </div>
  );
}
