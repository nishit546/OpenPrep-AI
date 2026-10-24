import React, { useEffect, useState } from 'react';
import { getRetentionHeatmap } from '../../services/api';

// Red under the danger line, amber close to it, green above.
function cellClass(value, danger) {
  if (value < danger) return 'bg-rose-500/70 text-white';
  if (value < danger + 15) return 'bg-amber-500/60 text-white';
  return 'bg-emerald-500/60 text-white';
}

const DeckRetentionHeatmap = ({ onSelectDeck, selectedDeckId = null }) => {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    getRetentionHeatmap()
      .then((res) => {
        if (cancelled) return;
        setData(res.data.data);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'loading')
    return <div className="text-stone-400 text-sm p-6">Loading heatmap...</div>;
  if (status === 'error')
    return <div className="text-rose-400 text-sm p-6">Could not load the retention heatmap.</div>;
  if (!data || data.decks.length === 0) {
    return (
      <div className="text-stone-400 text-sm p-6">
        Add some flashcards to see how well each deck holds up.
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-3">
      <div>
        <h3 className="text-stone-100 font-extrabold text-base">Deck Retention Heatmap</h3>
        <p className="text-stone-400 text-xs mt-0.5">
          Average predicted retention per deck. Pick a deck to open its simulator.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-separate border-spacing-1">
          <thead>
            <tr className="text-stone-400">
              <th scope="col" className="text-left font-semibold">
                Deck
              </th>
              {data.days.map((d) => (
                <th scope="col" key={d} className="font-semibold">
                  {d === 0 ? 'Now' : `+${d}d`}
                </th>
              ))}
              <th scope="col" className="font-semibold">
                48h risk
              </th>
            </tr>
          </thead>
          <tbody>
            {data.decks.map((deck) => (
              <tr key={deck.deckId ?? 'none'}>
                <th scope="row" className="text-left font-medium">
                  <button
                    type="button"
                    disabled={!deck.deckId}
                    onClick={() => onSelectDeck && onSelectDeck(deck)}
                    aria-pressed={selectedDeckId === deck.deckId}
                    className={`text-left truncate max-w-[10rem] ${
                      selectedDeckId === deck.deckId ? 'text-emerald-300' : 'text-stone-200'
                    } ${deck.deckId ? 'hover:underline' : 'cursor-default'}`}
                  >
                    {deck.name} <span className="text-stone-500">({deck.totalCards})</span>
                  </button>
                </th>
                {deck.retention.map((value, i) => (
                  <td
                    key={data.days[i]}
                    className={`text-center rounded-md py-1 ${cellClass(value, data.dangerThreshold)}`}
                  >
                    {Math.round(value)}%
                  </td>
                ))}
                <td className="text-center font-mono text-stone-200">{deck.vulnerabilityScore}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DeckRetentionHeatmap;
