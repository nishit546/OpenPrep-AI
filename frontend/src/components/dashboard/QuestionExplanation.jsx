import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { FaRegLightbulb, FaBookOpen, FaSpinner } from 'react-icons/fa';
import API from '../../services/api';

const markdownComponents = {
  h1: ({ children }) => <h1 className="text-base font-bold text-slate-100 mb-2">{children}</h1>,
  h2: ({ children }) => (
    <h2 className="text-sm font-bold text-slate-100 mt-3 mb-1.5">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-slate-200 mt-2 mb-1">{children}</h3>
  ),
  p: ({ children }) => <p className="text-sm text-slate-300 leading-relaxed my-1.5">{children}</p>,
  ul: ({ children }) => (
    <ul className="list-disc list-inside text-sm text-slate-300 my-1.5 space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside text-sm text-slate-300 my-1.5 space-y-1">{children}</ol>
  ),
  li: ({ children }) => <li className="text-sm text-slate-300">{children}</li>,
  strong: ({ children }) => <strong className="text-slate-100 font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic text-slate-300">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-indigo-500/50 pl-3 my-2 text-slate-400 italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-slate-700" />,
  code: ({ inline, className, children, ...props }) => {
    if (inline) {
      return (
        <code
          className="bg-slate-700/60 px-1.5 py-0.5 rounded text-indigo-200 text-xs font-mono"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <pre className="bg-slate-950 border border-slate-700 rounded p-3 my-2 overflow-x-auto">
        <code className="text-xs font-mono text-slate-200 whitespace-pre-wrap" {...props}>
          {children}
        </code>
      </pre>
    );
  },
  table: ({ children }) => (
    <table className="w-full text-sm text-slate-300 my-2 border-collapse">{children}</table>
  ),
  th: ({ children }) => (
    <th className="border border-slate-700 px-2 py-1 text-left text-slate-100 font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="border border-slate-700 px-2 py-1">{children}</td>,
};

const QuestionExplanation = ({
  question,
  options,
  correctAnswer,
  userAnswer,
  explanation,
  subjectName,
  topicName,
}) => {
  const [mode, setMode] = useState(null);
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const requestExplanation = async (requestedMode) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setMode(requestedMode);
    setContent(null);
    try {
      const res = await API.post('/ai/explain-question', {
        question,
        options,
        correctAnswer,
        userAnswer: userAnswer ?? null,
        explanation: explanation || '',
        mode: requestedMode,
        subjectName: subjectName || '',
        topicName: topicName || '',
      });
      setContent(res.data?.data?.markdown || null);
      if (!res.data?.data?.markdown) {
        setError('The AI did not return an explanation. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate explanation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 border-t border-slate-700/60 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => requestExplanation('hint')}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-300 hover:bg-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <FaRegLightbulb /> Get AI Hint
        </button>
        <button
          type="button"
          onClick={() => requestExplanation('full')}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-500/10 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <FaBookOpen /> Explain Solution
        </button>
      </div>

      {loading && (
        <div role="status" className="mt-3 flex items-center gap-2 text-sm text-slate-400">
          <FaSpinner className="animate-spin text-indigo-400" />
          Generating {mode === 'hint' ? 'hint' : 'solution'}...
        </div>
      )}

      {error && !loading && (
        <div
          role="alert"
          className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {content && !loading && (
        <div className="mt-3 p-4 bg-slate-950/70 border border-indigo-500/30 rounded-lg">
          <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
        </div>
      )}
    </div>
  );
};

export default QuestionExplanation;
