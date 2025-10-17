"use client";

import { useLanguage } from '../contexts/LanguageContext';

export default function EpicSection() {
  const { t } = useLanguage();

  return (
    <section className="epic-gradient py-24 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight" style={{ fontFamily: 'var(--font-family-primary)' }}>
          PLEIA
        </h2>
        <p className="text-xl text-gray-300 mb-4 font-medium">
          {t('epic.subtitle')}
        </p>
        <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
          {t('epic.description')}
        </p>
        
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-aurora to-electric rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--color-aurora), var(--color-electric))' }}>
              <div className="w-8 h-8 bg-white rounded-lg"></div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {t('epic.feature1')}
            </h3>
            <p className="text-gray-400">
              {t('epic.feature1Desc')}
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-aurora to-electric rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--color-aurora), var(--color-electric))' }}>
              <div className="w-8 h-8 bg-white rounded-lg"></div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {t('epic.feature2')}
            </h3>
            <p className="text-gray-400">
              {t('epic.feature2Desc')}
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-aurora to-electric rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--color-aurora), var(--color-electric))' }}>
              <div className="w-8 h-8 bg-white rounded-lg"></div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {t('epic.feature3')}
            </h3>
            <p className="text-gray-400">
              {t('epic.feature3Desc')}
            </p>
          </div>
        </div>
        
        <a 
          href="https://jeylabbb.com"
          target="_blank"
          rel="noopener noreferrer"
          className="spotify-button text-lg px-8 py-4"
        >
          JeyLabbb
        </a>
      </div>
    </section>
  );
}
