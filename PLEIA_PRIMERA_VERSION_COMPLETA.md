# 🎯 PLEIA: PRIMERA VERSIÓN COMPLETA

**Fecha de snapshot:** 2025-01-XX
**Commit hash:** 6f18ee1
**Estado:** ✅ PRODUCCIÓN LISTA - PRIMERA VERSIÓN COMPLETA

---

## 📋 ESTADO ACTUAL - SNAPSHOT COMPLETO

Este documento captura el estado exacto de PLEIA en su primera versión completa. Cualquier cambio futuro debe mantener:
- ✅ UI exactamente igual
- ✅ Procesos y funcionamientos idénticos
- ✅ Variables de entorno sin cambios
- ✅ Enlaces y navegación iguales
- ✅ Estados y comportamientos iguales

---

## 🎨 UI Y DISEÑO

### Navegación (CardNav)
- **Menú Burger:** 3 secciones principales
  - **Explorar:** Crear playlists, Trending, Amigos
  - **Tu música:** Mis playlists, Mi perfil, Planes
  - **MTRYX:** Cómo funciona, FAQ, Soporte
- **Logo:** PLEIA con estrella gradiente
- **Botón CTA:** "Mi perfil" (con badge de usos si aplica) o "Inicia sesión"
- **Badge de notificaciones:** Aparece en "Amigos" cuando hay solicitudes nuevas

### Footer
- **Enlaces:** Soporte, Eliminar datos, Instagram, TikTok, **Ver otros proyectos** (mtryx.com)
- **Estilo:** Borde superior, fondo dark, texto mist

### Página Principal (`/`)
- **Generador de playlists con IA**
- **Prompt input:** Campo de texto con ejemplos clickeables
- **Controles:** Número de canciones (20-50), botón generar
- **Progreso:** Barra de progreso con mensajes de estado
- **Playlist creada:**
  - Input para nombre personalizado
  - Botón "Crear playlist" → se convierte en "Abrir en Spotify" cuando está creada
  - Botón "Copiar enlace" (se desbloquea después de crear)
  - Botón "TuneMyMusic" (se desbloquea después de crear)
  - **NO redirige automáticamente a Spotify**
- **Playlists se crean en PLEIAHUB** (cuenta central)

### Página Trending (`/trending`)
- **Lista de playlists públicas**
- **Preview de playlists:** 5 canciones para no-owners/no-friends, completas para owners/friends
- **Métricas:** Views y clicks trackeados
- **Filtros:** Ordenar por popularidad, fecha, etc.
- **Imágenes de perfil:** Se cargan desde Supabase auth

### Página Amigos (`/amigos`)
- **Solicitudes entrantes:** Con badge "NEW" para nuevas
- **Solicitudes salientes:** Con badge "NEW" para aceptadas
- **Lista de amigos:** Clickables para ver perfil público
- **Botón eliminar:** Para remover amigos
- **Badge de notificaciones:** En navegación cuando hay nuevas solicitudes

### Página Mi Perfil (`/me`)
- **Información del usuario:** Email, username, plan
- **Estadísticas:** Usos restantes, plan actual
- **Mensaje "Primeros 1000":** Aparece si `is_early_founder_candidate = true`
- **Ventaja de referidos:** Se muestra si aplica

### Página Mis Playlists (`/my`)
- **Lista de playlists del usuario**
- **Preview completo:** Usuario puede ver todas sus playlists completas
- **Toggle de privacidad:** Para hacer playlists públicas/privadas
- **Botón abrir en Spotify**

### Página Perfil Público (`/u/[username]`)
- **Información del usuario:** Username normalizado, bio, imagen de perfil
- **Playlists públicas:** Con preview limitado (5 canciones) para no-owners/no-friends
- **Botón "← Volver":** Navegación inteligente (back o trending)
- **Métricas:** Views y clicks trackeados

### Página Pricing (`/pricing`)
- **Planes:** Free, Founder Pass
- **Ventaja de primeros 1000:** Se muestra si aplica
- **Sistema de referidos:** Invitar 3 amigos = Founder Pass gratis

---

## 🔧 FUNCIONALIDADES Y PROCESOS

### Autenticación
- **PLEIA Auth:** Sistema propio con Supabase
- **OAuth Google:** Disponible
- **Email/Password:** Disponible
- **Onboarding:** Flujo completo con aceptación de términos

### Generación de Playlists
- **IA:** OpenAI GPT-4.1 con fallback a GPT-4o
- **Spotify API:** Usa cuenta PLEIAHUB para crear playlists
- **Streaming:** SSE para progreso en tiempo real
- **Calidad:** Sin duplicados, caps de artistas, reglas de calidad

### Sistema de Usos
- **Free:** 5 usos iniciales
- **Founder:** Usos ilimitados (`max_uses = null`)
- **Tracking:** En Supabase (`usage_events` table)
- **Paywall:** Aparece cuando se agotan los usos

### Sistema de Referidos
- **Invitar 3 amigos:** Upgrade automático a Founder
- **Tracking:** En Supabase (`referrals` table)
- **`founder_source`:** 'referral' o 'purchase'
- **Email de bienvenida:** Se envía automáticamente

### Sistema de Amigos
- **Solicitudes:** Bidireccionales
- **Notificaciones:** Badge en navegación, "NEW" en página
- **Perfiles públicos:** Accesibles desde lista de amigos
- **Eliminar amigos:** Funcionalidad disponible

### Sistema de Playlists
- **Creación:** En PLEIAHUB (cuenta central)
- **Guardado:** En KV y Supabase
- **Visibilidad:**
  - **Owner:** Ve playlist completa
  - **Friend:** Ve playlist completa
  - **Otros:** Solo preview (5 canciones)
- **Métricas:** Views y clicks en Supabase y localStorage

### Admin Panel
- **Dashboard:** Métricas, usuarios, playlists, pagos
- **Newsletter:** Sistema completo de campañas
- **Filtros:** Por fecha, estado, tipo
- **Estilo:** Técnico y profesional (bg-gray-900, blue accents)

---

## 🔐 VARIABLES DE ENTORNO CRÍTICAS

### Supabase
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Spotify (PLEIAHUB)
- `SPOTIFY_HUB_CLIENT_ID`
- `SPOTIFY_HUB_CLIENT_SECRET`
- `SPOTIFY_HUB_REFRESH_TOKEN`

### OpenAI
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (gpt-4.1 o gpt-4o)

### Stripe
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### Email (Resend)
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

### Vercel KV
- `UPSTASH_REDIS_KV_REST_API_URL`
- `UPSTASH_REDIS_KV_REST_API_TOKEN`

### Otros
- `NEXT_PUBLIC_SITE_URL`
- `NEXTAUTH_SECRET` (si se usa)

---

## 📁 ESTRUCTURA DE ARCHIVOS CLAVE

### Páginas Principales
- `app/page.js` - Generador principal
- `app/trending/page.js` - Playlists trending
- `app/amigos/page.tsx` - Sistema de amigos
- `app/me/page.js` - Perfil del usuario
- `app/my/page.js` - Mis playlists
- `app/u/[username]/page.js` - Perfil público
- `app/pricing/page.js` - Planes y precios

### APIs Críticas
- `app/api/playlist/stream/route.js` - Generación de playlists
- `app/api/create/route.js` - Creación en Spotify
- `app/api/spotify/create/route.js` - API de Spotify
- `app/api/spotify/playlist-tracks/route.js` - Tracks con permisos
- `app/api/social/friends/*` - Sistema de amigos
- `app/api/referrals/*` - Sistema de referidos
- `app/api/stripe/webhook/route.js` - Webhooks de Stripe
- `app/api/metrics/route.ts` - Tracking de métricas

### Componentes
- `app/components/CardNav.tsx` - Navegación principal
- `app/PaywallHost.tsx` - Paywall y recordatorios
- `app/layout.js` - Layout raíz

### Librerías
- `lib/spotify/hubAuth.ts` - Autenticación PLEIAHUB
- `lib/auth/*` - Sistema de autenticación PLEIA
- `lib/social/*` - Funcionalidades sociales
- `lib/billing/usageV2.ts` - Sistema de usos

---

## 🗄️ BASE DE DATOS (Supabase)

### Tablas Principales
- `users` - Usuarios con `plan`, `max_uses`, `founder_source`, `is_early_founder_candidate`
- `playlists` - Playlists con `views`, `clicks`, `public`
- `friends` - Relaciones de amistad bidireccionales
- `referrals` - Sistema de referidos
- `usage_events` - Tracking de usos
- `payments` - Pagos de Stripe
- `newsletter_*` - Sistema de newsletter

### Columnas Críticas
- `users.plan`: 'free' | 'founder'
- `users.max_uses`: number | null (null = ilimitado)
- `users.founder_source`: 'referral' | 'purchase' | null
- `users.is_early_founder_candidate`: boolean
- `users.marketing_opt_in`: boolean
- `users.terms_accepted_at`: timestamp

---

## 🎯 COMPORTAMIENTOS ESPECÍFICOS

### Creación de Playlist
1. Usuario escribe prompt
2. IA genera intención estructurada
3. Se buscan tracks en Spotify
4. Se aplican reglas de calidad
5. Se crea playlist en **PLEIAHUB** (no en cuenta del usuario)
6. Botón cambia a "Abrir en Spotify"
7. Botones "Copiar enlace" y "TuneMyMusic" se desbloquean
8. **NO se abre Spotify automáticamente**

### Sistema de Permisos de Playlists
- **Owner:** Email coincide → playlist completa
- **Friend:** Amistad verificada en Supabase → playlist completa
- **Otros:** Solo 5 canciones de preview

### Sistema de Notificaciones de Amigos
- **Badge en navegación:** Cuenta nuevas solicitudes entrantes y aceptaciones salientes
- **"NEW" en página:** Marca items no vistos
- **LocalStorage:** Persiste estado de "vistos"

### Paywall
- Aparece cuando se agotan usos
- Muestra ventaja si `is_early_founder_candidate = true`
- Nunca aparece para Founders
- Recordatorio de usos restantes

---

## 🚫 LO QUE NO DEBE CAMBIAR

### UI
- ❌ NO cambiar colores, fuentes, espaciados
- ❌ NO modificar estructura de navegación
- ❌ NO cambiar textos de botones o mensajes
- ❌ NO alterar layout de páginas

### Funcionalidad
- ❌ NO cambiar flujo de creación de playlists
- ❌ NO modificar sistema de permisos
- ❌ NO alterar lógica de referidos
- ❌ NO cambiar autenticación
- ❌ NO modificar sistema de usos

### Procesos
- ❌ NO cambiar dónde se crean playlists (PLEIAHUB)
- ❌ NO modificar sistema de tracking
- ❌ NO alterar emails automáticos
- ❌ NO cambiar webhooks de Stripe

### Base de Datos
- ❌ NO modificar estructura de tablas
- ❌ NO cambiar nombres de columnas
- ❌ NO alterar lógica de RLS

---

## ✅ REGLAS DE MANTENIMIENTO

1. **Cualquier fix debe mantener UI idéntica**
2. **Cualquier fix debe mantener procesos idénticos**
3. **Cualquier fix debe mantener funcionamientos idénticos**
4. **Solo se pueden arreglar bugs, no cambiar comportamiento**
5. **Si hay conflicto entre fix y comportamiento actual, el comportamiento actual tiene prioridad**

---

## 📝 NOTAS FINALES

Este snapshot representa **PLEIA: PRIMERA VERSIÓN COMPLETA** en producción.

**Para restaurar este estado:**
1. Revertir a este commit
2. Verificar variables de entorno
3. Verificar estructura de base de datos
4. Verificar que todos los procesos funcionan igual

**Para hacer cambios:**
- Mantener UI exactamente igual
- Mantener procesos exactamente iguales
- Solo arreglar bugs sin cambiar comportamiento
- Si es necesario cambiar algo, documentarlo explícitamente

---

**Última actualización:** $(date)
**Estado:** ✅ COMPLETO Y LISTO PARA PRODUCCIÓN

