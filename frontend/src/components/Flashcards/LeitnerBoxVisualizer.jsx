import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Calendar, CheckCircle2, Clock, Zap, ArrowRight, RotateCcw, Play, Sparkles, Filter, ChevronRight } from 'lucide-react';

const BOX_CONFIGS = [
  { id: 1, name: 'Box 1', label: 'Daily Review', freq: 'Every 1 Day', color: 'from-rose-500 to-pink-600', text: 'text-rose-400', border: 'border-rose-500/40', bg: 'bg-rose-500/10', icon: Zap },
  { id: 2, name: 'Box 2', label: '3-Day Interval', freq: 'Every 3 Days', color: 'from-amber-500 to-orange-600', text: 'text-amber-400', border: 'border-amber-500/40', bg: 'bg-amber-500/10', icon: Clock },
  { id: 3, name: 'Box 3', label: 'Weekly Interval', freq: 'Every 7 Days', color: 'from-yellow-500 to-amber-600', text: 'text-yellow-400', border: 'border-yellow-500/40', bg: 'bg-yellow-500/10', icon: Calendar },
  { id: 4, name: 'Box 4', label: 'Bi-Weekly Interval', freq: 'Every 14 Days', color: 'from-indigo-500 to-blue-600', text: 'text-indigo-400', border: 'border-indigo-500/40', bg: 'bg-indigo-500/10', icon: Layers },
  { id: 5, name: 'Box 5', label: 'Mastered Tier', freq: 'Every 30 Days', color: 'from-emerald-500 to-teal-600', text: 'text-emerald-400', border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
];

const LeitnerBoxVisualizer = ({ boxes = [], onSelectBox, onStartReview }) => {
  const [selectedBoxId, setSelectedBoxId] = useState(1);
  const [driftingCard, setDriftingCard] = useState(null);

  // Normalize incoming box stats
  const boxMap = (boxes || []).reduce((acc, b) => {
    acc[b.id] = b;
    return acc;
  }, {});

  const totalCards = Object.values(boxMap).reduce((sum, b) => sum + (b.count || 0), 0);

  // Trigger interactive card drift animation simulation
  const handleSimulateDrift = (fromBoxId, isSuccess = true) => {
    const toBoxId = isSuccess ? Math.min(5, fromBoxId + 1) : 1;
    setDriftingCard({
      id: Date.now(),
      fromBoxId,
      toBoxId,
      isSuccess,
    });

    setTimeout(() => {
      setDriftingCard(null);
    }, 1200);
  };

  const activeBoxConfig = BOX_CONFIGS.find((b) => b.id === selectedBoxId) || BOX_CONFIGS[0];
  const activeBoxStats = boxMap[selectedBoxId] || { count: 0, dueCount: 0, cards: [] };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-neutral-800 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-stone-100 font-extrabold text-lg font-playfair tracking-tight">
              5-Tier Leitner Box Visualizer
            </h3>
          </div>
          <p className="text-stone-400 text-xs mt-1">
            Interactive spaced-repetition stage & card drift progression tracker
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSimulateDrift(selectedBoxId, true)}
            disabled={!!driftingCard}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-stone-300 text-xs font-semibold flex items-center gap-1.5 transition-all border border-neutral-700"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Simulate Card Drift
          </button>
          <div className="bg-neutral-950 border border-neutral-800 text-stone-200 text-xs px-3.5 py-1.5 rounded-xl font-mono font-bold">
            {totalCards} Total Cards
          </div>
        </div>
      </div>

      {/* 3D Visual Stage Trays */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 relative perspective-1000">
        {BOX_CONFIGS.map((config) => {
          const stats = boxMap[config.id] || {};
          const count = stats.count || 0;
          const dueCount = stats.dueCount || 0;
          const pct = totalCards > 0 ? Math.round((count / totalCards) * 100) : 0;
          const isSelected = selectedBoxId === config.id;
          const Icon = config.icon;

          return (
            <motion.div
              key={config.id}
              onClick={() => {
                setSelectedBoxId(config.id);
                if (onSelectBox) onSelectBox(config.id);
              }}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`cursor-pointer rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 relative overflow-hidden backdrop-blur-md ${
                isSelected
                  ? `bg-neutral-950 border-2 ${config.border} shadow-2xl shadow-${config.color.split('-')[1]}-500/20 ring-2 ring-indigo-500/30`
                  : 'bg-neutral-950/60 border border-neutral-800 hover:border-neutral-700'
              }`}
            >
              {/* Background Glow */}
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${config.color} opacity-10 rounded-full blur-2xl`} />

              {/* Box Top Header */}
              <div className="flex items-center justify-between mb-3 z-10">
                <span className="text-stone-400 text-xs font-mono font-bold uppercase tracking-wider">{config.name}</span>
                <div className={`p-1.5 rounded-xl bg-gradient-to-r ${config.color} text-white shadow-md`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              {/* Box Content & Metrics */}
              <div className="my-2 z-10">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-stone-100 font-playfair">{count}</span>
                  <span className="text-xs text-stone-400 font-semibold">{pct}%</span>
                </div>
                <div className="text-[11px] text-stone-400 mt-1">{config.label}</div>
              </div>

              {/* Due Cards Badge & Frequency */}
              <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between z-10">
                <span className="text-[10px] text-stone-400 font-medium">{config.freq}</span>
                {dueCount > 0 ? (
                  <span className="text-[10px] bg-rose-500/20 text-rose-300 font-bold px-2 py-0.5 rounded-full border border-rose-500/30 animate-pulse">
                    {dueCount} due
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-400/80 font-medium">Clear</span>
                )}
              </div>

              {/* Floating Card Stack Illusion Layers */}
              {count > 0 && (
                <div className="absolute bottom-1 right-3 opacity-20 pointer-events-none flex flex-col gap-0.5">
                  <div className="w-8 h-1 bg-stone-400 rounded-full" />
                  {count > 3 && <div className="w-6 h-1 bg-stone-500 rounded-full" />}
                  {count > 10 && <div className="w-4 h-1 bg-stone-600 rounded-full" />}
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Animated Card Drift Motion Overlay */}
        <AnimatePresence>
          {driftingCard && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: (driftingCard.fromBoxId - 3) * 120, y: 0 }}
              animate={{ opacity: 1, scale: 1.1, x: (driftingCard.toBoxId - 3) * 120, y: -20 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 1, ease: 'easeInOut' }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none"
            >
              <div className={`px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-2 text-xs font-bold text-white bg-gradient-to-r ${
                driftingCard.isSuccess ? 'from-emerald-600 to-teal-600 border-emerald-400' : 'from-rose-600 to-pink-600 border-rose-400'
              }`}>
                {driftingCard.isSuccess ? (
                  <>
                    <ArrowRight className="w-4 h-4" /> Promoted to Box {driftingCard.toBoxId}!
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" /> Demoted to Box 1
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selected Box Drawer / Filter Panel */}
      <div className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-gradient-to-r ${activeBoxConfig.color} text-white`}>
              <activeBoxConfig.icon className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-stone-100 font-bold text-sm flex items-center gap-2">
                {activeBoxConfig.name}: {activeBoxConfig.label}
                <span className="text-xs text-stone-400 font-normal">({activeBoxConfig.freq})</span>
              </h4>
              <p className="text-stone-400 text-xs">
                {activeBoxStats.count || 0} cards in this tier ({activeBoxStats.dueCount || 0} currently due for review)
              </p>
            </div>
          </div>

          {onStartReview && (
            <button
              onClick={() => onStartReview(selectedBoxId)}
              className={`px-4 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-2 bg-gradient-to-r ${activeBoxConfig.color} hover:brightness-110 transition-all shadow-md`}
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              Review Box {selectedBoxId} Cards
            </button>
          )}
        </div>

        {/* Card Sample List */}
        {activeBoxStats.cards && activeBoxStats.cards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeBoxStats.cards.map((card, idx) => (
              <div
                key={card.id || idx}
                className="bg-neutral-900/90 border border-neutral-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-neutral-700 transition-colors"
              >
                <div className="text-stone-200 text-xs font-semibold line-clamp-2">{card.front}</div>
                <div className="mt-3 flex items-center justify-between text-[10px] text-stone-400 pt-2 border-t border-neutral-800/60">
                  <span>Interval: {card.interval || 1}d</span>
                  <span>Reps: {card.repetitions || 0}</span>
                  {card.isDue && <span className="text-rose-400 font-bold">Due Now</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-stone-500 text-xs flex flex-col items-center gap-2">
            <Filter className="w-5 h-5 text-stone-600" />
            No flashcards currently mapped to {activeBoxConfig.name}.
          </div>
        )}
      </div>
    </div>
  );
};

export default LeitnerBoxVisualizer;
