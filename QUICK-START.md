# 🚀 JeyLabbb - Guía de Uso Rápido

## ✅ SISTEMA ACTUALIZADO Y LISTO

### 🎯 **FUNCIONALIDADES PRINCIPALES**

1. **Generación Inteligente de Playlists**
   - Modo Normal: 70% LLM + 30% Spotify
   - Modo Festival: 100% Spotify (búsqueda en playlists oficiales)
   - Modo Recientes: 100% Spotify (música actual/viral)

2. **Controles UX Avanzados**
   - Refinar playlist existente
   - Quitar tracks específicos
   - Añadir +5 tracks (hasta 200)

3. **Sistema de Debug Completo**
   - Trazas detalladas de cada generación
   - Endpoint de debug para monitoreo
   - Logs de colección y relajación

### 🚀 **COMANDOS RÁPIDOS**

```bash
# Iniciar servidor
npm run dev

# Prueba rápida del sistema
npm run test:quick

# Test completo (4 modos)
npm run test

# Test individual
npm run test:normal
npm run test:festival
npm run test:recientes
```

### 🎵 **PROMPTS DE EJEMPLO**

#### **Modo Normal (70/30)**
- `"jazz music"`
- `"rock clásico 80s"`
- `"jazz-techno fusion"`
- `"música para estudiar"`

#### **Modo Festival (100% Spotify)**
- `"festival Coachella 2024"`
- `"festival Primavera Sound 2024"`
- `"festival Tomorrowland 2024"`
- `"festival Sónar 2025"`

#### **Modo Recientes (100% Spotify)**
- `"música viral 2024"`
- `"reggaeton reciente 2024"`
- `"música actual TikTok"`
- `"hits de 2024"`

### 🔧 **ENDPOINTS DISPONIBLES**

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/playlist/llm` | POST | Generación principal |
| `/api/playlist/refine` | POST | Refinar playlist |
| `/api/playlist/remove` | POST | Quitar tracks |
| `/api/playlist/more` | POST | Añadir +5 tracks |
| `/api/debug/last` | GET | Debug último run |
| `/api/test` | GET | Test del sistema |

### 📊 **ESTRUCTURA DE RESPUESTA**

```json
{
  "tracks": [...],
  "metadata": {
    "run_id": "run_1234567890_abc123",
    "intent": {...},
    "llm_tracks": 35,
    "spotify_tracks": 15,
    "collection_log": {...},
    "relaxation_steps": [...],
    "artist_distribution": {...},
    "note": "Playlist generated successfully"
  }
}
```

### 🎯 **GARANTÍAS DE CALIDAD**

- ✅ **70% Rule**: Modo normal genera ≥70% tracks LLM
- ✅ **Sin Genéricos**: No títulos como "Study Music"
- ✅ **Variedad Artística**: Máximo 2 tracks por artista
- ✅ **Tamaño Exacto**: Siempre N tracks (o N-5 si escasez)
- ✅ **JSON Válido**: Respuestas siempre parseables
- ✅ **Trazas Completas**: Debug de cada fase

### 🔍 **MONITOREO Y DEBUG**

```bash
# Ver último run
curl "http://localhost:3000/api/debug/last?format=json" | jq

# Ver en formato texto
curl "http://localhost:3000/api/debug/last?format=text"

# Test del sistema
curl "http://localhost:3000/api/test" | jq
```

### ⚡ **CONFIGURACIÓN MÍNIMA**

```bash
# .env.local
NEXTAUTH_SECRET=tu_secret_aqui
SPOTIFY_CLIENT_ID=tu_client_id
SPOTIFY_CLIENT_SECRET=tu_client_secret
OPENAI_API_KEY=tu_openai_key
OPENAI_MODEL=gpt-4.1
```

### 🎉 **¡LISTO PARA USAR!**

1. **Inicia el servidor**: `npm run dev`
2. **Ve a**: `http://localhost:3000`
3. **Autentica con Spotify** (opcional pero recomendado)
4. **Genera playlists** con cualquier prompt
5. **Usa controles UX** para refinar

**¡El sistema está completamente actualizado y funcionando! 🎵**
