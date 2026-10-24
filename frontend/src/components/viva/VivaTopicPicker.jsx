import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

export const VIVA_SUBJECTS = [
  'Operating Systems',
  'Database Systems',
  'Computer Networks',
  'Data Structures',
  'Machine Learning',
  'Physics',
  'Chemistry',
  'Biology',
];

/** Joins the chosen subject and syllabus topic into the single topic string the API takes. */
export function buildTopic(subject, syllabusTopic) {
  const s = (subject || '').trim();
  const t = (syllabusTopic || '').trim();
  if (s && t) return `${s}: ${t}`;
  return s || t;
}

export default function VivaTopicPicker({ onStart, loading = false, initialSubject = '', initialTopic = '' }) {
  const [subject, setSubject] = useState(initialSubject);
  const [syllabusTopic, setSyllabusTopic] = useState(initialTopic);

  const topic = buildTopic(subject, syllabusTopic);
  const valid = topic.length >= 3;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!valid || loading) return;
    onStart(topic);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" aria-label="Configure viva session">
      <div className="space-y-2">
        <h2 className="text-stone-100 font-extrabold font-playfair text-xl">Configure Your Session</h2>
        <p className="text-stone-400 text-xs leading-relaxed">
          Pick a subject, then narrow it to a syllabus topic. The examiner starts at a moderate depth and adapts to
          your answers.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Subject</legend>
        <div className="flex flex-wrap gap-2">
          {VIVA_SUBJECTS.map((name) => (
            <button
              type="button"
              key={name}
              aria-pressed={subject === name}
              onClick={() => setSubject(subject === name ? '' : name)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                subject === name
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-stone-950 border-neutral-800 text-stone-300 hover:border-indigo-500'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor="viva-topic" className="text-[10px] font-black text-stone-500 uppercase tracking-widest block">
          Syllabus topic {subject ? '(optional)' : ''}
        </label>
        <input
          type="text"
          id="viva-topic"
          value={syllabusTopic}
          onChange={(e) => setSyllabusTopic(e.target.value)}
          maxLength={80}
          placeholder="e.g., CPU scheduling, B-trees, Le Chatelier's principle"
          className="w-full bg-stone-950 border border-neutral-850 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-stone-300 outline-none transition"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !valid}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg hover:shadow-indigo-500/10 cursor-pointer flex items-center justify-center gap-1.5"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Start Oral Examination'}
      </button>
    </form>
  );
}
