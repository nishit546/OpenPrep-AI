import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Palette,
  Check,
  RotateCcw,
  Sparkles,
  Sun,
  Moon,
  Eye,
  Monitor,
  Feather,
  Flame,
  Trees,
  Layers,
  Sliders,
} from 'lucide-react';
import { useTheme, hslToHex, hexToHsl } from '../context/ThemeContext';
import { THEME_PRESETS, THEME_PRESET_KEYS, PALETTE_PRESETS, COLORBLIND_MODES } from '../themePresets';

const PRESET_ICONS = {
  light: Sun,
  dark: Moon,
  glassmorphism: Layers,
  oled: Moon,
  emerald: Trees,
  sunset: Flame,
  sepia: Feather,
  'high-contrast': Eye,
  system: Monitor,
};

const ThemeCustomizerDrawer = ({ isOpen, onClose }) => {
  const {
    theme,
    resolvedTheme,
    accentColors,
    colorblindFilter,
    setTheme,
    setAccentColors,
    resetAccentColors,
    setColorblindFilter,
  } = useTheme();

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activePreset = THEME_PRESETS[resolvedTheme] || THEME_PRESETS.light;
  const primary = accentColors?.primary || activePreset.defaultAccent.primary;
  const secondary = accentColors?.secondary || activePreset.defaultAccent.secondary;

  const handlePrimaryHslChange = (field, value) => {
    const newPrimary = { ...primary, [field]: Number(value) };
    newPrimary.hex = hslToHex(newPrimary.h, newPrimary.s, newPrimary.l);
    setAccentColors({ primary: newPrimary });
  };

  const handleSecondaryHslChange = (field, value) => {
    const newSecondary = { ...secondary, [field]: Number(value) };
    newSecondary.hex = hslToHex(newSecondary.h, newSecondary.s, newSecondary.l);
    setAccentColors({ secondary: newSecondary });
  };

  const handlePrimaryHexInput = (e) => {
    const hex = e.target.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      const hsl = hexToHsl(hex);
      setAccentColors({ primary: hsl });
    }
  };

  const handleSecondaryHexInput = (e) => {
    const hex = e.target.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      const hsl = hexToHsl(hex);
      setAccentColors({ secondary: hsl });
    }
  };

  const applyPalette = (palette) => {
    const pPrimary = hexToHsl(palette.primaryHex);
    const pSecondary = hexToHsl(palette.secondaryHex);
    setAccentColors({ primary: pPrimary, secondary: pSecondary });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden font-inter">
        {/* Backdrop Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          aria-hidden="true"
        />

        {/* Slide-over Drawer Panel */}
        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="w-screen max-w-md bg-[#FFFBE9] dark:bg-[#1a120b] border-l border-[#CEAB93]/40 dark:border-[#412D15] shadow-2xl flex flex-col justify-between"
            role="dialog"
            aria-modal="true"
            aria-label="Theme Customizer Drawer"
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#CEAB93]/40 dark:border-[#412D15] flex items-center justify-between bg-amber-500/10 dark:bg-amber-950/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-700/20 text-amber-800 dark:text-amber-300">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold font-playfair text-neutral-900 dark:text-neutral-100">
                    Theme Customizer
                  </h2>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    Presets & Dynamic HSL Accent Palette
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* SECTION 1: PRESET THEMES GRID */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Theme Presets
                  </h3>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {THEME_PRESETS[theme]?.name || 'Custom'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {THEME_PRESET_KEYS.map((key) => {
                    const preset = THEME_PRESETS[key];
                    const isSelected = theme === key;
                    const Icon = PRESET_ICONS[key] || Sun;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTheme(key)}
                        className={`group relative p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-amber-600 dark:border-amber-400 ring-2 ring-amber-500/40 bg-amber-500/10 dark:bg-amber-950/40'
                            : 'border-neutral-300 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/60 hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                              style={{ backgroundColor: preset.bgPreview }}
                            />
                            <Icon className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                            <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100">
                              {preset.name}
                            </span>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          )}
                        </div>

                        <p className="text-[11px] text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-tight">
                          {preset.description}
                        </p>

                        {/* Swatch indicator dots */}
                        <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-black/5 dark:border-white/5">
                          <span
                            className="w-4 h-2.5 rounded-sm border border-black/10 shadow-xs"
                            style={{ backgroundColor: preset.defaultAccent.primary.hex }}
                            title="Primary Accent"
                          />
                          <span
                            className="w-4 h-2.5 rounded-sm border border-black/10 shadow-xs"
                            style={{ backgroundColor: preset.defaultAccent.secondary.hex }}
                            title="Secondary Accent"
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <hr className="border-neutral-200 dark:border-neutral-800" />

              {/* SECTION 2: ACCENT PALETTE PRESETS */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-2">
                    <Palette className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Quick Palettes
                  </h3>
                  <button
                    type="button"
                    onClick={resetAccentColors}
                    className="text-xs text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset Default
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PALETTE_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => applyPalette(p)}
                      className="p-2 border border-neutral-300 dark:border-neutral-800 rounded-lg hover:border-amber-500 transition-all flex flex-col items-center gap-1 bg-white/50 dark:bg-black/30 cursor-pointer"
                    >
                      <div className="flex items-center gap-1">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-xs"
                          style={{ backgroundColor: p.primaryHex }}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-xs"
                          style={{ backgroundColor: p.secondaryHex }}
                        />
                      </div>
                      <span className="text-[10px] font-medium text-neutral-700 dark:text-neutral-300 truncate w-full text-center">
                        {p.name}
                      </span>
                    </button>
                </div>
              </div>

              <hr className="border-neutral-200 dark:border-neutral-800" />

              {/* SECTION 3: COLORBLIND PALETTE FILTER MODES */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-2">
                    <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Colorblind Palette Filters
                  </h3>
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    {COLORBLIND_MODES.find((m) => m.id === colorblindFilter)?.badge || 'Standard'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {COLORBLIND_MODES.map((mode) => {
                    const isSelected = colorblindFilter === mode.id;

                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setColorblindFilter(mode.id)}
                        className={`group relative p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-amber-600 dark:border-amber-400 ring-2 ring-amber-500/40 bg-amber-500/10 dark:bg-amber-950/40'
                            : 'border-neutral-300 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/60 hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                            {mode.name}
                          </span>
                          {isSelected && (
                            <Check className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          )}
                        </div>

                        <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-tight mb-2">
                          {mode.description}
                        </p>

                        {/* Preview Color Dots */}
                        <div className="flex items-center gap-1.5 pt-2 border-t border-black/5 dark:border-white/5">
                          {mode.previewColors.map((colorHex, cIdx) => (
                            <span
                              key={cIdx}
                              className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-xs"
                              style={{ backgroundColor: colorHex }}
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <hr className="border-neutral-200 dark:border-neutral-800" />

              {/* SECTION 3: HSL ACCENT COLOR PICKERS */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-600 dark:text-amber-400" /> HSL Color Controls
                </h3>

                {/* Primary Accent Picker */}
                <div className="p-3.5 border border-neutral-300 dark:border-neutral-800 rounded-xl bg-white/60 dark:bg-black/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-full border border-black/20 shadow-xs inline-block"
                        style={{ backgroundColor: primary.hex || `hsl(${primary.h}, ${primary.s}%, ${primary.l}%)` }}
                      />
                      Primary Accent
                    </label>
                    <input
                      type="text"
                      key={primary.hex}
                      defaultValue={primary.hex || '#ad8b73'}
                      onBlur={handlePrimaryHexInput}
                      className="w-20 px-2 py-0.5 text-xs text-center border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-mono"
                    />
                  </div>

                  {/* Hue Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-neutral-600 dark:text-neutral-400">
                      <span>Hue ({primary.h}°)</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={primary.h}
                      onChange={(e) => handlePrimaryHslChange('h', e.target.value)}
                      className="w-full h-1.5 bg-gradient-to-r from-red-500 via-green-500 via-blue-500 to-red-500 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Saturation Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-neutral-600 dark:text-neutral-400">
                      <span>Saturation ({primary.s}%)</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={primary.s}
                      onChange={(e) => handlePrimaryHslChange('s', e.target.value)}
                      className="w-full h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Lightness Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-neutral-600 dark:text-neutral-400">
                      <span>Lightness ({primary.l}%)</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      value={primary.l}
                      onChange={(e) => handlePrimaryHslChange('l', e.target.value)}
                      className="w-full h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Secondary Accent Picker */}
                <div className="p-3.5 border border-neutral-300 dark:border-neutral-800 rounded-xl bg-white/60 dark:bg-black/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-full border border-black/20 shadow-xs inline-block"
                        style={{ backgroundColor: secondary.hex || `hsl(${secondary.h}, ${secondary.s}%, ${secondary.l}%)` }}
                      />
                      Secondary Accent
                    </label>
                    <input
                      type="text"
                      key={secondary.hex}
                      defaultValue={secondary.hex || '#e3caa5'}
                      onBlur={handleSecondaryHexInput}
                      className="w-20 px-2 py-0.5 text-xs text-center border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-mono"
                    />
                  </div>

                  {/* Hue Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-neutral-600 dark:text-neutral-400">
                      <span>Hue ({secondary.h}°)</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={secondary.h}
                      onChange={(e) => handleSecondaryHslChange('h', e.target.value)}
                      className="w-full h-1.5 bg-gradient-to-r from-red-500 via-green-500 via-blue-500 to-red-500 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Saturation Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-neutral-600 dark:text-neutral-400">
                      <span>Saturation ({secondary.s}%)</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={secondary.s}
                      onChange={(e) => handleSecondaryHslChange('s', e.target.value)}
                      className="w-full h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Lightness Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-neutral-600 dark:text-neutral-400">
                      <span>Lightness ({secondary.l}%)</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      value={secondary.l}
                      onChange={(e) => handleSecondaryHslChange('l', e.target.value)}
                      className="w-full h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: LIVE PREVIEW WIDGET */}
              <div className="p-4 border border-neutral-300 dark:border-neutral-800 rounded-xl bg-white/70 dark:bg-black/50 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                  Live UI Component Preview
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-md transition-all cursor-pointer"
                    style={{ backgroundColor: primary.hex }}
                  >
                    Primary Button
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer"
                    style={{
                      borderColor: primary.hex,
                      color: primary.hex,
                      backgroundColor: `${secondary.hex}30`,
                    }}
                  >
                    Secondary Outline
                  </button>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: '70%',
                      background: `linear-gradient(to right, ${primary.hex}, ${secondary.hex})`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#CEAB93]/40 dark:border-[#412D15] bg-neutral-100/50 dark:bg-neutral-900/50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-yellow-400 border border-yellow-700/50 rounded-lg text-xs font-semibold shadow transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default ThemeCustomizerDrawer;
