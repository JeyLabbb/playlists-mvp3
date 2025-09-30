"use client";

import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('es');
  const [translations, setTranslations] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Load translations
  useEffect(() => {
    const loadTranslations = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/locales/${language}.json`);
        if (!response.ok) throw new Error('Failed to fetch translations');
        const data = await response.json();
        setTranslations(data);
      } catch (error) {
        console.error('Failed to load translations:', error);
        // Fallback to Spanish
        if (language !== 'es') {
          try {
            const fallbackResponse = await fetch('/locales/es.json');
            const fallbackData = await fallbackResponse.json();
            setTranslations(fallbackData);
          } catch (fallbackError) {
            console.error('Failed to load fallback translations:', fallbackError);
            // Use empty translations as last resort
            setTranslations({});
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadTranslations();
  }, [language]);

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('playlist-ai-language');
    if (savedLanguage && (savedLanguage === 'es' || savedLanguage === 'en')) {
      setLanguage(savedLanguage);
    } else {
      // Auto-detect from browser language
      const browserLang = navigator.language.split('-')[0];
      setLanguage(browserLang === 'en' ? 'en' : 'es');
    }
  }, []);

  const changeLanguage = (newLanguage) => {
    setLanguage(newLanguage);
    localStorage.setItem('playlist-ai-language', newLanguage);
  };

  const t = (key) => {
    // If translations are still loading, return a loading state or the key
    if (isLoading || Object.keys(translations).length === 0) {
      return key; // Return key while loading
    }
    
    const keys = key.split('.');
    let value = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
