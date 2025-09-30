"use client";

import { useLanguage } from '../contexts/LanguageContext';

export default function LanguageSwitcher() {
  const { language, changeLanguage } = useLanguage();

  return (
    <div className="language-switcher">
      <button
        className={language === 'es' ? 'active' : ''}
        onClick={() => changeLanguage('es')}
        aria-label="Switch to Spanish"
      >
        ES
      </button>
      <button
        className={language === 'en' ? 'active' : ''}
        onClick={() => changeLanguage('en')}
        aria-label="Switch to English"
      >
        EN
      </button>
    </div>
  );
}
