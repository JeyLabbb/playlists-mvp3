"use client";

import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('es');
  const [translations, setTranslations] = useState({
    'prompt.title': '¿Qué tipo de playlist quieres?',
    'prompt.placeholder': 'Describe tu playlist perfecta... ej: \'calentar para Primavera Sound 2024\', \'reggaeton como Bad Bunny pero sin Bad Bunny\', \'girl groups k-pop 2024\'',
    'prompt.tracksLabel': 'Canciones:',
    'prompt.generateButton': 'Generar Playlist',
    'prompt.examples': 'Ejemplos:',
    'prompt.example1': 'festival warm-up para Primavera Sound 2024',
    'prompt.example2': 'reggaeton como Bad Bunny pero sin Bad Bunny',
    'prompt.example3': 'girl groups k-pop 2024',
    'prompt.example4': 'música para estudiar sin distracciones',
    'prompt.example5': 'hits latinos para el verano 2024',
    'empty.title': 'Crea tu primera playlist',
    'empty.description': 'Describe el tipo de música que quieres y te generaremos una playlist personalizada con IA.',
    'playlist.createTitle': 'Crear playlist',
    'playlist.createButton': 'Crear en Spotify',
    'playlist.creating': 'Creando...',
    'playlist.tracksTitle': 'Canciones generadas',
    'progress.title': 'Generando playlist...',
    'progress.errorTitle': 'Error al generar',
    'tips.includeArtists.title': 'Incluye artistas específicos',
    'tips.includeArtists.description': 'Menciona artistas que te gustan para obtener resultados más precisos.',
    'tips.includeArtists.example': 'rock como Arctic Monkeys pero más pesado',
    'tips.specifyLanguage.title': 'Especifica el idioma',
    'tips.specifyLanguage.description': 'Indica si quieres música en español, inglés o ambos idiomas.',
    'tips.specifyLanguage.example': 'reggaeton en español para el gym',
    'tips.runningBPM.title': 'Menciona el BPM',
    'tips.runningBPM.description': 'Si buscas música para correr, especifica el ritmo que necesitas.',
    'tips.runningBPM.example': 'música para correr a 160 BPM',
    'tips.festivalFormat.title': 'Formato de festival',
    'tips.festivalFormat.description': 'Especifica si es para calentar, el peak o el cierre del festival.',
    'tips.festivalFormat.example': 'warm-up para Primavera Sound 2024'
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load translations
  useEffect(() => {
    const loadTranslations = async () => {
      setIsLoading(true);
      
      try {
        const response = await fetch(`/locales/${language}.json`);
        if (!response.ok) throw new Error('Failed to fetch translations');
        const data = await response.json();
        console.log('Translations loaded:', data);
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
    // Direct lookup for flat keys
    if (translations[key]) {
      return translations[key];
    }
    
    // If translations are empty, return key
    if (Object.keys(translations).length === 0) {
      return key; // Return key while loading
    }
    
    const keys = key.split('.');
    let value = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation not found for key: ${key}`);
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
