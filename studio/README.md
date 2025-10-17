# 🎬 Animation Studio

Un estudio de animación completo para crear videos promocionales profesionales para playlists.jeylabbb.com.

## 📁 Estructura

```
studio/
├── remotion/           # Videos programáticos con React
│   ├── src/
│   │   ├── compositions/   # Videos principales
│   │   ├── components/     # Componentes reutilizables
│   │   └── utils/          # Utilidades y transiciones
│   ├── config/         # Configuraciones de colores/textos
│   └── README.md
├── motion-canvas/      # Animaciones vectoriales
│   ├── src/
│   └── README.md
└── README.md          # Este archivo
```

## 🚀 Inicio Rápido

### Instalar dependencias
```bash
npm install
```

### Previsualizar videos
```bash
npm run studio:remotion:preview
```

### Renderizar videos
```bash
# Video promocional principal (V1 legacy)
npm run studio:remotion:render:promo

# Video promocional V8 (principal)
npm run studio:remotion:render:promo-v8

# Video promocional V7 (legacy)
npm run studio:remotion:render:promo-v7

# Video promocional V6 (legacy)
npm run studio:remotion:render:promo-v6

# Video promocional V5 (legacy)
npm run studio:remotion:render:promo-v5

# Video promocional V4 (legacy)
npm run studio:remotion:render:promo-v4

# Video promocional V3 (legacy)
npm run studio:remotion:render:promo-v3

# Video promocional V2 (legacy)
npm run studio:remotion:render:promo-v2

# Video promocional V1 (legacy)
npm run studio:remotion:render:promo-v1

# Video original (legacy)
npm run studio:remotion:render

# Video de fondo
npm run studio:remotion:render:hero
```

## 📹 Videos Disponibles

### 1. SimplePromoV8 (Principal - ESPECIFICACIONES EXACTAS)
- **Duración**: 20 segundos (con loop perfecto y especificaciones exactas)
- **Formato**: 1080x1920 (vertical)
- **Estilo**: Apple-inspired, UI real con audio de alta calidad y loop perfecto
- **Contenido**: 7 escenas exactas (0:00-0:20) con timing preciso
- **Características**: UI real del proyecto, audio de alta calidad, especificaciones exactas, loop perfecto
- **Renderizado**: `out/promo-v8.mp4`

### 2. SimplePromoV7 (Legacy - CORREGIDO)
- **Duración**: 15 segundos (con loop perfecto y correcciones específicas)
- **Formato**: 1080x1920 (vertical)
- **Estilo**: Apple-inspired, UI real con marca JeyLabbb y canciones exactas
- **Contenido**: Hook → UI Real → Typing → Loading → Playlist → Spotify → Mis Playlists → CTA → Loop
- **Características**: Marca JeyLabbb, canciones exactas, efectos preview, zoom real, estética Apple
- **Renderizado**: `out/promo-v7.mp4`

### 3. SimplePromoV6 (Legacy - PROFESIONAL)
- **Duración**: 15 segundos (con loop perfecto)
- **Formato**: 1080x1920 (vertical)
- **Estilo**: Apple-inspired, UI real con canciones específicas y loop orgánico
- **Contenido**: Hook → UI Real → Typing → Loading → Playlist → Spotify → Mis Playlists → CTA → Loop
- **Características**: UI real, canciones específicas, efectos hover, loop perfecto, estética Apple
- **Renderizado**: `out/promo-v6.mp4`

### 3. SimplePromoV5 (Legacy - VIRAL)
- **Duración**: 10 segundos (timing viral perfecto)
- **Formato**: 1080x1920 (vertical)
- **Estilo**: Apple-inspired, UI real con técnicas de viralidad
- **Contenido**: Hook → UI Real → Typing → Loading → Playlist → Spotify → CTA
- **Características**: UI real, sonidos mejorados, técnicas de viralidad, timing perfecto
- **Renderizado**: `out/promo-v5.mp4`

### 3. SimplePromoV4 (Legacy)
- **Duración**: 13 segundos (rápido y dinámico)
- **Formato**: 1080x1920 (vertical)
- **Estilo**: Apple-inspired, UI real con sonidos
- **Contenido**: Hook → UI Real → Typing → Loading → Playlist → Spotify → CTA
- **Características**: UI real, sonidos sintéticos, zooms, sin pantallas negras
- **Renderizado**: `out/promo-v4.mp4`

### 4. SimplePromoV3 (Legacy)
- **Duración**: 20 segundos (movimiento continuo)
- **Formato**: 1080x1920 (vertical)
- **Estilo**: Apple-inspired, UI real con zooms
- **Contenido**: Hook → UI Real → Typing → Loading → Playlist → Spotify → CTA
- **Características**: UI real, zooms, elementos grandes, movimiento continuo
- **Renderizado**: `out/promo-v3.mp4`

### 5. SimplePromoV2 (Legacy)
- **Duración**: 15 segundos (fast-paced)
- **Formato**: 1080x1920 (vertical)
- **Estilo**: Apple-inspired, premium con efectos 3D
- **Contenido**: Hook → UI → Typing → Loading → Result → Features → CTA
- **Características**: Transiciones profesionales, SFX, elementos 3D, partículas
- **Renderizado**: `out/promo-v2.mp4`

### 6. SimplePromoV1 (Legacy)
- **Duración**: 18 segundos
- **Formato**: 1080x1920 (vertical)
- **Estilo**: Apple-inspired, básico
- **Contenido**: Hook → Demo UI → CTA
- **Renderizado**: `out/promo.mp4` y `out/promo-v1.mp4`

### 3. AdMain (Legacy)
- **Duración**: 18 segundos  
- **Formato**: 1080x1920 (vertical)
- **Estilo**: Básico, experimental

### 4. HeroBgLoop
- **Duración**: 8 segundos (loop)
- **Formato**: 1080x1920 (vertical)
- **Uso**: Fondo animado

## 🎨 Presets de Color

### Default (ad.json)
- Brand: `#000000` (negro)
- Accent: `#00E5A8` (verde neón)

### Dark (ad-dark.json)
- Brand: `#0a0a0a` (negro profundo)
- Accent: `#ff6b35` (naranja vibrante)

### Vibrant (ad-vibrant.json)
- Brand: `#1a0033` (púrpura oscuro)
- Accent: `#ff0080` (rosa neón)

## 🔧 Personalización

### Cambiar colores y textos
Edita los archivos en `studio/remotion/config/`:
- `ad.json` - Configuración principal
- `ad-dark.json` - Preset oscuro
- `ad-vibrant.json` - Preset vibrante

### Añadir nuevas transiciones
Edita `studio/remotion/src/utils/transitions.ts` para añadir nuevas curvas de animación.

### Crear nuevos componentes
Añade componentes en `studio/remotion/src/components/` siguiendo el patrón existente.

## 📚 Sistema de Versionado

### Crear una nueva versión
Sigue el template en `TEMPLATE_NEW_VERSION.md`:

1. **Copiar versión anterior**: `cp SimplePromoV1.tsx SimplePromoV2.tsx`
2. **Actualizar componente**: Cambiar nombre y lógica
3. **Registrar en Root.tsx**: Añadir nueva composición
4. **Añadir script**: Nuevo comando de renderizado
5. **Documentar**: Actualizar `VERSIONS.md`

### Versiones disponibles
- **V1**: Versión base con estética Apple
- **V2**: Pendiente (mejores transiciones)
- **V3**: Pendiente (integración 3D)

### Convenciones
- Archivos: `SimplePromoV{X}.tsx`
- Outputs: `out/promo-v{x}.mp4`
- Scripts: `studio:remotion:render:promo-v{x}`

## 📱 Formato de Salida

- **Resolución**: 1080x1920 (9:16)
- **FPS**: 30
- **Codec**: H.264
- **Formato**: MP4
- **Duración**: 18-30 segundos (optimizado para TikTok/Reels)

## 🎵 Características Técnicas

### Transiciones Profesionales
- Curvas de animación estilo Apple
- Springs suaves y naturales
- Efectos de glow y escala
- Timing perfecto para redes sociales

### Componentes Especializados
- **AppleButton**: Botones con estilo iOS
- **ScreenRecording**: Simulación de grabación de pantalla
- **PlaylistCard**: Tarjetas de canciones
- **TypeOn**: Efecto de escritura

### Sistema de Sonido
- Efectos sintéticos programáticos
- Timing sincronizado con animaciones
- Volúmenes optimizados para móviles

## 🎯 Mejoras Implementadas

### ✅ Completado
- [x] Video promocional completamente refactorizado
- [x] Estética Apple profesional
- [x] Transiciones suaves y elegantes
- [x] Sistema de componentes modular
- [x] Presets de color alternativos
- [x] Renderizado funcional
- [x] Documentación completa

### 🔄 En Desarrollo
- [ ] **SimplePromoV3**: Integración 3D y animaciones reales
- [ ] Integración de audio real
- [ ] Más transiciones avanzadas
- [ ] Componentes 3D (opcional)
- [ ] Templates adicionales

## 🚫 Limitaciones Actuales

- **Audio**: Solo efectos sintéticos básicos
- **3D**: Deshabilitado por conflictos de dependencias
- **Lottie/Rive**: Simplificado a CSS animations
- **Duración**: Máximo 30 segundos recomendado

## 📊 Rendimiento

- **Tiempo de renderizado**: ~3-4 minutos (540 frames)
- **Tamaño de archivo**: ~2-5MB (MP4 comprimido)
- **Calidad**: 1080p, 30fps, H.264

## 🎨 Filosofía de Diseño

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

---

**Nota**: Este estudio está completamente aislado y no afecta la funcionalidad principal de la aplicación de playlists.