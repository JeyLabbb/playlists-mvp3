# Playlist Board by PLEIA — Instrucciones de Setup

## 📋 Resumen
Feature completo de "Playlist Board" personalizable y compartible para cada usuario.
- Página privada de edición: `/board`
- Página pública read-only: `/board/[slug]`
- Acceso desde menú: "Tu música" → "Playlist Board by PLEIA"

---

## 🗄️ 1. BASE DE DATOS (Supabase)

### Ejecutar SQL

```sql
-- Ejecutar en Supabase SQL Editor:
-- supabase/migrations/20250106_playlist_boards.sql
```

Este script crea:
- Tabla `playlist_boards` con campos: `user_id`, `slug`, `display_name`, `status_text`, `theme`, `font_title`, `font_status`
- Índices en `slug` y `user_id`
- RLS policies (owner puede leer/escribir, público puede leer todo)
- Trigger para `updated_at`
- Función helper `generate_unique_board_slug()` para slugs únicos

### Verificar

```sql
-- Verificar que la tabla existe
SELECT * FROM public.playlist_boards LIMIT 1;

-- Verificar policies
SELECT * FROM pg_policies WHERE tablename = 'playlist_boards';
```

---

## 🔧 2. ARCHIVOS CREADOS/MODIFICADOS

### Nuevos archivos:

1. **`supabase/migrations/20250106_playlist_boards.sql`**
   - Migración SQL completa

2. **`app/api/board/me/route.ts`**
   - `GET`: Obtener board del usuario autenticado + playlists
   - `POST`: Actualizar board (display_name, status_text, theme, fonts, slug)

3. **`app/api/board/public/[slug]/route.ts`**
   - `GET`: Obtener board público por slug + playlists públicas

4. **`app/board/page.tsx`**
   - Página privada de edición del board
   - Editor de configuración + preview en vivo

5. **`app/board/[slug]/page.tsx`**
   - Página pública read-only del board
   - 3 themes: light, dark, pleia
   - Grid de playlists con covers, preview tracks, botón Spotify

6. **`PLAYLIST_BOARD_SETUP.md`** (este archivo)

### Archivos modificados:

1. **`app/layout.js`**
   - Añadido enlace "Playlist Board by PLEIA" en sección "Tu música"

---

## 🧪 3. TESTING LOCAL

### Paso 1: Ejecutar SQL
```bash
# Copiar contenido de supabase/migrations/20250106_playlist_boards.sql
# Pegar en Supabase SQL Editor y ejecutar
```

### Paso 2: Reiniciar dev server
```bash
npm run dev
```

### Paso 3: Probar flujo completo

1. **Login**
   - Ir a http://localhost:3001
   - Hacer login con Spotify

2. **Acceder al Board**
   - Abrir menú hamburguesa (arriba izquierda)
   - Click en "Tu música" → "Playlist Board by PLEIA"
   - O ir directo a: http://localhost:3001/board

3. **Editar Board**
   - Cambiar nombre visible
   - Añadir una frase/estado
   - Probar los 3 themes (Light, Dark, PLEIA)
   - Cambiar fuentes de título y estado
   - Click "Guardar cambios"

4. **Copiar enlace público**
   - Click "📋 Copiar enlace público"
   - Debe copiar algo como: `http://localhost:3001/board/tu-slug`

5. **Ver página pública**
   - Abrir el enlace en ventana incógnito
   - Verificar que se ve el board con:
     - Nombre y frase
     - Theme aplicado
     - Grid de playlists públicas
     - Botones "Abrir en Spotify" funcionando

6. **Probar themes**
   - En `/board`, cambiar entre Light, Dark, PLEIA
   - Guardar
   - Recargar página pública y verificar cambio

---

## 🎨 4. DISEÑO Y ESTÉTICA

### Themes disponibles:

1. **Light**
   - Fondo blanco limpio
   - Texto negro
   - Cards con bordes suaves
   - Minimal, tipo Apple

2. **Dark**
   - Fondo negro elegante
   - Texto blanco
   - Cards con transparencias

3. **PLEIA**
   - Degradado verde-azul de fondo
   - Badge "✨ PLEIA Board" arriba
   - Footer "Made with PLEIA" con gradiente
   - Glow effects sutiles

### Fuentes disponibles:
- **Inter**: Sans-serif moderna (default)
- **Space Grotesk**: Mono tracking tight (estilo tech)
- **SF Pro**: Sans-serif tipo Apple

---

## 🔗 5. RUTAS Y ENDPOINTS

### Páginas:
- `/board` (privada, requiere login)
- `/board/[slug]` (pública, read-only)

### API:
- `GET /api/board/me` (privada)
- `POST /api/board/me` (privada)
- `GET /api/board/public/[slug]` (pública)

---

## 📊 6. DATOS DE PLAYLISTS

### Fuente:
- Tabla `playlists` existente
- Solo playlists donde `is_public = true` se muestran en board público
- En board privado se ven todas las del usuario

### Campos usados:
- `playlist_id`, `playlist_name`
- `spotify_playlist_id`, `spotify_playlist_url`
- `mood` (opcional)
- `preview_tracks` (JSONB con hasta 5 tracks)

### Cover image:
- Se extrae del primer track en `preview_tracks[0].album.images[0].url`
- Fallback: `/pleia-logo.png`

---

## 🚀 7. DEPLOY A PRODUCCIÓN

### Pre-deploy checklist:
- [ ] SQL ejecutado en Supabase producción
- [ ] Verificar que `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` están en Vercel
- [ ] Commit y push a main
- [ ] Vercel auto-deploy

### Post-deploy:
1. Ir a https://pleia.app/board
2. Crear/editar tu board
3. Compartir enlace público: https://pleia.app/board/[tu-slug]

---

## 🐛 8. TROUBLESHOOTING

### "Board no encontrado" en página pública
- Verificar que el slug existe en `playlist_boards`
- Verificar RLS policies (público debe poder leer)
- La URL correcta es `/board/[slug]` (no `/u/[slug]`)

### No se ven playlists en board público
- Verificar que las playlists tienen `is_public = true`
- Verificar que el `user_id` coincide

### Slug duplicado al crear board
- La función `generate_unique_board_slug()` añade sufijos automáticamente
- Si falla, revisar que la función existe en Supabase

### Fuentes no se aplican correctamente
- Verificar que Space Grotesk está cargada en `app/layout.js` (ya está)
- Los valores válidos son: `inter`, `space_grotesk`, `sf_pro`

---

## ✅ 9. CHECKLIST FINAL

- [ ] SQL ejecutado en Supabase
- [ ] Tabla `playlist_boards` creada
- [ ] RLS policies activas
- [ ] Dev server reiniciado
- [ ] Login funciona
- [ ] Menú muestra "Playlist Board by PLEIA"
- [ ] Página `/board` carga correctamente
- [ ] Editor guarda cambios
- [ ] Preview se actualiza en vivo
- [ ] Enlace público se copia
- [ ] Página pública `/u/[slug]` funciona
- [ ] Themes se aplican correctamente
- [ ] Playlists públicas se muestran
- [ ] Botones Spotify funcionan
- [ ] Responsive en móvil

---

## 📝 10. NOTAS ADICIONALES

### Mejoras futuras (no en MVP):
- Reordenar playlists en el board (drag & drop)
- Ocultar playlists específicas del board
- Más themes personalizables
- Subir imagen de fondo custom
- Compartir directo a redes sociales

### Limitaciones actuales:
- Solo 3 themes predefinidos
- Solo 3 fuentes disponibles
- No se pueden importar playlists externas
- Slug solo se puede cambiar manualmente (no auto-actualiza)

---

## 🎉 ¡Listo!

El feature está completo y funcional. Los usuarios pueden:
1. Crear su board personalizado
2. Elegir theme y fuentes
3. Compartir enlace público
4. Mostrar sus playlists de forma estética

**Próximo paso**: Promocionar el feature en redes y ver qué boards crean los usuarios 🚀

