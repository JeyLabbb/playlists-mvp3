/**
 * Design Tokens - Sistema de diseño profesional para ads
 * Estilo Apple-like con colores Pleia y tipografías modernas
 */

export const colors = {
  // Backgrounds
  bg: {
    primary: '#0E1116',      // Fondo principal oscuro
    secondary: '#11141A',    // Fondo de cards
    tertiary: '#1A1D23',     // Fondo de elementos elevados
    overlay: 'rgba(0, 0, 0, 0.6)', // Overlay para modales
  },
  
  // Cards y elementos
  card: {
    background: '#11141A',
    border: 'rgba(255, 255, 255, 0.06)',
    hover: 'rgba(255, 255, 255, 0.08)',
  },
  
  // Bordes
  border: {
    subtle: 'rgba(255, 255, 255, 0.06)',
    medium: 'rgba(255, 255, 255, 0.12)',
    strong: 'rgba(255, 255, 255, 0.20)',
  },
  
  // Colores Pleia
  pleia: {
    green: '#36E2B4',        // Verde Pleia principal
    blue: '#5B8CFF',         // Azul Pleia secundario
    greenDark: '#2BC49A',    // Verde más oscuro para hover
    blueDark: '#4A7AE6',     // Azul más oscuro para hover
  },
  
  // Texto
  text: {
    primary: '#FFFFFF',       // Texto principal
    secondary: 'rgba(255, 255, 255, 0.7)', // Texto secundario
    tertiary: 'rgba(255, 255, 255, 0.5)',  // Texto terciario
    disabled: 'rgba(255, 255, 255, 0.3)',   // Texto deshabilitado
    accent: '#36E2B4',       // Texto de acento
  },
  
  // Estados
  state: {
    success: '#36E2B4',
    error: '#FF6B6B',
    warning: '#FFB347',
    info: '#5B8CFF',
  },
  
  // Gradientes
  gradient: {
    pleia: 'linear-gradient(135deg, #36E2B4 0%, #5B8CFF 100%)',
    subtle: 'linear-gradient(135deg, rgba(54, 226, 180, 0.1) 0%, rgba(91, 140, 255, 0.1) 100%)',
    overlay: 'linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.8) 100%)',
  },
} as const;

export const typography = {
  // Familias de fuentes
  fontFamily: {
    primary: '"Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    secondary: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
  },
  
  // Tamaños
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
    '5xl': '48px',
    '6xl': '60px',
    '7xl': '72px',
    '8xl': '96px',
  },
  
  // Pesos
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  
  // Alturas de línea
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  
  // Espaciado de letras
  letterSpacing: {
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
  },
} as const;

export const spacing = {
  // Espaciado base (4px grid)
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
  32: '128px',
  40: '160px',
  48: '192px',
  56: '224px',
  64: '256px',
} as const;

export const radius = {
  none: '0px',
  sm: '4px',
  base: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '32px',
  full: '9999px',
} as const;

export const shadows = {
  // Sombras sutiles estilo Apple
  sm: '0 1px 2px rgba(0, 0, 0, 0.1)',
  base: '0 2px 4px rgba(0, 0, 0, 0.1)',
  md: '0 4px 8px rgba(0, 0, 0, 0.12)',
  lg: '0 8px 16px rgba(0, 0, 0, 0.15)',
  xl: '0 16px 32px rgba(0, 0, 0, 0.2)',
  '2xl': '0 24px 48px rgba(0, 0, 0, 0.25)',
  
  // Sombras Pleia (con color)
  pleia: {
    sm: '0 2px 8px rgba(54, 226, 180, 0.15)',
    md: '0 4px 16px rgba(54, 226, 180, 0.2)',
    lg: '0 8px 32px rgba(54, 226, 180, 0.25)',
    glow: '0 0 20px rgba(54, 226, 180, 0.3)',
  },
  
  // Sombras internas
  inner: {
    sm: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)',
    md: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
  },
} as const;

export const opacity = {
  0: '0',
  5: '0.05',
  10: '0.1',
  20: '0.2',
  25: '0.25',
  30: '0.3',
  40: '0.4',
  50: '0.5',
  60: '0.6',
  70: '0.7',
  75: '0.75',
  80: '0.8',
  90: '0.9',
  95: '0.95',
  100: '1',
} as const;

export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
} as const;

// Breakpoints para responsive (aunque los ads son fijos)
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Configuración de animaciones
export const animation = {
  // Duración base
  duration: {
    instant: '0ms',
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
    slower: '500ms',
  },
  
  // Curvas de animación
  easing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
} as const;

// Exportar todo como un objeto unificado
export const tokens = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  opacity,
  zIndex,
  breakpoints,
  animation,
} as const;

export default tokens;

