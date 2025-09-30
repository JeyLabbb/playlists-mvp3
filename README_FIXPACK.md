# 🔧 FIXPACK - Correcciones Implementadas

## Resumen de Cambios

Este documento describe las correcciones implementadas para resolver los problemas identificados en el generador de playlists.

## 1. Spotify Auth y Creación de Playlist (Errores 403, token indefinido)

### Problema
- Error: `accessToken is not defined` durante SPOTIFY-CREATE
- Error 403: "You cannot create a playlist for another user"

### Solución
- **FIXPACK**: Creado `lib/spotify/client.ts` con clase `SpotifyClient` unificada
- **FIXPACK**: Validación estricta de `accessToken` y `userId` antes de crear playlists
- **FIXPACK**: Endpoint `/api/status` para verificar configuración sin llamadas reales

### Archivos Modificados
- `web/lib/spotify/client.ts` (nuevo)
- `web/app/api/status/route.js` (nuevo)
- `web/app/api/playlist/llm/route.js` (actualizado)

## 2. "[object Object]" en UI (nombres de artista/canción)

### Problema
- En UI aparecía "[object Object]" en lugar de nombres de artistas
- Formato inconsistente de tracks entre LLM y Spotify

### Solución
- **FIXPACK**: Creado `lib/tracks/mapper.ts` con formato unificado `UTrack`
- **FIXPACK**: Mappers `mapLLMTrackToUTrack()` y `mapSpotifyTrackToUTrack()`
- **FIXPACK**: Función `getArtistName()` para manejo robusto de artistas

### Archivos Modificados
- `web/lib/tracks/mapper.ts` (nuevo)
- `web/app/page.js` (actualizado)

## 3. Festival Mode: Extracción de Nombre y Año

### Problema
- Extraía "necesito primavera" como nombre de festival
- Filtrado de año demasiado estricto resultando en 0 playlists

### Solución
- **FIXPACK**: Creado `lib/intent/festival.ts` con extractor mejorado
- **FIXPACK**: Eliminación de verbos de intención ("necesito", "quiero", "calentar")
- **FIXPACK**: Algoritmo de similitud de strings para matching de playlists
- **FIXPACK**: Queries robustas con variantes ES/EN y años cercanos

### Archivos Modificados
- `web/lib/intent/festival.ts` (nuevo)
- `web/app/api/playlist/llm/route.js` (actualizado)

## 4. Casos "Actual/Viral" (100% Spotify)

### Problema
- No priorizaba playlists editoriales "Viral TikTok España 2024/2025"
- Relleno a veces irrelevante

### Solución
- **FIXPACK**: Creado `lib/music/scenes.ts` con biblioteca de escenas musicales
- **FIXPACK**: Función `cleanSpotifyHint()` para eliminar frases meta
- **FIXPACK**: Mapeo semántico de prompts a features de audio

### Archivos Modificados
- `web/lib/music/scenes.ts` (nuevo)
- `web/app/api/playlist/llm/route.js` (actualizado)

## 5. Semántica "viaje nocturno con lluvia"

### Problema
- Sistema inyectaba artistas "underground" por usar contextos como seeds directos
- No respetaba exclusión de artistas ("como Bad Bunny pero sin Bad Bunny")

### Solución
- **FIXPACK**: Contextos solo como brújula semántica, no como seeds directos
- **FIXPACK**: Mapeo de escenas a features de audio (tempo, energy, valence)
- **FIXPACK**: Filtro de exclusión estricto por artistId y text match

### Archivos Modificados
- `web/lib/music/scenes.ts` (actualizado)
- `web/app/api/playlist/llm/route.js` (actualizado)

## 6. Recomendations/Seeds devolviendo 0

### Problema
- `RECOMMENDATIONS Returning 0 tracks` con seeds presentes

### Solución
- **FIXPACK**: Garantía de hasta 5 seeds válidas (trackIds o artistIds)
- **FIXPACK**: Fallback a genre + market + recency con features objetivo
- **FIXPACK**: Derivación de seeds de playlists editoriales priorizadas

### Archivos Modificados
- `web/app/api/playlist/llm/route.js` (actualizado)

## 7. Distribución 70/30 y Caps Dinámicos

### Problema
- Playlists no llegaban al tamaño exacto
- Dominancia de un solo artista

### Solución
- **FIXPACK**: `llmTarget = ceil(target * 0.7)` para modo normal
- **FIXPACK**: Caps dinámicos: `max(1, ceil(target / 10))`
- **FIXPACK**: Round-robin real entre artistas

### Archivos Modificados
- `web/app/api/playlist/llm/route.js` (actualizado)

## 8. Limpieza de Queries Absurdas

### Problema
- `genre_search` buscaba literalmente "instrucciones específicas"

### Solución
- **FIXPACK**: Función `cleanSpotifyHint()` para eliminar frases meta
- **FIXPACK**: Sanitización de queries antes de usar en búsquedas

### Archivos Modificados
- `web/lib/music/scenes.ts` (actualizado)
- `web/app/api/playlist/llm/route.js` (actualizado)

## 9. Logging y Trazabilidad

### Problema
- Logs inconsistentes y difíciles de seguir

### Solución
- **FIXPACK**: Logs estandarizados: `[INTENT]`, `[FESTIVAL]`, `[EDITORIAL]`, `[RECS]`, `[CREATE]`, `[UI]`
- **FIXPACK**: Counts de candidatos: totales, tras filtros, tras caps, final
- **FIXPACK**: Sin logging de tokens ni datos sensibles

### Archivos Modificados
- `web/app/api/playlist/llm/route.js` (actualizado)

## 10. Kit de Verificación Manual

### Solución
- **FIXPACK**: Endpoint `/api/status` para verificar configuración
- **FIXPACK**: Flag `DRY_RUN_CREATE=true` para preview sin crear playlist
- **FIXPACK**: Validación de sesión antes de intentar crear playlists

### Archivos Modificados
- `web/app/api/status/route.js` (nuevo)
- `web/app/api/playlist/llm/route.js` (actualizado)

## Cómo Usar

### 1. Verificar Estado del Sistema
```bash
curl http://localhost:3000/api/status
```

### 2. Activar Modo Dry Run
```bash
# En .env.local
DRY_RUN_CREATE=true
```

### 3. Activar Mocks de Spotify
```bash
# En .env.local
USE_MOCK_SPOTIFY=true
```

### 4. Verificar Logs
Los logs ahora siguen el formato:
- `[INTENT]` - Parsing de intenciones
- `[FESTIVAL]` - Búsqueda de festivales
- `[EDITORIAL]` - Playlists editoriales
- `[RECS]` - Recomendaciones de Spotify
- `[CREATE]` - Creación de playlists
- `[UI]` - Interfaz de usuario

## Checklist de Verificación

### ✅ Spotify Auth
- [ ] `accessToken` y `userId` siempre definidos antes de `createPlaylist`
- [ ] Sin errores 403 y sin "accessToken is not defined"
- [ ] Si falta sesión → no crear playlist y no mostrar error confuso

### ✅ UI - "[object Object]"
- [ ] Ningún "[object Object]" en nombres de artistas
- [ ] Todos los elementos tienen `title` y `artist` visibles

### ✅ Festival Mode
- [ ] "Primavera Sound 2025" se extrae exacto; no incluye verbos
- [ ] Con 0 playlists exactas por año, busca sin año y usa popularidad
- [ ] Siempre se llena hasta el target (con round-robin de artistas principales si hace falta)

### ✅ Casos Actual/Viral
- [ ] Para "virales", se ven queries editoriales prioritarias
- [ ] `recommendations` ya no devuelve 0 si hay seeds disponibles

### ✅ Semántica
- [ ] Ningún artista de contextos aparece si no venía del LLM o de Spotify por semántica directa
- [ ] El filtro "sin X" siempre se respeta

### ✅ Recomendations
- [ ] `recommendations` deja de devolver 0 en escenarios normales
- [ ] Si 0, cae en fallback y aún así rellena

### ✅ Distribución 70/30
- [ ] Playlists salen con el tamaño exacto
- [ ] Variedad coherente (sin 10 tracks del mismo artista salvo festivales muy pequeños)

### ✅ Queries Limpias
- [ ] No hay búsquedas con textos meta
- [ ] Las queries están compuestas por términos musicales reales

### ✅ Logs
- [ ] Logs legibles y útiles para test manual

## Notas Importantes

1. **No se rompió la lógica del Prompt 1** que funcionaba bien (40/40 tracks, smooth ordering)
2. **Smooth ordering** no accede a `accessToken` directamente
3. **Todos los cambios están marcados con `// FIXPACK:`** para fácil identificación
4. **El sistema mantiene la arquitectura 70/30** para modo normal
5. **Festivales y casos virales** siguen usando 100% Spotify cuando corresponde
