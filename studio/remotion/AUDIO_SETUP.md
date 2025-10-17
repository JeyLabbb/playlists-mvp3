# 🎵 Audio Setup Guide - Sistema de Audio Flexible

## 📋 Estado Actual

### ✅ **Archivos Pequeños Listos (SFX)**
Estos archivos ya están disponibles y funcionando:

- `whoosh.wav` - Sonido de transición whoosh
- `keyboard clicks.wav` - Sonidos de teclado
- `button click.wav` - Sonido de click de botón
- `success.wav` - Sonido de notificación de éxito
- `swoosh.mp3` - Sonido de transición swoosh alternativo

### ⚠️ **Archivos Grandes Pendientes (Canciones)**
Estos archivos necesitan ser procesados por ti:

- `Do You Remember-Xiyo Fernandezz Eix.m4a` → **Convertir a MP3 de 3s**
- `Pa Q Me Escribes-Vreno Yg.m4a` → **Convertir a MP3 de 3s**
- `Suena Cool-Mvrk Lhaine.m4a` → **Convertir a MP3 de 3s**

## 🔧 **Instrucciones para Añadir Archivos Grandes**

### **Paso 1: Convertir M4A a MP3**
```bash
# Usar ffmpeg para convertir y recortar
ffmpeg -i "Do You Remember-Xiyo Fernandezz Eix.m4a" -t 3 -acodec mp3 "song-1.mp3"
ffmpeg -i "Pa Q Me Escribes-Vreno Yg.m4a" -t 3 -acodec mp3 "song-2.mp3"
ffmpeg -i "Suena Cool-Mvrk Lhaine.m4a" -t 3 -acodec mp3 "song-3.mp3"
```

### **Paso 2: Colocar Archivos**
Coloca los archivos MP3 convertidos en:
```
/public/studio/audio/
```

### **Paso 3: Actualizar Configuración**
Edita `/studio/remotion/src/utils/audioConfig.ts` y cambia:
```typescript
// ANTES (no disponible)
available: false

// DESPUÉS (disponible)
available: true
```

## 🎯 **Sistema de Audio Flexible**

### **Características:**
- ✅ **Soporte para MP3 y WAV**
- ✅ **Detección automática de rutas**
- ✅ **Manejo de archivos grandes**
- ✅ **Fallback a audio silencioso**
- ✅ **Debug info en desarrollo**

### **Uso en Composiciones:**
```typescript
import { useAudioSequence } from '../utils/useFlexibleAudio';

const audioConfigs = [
  {
    audioKey: 'whoosh',
    startFrame: 0,
    endFrame: 15,
    volume: 0.6
  },
  {
    audioKey: 'song-1', // Solo disponible después de conversión
    startFrame: 100,
    endFrame: 130,
    volume: 0.7
  }
];

const audioSequence = useAudioSequence(audioConfigs);
```

## 📁 **Estructura de Archivos**

```
/public/studio/audio/
├── whoosh.wav ✅
├── keyboard clicks.wav ✅
├── button click.wav ✅
├── success.wav ✅
├── swoosh.mp3 ✅
├── song-1.mp3 ⏳ (pendiente)
├── song-2.mp3 ⏳ (pendiente)
└── song-3.mp3 ⏳ (pendiente)
```

## 🚀 **Composiciones Disponibles**

- **SimplePromoV17**: Versión visual sin audio (ya funciona)
- **SimplePromoV18**: Versión con sistema de audio flexible (ejemplo)

## 🔍 **Debugging**

### **Verificar Archivos Disponibles:**
```typescript
import { checkAudioAvailability } from '../utils/useFlexibleAudio';

const availability = checkAudioAvailability();
console.log('Available:', availability.available);
console.log('Unavailable:', availability.unavailable);
```

### **Información de Archivo:**
```typescript
import { getAudioInfo } from '../utils/useFlexibleAudio';

const info = getAudioInfo('whoosh');
console.log(info); // { name, path, format, size, available, status }
```

## ⚡ **Renderizado**

```bash
# Renderizar V18 (con sistema flexible)
npm run studio:remotion:render:promo-v18

# Renderizar V17 (sin audio)
npm run studio:remotion:render:promo-v17
```

## 📝 **Notas Importantes**

1. **Los archivos M4A no funcionan bien** en Remotion
2. **Los archivos grandes causan problemas** de renderizado
3. **El sistema detecta automáticamente** qué archivos están disponibles
4. **Los archivos no disponibles** se saltan silenciosamente
5. **El debug info** solo aparece en desarrollo

---

**🎬 Una vez que añadas los archivos MP3 convertidos, el sistema funcionará completamente con audio real.**
