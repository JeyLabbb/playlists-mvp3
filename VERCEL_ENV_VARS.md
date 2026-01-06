# Variables de Entorno Necesarias en Vercel

Para que la funcionalidad de "Playlist Destacada" funcione correctamente en producción, necesitas configurar las siguientes variables de entorno en Vercel:

## Variables Requeridas para Spotify API

1. **`SPOTIFY_CLIENT_ID`**
   - Tu Client ID de Spotify App
   - Se usa para autenticación con Spotify API

2. **`SPOTIFY_CLIENT_SECRET`**
   - Tu Client Secret de Spotify App
   - Se usa para autenticación con Spotify API

3. **`PLEIA_HUB_REFRESH_TOKEN`**
   - Token de refresco de Spotify para el "hub account"
   - Se usa para obtener access tokens para consultar playlists públicas
   - Este token permite que el servidor acceda a la API de Spotify sin necesidad de autenticación del usuario

## Cómo Configurarlas en Vercel

1. Ve a tu proyecto en Vercel
2. Ve a **Settings** → **Environment Variables**
3. Añade cada una de las variables arriba con sus valores correspondientes
4. Asegúrate de que están marcadas para el entorno de **Production** (y también **Preview** si quieres que funcione en PRs)
5. Guarda los cambios
6. **IMPORTANTE**: Después de añadir o modificar variables de entorno, necesitas hacer un nuevo deploy:
   - Ve a **Deployments**
   - Haz clic en los tres puntos (⋯) del último deployment
   - Selecciona **Redeploy**
   - O simplemente haz un push nuevo a `main`

## Verificación

Después de configurar las variables y hacer redeploy, verifica:

1. **Al seleccionar una playlist destacada** desde `/admin/featured-playlist`:
   - Debe guardar correctamente los `preview_tracks` en la base de datos
   - En los logs de Vercel no debe aparecer errores relacionados con "Missing Spotify hub environment variables"

2. **Al hacer click en "Ver canciones"** en la playlist destacada:
   - Debe cargar las canciones correctamente
   - No debe quedarse cargando indefinidamente
   - Debe mostrar hasta 15 tracks con sus nombres, artistas e imágenes

## Notas

- Las variables de entorno son **sensibles** y no deben compartirse públicamente
- Si alguna de estas variables falta, verás errores en los logs de Vercel indicando cuál falta
- El token `PLEIA_HUB_REFRESH_TOKEN` se genera cuando autorizas tu aplicación de Spotify por primera vez
