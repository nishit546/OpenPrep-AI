/**
 * @fileoverview Compare two or more of the user's syllabi and see which topics are shared
 * (study once, count twice) and which are exclusive to one exam.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { getSyllabusCatalog, compareSyllabi } from '../../services/api';

const FILTERS = [
  { id: 'all', label: 'Show All' },
  { id: 'shared', label: 'Shared Only' },
  { id: 'exclusive', label: 'Exam-Exclusive Only' },
];

const SyllabusOverlapMatrix = () => {
  const [catalog, setCatalog] = useState([]);
  const [selected, setSelected] = useState([]);
  const [result, setResult] = useState(null);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getSyllabusCatalog()
      .then((res) => {
        if (active) setCatalog(res.data?.data || []);
      })
      .catch(() => {
        if (active) setError('Could not load your syllabi.');
      });
    return () => {
      active = false;
    };
  }, []);

  const toggle = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleCompare = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await compareSyllabi(selected);
      setResult(res.data?.data || null);
    } catch (err) {
      setResult(null);
      setError(err.response?.data?.error || 'Could not compare these syllabi.');
    } finally {
      setLoading(false);
    }
  };

  const names = useMemo(
    () => Object.fromEntries((result?.syllabi || []).map((s) => [s.id, s.name])),
    [result]
  );

  const rows = useMemo(() => {
    if (!result) return [];
    const q = query.trim().toLowerCase();
    return result.topics.filter((row) => {
      if (filter !== 'all' && row.type !== filter) return false;
      if (!q) return true;
      return (
        row.title.toLowerCase().includes(q) ||
        (row.moduleName || '').toLowerCase().includes(q) ||
        row.entries.some((e) => e.title.toLowerCase().includes(q))
      );
    });
  }, [result, filter, query]);

  return (
    <section
      aria-labelledby="overlap-heading"
      className="mt-10 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
    >
      <h2 id="overlap-heading" className="text-2xl font-bold text-gray-900 dark:text-white">
        Syllabus Overlap
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Preparing for more than one exam? Pick two or more of your syllabi to see what you can study
        once.
      </p>

      {catalog.length < 2 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Add at least two syllabi to compare them.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {catalog.map((s) => (
            <label
              key={s.id}
              className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200"
            >
              <input
                type="checkbox"
                checked={selected.includes(s.id)}
                onChange={() => toggle(s.id)}
              />
              {s.name}
            </label>
          ))}
          <button
            type="button"
            onClick={handleCompare}
            disabled={selected.length < 2 || loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold rounded-lg"
          >
            {loading ? 'Comparing...' : 'Compare'}
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-4 p-3 text-sm bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg"
        >
          {error}
        </div>
      )}

      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <Stat label="Overlap" value={`${result.overlapPercentage}%`} />
            <Stat label="Shared topics" value={result.shared.length} />
            <Stat label="Exclusive topics" value={result.exclusive.length} />
            <Stat label="Hours saved" value={`${result.studyHours.saved}h`} />
          </div>
          <ul className="mb-5 text-sm text-gray-700 dark:text-gray-300 space-y-1">
            {result.syllabi.map((s) => (
              <li key={s.id}>
                {s.name}: {s.weightedCoverage}% of its weightage is covered by shared topics
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div role="group" aria-label="Topic filter" className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-3 py-1.5 text-sm rounded-full border ${
                    filter === f.id
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search topics"
              aria-label="Search topics"
              className="ml-auto px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {rows.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No topics match.</p>
          ) : (
            <ul className="space-y-2">
              {rows.map((row) => (
                <li
                  key={row.key}
                  data-testid="overlap-row"
                  className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 flex flex-wrap items-center justify-between gap-2"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{row.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {row.moduleName ? `${row.moduleName} - ` : ''}~{row.estimatedHours}h
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {row.presentIn.map((id) => (
                      <span
                        key={id}
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          row.type === 'shared'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                        }`}
                      >
                        {names[id] || id}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
};

const Stat = ({ label, value }) => (
  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
    <p className="text-xl font-bold text-blue-900 dark:text-blue-100">{value}</p>
    <p className="text-xs text-blue-700 dark:text-blue-300">{label}</p>
  </div>
);

export default SyllabusOverlapMatrix;
