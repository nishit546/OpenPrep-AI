import React, { useState, useEffect, useRef } from 'react';
import { saveNoteOffline, getOfflineNotes } from '../../utils/notesOfflineStorage';
import axios from 'axios';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const MarkdownNotesEditor = ({ noteId, subjectId, onSaveSuccess }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Lecture Notes');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Suggestion popup states for [[ autocomplete
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const [existingNotes, setExistingNotes] = useState([]);

  const textareaRef = useRef(null);

  // Load existing notes for autocomplete lookup
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get('/api/notes', { headers });
        if (res.data && res.data.success) {
          setExistingNotes(res.data.data.notes || []);
        } else {
          const offline = await getOfflineNotes();
          setExistingNotes(offline);
        }
      } catch (err) {
        const offline = await getOfflineNotes();
        setExistingNotes(offline);
      }
    };
    loadNotes();
  }, []);

  // Load initial note details if noteId is provided
  useEffect(() => {
    if (!noteId) return;
    const fetchNote = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`/api/notes/${noteId}`, { headers });
        if (res.data && res.data.success) {
          const note = res.data.data;
          setTitle(note.title);
          setContent(note.content || '');
          setCategory(note.category);
        }
      } catch (err) {
        console.error('Failed to load note from server, checking local offline DB:', err);
      }
    };
    fetchNote();
  }, [noteId]);

  // Sync refs for unmount save
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const categoryRef = useRef(category);
  const hasUnsavedRef = useRef(hasUnsavedChanges);

  useEffect(() => {
    titleRef.current = title;
    contentRef.current = content;
    categoryRef.current = category;
    hasUnsavedRef.current = hasUnsavedChanges;
  }, [title, content, category, hasUnsavedChanges]);

  // Unload & Unmount handler for data loss prevention
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedRef.current) {
        e.preventDefault();
        e.returnValue = ''; // Required for modern browsers to show a prompt
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (hasUnsavedRef.current && titleRef.current) {
        // Trigger a final save on unmount
        saveNoteOffline({
          id: noteId || undefined,
          title: titleRef.current,
          content: contentRef.current,
          subjectId,
          category: categoryRef.current,
          tags: [],
        }).catch(err => console.error('Final unmount save failed:', err));
      }
    };
  }, [noteId, subjectId]);

  // Handle autocomplete trigger and query matching on key change
  const handleContentChange = (e) => {
    const text = e.target.value;
    const selectionStart = e.target.selectionStart;
    setContent(text);
    setCursorPos(selectionStart);
    setHasUnsavedChanges(true);

    // Look backward from cursor to find last '[['
    const lastOpenIndex = text.lastIndexOf('[[', selectionStart - 1);
    const lastCloseIndex = text.lastIndexOf(']]', selectionStart - 1);

    if (lastOpenIndex !== -1 && lastOpenIndex > lastCloseIndex) {
      const query = text.slice(lastOpenIndex + 2, selectionStart);
      setSearchQuery(query);
      
      // Filter existing notes by title match
      const filtered = existingNotes.filter((n) =>
        n.title.toLowerCase().includes(query.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (selectedTitle) => {
    if (!textareaRef.current) return;

    const text = content;
    const lastOpenIndex = text.lastIndexOf('[[', cursorPos - 1);
    
    // Replace text between '[[' and cursor with selectedTitle + ']]'
    const before = text.slice(0, lastOpenIndex);
    const after = text.slice(cursorPos);
    const newContent = `${before}[[${selectedTitle}]]${after}`;

    setContent(newContent);
    setShowSuggestions(false);

    // Reposition cursor after the newly inserted wiki-link
    const newCursorPos = lastOpenIndex + selectedTitle.length + 4;
    setTimeout(() => {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  const handleSave = async () => {
    if (!title) return alert('Note title is required!');
    setIsSaving(true);

    try {
      const payload = {
        id: noteId || undefined,
        title,
        content,
        subjectId,
        category,
        tags: [],
      };

      // Save locally (IndexedDB) and trigger background sync
      const savedLocal = await saveNoteOffline(payload);
      
      setHasUnsavedChanges(false);
      setIsSaving(false);
      if (onSaveSuccess) onSaveSuccess(savedLocal);
    } catch (err) {
      console.error('Save failed:', err);
      setIsSaving(false);
    }
  };

  // Render Markdown preview helper (includes KaTeX equations helper)
  const renderMarkdownAndMath = (text) => {
    if (!text) return null;

    // Regex to split block math ($$...$$), inline math ($...$), and text
    const parts = text.split(/(\$\$.*?\$\$|\$.*?\$)/gs);

    return parts.map((part, index) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const formula = part.slice(2, -2);
        try {
          const html = katex.renderToString(formula, { displayMode: true, throwOnError: false });
          return <div key={index} dangerouslySetInnerHTML={{ __html: html }} className="my-4 overflow-x-auto" />;
        } catch (e) {
          return <div key={index} className="text-red-500">{part}</div>;
        }
      } else if (part.startsWith('$') && part.endsWith('$')) {
        const formula = part.slice(1, -1);
        try {
          const html = katex.renderToString(formula, { displayMode: false, throwOnError: false });
          return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="mx-1" />;
        } catch (e) {
          return <span key={index} className="text-red-500">{part}</span>;
        }
      }

      // Convert wiki-links [[Title]] into highlighted anchor-style spans
      const linkParts = part.split(/(\[\[.*?\]\])/g);
      return linkParts.map((subPart, subIndex) => {
        if (subPart.startsWith('[[') && subPart.endsWith(']]')) {
          const linkTitle = subPart.slice(2, -2);
          return (
            <span
              key={`${index}-${subIndex}`}
              className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded font-bold cursor-pointer hover:underline"
            >
              🚀 {linkTitle}
            </span>
          );
        }
        return <span key={`${index}-${subIndex}`}>{subPart}</span>;
      });
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 p-6 min-h-[500px]">
      {/* Editor Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4 items-center">
          <input
            type="text"
            placeholder="Untitled Note"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setHasUnsavedChanges(true); }}
            className="text-2xl font-black bg-transparent border-b-2 border-transparent hover:border-slate-300 focus:border-indigo-600 dark:focus:border-indigo-400 transition-all focus:outline-none placeholder-slate-400 font-inter px-1 py-0.5"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300"
          >
            <option value="Lecture Notes">Lecture Notes</option>
            <option value="Study Guide">Study Guide</option>
            <option value="Cheat Sheet">Cheat Sheet</option>
            <option value="Summary">Summary</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/10 text-sm"
        >
          {isSaving ? 'Saving...' : 'Save Note'}
        </button>
      </div>

      {/* Editor Main Content Split Pane */}
      <div className="flex-1 grid grid-cols-2 gap-6 overflow-hidden min-h-[400px]">
        {/* Left Side: Markdown Raw Textarea Editor */}
        <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col shadow-sm">
          <textarea
            ref={textareaRef}
            placeholder="Type your notes in Markdown here... Use $x^2$ for inline math and $$x^2$$ for block math equations. Type [[ to reference other notes."
            value={content}
            onChange={handleContentChange}
            className="flex-1 w-full h-full resize-none border-0 focus:outline-none focus:ring-0 bg-transparent font-mono text-sm leading-relaxed"
          />

          {/* Autocomplete Suggestions Popup */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-6 bottom-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-2xl p-2 w-64 max-h-48 overflow-y-auto z-10 transition-all animate-in fade-in slide-in-from-bottom-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-3 py-1.5 block">Wiki-Link Suggestions</span>
              {suggestions.map((note) => (
                <button
                  key={note.id}
                  onClick={() => handleSuggestionClick(note.title)}
                  className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-all"
                >
                  {note.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Live HTML/KaTeX Preview Pane */}
        <div className="bg-slate-100/55 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-8 overflow-y-auto flex flex-col shadow-inner">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-6">Live Markdown & KaTeX Preview</span>
          <div className="prose prose-indigo dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
            {renderMarkdownAndMath(content)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarkdownNotesEditor;
