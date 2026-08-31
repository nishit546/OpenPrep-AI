import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { THEME_PRESETS, THEME_PRESET_KEYS, DEFAULT_ACCENT_COLORS } from '../themePresets';

export const ThemeContext = createContext({
  theme: 'system',
  resolvedTheme: 'light',
  isDarkMode: false,
  accentColors: DEFAULT_ACCENT_COLORS,
  colorblindFilter: 'none',
  setTheme: () => {},
  toggleTheme: () => {},
  setAccentColors: () => {},
  resetAccentColors: () => {},
  setColorblindFilter: () => {},
});

const STORAGE_KEY = 'openprep_theme';
const LEGACY_STORAGE_KEY = 'theme';
const ACCENT_STORAGE_KEY = 'openprep_accent_colors';
const COLORBLIND_STORAGE_KEY = 'openprep_colorblind_filter';

const readSavedColorblindFilter = () => {
  if (typeof window === 'undefined') return 'none';
  return localStorage.getItem(COLORBLIND_STORAGE_KEY) || 'none';
};

const readSavedTheme = () => {
  if (typeof window === 'undefined') return 'system';
  const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  return THEME_PRESET_KEYS.includes(saved) ? saved : 'system';
};

const readSavedAccentColors = () => {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(ACCENT_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
};

const systemPrefersDark = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

export const hexToHsl = (hex) => {
  if (!hex || typeof hex !== 'string') return { h: 0, s: 0, l: 50, hex: '#808080' };
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  if (c.length !== 6) return { h: 0, s: 0, l: 50, hex: '#808080' };
  const num = parseInt(c, 16);
  const r = (num >> 16) / 255;
  const g = ((num >> 8) & 0xff) / 255;
  const b = (num & 0xff) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
    hex: `#${c}`,
  };
};

export const hslToHex = (h, s, l) => {
  const light = l / 100;
  const a = (s * Math.min(light, 1 - light)) / 100;
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = light - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(readSavedTheme);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);
  const [customAccentColors, setCustomAccentColors] = useState(readSavedAccentColors);
  const [colorblindFilter, setColorblindFilterState] = useState(readSavedColorblindFilter);

  const resolvedTheme = useMemo(() => {
    if (theme === 'system') return systemDark ? 'dark' : 'light';
    return theme;
  }, [theme, systemDark]);

  const activePreset = useMemo(() => {
    return THEME_PRESETS[resolvedTheme] || THEME_PRESETS.light;
  }, [resolvedTheme]);

  const isDarkMode = useMemo(() => {
    if (theme === 'system') return systemDark;
    return !!activePreset.isDark;
  }, [theme, systemDark, activePreset]);

  const accentColors = useMemo(() => {
    if (customAccentColors && customAccentColors[resolvedTheme]) {
      return customAccentColors[resolvedTheme];
    }
    return activePreset.defaultAccent || DEFAULT_ACCENT_COLORS;
  }, [customAccentColors, resolvedTheme, activePreset]);

  const setTheme = (newTheme) => {
    if (THEME_PRESET_KEYS.includes(newTheme)) {
      setThemeState(newTheme);
    }
  };

  const toggleTheme = () => {
    setThemeState((prevTheme) => {
      const currentResolved = prevTheme === 'system' ? (systemDark ? 'dark' : 'light') : prevTheme;
      return currentResolved === 'dark' ? 'light' : 'dark';
    });
  };

  const setAccentColors = (colors) => {
    setCustomAccentColors((prev) => {
      const updated = {
        ...(prev || {}),
        [resolvedTheme]: {
          primary: colors.primary
            ? { ...colors.primary, hex: colors.primary.hex || hslToHex(colors.primary.h, colors.primary.s, colors.primary.l) }
            : accentColors.primary,
          secondary: colors.secondary
            ? { ...colors.secondary, hex: colors.secondary.hex || hslToHex(colors.secondary.h, colors.secondary.s, colors.secondary.l) }
            : accentColors.secondary,
        },
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(ACCENT_STORAGE_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const resetAccentColors = () => {
    setCustomAccentColors((prev) => {
      if (!prev) return null;
      const updated = { ...prev };
      delete updated[resolvedTheme];
      if (typeof window !== 'undefined') {
        localStorage.setItem(ACCENT_STORAGE_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  const setColorblindFilter = (mode) => {
    setColorblindFilterState(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(COLORBLIND_STORAGE_KEY, mode);
    }
  };

  // Listen for OS system preference changes (used while theme === 'system')
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setSystemDark(e.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  // Sync theme class & root CSS custom properties to <html>
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = window.document.documentElement;

    // Remove all previous theme classes
    const classesToRemove = [
      'dark',
      'high-contrast',
      'theme-light',
      'theme-dark',
      'theme-glassmorphism',
      'theme-oled',
      'theme-emerald',
      'theme-sunset',
      'theme-sepia',
      'theme-high-contrast',
      'theme-system',
    ];
    root.classList.remove(...classesToRemove);

    // Apply current theme preset classes
    const targetClasses = (activePreset.className || '').split(' ').filter(Boolean);
    targetClasses.forEach((cls) => root.classList.add(cls));

    if (isDarkMode) {
      root.classList.add('dark');
    }

    // Apply dynamic CSS Variables
    const { primary, secondary } = accentColors;
    root.style.setProperty('--accent-primary', primary.hex || `hsl(${primary.h}, ${primary.s}%, ${primary.l}%)`);
    root.style.setProperty('--accent-secondary', secondary.hex || `hsl(${secondary.h}, ${secondary.s}%, ${secondary.l}%)`);
    root.style.setProperty('--primary-h', String(primary.h));
    root.style.setProperty('--primary-s', `${primary.s}%`);
    root.style.setProperty('--primary-l', `${primary.l}%`);
    root.style.setProperty('--secondary-h', String(secondary.h));
    root.style.setProperty('--secondary-s', `${secondary.s}%`);
    root.style.setProperty('--secondary-l', `${secondary.l}%`);
    root.style.setProperty('--color-primary', primary.hex);
    root.style.setProperty('--color-secondary', secondary.hex);

    // Apply Colorblind Filter attribute
    root.setAttribute('data-colorblind-filter', colorblindFilter);

    localStorage.setItem(STORAGE_KEY, theme);
    localStorage.setItem(LEGACY_STORAGE_KEY, theme);
  }, [theme, resolvedTheme, activePreset, isDarkMode, accentColors, colorblindFilter]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        isDarkMode,
        accentColors,
        colorblindFilter,
        setTheme,
        toggleTheme,
        setAccentColors,
        resetAccentColors,
        setColorblindFilter,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

