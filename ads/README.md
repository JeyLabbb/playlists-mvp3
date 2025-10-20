# 🎬 Ads Studio - Sistema de Video Profesional

Estudio de video completamente refactorizado con arquitectura modular y componentes profesionales para crear ads de alta calidad.

## 🚀 Inicio Rápido

### Previsualizar videos
```bash
# Studio completo
npm run ad:preview

# Video de 15 segundos
npm run ad:preview:15

# Video de 30 segundos  
npm run ad:preview:30
```

### Renderizar videos
```bash
# Video de 15 segundos
npm run ad:15

# Video de 30 segundos
npm run ad:30
```

## 📁 Arquitectura

```
ads/
├── src/
│   ├── design/           # Sistema de design tokens
│   │   ├── tokens.ts     # Colores, tipografías, spacing, etc.
│   │   └── timings.ts    # Duraciones y easings profesionales
│   ├── comps/            # Componentes reutilizables
│   │   ├── transitions/   # SlideIn, Push, ZoomInTight, etc.
│   │   └── ui/           # PromptBox, SongCard, PlaylistsGrid
│   ├── 3d/              # Componentes 3D con Three.js
│   │   └── StarPleia.tsx # Estrella 3D con glow suave
│   ├── lottie/          # Animaciones Lottie
│   │   └── index.tsx    # Loader, Sparkles, Success
│   ├── audio/           # Sistema de audio
│   │   └── index.ts     # SFX y util playSfx
│   ├── Video15s.tsx     # Video promocional 15s
│   ├── Video30s.tsx     # Video promocional 30s
│   └── Root.tsx         # Registro de composiciones
└── out/                 # Videos renderizados
```

## 🎨 Design System

### Colores Pleia
- **Verde**: `#36E2B4` - Color principal
- **Azul**: `#5B8CFF` - Color secundario
- **Fondo**: `#0E1116` - Fondo principal
- **Cards**: `#11141A` - Fondo de elementos

### Tipografías
- **Primaria**: Space Grotesk (moderna y limpia)
- **Secundaria**: Inter (legibilidad perfecta)
- **Mono**: SF Mono (código y datos)

### Transiciones
- **SlideIn**: Deslizamiento suave con dirección
- **Push**: Transición de empuje estilo iOS
- **ZoomInTight**: Zoom con enfoque dramático
- **WipeDiagonal**: Transición diagonal con máscara
- **MatchCut**: Reposicionamiento para continuidad visual

## 🎯 Características

### ✅ Implementado
- [x] Sistema de design tokens completo
- [x] Transiciones profesionales Apple-style
- [x] Componentes UI mock reales (sin capturas)
- [x] Componentes 3D con Three.js
- [x] Integración Lottie con animaciones
- [x] Sistema de audio con SFX
- [x] Videos refactorizados (15s y 30s)
- [x] Scripts de export optimizados

### 🎬 Videos Disponibles

#### Video15s (15 segundos)
- **Hook**: Texto grande con impacto
- **PromptBox**: Tecleo con keyboard-click SFX
- **Resultados**: SongCard en cascada con SlideIn
- **CTA**: Logo 3D + URL + botón

#### Video30s (30 segundos)
- **Hook**: Problema identificado
- **Problem**: Transición Push con pain points
- **Solution**: WipeDiagonal con estrella 3D
- **PromptBox**: Tecleo extendido
- **Resultados**: Más canciones en cascada
- **Features**: PlaylistsGrid con variedad
- **CTA**: Logo 3D + partículas + éxito

## 🔧 Uso de Componentes

### Transiciones
```tsx
import { SlideIn, Push, ZoomInTight } from './comps/transitions';

<SlideIn delay={0.5} duration={350} direction="up" intensity="dramatic">
  <YourContent />
</SlideIn>
```

### UI Components
```tsx
import { PromptBox, SongCard, PlaylistsGrid } from './comps/ui';

<PromptBox
  placeholder="Buscar música..."
  value="Música para estudiar"
  isTyping={true}
  width={400}
  height={56}
/>
```

### 3D Components
```tsx
import { StarPleia, StarPleiaParticles } from './3d/StarPleia';

<StarPleia
  width={200}
  height={200}
  size={1.5}
  count={3}
/>
```

### Audio SFX
```tsx
import { useSFX } from './audio';

const keyboardSFX = useSFX('keyboard-click', 0.4, 2.5);
const successSFX = useSFX('success', 0.7, 11);
```

## 🎵 Audio System

### SFX Disponibles
- `whoosh` - Sonido de aire rápido
- `swoosh` - Deslizamiento suave
- `keyboard-click` - Click de teclado
- `button-click` - Click de botón
- `success` - Confirmación exitosa
- `notification` - Notificación
- `hover` - Hover sutil
- `focus` - Enfoque

### Configuración
```tsx
const sfxConfig = {
  'keyboard-click': {
    file: '/audio/keyboard-click.wav',
    volume: 0.4,
    duration: 0.1,
  },
  // ... más configuraciones
};
```

## 🎨 Lottie Animations

### Animaciones Disponibles
- **Loader**: Spinner de carga circular
- **Sparkles**: Partículas brillantes
- **Success**: Checkmark con sparkles
- **Overlay**: Superposición opcional

### Uso
```tsx
import { LottieSparkles, SuccessAnimation } from './lottie';

<LottieSparkles width={200} height={200} />
<SuccessAnimation width={300} height={300} />
```

## 📱 Formato de Salida

- **Resolución**: 1080x1920 (9:16 vertical)
- **FPS**: 30
- **Codec**: H.264
- **Formato**: MP4
- **Duración**: 15s y 30s
- **Optimizado**: Para TikTok, Instagram Reels, YouTube Shorts

## 🚀 Rendimiento

- **Tiempo de renderizado**: ~2-3 minutos por video
- **Tamaño de archivo**: ~3-6MB (comprimido)
- **Calidad**: 1080p, 30fps, H.264
- **Compatibilidad**: Todos los dispositivos móviles

## 🎯 Filosofía de Diseño

### Principios Apple
- Simplicidad y elegancia
- Animaciones naturales
- Tipografía del sistema
- Colores minimalistas
- Transiciones fluidas

### Optimización Mobile-First
- Formato vertical nativo
- Elementos grandes y legibles
- Contraste alto
- Carga rápida
- Compatible con todas las redes sociales

## 🔧 Personalización

### Cambiar Colores
Edita `ads/src/design/tokens.ts`:
```tsx
export const colors = {
  pleia: {
    green: '#36E2B4',  // Cambia aquí
    blue: '#5B8CFF',   // Y aquí
  },
  // ...
};
```

### Ajustar Timings
Edita `ads/src/design/timings.ts`:
```tsx
export const durations = {
  fast: 180,    // 0.18s
  medium: 250,  // 0.25s
  slow: 350,    // 0.35s
  // ...
};
```

### Añadir Transiciones
Crea nuevas en `ads/src/comps/transitions/index.tsx`:
```tsx
export const NewTransition: React.FC<TransitionProps> = ({ children, ...props }) => {
  // Tu implementación aquí
};
```

## 🚫 Limitaciones

- **Audio**: Archivos placeholder (normalizar en post)
- **3D**: Renderizado ligero (sin luces pesadas)
- **Lottie**: Animaciones básicas (expandir según necesidad)
- **Duración**: Máximo 30 segundos recomendado

## 📊 Métricas

- **Componentes**: 15+ componentes reutilizables
- **Transiciones**: 8 transiciones profesionales
- **SFX**: 8 efectos de sonido
- **Animaciones**: 4 animaciones Lottie
- **3D**: 3 variantes de estrella
- **Videos**: 2 videos completos

---

**¡El estudio está listo para crear ads profesionales!** 🎬✨

