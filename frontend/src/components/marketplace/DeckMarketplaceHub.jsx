

import React, { useState, useEffect } from 'react';

/**
 * DeckMarketplaceHub Component
 * Community flashcard marketplace explorer with search, filtering, card previews,
 * ratings, and one-click forking.
 */
export default function DeckMarketplaceHub() {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [examTag, setExamTag] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [previewCards, setPreviewCards] = useState([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [forkingId, setForkingId] = useState(null);

  useEffect(() => {
    fetchDecks();
  }, [search, subject, examTag, sortBy]);

  const fetchDecks = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        search,
        subject,
        examTag,
        sortBy,
      }).toString();

      const response = await fetch(`/api/marketplace/decks?${queryParams}`);
      const data = await response.json();
      if (data.success) {
        setDecks(data.decks);
      }
    } catch (error) {
      console.error('Failed to fetch marketplace decks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleForkDeck = async (deckId) => {
    setForkingId(deckId);
    try {
      const response = await fetch(`/api/marketplace/decks/${deckId}/fork`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.success) {
        alert('Deck successfully forked to your personal library!');
        fetchDecks();
      } else {
        alert(data.message || 'Failed to fork deck.');
      }
    } catch (error) {
      console.error('Error forking deck:', error);
      alert('An error occurred while forking the deck.');
    } finally {
      setForkingId(null);
    }
  };

  const handleOpenPreview = async (deck) => {
    setSelectedDeck(deck);
    setIsPreviewOpen(true);
    try {
      const response = await fetch(`/api/marketplace/decks/${deck.id}/preview`);
      const data = await response.json();
      if (data.success) {
        setPreviewCards(data.cards || []);
      }
    } catch (error) {
      console.error('Error loading preview:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Community Deck Marketplace</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Explore, fork, and adapt curated flashcard decks from top educators and peers.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-1 min-w-[280px] gap-2">
          <input
            type="text"
            placeholder="Search decks, exams, or topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:text-white dark:border-gray-700 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={examTag}
            onChange={(e) => setExamTag(e.target.value)}
            className="px-3 py-2 border rounded-lg dark:bg-gray-900 dark:text-white dark:border-gray-700"
          >
            <option value="">All Exams</option>
            <option value="MCAT">MCAT</option>
            <option value="USMLE">USMLE</option>
            <option value="JEE">JEE</option>
            <option value="CFA">CFA</option>
            <option value="Bar Exam">Bar Exam</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border rounded-lg dark:bg-gray-900 dark:text-white dark:border-gray-700"
          >
            <option value="popular">Most Popular</option>
            <option value="rating">Highest Rated</option>
            <option value="trending">Trending</option>
          </select>
        </div>
      </div>

      {/* Decks Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : decks.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">No community decks found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {decks.map((deck) => (
            <div
              key={deck.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col justify-between hover:shadow-lg transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                    {deck.subject || 'General'}
                  </span>
                  <div className="flex items-center text-amber-500 text-sm font-semibold">
                    ★ {deck.average_rating ? deck.average_rating.toFixed(1) : 'N/A'}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-1">
                  {deck.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
                  {deck.description || 'No description provided.'}
                </p>

                {/* Exam Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {deck.exam_tags?.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                {/* Author Details & Verified Badge */}
                <div className="flex items-center gap-3 pt-3 border-t border-gray-100 dark:border-gray-700 mb-4">
                  <img
                    src={deck.author?.avatar_url || 'https://via.placeholder.com/40'}
                    alt={deck.author?.username}
                    className="w-8 h-8 rounded-full"
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {deck.author?.username || 'Unknown Author'}
                    </span>
                    {deck.author?.is_verified_educator && (
                      <span className="text-blue-500 text-xs title='Verified Educator'">✓</span>
                    )}
                  </div>
                </div>

                {/* Card Count & Action Buttons */}
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
                  <span>{deck.card_count || 0} Cards</span>
                  <span>{deck.fork_count || 0} Forks</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenPreview(deck)}
                    className="flex-1 py-2 px-3 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => handleForkDeck(deck.id)}
                    disabled={forkingId === deck.id}
                    className="flex-1 py-2 px-3 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
                  >
                    {forkingId === deck.id ? 'Forking...' : 'Fork Deck'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {isPreviewOpen && selectedDeck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold dark:text-white">{selectedDeck.title}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Card Preview</p>
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-3">
              {previewCards.length === 0 ? (
                <p className="text-gray-500 text-center py-6">Loading preview cards...</p>
              ) : (
                previewCards.map((card, idx) => (
                  <div
                    key={idx}
                    className="p-4 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-900 space-y-2"
                  >
                    <div className="font-semibold text-sm text-indigo-600 dark:text-indigo-400">
                      Q: {card.front}
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">A: {card.back}</div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2 border rounded-lg text-sm text-gray-700 dark:text-gray-300"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setIsPreviewOpen(false);
                  handleForkDeck(selectedDeck.id);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm"
              >
                Fork Full Deck
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
