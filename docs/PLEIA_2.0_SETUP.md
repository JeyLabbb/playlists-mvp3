# PLEIA 2.0 - Guía de Configuración

## ⚡ Inicio Rápido

### 1. Base de Datos

Ejecuta la migración SQL en tu instancia de Supabase:

```bash
psql -h your-supabase-host -U postgres -d postgres -f supabase/migrations/pleia_v2_learning_system.sql
```

O desde el dashboard de Supabase:
1. Ve a SQL Editor
2. Copia el contenido de `supabase/migrations/pleia_v2_learning_system.sql`
3. Ejecuta

### 2. Variables de Entorno

Asegúrate de tener estas variables en tu `.env.local`:

```env
# OpenAI
OPENAI_API_KEY=sk-...

# Spotify (cuenta PLEIAHUB)
PLEIAHUB_SPOTIFY_ACCESS_TOKEN=...
PLEIAHUB_SPOTIFY_USER_ID=...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...

# NextAuth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

### 3. Acceso

Navega a: `http://localhost:3000/pleia2.0`

**✨ En desarrollo**: Estás automáticamente logueado como `jorgejr200419@gmail.com` - no necesitas hacer login!

**En producción**: Requiere autenticación real con NextAuth.

## 🎯 Uso

### Crear una Playlist

1. Escribe qué tipo de playlist quieres
   - Ejemplo: "Crea una playlist de rock alternativo melancólico"

2. El agente buscará en Spotify y te presentará una playlist

3. Puedes refinar:
   - "Quita artistas muy conocidos"
   - "Hazla más energética"
   - "Cambia el género a indie rock"

4. Edita manualmente:
   - Cambia el nombre
   - Elimina canciones
   - Agrega imagen de portada

5. Click en "🎵 Crear Playlist en Spotify"

### Ejemplos de Prompts

**Específicos por género:**
- "Playlist de reggaeton romántico con artistas emergentes"
- "Rock progresivo de los 70s para concentrarse"
- "Jazz suave para trabajar"

**Por estado de ánimo:**
- "Música triste pero esperanzadora"
- "Canciones energéticas para hacer ejercicio"
- "Música relajante para dormir"

**Creativos:**
- "Canciones que suenan como si estuviera en un café parisino"
- "Música que combinaría bien con una lluvia tormentosa"
- "Soundtrack para una escena de persecución en película"

## 🔓 Sesión Mock en Desarrollo

En **desarrollo local**, estás automáticamente logueado como:
- **Email**: `jorgejr200419@gmail.com`
- **Nombre**: Jorge JR

**Cómo funciona**:
- El sistema detecta automáticamente si está en desarrollo
- En `localhost`, todas las APIs aceptan peticiones sin autenticación real
- La sesión mock se inyecta automáticamente
- **En producción** (Vercel), esto NO funciona y se requiere login real

**Para cambiar el usuario mock**, edita `lib/auth/mock-session.ts`

Ver más detalles en: `docs/DEV_MOCK_SESSION.md`

## 🔧 Troubleshooting

### Error: "Unauthorized"
- **En desarrollo**: No debería pasar, se usa sesión mock automáticamente
- **En producción**: Verifica que estés autenticado con NextAuth
- Revisa que las variables de entorno estén configuradas

### Error al crear playlist
- Verifica que `PLEIAHUB_SPOTIFY_ACCESS_TOKEN` sea válido
- Los tokens de Spotify expiran, renuévalos si es necesario

### Base de datos no responde
- Verifica la conexión a Supabase
- Revisa que las migraciones se hayan ejecutado correctamente
- Confirma que RLS esté configurado correctamente

### La IA no encuentra canciones
- Revisa que la API de Spotify responda
- Intenta con prompts más específicos
- Verifica los logs del servidor

## 📊 Monitoreo

### Ver conversaciones activas

```sql
SELECT 
  c.id,
  c.initial_prompt,
  COUNT(m.id) as message_count,
  c.created_at
FROM pleia_conversations c
LEFT JOIN pleia_messages m ON m.conversation_id = c.id
GROUP BY c.id
ORDER BY c.created_at DESC
LIMIT 20;
```

### Ver patrones más exitosos

```sql
SELECT 
  prompt_keywords,
  genres,
  usage_count,
  avg_rating
FROM pleia_successful_patterns
WHERE usage_count > 3
ORDER BY avg_rating DESC, usage_count DESC
LIMIT 10;
```

### Limpiar datos de prueba

```sql
-- ⚠️ CUIDADO: Esto eliminará TODAS las conversaciones
DELETE FROM pleia_conversations;
```

## 🚀 Despliegue

### Vercel

1. Asegúrate de configurar las variables de entorno en Vercel
2. Despliega normalmente

### Renovar Token de Spotify

El token de acceso de Spotify expira. Para renovarlo:

```bash
curl -X POST "https://accounts.spotify.com/api/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token" \
  -d "refresh_token=YOUR_REFRESH_TOKEN" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET"
```

Actualiza `PLEIAHUB_SPOTIFY_ACCESS_TOKEN` con el nuevo token.

## 📝 Notas

- El sistema usa GPT-4 Turbo por defecto (más costoso pero mejor)
- Puedes cambiar a GPT-3.5 Turbo editando `app/api/pleia2/chat/route.ts`
- Las playlists se crean en la cuenta de PLEIAHUB, no del usuario
- Para usar cuentas de usuario, necesitarás implementar OAuth de Spotify

## 🎨 Personalización

### Cambiar modelo de IA

En `app/api/pleia2/chat/route.ts`:

```typescript
model: 'gpt-3.5-turbo', // Cambiar de gpt-4-turbo-preview
```

### Ajustar cantidad de canciones

```typescript
const selectedTracks = tracks.slice(0, 20); // Cambiar de 15
```

### Modificar prompt del sistema

Edita la constante `agentSystem` en `app/api/pleia2/chat/route.ts`

---

¿Problemas? Revisa los logs del servidor y la consola del navegador.

