"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const menuItems = [
    {
      href: '/',
      label: 'Generador IA',
      subtitle: 'Crea playlists perfectas',
      icon: '🎵',
      active: pathname === '/'
    },
    {
      href: '/trending',
      label: 'Trending',
      subtitle: 'Playlists populares',
      icon: '🔥',
      active: pathname === '/trending'
    }
  ];

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed top-6 left-6 z-50 group transition-all duration-300 ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        aria-label="Abrir menú de navegación"
      >
        <div className="relative w-10 h-10 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700/50 backdrop-blur-xl flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:shadow-green-500/20 group-hover:border-green-500/30">
          <div className="flex flex-col gap-1.5 w-5">
            <div className="h-0.5 bg-white transition-all duration-300 group-hover:bg-green-400" />
            <div className="h-0.5 bg-white transition-all duration-300 group-hover:bg-green-400" />
            <div className="h-0.5 bg-white transition-all duration-300 group-hover:bg-green-400" />
          </div>
        </div>
      </button>

      {/* Navigation Menu */}
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="absolute top-0 left-0 h-full w-80 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border-r border-gray-700/50 shadow-2xl backdrop-blur-xl">
            {/* Header */}
            <div className="relative p-8 border-b border-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    JeyLabbb
                  </h1>
                  <p className="text-gray-400 text-sm font-medium">
                    AI Playlist Generator
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-800/50 hover:bg-gray-700/50 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200 group"
                  aria-label="Cerrar menú"
                >
                  <svg className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Menu Items */}
            <nav className="p-6 space-y-4">
              {menuItems.map((item, index) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`group relative block p-6 rounded-2xl transition-all duration-300 ${
                    item.active
                      ? 'bg-gradient-to-r from-green-500/20 to-cyan-500/20 border border-green-500/30 shadow-lg shadow-green-500/10'
                      : 'hover:bg-gray-800/50 border border-transparent hover:border-gray-600/30 hover:shadow-lg'
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all duration-300 ${
                      item.active 
                        ? 'bg-gradient-to-br from-green-500/30 to-cyan-500/30 text-green-400' 
                        : 'bg-gray-800/50 text-gray-400 group-hover:bg-gray-700/50 group-hover:text-white group-hover:scale-110'
                    }`}>
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold text-lg transition-colors duration-200 ${
                        item.active ? 'text-white' : 'text-gray-300 group-hover:text-white'
                      }`}>
                        {item.label}
                      </h3>
                      <p className={`text-sm transition-colors duration-200 ${
                        item.active ? 'text-gray-400' : 'text-gray-500 group-hover:text-gray-400'
                      }`}>
                        {item.subtitle}
                      </p>
                    </div>
                    {item.active && (
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    )}
                  </div>
                  
                  {/* Hover effect */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </a>
              ))}
            </nav>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-700/50 bg-gray-900/50 backdrop-blur-xl">
              <div className="text-center space-y-2">
                <p className="text-gray-400 text-sm font-medium">
                  Made with ❤️ for music lovers
                </p>
                <p className="text-gray-500 text-xs">
                  Powered by AI JeyLabbb Engines
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
