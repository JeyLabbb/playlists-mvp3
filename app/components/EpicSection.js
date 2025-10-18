"use client";

import { useLanguage } from '../contexts/LanguageContext';

export default function EpicSection() {
  const { t } = useLanguage();

  return (
    <section className="epic-gradient py-24 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-5xl md:text-6xl font-bold mb-6 leading-tight" style={{
          fontFamily: 'var(--font-primary)',
          fontSize: '4.5rem',
          fontWeight: '800',
          letterSpacing: '-0.04em',
          background: 'var(--gradient-primary)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          lineHeight: '0.9'
        }}>
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
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--color-slate)', border: '2px solid rgba(255, 255, 255, 0.2)' }}>
              <svg width="48" height="48" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="gradStar1" x1="176" y1="176" x2="336" y2="336" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#36E2B4"/>
                    <stop offset="1" stopColor="#5B8CFF"/>
                  </linearGradient>
                </defs>
                <path d="M256 136L276 210L352 230L276 250L256 324L236 250L160 230L236 210Z" fill="url(#gradStar1)" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="2"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {t('epic.feature1')}
            </h3>
            <p className="text-gray-400">
              {t('epic.feature1Desc')}
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--color-slate)', border: '2px solid rgba(255, 255, 255, 0.2)' }}>
              <svg width="48" height="48" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="gradStar1" x1="176" y1="176" x2="336" y2="336" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#36E2B4"/>
                    <stop offset="1" stopColor="#5B8CFF"/>
                  </linearGradient>
                </defs>
                <path d="M256 136L276 210L352 230L276 250L256 324L236 250L160 230L236 210Z" fill="url(#gradStar1)" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="2"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {t('epic.feature2')}
            </h3>
            <p className="text-gray-400">
              {t('epic.feature2Desc')}
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--color-slate)', border: '2px solid rgba(255, 255, 255, 0.2)' }}>
              <svg width="48" height="48" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="gradStar1" x1="176" y1="176" x2="336" y2="336" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#36E2B4"/>
                    <stop offset="1" stopColor="#5B8CFF"/>
                  </linearGradient>
                </defs>
                <path d="M256 136L276 210L352 230L276 250L256 324L236 250L160 230L236 210Z" fill="url(#gradStar1)" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="2"/>
              </svg>
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
          className="inline-block text-night font-semibold text-lg px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
          style={{
            background: 'var(--gradient-primary)',
            color: 'var(--color-night)',
            fontFamily: 'var(--font-primary)',
            fontWeight: '600',
            borderRadius: '16px',
            boxShadow: '0 8px 25px rgba(54, 226, 180, 0.25)'
          }}
        >
          JeyLabbb
        </a>
      </div>
    </section>
  );
}
