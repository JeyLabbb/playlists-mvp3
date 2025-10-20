/**
 * Timings System - Sistema de duraciones y transiciones profesionales
 * Basado en principios de Apple y motion design moderno
 */

// Duración base en milisegundos
export const durations = {
  // Micro-interacciones (UI feedback)
  instant: 0,
  fast: 180,        // 0.18s - Respuesta inmediata
  medium: 250,       // 0.25s - Transición estándar
  slow: 350,         // 0.35s - Transición suave
  slower: 600,       // 0.6s - Transición dramática
  
  // Duraciones específicas para diferentes elementos
  ui: {
    button: 180,     // Respuesta de botón
    hover: 150,      // Hover state
    focus: 200,      // Focus state
    toggle: 250,      // Toggle switches
  },
  
  // Transiciones de contenido
  content: {
    slide: 350,      // Slide in/out
    fade: 250,       // Fade in/out
    scale: 300,      // Scale animations
    rotate: 400,     // Rotate animations
  },
  
  // Transiciones de página/pantalla
  page: {
    enter: 500,      // Entrada de pantalla
    exit: 400,       // Salida de pantalla
    transition: 600, // Transición entre pantallas
  },
  
  // Animaciones especiales
  special: {
    bounce: 600,     // Bounce effects
    elastic: 800,    // Elastic effects
    spring: 500,     // Spring animations
    stagger: 100,    // Delay entre elementos en cascada
  },
} as const;

// Curvas de animación profesionales
export const easings = {
  // Curvas estándar CSS
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
  easeInOut: [0.42, 0, 0.58, 1],
  
  // Curvas Apple-style
  apple: {
    easeIn: [0.25, 0.46, 0.45, 0.94],
    easeOut: [0.55, 0.06, 0.68, 0.19],
    easeInOut: [0.645, 0.045, 0.355, 1],
  },
  
  // Curvas Material Design
  material: {
    standard: [0.4, 0, 0.2, 1],
    decelerate: [0, 0, 0.2, 1],
    accelerate: [0.4, 0, 1, 1],
    sharp: [0.4, 0, 0.6, 1],
  },
  
  // Curvas personalizadas para Pleia
  pleia: {
    smooth: [0.25, 0.46, 0.45, 0.94],
    bounce: [0.68, -0.55, 0.265, 1.55],
    elastic: [0.175, 0.885, 0.32, 1.275],
    spring: [0.68, -0.6, 0.32, 1.6],
  },
  
  // Curvas específicas para diferentes tipos de animación
  slide: {
    in: [0.25, 0.46, 0.45, 0.94],
    out: [0.55, 0.06, 0.68, 0.19],
    bounce: [0.68, -0.55, 0.265, 1.55],
  },
  
  scale: {
    in: [0.175, 0.885, 0.32, 1.275],
    out: [0.6, -0.28, 0.735, 0.045],
    bounce: [0.68, -0.55, 0.265, 1.55],
  },
  
  fade: {
    in: [0.25, 0.46, 0.45, 0.94],
    out: [0.55, 0.06, 0.68, 0.19],
  },
  
  rotate: {
    in: [0.25, 0.46, 0.45, 0.94],
    out: [0.55, 0.06, 0.68, 0.19],
    continuous: [0.25, 0.46, 0.45, 0.94],
  },
} as const;

// Configuración de delays para animaciones en cascada
export const delays = {
  // Delays base
  none: 0,
  micro: 50,        // 0.05s
  small: 100,       // 0.1s
  medium: 150,      // 0.15s
  large: 200,       // 0.2s
  xlarge: 300,      // 0.3s
  
  // Delays específicos para diferentes patrones
  stagger: {
    tight: 50,      // Elementos muy cercanos
    normal: 100,    // Elementos normales
    loose: 150,     // Elementos espaciados
    wide: 200,      // Elementos muy espaciados
  },
  
  // Delays para secuencias específicas
  sequence: {
    fast: 80,       // Secuencia rápida
    normal: 120,    // Secuencia normal
    slow: 180,      // Secuencia lenta
  },
} as const;

// Configuración de timing para diferentes tipos de contenido
export const timingPresets = {
  // Preset para UI rápida y responsiva
  responsive: {
    duration: durations.fast,
    easing: easings.apple.easeOut,
    delay: delays.none,
  },
  
  // Preset para transiciones suaves
  smooth: {
    duration: durations.medium,
    easing: easings.apple.easeInOut,
    delay: delays.none,
  },
  
  // Preset para animaciones dramáticas
  dramatic: {
    duration: durations.slower,
    easing: easings.pleia.elastic,
    delay: delays.none,
  },
  
  // Preset para elementos en cascada
  cascade: {
    duration: durations.medium,
    easing: easings.apple.easeOut,
    delay: delays.stagger.normal,
  },
  
  // Preset para micro-interacciones
  micro: {
    duration: durations.fast,
    easing: easings.apple.easeOut,
    delay: delays.none,
  },
  
  // Preset para transiciones de página
  page: {
    duration: durations.page.transition,
    easing: easings.apple.easeInOut,
    delay: delays.none,
  },
} as const;

// Utilidades para crear configuraciones de timing dinámicas
export const createTiming = (
  duration: number = durations.medium,
  easing: number[] = easings.apple.easeOut,
  delay: number = delays.none
) => ({
  duration,
  easing,
  delay,
});

// Utilidad para crear animaciones en cascada
export const createStagger = (
  count: number,
  baseDelay: number = delays.stagger.normal,
  duration: number = durations.medium,
  easing: number[] = easings.apple.easeOut
) => {
  return Array.from({ length: count }, (_, index) => ({
    duration,
    easing,
    delay: baseDelay * index,
  }));
};

// Configuración de timing para diferentes dispositivos
export const deviceTiming = {
  // Reducir duraciones en dispositivos más lentos
  slow: {
    multiplier: 0.7,
    minDuration: 150,
  },
  
  // Duraciones normales
  normal: {
    multiplier: 1,
    minDuration: 180,
  },
  
  // Duraciones más largas para dispositivos rápidos
  fast: {
    multiplier: 1.2,
    minDuration: 200,
  },
} as const;

// Función para ajustar timing según el dispositivo
export const adjustForDevice = (
  baseDuration: number,
  deviceType: keyof typeof deviceTiming = 'normal'
) => {
  const config = deviceTiming[deviceType];
  const adjustedDuration = baseDuration * config.multiplier;
  return Math.max(adjustedDuration, config.minDuration);
};

// Exportar configuración unificada
export const timings = {
  durations,
  easings,
  delays,
  presets: timingPresets,
  createTiming,
  createStagger,
  adjustForDevice,
} as const;

export default timings;

