# Configuración de OAuth en Supabase Dashboard

## ⚠️ IMPORTANTE: Configurar URLs de Redirección

Para que OAuth funcione correctamente en producción, debes configurar las URLs de redirección en el dashboard de Supabase.

### Pasos:

1. **Ve a tu proyecto en Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/[TU_PROJECT_ID]

2. **Navega a Authentication → URL Configuration**

3. **Configura las siguientes URLs:**

   **Site URL:**
   ```
   https://playlists.jeylabbb.com
   ```

   **Redirect URLs (añade todas estas):**
   ```
   https://playlists.jeylabbb.com/auth/callback
   https://playlists.jeylabbb.com/**
   ```

4. **Guarda los cambios**

### Para Desarrollo Local (opcional):

Si quieres probar OAuth en local, añade también:
```
http://localhost:3000/auth/callback
http://127.0.0.1:3000/auth/callback
```

**⚠️ IMPORTANTE:** Las URLs de producción deben estar PRIMERO en la lista.

### Verificar Configuración:

Después de configurar, prueba iniciar sesión con Google en producción. Si sigue redirigiendo a localhost, verifica:

1. Que las URLs de producción estén en la lista
2. Que no haya URLs de localhost antes de las de producción
3. Que el Site URL esté configurado correctamente

### Nota sobre el Código:

El código ya está configurado para:
- Detectar automáticamente si estamos en producción
- Forzar la URL de producción cuando no estamos en desarrollo local
- Reemplazar cualquier referencia a localhost por la URL de producción

Pero Supabase también necesita tener estas URLs configuradas en su dashboard para que funcione correctamente.

