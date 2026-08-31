import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PlaySquare as Youtube, Loader2, Sparkles, AlertCircle, CheckCircle2, Play, Edit3, Trash2, Plus, Save } from 'lucide-react';
import API from '../../services/api';

// Helper to extract 11-char YouTube ID
const getYouTubeId = (url) => {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regExp);
  return match ? match[1] : null;
};

// Formats seconds into MM:SS format
const formatSeconds = (sec) => {
  if (sec === undefined || sec === null) return '00:00';
  const total = Math.floor(Number(sec));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
};

export default function YouTubeDeckModal({ isOpen, onClose, onImported }) {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoId, setVideoId] = useState(null);
  const [deckMode, setDeckMode] = useState('full'); // 'full' | 'chapters'
  const [count, setCount] = useState(10);
  const [deckTitle, setDeckTitle] = useState('');
  
  // State for AI processing and preview table
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [generatedCards, setGeneratedCards] = useState([]);
  const [activeTimestamp, setActiveTimestamp] = useState(0);
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);

  // Sync video ID on URL change
  useEffect(() => {
    const id = getYouTubeId(youtubeUrl);
    setVideoId(id);
    if (id && !deckTitle) {
      setDeckTitle(`YouTube Deck (${id})`);
    }
  }, [youtubeUrl]);

  // Reset modal state on open
  useEffect(() => {
    if (isOpen) {
      setYoutubeUrl('');
      setVideoId(null);
      setError('');
      setGeneratedCards([]);
      setIsSavedSuccess(false);
      setLoading(false);
      setSaving(false);
    }
  }, [isOpen]);

  // Generate flashcards API trigger
  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!youtubeUrl || !videoId) {
      setError('Please provide a valid YouTube URL.');
      return;
    }

    setLoading(true);
    setError('');
    setGeneratedCards([]);

    try {
      const res = await API.post('/flashcards/generate-from-youtube', {
        youtubeUrl,
        options: {
          mode: deckMode,
          count: parseInt(count, 10),
        }
      });

      if (res.data?.cards) {
        setGeneratedCards(res.data.cards);
      } else {
        setError('No flashcards returned from AI content extraction.');
      }
    } catch (err) {
      console.error('Error generating YouTube flashcards:', err);
      setError(err?.response?.data?.error || 'Failed to extract flashcards from video transcript.');
    } finally {
      setLoading(false);
    }
  };

  // Update specific flashcard front/back
  const handleCardChange = (index, field, value) => {
    const updated = [...generatedCards];
    updated[index] = { ...updated[index], [field]: value };
    setGeneratedCards(updated);
  };

  // Delete card from preview table
  const handleDeleteCard = (index) => {
    setGeneratedCards(generatedCards.filter((_, i) => i !== index));
  };

  // Add new manual card
  const handleAddCard = () => {
    setGeneratedCards([
      ...generatedCards,
      { front: '', back: '', timestamp: activeTimestamp, formattedTime: formatSeconds(activeTimestamp) }
    ]);
  };

  // Jump player to timestamp
  const handleTimestampClick = (ts) => {
    setActiveTimestamp(ts || 0);
  };

  // Persist flashcards to database library
  const handleSaveDeck = async () => {
    if (generatedCards.length === 0) {
      setError('Cannot save an empty deck.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await API.post('/flashcards/save-youtube-deck', {
        videoId,
        youtubeUrl,
        deckName: deckTitle || `YouTube Deck (${videoId})`,
        cards: generatedCards,
      });

      if (res.data?.success) {
        setIsSavedSuccess(true);
        if (onImported) onImported();
      }
    } catch (err) {
      console.error('Error saving YouTube deck:', err);
      setError(err?.response?.data?.error || 'Failed to save flashcard deck into library.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-4xl w-full space-y-6 shadow-2xl relative my-8"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl text-stone-400 hover:text-white bg-neutral-800 hover:bg-neutral-750 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="space-y-1">
              <h3 className="text-xl font-black text-white flex items-center gap-2.5 font-playfair">
                <Youtube className="text-rose-500 w-7 h-7" /> AI YouTube Flashcard Generator
              </h3>
              <p className="text-stone-400 text-xs font-semibold">
                Generate review-ready spaced repetition flashcards linked to exact lecture video timestamps.
              </p>
            </div>

            {isSavedSuccess ? (
              // Success Screen
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400">
                  <CheckCircle2 className="w-12 h-12 animate-bounce" />
                </div>
                <h4 className="text-lg font-black text-white">Deck Saved to Library!</h4>
                <p className="text-xs text-stone-400 max-w-md">
                  Successfully persisted <strong>{generatedCards.length}</strong> flashcards with interactive video timestamp links into your library.
                </p>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-stone-200 text-xs font-bold rounded-xl border border-neutral-700 transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Inputs & Options Panel */}
                <form onSubmit={handleGenerate} className="space-y-4 bg-neutral-950 p-4 rounded-2xl border border-neutral-800">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-300" htmlFor="yt-modal-url">YouTube Lecture Video URL</label>
                    <input
                      id="yt-modal-url"
                      type="url"
                      required
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      disabled={loading || generatedCards.length > 0}
                      className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-750 rounded-xl text-stone-200 text-xs outline-none focus:border-rose-500 transition font-mono"
                    />
                  </div>

                  {/* Thumbnail / Embed Preview */}
                  {videoId && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      <div className="md:col-span-1 relative aspect-video rounded-xl overflow-hidden border border-neutral-800 bg-black">
                        <img
                          src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                          alt="YouTube Video Thumbnail"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Play className="w-8 h-8 text-white opacity-80" />
                        </div>
                      </div>
                      
                      <div className="md:col-span-2 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-stone-400">Generation Mode</label>
                            <select
                              value={deckMode}
                              onChange={(e) => setDeckMode(e.target.value)}
                              disabled={loading || generatedCards.length > 0}
                              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-750 rounded-xl text-stone-200 text-xs outline-none focus:border-rose-500"
                            >
                              <option value="full">Full Lecture Transcript</option>
                              <option value="chapters">Segmented Chapters</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-stone-400">Card Limit</label>
                            <select
                              value={count}
                              onChange={(e) => setCount(e.target.value)}
                              disabled={loading || generatedCards.length > 0}
                              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-750 rounded-xl text-stone-200 text-xs outline-none focus:border-rose-500"
                            >
                              <option value={5}>5 Flashcards</option>
                              <option value={10}>10 Flashcards</option>
                              <option value={15}>15 Flashcards</option>
                              <option value={20}>20 Flashcards</option>
                              <option value={30}>30 Flashcards</option>
                            </select>
                          </div>
                        </div>

                        {generatedCards.length === 0 && (
                          <button
                            type="submit"
                            disabled={loading || !videoId}
                            className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {loading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Extracting Captions & Generating AI Flashcards...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                Generate Deck from Lecture
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </form>

                {error && (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Generated Preview & Interactive Timestamp Player Table */}
                {generatedCards.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Embedded YouTube Player */}
                      <div className="md:w-1/2 space-y-2">
                        <h4 className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                          <Play className="w-4 h-4 text-rose-500" /> Interactive Video Timestamp Player
                        </h4>
                        <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950 shadow-inner">
                          <iframe
                            title="YouTube Player with Timestamp"
                            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&start=${activeTimestamp}`}
                            className="absolute inset-0 w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                        <p className="text-[11px] text-stone-400">
                          Active Jump Point: <span className="font-mono font-bold text-rose-400">{formatSeconds(activeTimestamp)}</span>
                        </p>
                      </div>

                      {/* Cards Table & Editor */}
                      <div className="md:w-1/2 space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                            <Edit3 className="w-4 h-4 text-indigo-400" /> Card Preview & Editor ({generatedCards.length})
                          </h4>
                          <button
                            type="button"
                            onClick={handleAddCard}
                            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-750 text-stone-200 text-[11px] font-bold rounded-lg border border-neutral-700 flex items-center gap-1 transition cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Add Card
                          </button>
                        </div>

                        <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                          {generatedCards.map((card, index) => (
                            <div
                              key={index}
                              className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2 hover:border-neutral-750 transition"
                            >
                              <div className="flex justify-between items-center">
                                <span className="text-[11px] font-bold text-stone-400">Card #{index + 1}</span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleTimestampClick(card.timestamp)}
                                    className="px-2 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-[10px] font-mono font-bold flex items-center gap-1 transition cursor-pointer"
                                  >
                                    <Play className="w-2.5 h-2.5" />
                                    {card.formattedTime || formatSeconds(card.timestamp)}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCard(index)}
                                    className="text-stone-500 hover:text-rose-400 transition cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <input
                                type="text"
                                value={card.front}
                                onChange={(e) => handleCardChange(index, 'front', e.target.value)}
                                placeholder="Front question / prompt..."
                                className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-stone-200 text-xs outline-none focus:border-indigo-500"
                              />

                              <textarea
                                value={card.back}
                                onChange={(e) => handleCardChange(index, 'back', e.target.value)}
                                placeholder="Back answer / explanation..."
                                rows={2}
                                className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-stone-200 text-xs outline-none focus:border-indigo-500 resize-none"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex gap-3 pt-4 border-t border-neutral-800">
                      <button
                        type="button"
                        onClick={() => setGeneratedCards([])}
                        className="py-2.5 px-4 bg-neutral-800 hover:bg-neutral-750 text-stone-300 text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        Reset / Re-generate
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleSaveDeck}
                        disabled={saving || generatedCards.length === 0}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving Deck...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save {generatedCards.length} Flashcards to Library
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
