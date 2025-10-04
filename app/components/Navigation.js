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
        className="fixed top-4 left-4 z-50 bg-gray-800/90 backdrop-blur-sm hover:bg-gray-700 text-white rounded-lg p-3 border border-gray-600 hover:border-gray-500 transition-all duration-200 shadow-lg"
        aria-label="Abrir menú de navegación"
      >
        <div className="flex flex-col gap-1 w-6">
          <div className={`h-0.5 bg-white transition-all duration-300 ${isOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
          <div className={`h-0.5 bg-white transition-all duration-300 ${isOpen ? 'opacity-0' : ''}`} />
          <div className={`h-0.5 bg-white transition-all duration-300 ${isOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
        </div>
      </button>

      {/* Navigation Menu */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-start justify-start">
          <div className="bg-gray-900 border-r border-gray-700 min-h-full w-80 shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-gray-700 bg-gradient-to-r from-green-500/20 to-cyan-500/20">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">JeyLabbb</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors text-2xl p-1"
                  aria-label="Cerrar menú"
                >
                  ×
                </button>
              </div>
              <p className="text-gray-300 text-sm mt-2">AI Playlist Generator</p>
            </div>

            {/* Menu Items */}
            <nav className="p-6">
              <div className="space-y-2">
                {menuItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-4 p-4 rounded-lg transition-all duration-200 ${
                      item.active
                        ? 'bg-blue-600 text-white border border-blue-500'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white border border-transparent hover:border-gray-600'
                    }`}
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                    {item.active && (
                      <span className="ml-auto w-2 h-2 bg-white rounded-full" />
                    )}
                  </a>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-gray-700">
                <div className="text-center">
                  <p className="text-gray-400 text-sm">
                    Made with ❤️ for music lovers
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    Powered by AI & Spotify
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
