# Setup: Playlist Destacada + Reyes

## ✅ CHECKPOINT

- **Rama**: `feat/featured-playlist-reyes`
- **Tag**: `CHECKPOINT_before_featured_playlist`
- **Para volver**: `git checkout CHECKPOINT_before_featured_playlist`

---

## 📋 PASO 1: Ejecutar SQL en Supabase

1. Abre el **SQL Editor** en Supabase Dashboard
2. Copia y pega el contenido de: `supabase/migrations/20250102_featured_playlist.sql`
3. Ejecuta el script
4. Verifica que se creó la tabla:
   ```sql
   SELECT * FROM featured_playlists LIMIT 1;
   ```

**Qué hace el SQL:**
- Crea tabla `featured_playlists` con todos los campos necesarios
- Constraint único: solo 1 playlist activa (`is_active=true`)
- RLS policies: lectura pública solo de activa, escritura solo admin
- Índices para performance

---

## 📋 PASO 2: Verificar RLS/Policies

El SQL ya crea las policies, pero verifica:

```sql
-- Ver policies
SELECT * FROM pg_policies WHERE tablename = 'featured_playlists';

-- Verificar que RLS está activo
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'featured_playlists';
```

**Debería mostrar:**
- `Public can read active featured playlist` (SELECT para público)
- `Admin can read all featured playlists` (SELECT para admin)
- `Admin can insert/update/delete` (escritura solo admin)

---

## 📋 PASO 3: Deploy a Vercel

```bash
# Asegúrate de estar en la rama correcta
git checkout feat/featured-playlist-reyes

# Commit si hay cambios pendientes
git add .
git commit -m "feat: featured playlist + reyes functionality"

# Push y deploy
git push origin feat/featured-playlist-reyes
```

O merge a main y deploy automático.

---

## 📋 PASO 4: Usar Admin Panel

### 4.1 Seleccionar Playlist Destacada

1. Ve a: `https://playlists.jeylabbb.com/admin/featured-playlist`
2. Verás lista de todas las playlists generadas
3. Haz clic en **"Seleccionar"** en la playlist que quieras destacar
4. ✅ Automáticamente:
   - Se desactiva la anterior (si había)
   - Se activa la nueva
   - Se guarda cache (nombre, owner, preview_tracks)
   - Se envía email al creador

### 4.2 Quitar Playlist Destacada

1. En la misma página, si hay destacada actual
2. Haz clic en **"Quitar destacada"**
3. Confirma

### 4.3 Reyes: Grant Founder

1. Ve a: `https://playlists.jeylabbb.com/admin/reyes`
2. Haz clic en **"Grant Founder a Todos"**
3. ✅ Convierte a TODOS los usuarios a Founder (plan ilimitado)
4. Idempotente: si ya son Founder, no hace nada

### 4.4 Reyes: Enviar Email

1. En la misma página `/admin/reyes`
2. Haz clic en **"Enviar Email a Todos"**
3. ✅ Envía email de Reyes con Founder Pass a todos
4. Se procesa en lotes (10 por vez, 1 segundo entre lotes)
5. Verás resultado: enviados, fallidos, errores

---

## 📋 PASO 5: Verificar en Home

1. Ve a: `https://playlists.jeylabbb.com`
2. Justo **encima de "Mis Playlists"** debería aparecer:
   - Card "⭐ Playlist destacada de la semana"
   - Nombre de la playlist
   - Creador
   - Botón "Abrir en Spotify"
   - Opción "Ver preview" (si hay tracks)

**Si no aparece:**
- Verifica que hay una playlist con `is_active=true` en DB
- Revisa consola del navegador por errores
- Verifica que el endpoint `/api/featured-playlist` funciona

---

## 📋 PASO 6: Verificar Email al Creador

Cuando seleccionas una playlist destacada:

1. El sistema identifica al `owner_user_id`
2. Envía email automáticamente a `owner_email`
3. Asunto: "🎉 Tu playlist ha sido la destacada de la semana"
4. Contenido: enhorabuena + link a Spotify + CTA crear otra

**Para verificar:**
- Revisa logs del servidor (Vercel logs)
- Busca: `[FEATURED_EMAIL] ✅ Email enviado a:`
- Si falla, no rompe el proceso (solo loggea error)

---

## 🔍 Troubleshooting

### La playlist destacada no aparece en home

```sql
-- Verificar que hay una activa
SELECT * FROM featured_playlists WHERE is_active = true;
```

Si no hay resultados, selecciona una desde admin.

### Error "No autorizado" en admin

- Verifica que estás logueado como admin
- Revisa `ADMIN_EMAILS` en variables de entorno
- El email debe estar en la lista de admins

### Email no se envía

- Verifica `RESEND_API_KEY` en Vercel
- Revisa logs: `[FEATURED_EMAIL]` o `[REYES_EMAIL]`
- Si falla 1 usuario, continúa con los demás (no rompe)

### Preview tracks vacío

- Por ahora el preview está vacío (se puede rellenar después con Spotify API)
- No afecta la funcionalidad principal
- La playlist se muestra igual

---

## 📁 Archivos Creados/Modificados

### SQL
- `supabase/migrations/20250102_featured_playlist.sql`

### API Endpoints
- `app/api/featured-playlist/route.ts` (GET público)
- `app/api/admin/featured-playlist/select/route.ts` (POST admin)
- `app/api/admin/featured-playlist/clear/route.ts` (POST admin)
- `app/api/admin/featured-playlist/list/route.ts` (GET admin)
- `app/api/admin/reyes/grant-founder/route.ts` (POST admin)
- `app/api/admin/reyes/send-email/route.ts` (POST admin)

### UI
- `app/components/FeaturedPlaylistCard.tsx` (componente público)
- `app/page.js` (modificado: agregado FeaturedPlaylistCard)
- `app/admin/featured-playlist/page.tsx` (admin UI)
- `app/admin/reyes/page.tsx` (admin UI Reyes)

### Email Templates
- `lib/email/reyesNotification.ts`
- `lib/email/featuredPlaylistNotification.ts`

---

## ✅ Checklist Final

- [ ] SQL ejecutado en Supabase
- [ ] RLS policies verificadas
- [ ] Deploy a Vercel completado
- [ ] Admin panel accesible (`/admin/featured-playlist` y `/admin/reyes`)
- [ ] Playlist destacada seleccionada desde admin
- [ ] Aparece en home pública
- [ ] Email al creador recibido (verificar logs)
- [ ] Grant Founder ejecutado (Reyes)
- [ ] Email de Reyes enviado (verificar logs)

---

## 🎯 Próximos Pasos (Opcional)

1. **Preview tracks desde Spotify API**: Implementar fetch de tracks al seleccionar
2. **Mejoras UI**: Añadir más info en la card destacada
3. **Analytics**: Trackear clicks en playlist destacada
4. **Rotación automática**: Cron job para cambiar destacada semanalmente

---

## 📞 Soporte

Si algo falla:
1. Revisa logs de Vercel
2. Verifica SQL en Supabase
3. Revisa consola del navegador
4. Todos los errores están loggeados con prefijos: `[FEATURED]`, `[REYES]`, `[FEATURED_EMAIL]`, `[REYES_EMAIL]`

