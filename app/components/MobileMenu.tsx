'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface MobileMenuProps {
  children: React.ReactNode;
}

export default function MobileMenu({ children }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Toggle function with useCallback to prevent re-creation
  const toggleMenu = useCallback((e?: React.MouseEvent) => {
    // Prevent event propagation to avoid conflicts
    e?.stopPropagation();
    e?.preventDefault();
    
    setIsOpen((prev) => !prev);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      // Add event listener with a small delay to avoid immediate closure
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Hamburger Button - Enhanced for better clickability */}
      <button
        ref={buttonRef}
        onClick={toggleMenu}
        onMouseDown={(e) => e.preventDefault()} // Prevent focus issues
        aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={isOpen}
        className="relative z-50 flex flex-col items-center justify-center rounded-lg transition-all duration-200 active:scale-95"
        style={{
          // Ensure clickable area is large enough
          minWidth: '48px',
          minHeight: '48px',
          width: '48px',
          height: '48px',
          padding: '8px',
          touchAction: 'manipulation', // Better mobile touch handling
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(26, 35, 43, 0.8)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        {/* Hamburger Icon - Three lines */}
        <span
          className={`absolute block transition-all duration-300 ease-in-out ${
            isOpen ? 'rotate-45 translate-y-0' : '-translate-y-2'
          }`}
          style={{
            height: '2px',
            width: '24px',
            backgroundColor: 'var(--color-cloud)',
          }}
        />
        <span
          className={`absolute block transition-all duration-300 ease-in-out ${
            isOpen ? 'opacity-0' : 'opacity-100'
          }`}
          style={{
            height: '2px',
            width: '24px',
            backgroundColor: 'var(--color-cloud)',
          }}
        />
        <span
          className={`absolute block transition-all duration-300 ease-in-out ${
            isOpen ? '-rotate-45 translate-y-0' : 'translate-y-2'
          }`}
          style={{
            height: '2px',
            width: '24px',
            backgroundColor: 'var(--color-cloud)',
          }}
        />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 backdrop-blur-sm z-40 transition-opacity duration-300"
          style={{
            backgroundColor: 'rgba(11, 15, 18, 0.8)',
          }}
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Menu Panel */}
      <div
        ref={menuRef}
        className={`fixed top-0 right-0 h-full z-50 transform transition-transform duration-300 ease-in-out`}
        style={{
          width: '320px',
          maxWidth: '85vw',
          backgroundColor: 'var(--color-slate)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
      >
        {/* Close button inside menu */}
        <div
          className="flex items-center justify-between p-4"
          style={{
            borderBottom: '1px solid rgba(199, 208, 218, 0.2)',
          }}
        >
          <h2
            className="text-lg font-semibold"
            style={{
              color: 'var(--color-cloud)',
              fontFamily: 'var(--font-primary)',
            }}
          >
            Menú
          </h2>
          <button
            onClick={toggleMenu}
            aria-label="Cerrar menú"
            className="flex items-center justify-center rounded-lg transition-colors"
            style={{
              width: '40px',
              height: '40px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(26, 35, 43, 0.8)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              style={{
                color: 'var(--color-cloud)',
              }}
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Menu Content */}
        <nav
          className="p-4 overflow-y-auto"
          style={{
            height: 'calc(100% - 73px)',
          }}
        >
          {children}
        </nav>
      </div>
    </>
  );
}
