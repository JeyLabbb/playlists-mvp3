"use client";

import { useState } from 'react';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const menuItems = [
    {
      href: '/',
      label: 'Generador IA de Playlists',
      icon: '🎵',
      active: pathname === '/'
    },
    {
      href: '/trending',
      label: 'Trending Playlists',
      icon: '🔥',
      active: pathname === '/trending'
    }
  ];

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 bg-gray-900/95 backdrop-blur-md hover:bg-gray-800 text-white rounded-xl p-3 border border-gray-700 hover:border-gray-600 transition-all duration-300 shadow-xl hover:shadow-2xl group"
        aria-label="Abrir menú de navegación"
      >
        <div className="flex flex-col gap-1.5 w-6">
          <div className={`h-0.5 bg-white transition-all duration-300 group-hover:bg-green-400 ${isOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <div className={`h-0.5 bg-white transition-all duration-300 group-hover:bg-green-400 ${isOpen ? 'opacity-0' : ''}`} />
          <div className={`h-0.5 bg-white transition-all duration-300 group-hover:bg-green-400 ${isOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </div>
      </button>

      {/* Navigation Menu */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/90 backdrop-blur-md flex items-start justify-start">
          <div className="bg-gray-900/95 border-r border-gray-600 min-h-full w-80 shadow-2xl backdrop-blur-xl">
            {/* Header */}
            <div className="p-6 border-b border-gray-600 bg-gradient-to-r from-green-500/30 to-cyan-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">JeyLabbb</h2>
                  <p className="text-gray-300 text-sm mt-1">AI Playlist Generator</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white transition-all duration-200 text-3xl p-2 hover:bg-gray-800 rounded-lg"
                  aria-label="Cerrar menú"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Menu Items */}
            <nav className="p-6">
              <div className="space-y-3">
                {menuItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 group ${
                      item.active
                        ? 'bg-gradient-to-r from-green-500/20 to-cyan-500/20 text-white border border-green-500/30 shadow-lg'
                        : 'text-gray-300 hover:bg-gray-800/50 hover:text-white border border-transparent hover:border-gray-600 hover:shadow-md'
                    }`}
                  >
                    <span className="text-3xl group-hover:scale-110 transition-transform duration-200">{item.icon}</span>
                    <span className="font-semibold text-lg">{item.label}</span>
                    {item.active && (
                      <span className="ml-auto w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                    )}
                  </a>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-gray-600">
                <div className="text-center">
                  <p className="text-gray-400 text-sm">
                    Made with ❤️ for music lovers
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    Powered by AI JeyLabbb Engines
                  </p>
                </div>
              </div>
            </nav>
          </div>

          {/* Overlay to close menu */}
          <div 
            className="flex-1 h-full" 
            onClick={() => setIsOpen(false)}
            aria-label="Cerrar menú"
          />
        </div>
      )}
    </>
  );
}
