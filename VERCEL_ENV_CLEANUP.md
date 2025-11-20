# Limpieza de Variables de Entorno en Vercel

## 📋 Variables que TIENES actualmente:

### ✅ MANTENER (siguen siendo necesarias):

```
SPOTIFY_CLIENT_ID=...                    ✅ MANTENER
SPOTIFY_CLIENT_SECRET=...                ✅ MANTENER
NEXT_PUBLIC_SUPABASE_URL=...             ✅ MANTENER
NEXT_PUBLIC_SUPABASE_ANON_KEY=...        ✅ MANTENER
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...   ✅ MANTENER (si usas Stripe)
```

### ⚠️ MANTENER (si usas Upstash KV):

```
UPSTASH_REDIS_KV_REST_API_TOKEN=...      ⚠️ MANTENER (si usas KV)
UPSTASH_REDIS_KV_REST_API_URL=...        ⚠️ MANTENER (si usas KV)
UPSTASH_REDIS_KV_URL=...                 ⚠️ MANTENER (si usas KV)
UPSTASH_REDIS_KV_REST_API_READ_ONLY_TOKEN=...  ⚠️ MANTENER (si usas KV)
UPSTASH_REDIS_REDIS_URL=...              ⚠️ MANTENER (si usas KV)
```

**NOTA:** Si NO usas KV storage, puedes QUITAR todas las UPSTASH_*. La app funcionará sin ellas (usará localStorage en el cliente).

### ❌ QUITAR (obsoletas - ya no se usan):

```
NEXTAUTH_SECRET=...                      ❌ QUITAR
NEXTAUTH_URL=...                         ❌ QUITAR
AUTH_TRUST_HOST=...                      ❌ QUITAR (no se usa)
ALLOWLIST_ENABLED=...                    ❌ QUITAR (Early Access eliminado)
NEXT_PUBLIC_LOCAL_CHECKOUT_TEST=...      ❌ QUITAR (solo para desarrollo)
```

---

## ➕ AGREGAR (faltan - OBLIGATORIAS):

### Supabase (OBLIGATORIO):
```
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

### Site URL (OBLIGATORIO para OAuth):
```
NEXT_PUBLIC_SITE_URL=https://playlists.jeylabbb.com
```

### OpenAI (OBLIGATORIO):
```
OPENAI_API_KEY=tu_openai_key_aqui
```

### Si usas Admin Panel:
```
ADMIN_EMAILS=email1@example.com,email2@example.com
ADMIN_PASSWORD=tu_password_seguro
ADMIN_SESSION_SECRET=una_cadena_secreta_larga_y_aleatoria
```

### Si usas PleiaHub:
```
PLEIAHUB_REFRESH_TOKEN=...
PLEIAHUB_USER_ID=...
HUB_MODE=0  (o no ponerlo)
```

---

## 📝 RESUMEN DE ACCIONES:

### 1. QUITAR estas variables:
- ❌ `NEXTAUTH_SECRET`
- ❌ `NEXTAUTH_URL`
- ❌ `AUTH_TRUST_HOST`
- ❌ `ALLOWLIST_ENABLED`
- ❌ `NEXT_PUBLIC_LOCAL_CHECKOUT_TEST`

### 2. AGREGAR estas variables:
- ➕ `SUPABASE_SERVICE_ROLE_KEY` (OBLIGATORIO)
- ➕ `NEXT_PUBLIC_SITE_URL` (OBLIGATORIO)
- ➕ `OPENAI_API_KEY` (OBLIGATORIO)
- ➕ `ADMIN_EMAILS` (si usas admin)
- ➕ `ADMIN_PASSWORD` (si usas admin)
- ➕ `ADMIN_SESSION_SECRET` (si usas admin)

### 3. MANTENER estas variables:
- ✅ `SPOTIFY_CLIENT_ID`
- ✅ `SPOTIFY_CLIENT_SECRET`
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (si usas Stripe)
- ⚠️ `UPSTASH_REDIS_*` (solo si usas KV storage)

---

## 🚨 IMPORTANTE:

1. **Después de cambiar variables en Vercel:**
   - Vercel hace redeploy automático
   - Si no, ve a Deployments → Redeploy

2. **Si la UI sigue siendo vieja:**
   - Settings → General → Clear Build Cache
   - Deployments → Redeploy
   - Prueba en modo incógnito

3. **SUPABASE_SERVICE_ROLE_KEY:**
   - Lo encuentras en Supabase Dashboard → Settings → API
   - Es SECRETO - nunca lo expongas

4. **NEXT_PUBLIC_SITE_URL:**
   - Debe ser tu dominio de producción: `https://playlists.jeylabbb.com`
   - Sin barra final (/)

