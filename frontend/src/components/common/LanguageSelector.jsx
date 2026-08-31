import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ja', name: '日本語' },
  { code: 'ar', name: 'العربية' },
  { code: 'bn', name: 'বাংলা' },
  { code: 'pt', name: 'Português' },
  { code: 'id', name: 'Bahasa Indonesia' }
];

export default function LanguageSelector() {
  const { i18n, t } = useTranslation();

  const handleLanguageChange = (e) => {
    const targetLang = e.target.value;
    i18n.changeLanguage(targetLang);
    
    // Sync to user profile and localStorage
    localStorage.setItem('user-preferred-lng', targetLang);
    localStorage.setItem('preferred_language', targetLang);
  };

  return (
    <div className="relative inline-block text-left">
      <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 shadow-sm text-stone-200 text-xs">
        <Globe className="w-4 h-4 text-rose-500 shrink-0" />
        <select
          value={i18n.language || 'en'}
          onChange={handleLanguageChange}
          className="bg-transparent border-none text-xs font-semibold focus:outline-none text-stone-200 cursor-pointer"
          aria-label={t('select_language') || 'Select Language'}
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code} className="bg-neutral-900 text-stone-200">
              {lang.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
