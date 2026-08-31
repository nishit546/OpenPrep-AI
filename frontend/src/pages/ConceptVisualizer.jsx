/**
 * @fileoverview Main page for 3D Molecular & Biology Structure Visualization.
 * Features 3D WebGL rendering, hotspot annotation tooltips, and Gemini AI structural explanations.
 */
import React, { useState } from 'react';
import ThreeDViewer from '../components/visualizer3d/ThreeDViewer';
import MOLECULAR_PRESETS from '../components/visualizer3d/molecularPresets';
import { explainMolecularStructure } from '../services/api';
import { Sparkles, Dna, Activity, Layers, Atom, BookOpen, ChevronRight, HelpCircle, Lightbulb, MessageSquare } from 'lucide-react';

const CATEGORIES = ['All', 'Genetics', 'Biochemistry', 'Cell Biology', 'Organic Chemistry'];

const ConceptVisualizer = () => {
  const [selectedPresetId, setSelectedPresetId] = useState('dna');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [aiExplanation, setAiExplanation] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const presetsList = Object.values(MOLECULAR_PRESETS);
  const filteredPresets = activeCategory === 'All'
    ? presetsList
    : presetsList.filter((p) => p.category === activeCategory);

  const activePreset = MOLECULAR_PRESETS[selectedPresetId] || MOLECULAR_PRESETS.dna;

  const handleSelectPreset = (id) => {
    setSelectedPresetId(id);
    setSelectedHotspot(null);
    setAiExplanation(null);
  };

  const handleFetchAiExplanation = async (hotspotObj = null) => {
    setIsAiLoading(true);
    try {
      const res = await explainMolecularStructure({
        structureId: selectedPresetId,
        hotspotId: hotspotObj?.id || selectedHotspot?.id || null,
        prompt: customPrompt || undefined,
      });

      if (res.data && res.data.success) {
        setAiExplanation(res.data.data.explanation);
      }
    } catch (err) {
      console.error('Failed to fetch AI molecular explanation:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-stone-100 py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold font-mono">
            <Sparkles className="w-3.5 h-3.5" />
            3D WebGL Biology &amp; Molecular Studio
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-stone-100 tracking-tight font-playfair">
            Interactive 3D Molecular Structure Viewer
          </h1>
          <p className="text-stone-400 text-sm max-w-2xl mx-auto">
            Explore 3D biological conformations, catalytic active sites, and chemical bonding with dynamic AI-annotated hotspots.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeCategory === cat
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-neutral-900 border border-neutral-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Main 3D Viewport & Sidebar Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Preset Selector Sidebar (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <h2 className="text-sm font-extrabold text-stone-300 uppercase font-mono tracking-wider flex items-center justify-between">
              <span>Structures ({filteredPresets.length})</span>
              <Atom className="w-4 h-4 text-indigo-400" />
            </h2>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {filteredPresets.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden ${
                      isSelected
                        ? 'border-indigo-500 bg-neutral-900 shadow-xl ring-1 ring-indigo-500/40'
                        : 'border-neutral-800/80 bg-neutral-950/60 hover:border-neutral-700'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/10 rounded-full blur-xl" />
                    )}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-sm text-stone-100 font-playfair">{preset.name}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-neutral-800 text-stone-300 font-mono rounded-full">
                        {preset.category}
                      </span>
                    </div>
                    {preset.formula && (
                      <div className="text-[11px] font-mono text-indigo-400 font-bold mb-1.5">{preset.formula}</div>
                    )}
                    <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">{preset.description}</p>

                    <div className="mt-3 pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[10px] text-stone-500">
                      <span>{preset.atoms.length} Atoms</span>
                      <span>{preset.hotspots.length} AI Hotspots</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3D Viewport & AI Annotation Drawer (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Three.js Viewport */}
            <ThreeDViewer
              preset={selectedPresetId}
              width="100%"
              height="500px"
              onSelectHotspot={(hs) => setSelectedHotspot(hs)}
            />

            {/* Hotspots & AI Explanation Drawer Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Hotspot Annotation Detail Card */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <h3 className="text-stone-100 font-bold text-sm flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    Interactive Hotspots ({activePreset.hotspots.length})
                  </h3>
                </div>

                <div className="space-y-2.5">
                  {activePreset.hotspots.map((hs) => {
                    const isSelected = selectedHotspot?.id === hs.id;
                    return (
                      <div
                        key={hs.id}
                        onClick={() => setSelectedHotspot(hs)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-amber-500/60 bg-amber-500/10 text-stone-100'
                            : 'border-neutral-800 bg-neutral-950/60 text-stone-300 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-amber-400">{hs.label}</span>
                          <span className="text-[9px] bg-neutral-800 text-stone-400 px-2 py-0.5 rounded-md font-mono">{hs.category}</span>
                        </div>
                        <p className="text-[11px] text-stone-400 mt-1">{hs.description}</p>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => handleFetchAiExplanation()}
                  disabled={isAiLoading}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  {isAiLoading ? 'Asking Gemini AI...' : `Explain ${activePreset.name} with AI`}
                </button>
              </div>

              {/* AI Explanation Drawer Output */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-stone-100 font-bold text-sm">Gemini AI Structural Insights</h3>
                  </div>

                  <div className="mt-3 text-xs text-stone-300 leading-relaxed font-sans space-y-2 min-h-[160px]">
                    {aiExplanation ? (
                      <div className="whitespace-pre-wrap">{aiExplanation}</div>
                    ) : (
                      <div className="text-stone-500 text-center py-10 flex flex-col items-center gap-2">
                        <MessageSquare className="w-6 h-6 text-stone-600" />
                        <span>Click an annotated hotspot or tap "Explain with AI" to generate high-yield biochemical breakdowns.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Custom AI Query Box */}
                <div className="pt-3 border-t border-neutral-800 flex gap-2">
                  <input
                    type="text"
                    placeholder="Ask AI about this structure..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleFetchAiExplanation()}
                    className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    onClick={() => handleFetchAiExplanation()}
                    disabled={isAiLoading}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    Ask
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConceptVisualizer;
