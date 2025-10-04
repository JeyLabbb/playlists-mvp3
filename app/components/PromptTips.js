"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "../contexts/LanguageContext";

export default function PromptTips() {
  const { t, isLoading: translationsLoading } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  
  // Debug: log translation state
  console.log('PromptTips - translationsLoading:', translationsLoading);
  console.log('PromptTips - festivalFormat title:', t('tips.festivalFormat.title'));

  const tips = [
    {
      title: t('tips.includeArtists.title'),
      description: t('tips.includeArtists.description'),
      example: t('tips.includeArtists.example')
    },
    {
      title: t('tips.specifyLanguage.title'),
      description: t('tips.specifyLanguage.description'),
      example: t('tips.specifyLanguage.example')
    },
    {
      title: t('tips.runningBPM.title'),
      description: t('tips.runningBPM.description'),
      example: t('tips.runningBPM.example')
    },
    {
      title: t('tips.studyInstrumental.title'),
      description: t('tips.studyInstrumental.description'),
      example: t('tips.studyInstrumental.example')
    },
    {
      title: t('tips.festivalFormat.title'),
      description: t('tips.festivalFormat.description'),
      example: t('tips.festivalFormat.example')
    },
    {
      title: t('tips.excludeArtists.title'),
      description: t('tips.excludeArtists.description'),
      example: t('tips.excludeArtists.example')
    },
    {
      title: t('tips.specificEra.title'),
      description: t('tips.specificEra.description'),
      example: t('tips.specificEra.example')
    },
    {
      title: t('tips.activityContext.title'),
      description: t('tips.activityContext.description'),
      example: t('tips.activityContext.example')
    },
    {
      title: t('tips.genreCombinations.title'),
      description: t('tips.genreCombinations.description'),
      example: t('tips.genreCombinations.example')
    },
    {
      title: t('tips.moodDescriptors.title'),
      description: t('tips.moodDescriptors.description'),
      example: t('tips.moodDescriptors.example')
    }
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-dark hover:bg-gray-700 text-white rounded-full border border-gray-600 hover:border-gray-500 transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl"
      >
        <span className="text-lg">💡</span>
        <span>{translationsLoading ? 'Cargando...' : t('prompt.tipsButton')}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500/20 to-cyan-500/20 p-6 border-b border-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {t('tips.title')}
                  </h2>
                  <p className="text-gray-300 text-base">
                    {t('tips.subtitle')}
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors text-2xl p-2 hover:bg-gray-800 rounded-full ml-4"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
                <p className="text-gray-300 text-sm leading-relaxed">
                  {t('tips.intro')}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {translationsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Cargando consejos...</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {tips.map((tip, index) => (
                    <div key={index} className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50 hover:border-gray-600 transition-all duration-200 hover:bg-gray-800/70">
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-start gap-3">
                        <span className="text-xl">{tip.title.split(' ')[0]}</span>
                        <span className="flex-1">{tip.title.split(' ').slice(1).join(' ')}</span>
                      </h3>
                      <p className="text-gray-300 mb-4 leading-relaxed text-sm">
                        {tip.description}
                      </p>
                      <div className="bg-gray-900/80 rounded-lg p-3 border border-gray-600/30">
                        <p className="text-sm text-cyan-400 font-mono">
                          &ldquo;{tip.example}&rdquo;
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pro Tip */}
              <div className="mt-6 p-5 bg-gradient-to-r from-green-500/20 to-cyan-500/20 rounded-xl border border-green-500/30">
                <h4 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
                  {t('tips.proTip.title')}
                </h4>
                <p className="text-gray-300 leading-relaxed text-sm">
                  {t('tips.proTip.description')}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-700 bg-gray-800/30">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                {t('tips.closeButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
