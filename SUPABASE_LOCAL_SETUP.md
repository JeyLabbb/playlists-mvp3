# Configuración de Supabase para Desarrollo Local

## ⚠️ IMPORTANTE: Esto NO afecta a producción

Supabase acepta **múltiples URLs de redirección** y usa automáticamente la que coincida con cada request. Añadir URLs de localhost es **completamente seguro** y no afectará a los usuarios en producción.

## Pasos para configurar:

1. **Ve a tu proyecto en Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/[TU_PROJECT_ID]

2. **Navega a Authentication → URL Configuration**

3. **Configura Site URL (debe ser producción):**
   ```
   https://playlists.jeylabbb.com
   ```

4. **Añade TODAS estas URLs en Redirect URLs (en este orden):**
   ```
   https://playlists.jeylabbb.com/auth/callback
   https://playlists.jeylabbb.com/**
   http://localhost:3002/auth/callback
   http://127.0.0.1:3002/auth/callback
   http://localhost:3000/auth/callback
   http://127.0.0.1:3000/auth/callback
   http://localhost:3001/auth/callback
   http://127.0.0.1:3001/auth/callback
   ```

5. **Guarda los cambios**

## ¿Por qué esto es seguro?

- Supabase usa la URL que **coincida** con la request
- Si la request viene de `localhost:3002`, usará `http://localhost:3002/auth/callback`
- Si la request viene de `playlists.jeylabbb.com`, usará `https://playlists.jeylabbb.com/auth/callback`
- **Nunca mezcla** las URLs entre entornos

## Verificación:

Después de configurar:
1. En local: Intenta iniciar sesión con Google desde `http://localhost:3002`
2. Revisa los logs en la consola del servidor para ver qué URL se está usando
3. Deberías ver: `[AUTH] ✅ Using localhost redirect (local development): http://localhost:3002/auth/callback`

## Si sigue redirigiendo a producción:

1. Verifica que las URLs de localhost estén en la lista de Redirect URLs
2. Verifica que el código detecte correctamente localhost (revisa los logs)
3. Asegúrate de que `.env.local` tenga `NEXT_PUBLIC_SITE_URL` comentado (ya lo hicimos)


