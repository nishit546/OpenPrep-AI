export const DEFAULT_ACCENT_COLORS = {
  primary: { h: 36, s: 62, l: 67, hex: '#e3caa5' },
  secondary: { h: 24, s: 25, l: 57, hex: '#ad8b73' },
};

export const THEME_PRESETS = {
  light: {
    id: 'light',
    name: 'Light',
    description: 'Classic warm cream light theme',
    className: 'theme-light',
    isDark: false,
    bgPreview: '#fffbe9',
    cardPreview: '#e3caa5',
    textPreview: '#2c1e16',
    defaultAccent: {
      primary: { h: 24, s: 25, l: 57, hex: '#ad8b73' },
      secondary: { h: 36, s: 62, l: 67, hex: '#e3caa5' },
    },
  },

  dark: {
    id: 'dark',
    name: 'Dark Slate',
    description: 'Espresso warm dark theme',
    className: 'theme-dark dark',
    isDark: true,
    bgPreview: '#000000',
    cardPreview: '#1f150c',
    textPreview: '#e1dcc9',
    defaultAccent: {
      primary: { h: 36, s: 28, l: 83, hex: '#e1dcc9' },
      secondary: { h: 33, s: 49, l: 17, hex: '#412d15' },
    },
  },

  glassmorphism: {
    id: 'glassmorphism',
    name: 'Modern Glassmorphism',
    description: 'Vibrant translucent glass overlays with glowing accents',
    className: 'theme-glassmorphism dark',
    isDark: true,
    bgPreview: '#0f172a',
    cardPreview: 'rgba(30, 41, 59, 0.7)',
    textPreview: '#f8fafc',
    defaultAccent: {
      primary: { h: 239, s: 84, l: 67, hex: '#6366f1' },
      secondary: { h: 271, s: 91, l: 65, hex: '#a855f7' },
    },
  },

  oled: {
    id: 'oled',
    name: 'Midnight AMOLED Dark',
    description: 'Pure pitch black background optimized for AMOLED screens',
    className: 'theme-oled dark',
    isDark: true,
    bgPreview: '#000000',
    cardPreview: '#0a0a0a',
    textPreview: '#ffffff',
    defaultAccent: {
      primary: { h: 184, s: 100, l: 50, hex: '#00f0ff' },
      secondary: { h: 43, s: 100, l: 51, hex: '#ffb703' },
    },
  },

  emerald: {
    id: 'emerald',
    name: 'Emerald Study',
    description: 'Calming forest emerald green tones for deep focus',
    className: 'theme-emerald dark',
    isDark: true,
    bgPreview: '#022c22',
    cardPreview: '#064e3b',
    textPreview: '#ecfdf5',
    defaultAccent: {
      primary: { h: 160, s: 84, l: 39, hex: '#10b981' },
      secondary: { h: 168, s: 76, l: 42, hex: '#14b8a6' },
    },
  },

  sunset: {
    id: 'sunset',
    name: 'Sunset Warm',
    description: 'Warm dusk twilight with vibrant orange and magenta glows',
    className: 'theme-sunset dark',
    isDark: true,
    bgPreview: '#181825',
    cardPreview: '#2a2a3c',
    textPreview: '#f3e8ee',
    defaultAccent: {
      primary: { h: 24, s: 95, l: 53, hex: '#f97316' },
      secondary: { h: 330, s: 81, l: 60, hex: '#ec4899' },
    },
  },

  sepia: {
    id: 'sepia',
    name: 'Sepia Reading',
    description: 'Soft parchment paper tones for non-fatiguing reading',
    className: 'theme-sepia',
    isDark: false,
    bgPreview: '#fbf0d9',
    cardPreview: '#f4ebe1',
    textPreview: '#433422',
    defaultAccent: {
      primary: { h: 31, s: 61, l: 30, hex: '#7a4b16' },
      secondary: { h: 28, s: 45, l: 55, hex: '#c58d57' },
    },
  },

  'high-contrast': {
    id: 'high-contrast',
    name: 'High Contrast',
    description: 'Maximum contrast black & white theme (WCAG 2.1 AA)',
    className: 'theme-high-contrast high-contrast dark',
    isDark: true,
    bgPreview: '#000000',
    cardPreview: '#000000',
    textPreview: '#ffffff',
    defaultAccent: {
      primary: { h: 60, s: 100, l: 50, hex: '#ffff00' },
      secondary: { h: 0, s: 0, l: 100, hex: '#ffffff' },
    },
  },

  system: {
    id: 'system',
    name: 'System Default',
    description: 'Automatically sync with device light or dark appearance',
    className: 'theme-system',
    isDark: false,
    bgPreview: '#94a3b8',
    cardPreview: '#64748b',
    textPreview: '#ffffff',
    defaultAccent: {
      primary: { h: 24, s: 25, l: 57, hex: '#ad8b73' },
      secondary: { h: 36, s: 62, l: 67, hex: '#e3caa5' },
    },
  },
};

export const THEME_PRESET_KEYS = Object.keys(THEME_PRESETS);

export const PALETTE_PRESETS = [
  { name: 'Warm Amber', primaryHex: '#ad8b73', secondaryHex: '#e3caa5' },
  { name: 'Neon Cyan', primaryHex: '#00f0ff', secondaryHex: '#0077ff' },
  { name: 'Electric Violet', primaryHex: '#8b5cf6', secondaryHex: '#ec4899' },
  { name: 'Emerald Focus', primaryHex: '#10b981', secondaryHex: '#06b6d4' },
  { name: 'Sunset Blaze', primaryHex: '#f97316', secondaryHex: '#ef4444' },
  { name: 'Royal Indigo', primaryHex: '#6366f1', secondaryHex: '#a855f7' },
  { name: 'Rose Gold', primaryHex: '#f43f5e', secondaryHex: '#fb7185' },
  { name: 'Terracotta Sepia', primaryHex: '#7a4b16', secondaryHex: '#c58d57' },
];

export const COLORBLIND_MODES = [
  {
    id: 'none',
    name: 'Standard (Full Spectrum)',
    description: 'Default full RGB spectrum display',
    badge: 'Standard',
    previewColors: ['#ef4444', '#10b981', '#3b82f6'],
  },
  {
    id: 'protanopia',
    name: 'Protanopia Filter',
    description: 'Optimized for red-blindness & red-weak vision',
    badge: 'Red-Weak',
    previewColors: ['#0072b2', '#e69f00', '#56b4e9'],
  },
  {
    id: 'deuteranopia',
    name: 'Deuteranopia Filter',
    description: 'Optimized for green-blindness & green-weak vision',
    badge: 'Green-Weak',
    previewColors: ['#005ab5', '#dc0000', '#f1c40f'],
  },
  {
    id: 'tritanopia',
    name: 'Tritanopia Filter',
    description: 'Optimized for blue-blindness & yellow-weak vision',
    badge: 'Blue-Weak',
    previewColors: ['#009e73', '#d55e00', '#cc79a7'],
  },
  {
    id: 'achromatopsia',
    name: 'Achromatopsia Filter',
    description: 'Monochromacy high-contrast grayscale mode',
    badge: 'Monochrome',
    previewColors: ['#ffffff', '#808080', '#000000'],
  },
  {
    id: 'okabe-ito',
    name: 'Okabe-Ito Palette',
    description: 'Universal colorblind compliant palette (W3C / WCAG)',
    badge: 'Universal',
    previewColors: ['#e69f00', '#56b4e9', '#009e73'],
  },
];