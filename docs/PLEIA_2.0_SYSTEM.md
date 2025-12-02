# PLEIA 2.0 - Sistema de Agente Conversacional Avanzado

## 🎯 Visión General

PLEIA 2.0 es un sistema de agente conversacional avanzado que permite crear playlists mediante un proceso iterativo e interactivo. A diferencia del sistema v1, PLEIA 2.0 puede mantener conversaciones fluidas, refinar resultados basándose en feedback y aprender de cada interacción.

## 🏗️ Arquitectura

### Componentes Frontend

1. **`/pleia2.0/page.tsx`** - Página principal del chat
   - Interfaz de dos paneles: chat + preview de playlist
   - Gestión de estado de conversación
   - Coordinación entre componentes

2. **`ChatInterface.tsx`** - Componente de chat
   - UI tipo chat estilo PLEIA
   - Mensajes del usuario y del asistente
   - Input con soporte para multilinea
   - Estados de carga

3. **`PlaylistPreview.tsx`** - Preview y edición de playlist
   - Vista de la playlist generada
   - Edición del nombre
   - Agregar/quitar imagen de portada
   - Eliminar canciones individuales
   - Botón para crear en Spotify

### Backend API

1. **`/api/pleia2/chat`** - Endpoint principal del agente
   - Procesamiento de mensajes
   - Integración con OpenAI GPT-4
   - Búsqueda en Spotify
   - Análisis de audio features
   - Consulta de patrones exitosos
   - Generación y refinamiento de playlists

2. **`/api/pleia2/create-playlist`** - Creación de playlists
   - Crear playlist en Spotify
   - Agregar tracks
   - Establecer imagen de portada
   - Guardar patrón exitoso en base de datos

## 🧠 Sistema de Retroalimentación

### Base de Datos Supabase

#### Tablas Principales

**`pleia_conversations`**
- Almacena conversaciones completas
- Rating del usuario
- Referencia a playlist creada en Spotify

**`pleia_messages`**
- Mensajes individuales de cada conversación
- Metadata sobre acciones realizadas

**`pleia_refinements`**
- Refinamientos exitosos aplicados
- Tipo de refinamiento (remove_artist, change_genre, etc.)
- Score de éxito

**`pleia_successful_patterns`**
- Patrones musicales que han funcionado bien
- Keywords, géneros, audio features
- Artistas y tracks frecuentes
- Rating promedio y contador de uso

**`pleia_negative_feedback`**
- Feedback negativo para evitar errores
- Tracks problemáticos
- Tipos de issues

**`pleia_prompt_embeddings`**
- Embeddings de prompts para búsqueda semántica
- Permite encontrar patrones similares

**`pleia_user_preferences`**
- Preferencias personalizadas por usuario
- Géneros y artistas preferidos/rechazados
- Audio features preferidas

### Funciones SQL

**`update_successful_pattern()`**
- Actualiza o crea patrones exitosos
- Merge inteligente de patrones similares

**`get_relevant_patterns()`**
- Obtiene patrones relevantes basados en keywords
- Ordenado por relevancia y rating

## 🔄 Flujo de Trabajo

### 1. Inicio de Conversación

```
Usuario: "Quiero una playlist de rock alternativo melancólico"
       ↓
Sistema:
  - Crea conversación en DB
  - Extrae keywords
  - Busca patrones similares exitosos
  - Construye contexto para IA
```

### 2. Generación de Playlist

```
IA analiza → Busca en Spotify → Analiza audio features
                    ↓
         Selecciona mejores matches
                    ↓
         Genera nombre creativo
                    ↓
          Presenta al usuario
```

### 3. Refinamiento

```
Usuario: "Quita artistas muy conocidos"
       ↓
Sistema:
  - Analiza feedback
  - Filtra artistas populares
  - Actualiza playlist
  - Guarda refinamiento exitoso
```

### 4. Creación Final

```
Usuario click en "Crear Playlist"
       ↓
Sistema:
  - Crea playlist en Spotify (cuenta PLEIAHUB)
  - Agrega tracks
  - Establece imagen si existe
  - Guarda patrón exitoso en DB
  - Actualiza conversación con playlist_id
```

## 💡 Aprendizaje Continuo

El sistema aprende de las siguientes maneras:

### 1. Patrones Exitosos
- Cada playlist creada se analiza y guarda
- Keywords → Géneros → Artistas → Tracks
- Peso por rating y frecuencia de uso

### 2. Refinamientos Comunes
- "Quita X artista" → patrón de filtrado
- "Más energético" → ajuste de audio features
- "Cambia género" → substitución de tracks

### 3. Preferencias Personales
- Cada usuario acumula preferencias
- Géneros que frecuentemente usa
- Artistas que evita o prefiere
- Rangos de audio features favoritos

### 4. Embeddings Semánticos
- Prompts similares → resultados similares
- Búsqueda por vector similarity
- Reutilización de patrones exitosos

## 🎨 Características de la UI

### Chat Interface
- Burbujas de mensaje estilo moderno
- Estados de carga animados
- Scroll automático
- Soporte para multilinea (Shift+Enter)
- Timestamps
- Enlaces a playlists creadas

### Playlist Preview
- Imagen de portada editable
- Nombre editable inline
- Lista de tracks expandible/colapsable
- Eliminar tracks individuales
- Duración total
- Botón prominente para crear

### Diseño
- Estilo PLEIA consistente
- Gradientes de marca (#47C8D1 → #5B8CFF)
- Modo oscuro
- Responsive (desktop/mobile)

## 🚀 Características Avanzadas para Futuro

### 1. Integración con Cuentas de Usuario
```typescript
// En lugar de siempre usar PLEIAHUB
const accessToken = session.user.spotify_token;
```

### 2. Análisis de Audio Features Detallado
```typescript
// Filtrar por características específicas
if (prompt.includes('energético')) {
  tracks = tracks.filter(t => t.energy > 0.7);
}
```

### 3. Búsqueda por Embeddings
```typescript
// Encontrar prompts similares
const similar = await findSimilarPrompts(embedding);
```

### 4. Collaborative Filtering
```typescript
// "Usuarios que crearon X también crearon Y"
const recommendations = await getCollaborativeRecs(userId);
```

### 5. A/B Testing de Patrones
```typescript
// Probar diferentes estrategias de selección
const strategy = await getOptimalStrategy(keywords);
```

## 📊 Métricas y Analytics

### Métricas a Trackear
- Conversaciones iniciadas
- Playlists creadas
- Refinamientos por playlist (promedio)
- Rating promedio de playlists
- Patterns más usados
- Tiempo promedio hasta crear playlist
- Tasa de abandono

### Queries Útiles

```sql
-- Top patterns por rating
SELECT * FROM pleia_successful_patterns
WHERE usage_count > 5
ORDER BY avg_rating DESC
LIMIT 10;

-- Conversaciones más largas (más refinamientos)
SELECT c.id, COUNT(m.id) as message_count
FROM pleia_conversations c
JOIN pleia_messages m ON m.conversation_id = c.id
GROUP BY c.id
ORDER BY message_count DESC;

-- Géneros más populares
SELECT unnest(genres) as genre, COUNT(*) as count
FROM pleia_successful_patterns
GROUP BY genre
ORDER BY count DESC;
```

## 🔐 Seguridad y Privacidad

- Row Level Security (RLS) habilitado
- Usuarios solo ven sus propias conversaciones
- Tokens de Spotify en variables de entorno
- API keys de OpenAI protegidas
- No se almacenan credenciales de usuario

## 🛠️ Configuración Requerida

### Variables de Entorno

```env
OPENAI_API_KEY=sk-...
PLEIAHUB_SPOTIFY_ACCESS_TOKEN=...
PLEIAHUB_SPOTIFY_USER_ID=...
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Migraciones de Base de Datos

```bash
# Ejecutar migración
psql -h [HOST] -U [USER] -d [DATABASE] -f supabase/migrations/pleia_v2_learning_system.sql
```

## 📝 Notas de Desarrollo

- El sistema usa GPT-4 Turbo para mejor razonamiento
- Las búsquedas en Spotify están limitadas a 30 resultados iniciales
- Los audio features se obtienen en batch (máx 100 tracks)
- La conversación mantiene contexto de últimos 10 mensajes
- Los embeddings son de 1536 dimensiones (OpenAI ada-002)

## 🎯 Próximos Pasos

1. ✅ Sistema base funcional
2. ⏳ Refinamiento avanzado (filtros específicos)
3. ⏳ Integración con cuentas de usuario
4. ⏳ Sistema de ratings post-creación
5. ⏳ Dashboard de analytics
6. ⏳ Búsqueda por embeddings
7. ⏳ Recomendaciones colaborativas
8. ⏳ Optimización de patrones con ML

---

**Creado por**: PLEIA Team
**Fecha**: 2024
**Versión**: 2.0.0

