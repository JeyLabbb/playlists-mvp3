# Variables de Entorno para Vercel - GUÍA COMPLETA

## ✅ OBLIGATORIAS - Debes agregar estas:

### Supabase (NUEVO - OBLIGATORIO)
```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

### Site URL (NUEVO - OBLIGATORIO para OAuth)
```
NEXT_PUBLIC_SITE_URL=https://playlists.jeylabbb.com
```

### Spotify (OBLIGATORIO - para crear playlists)
```
SPOTIFY_CLIENT_ID=tu_spotify_client_id
SPOTIFY_CLIENT_SECRET=tu_spotify_secret
```

### OpenAI (OBLIGATORIO - para generar playlists)
```
OPENAI_API_KEY=tu_openai_key
```

---

## 🔧 OPCIONALES pero RECOMENDADAS:

### Admin Panel (si usas /admin)
```
ADMIN_EMAILS=email1@example.com,email2@example.com
ADMIN_PASSWORD=tu_password_seguro
ADMIN_SESSION_SECRET=una_cadena_secreta_larga_y_aleatoria
```

### PleiaHub (si usas HUB_MODE para Spotify)
```
PLEIAHUB_REFRESH_TOKEN=tu_refresh_token
PLEIAHUB_USER_ID=tu_user_id
HUB_MODE=0
```
**NOTA:** Si `HUB_MODE=0` o no está, se usa OAuth normal de Spotify. Si `HUB_MODE=1`, usa PleiaHub.

### Stripe (si usas checkout)
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=https://playlists.jeylabbb.com/checkout/success
STRIPE_CANCEL_URL=https://playlists.jeylabbb.com/checkout/cancel
STRIPE_PRICE_FOUNDER=price_...
STRIPE_PRICE_MONTHLY=price_...
```

### Vercel KV (si usas KV storage)
```
KV_REST_API_URL=https://tu-kv.vercel-storage.com
KV_REST_API_TOKEN=tu_token
```

### Email/Notificaciones (opcional)
```
RESEND_API_KEY=tu_resend_key
SLACK_WEBHOOK_URL=tu_slack_webhook
FEEDBACK_NOTIFY_EMAIL=tu_email@example.com
```

### Usage Limits (opcional - defaults: 5/30)
```
FREE_USAGE_LIMIT=5
USAGE_WINDOW_DAYS=30
```

---

## ❌ OBSOLETAS - Puedes QUITAR estas:

### NextAuth (YA NO SE USA - migrado a Supabase)
```
NEXTAUTH_SECRET=...  ❌ QUITAR
NEXTAUTH_URL=...     ❌ QUITAR
```

---

## 📝 RESUMEN RÁPIDO:

### Mínimo para que funcione:
1. `NEXT_PUBLIC_SUPABASE_URL`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. `SUPABASE_SERVICE_ROLE_KEY`
4. `NEXT_PUBLIC_SITE_URL`
5. `SPOTIFY_CLIENT_ID`
6. `SPOTIFY_CLIENT_SECRET`
7. `OPENAI_API_KEY`

### Si usas admin:
+ `ADMIN_EMAILS`
+ `ADMIN_PASSWORD`
+ `ADMIN_SESSION_SECRET`

### Si usas PleiaHub:
+ `PLEIAHUB_REFRESH_TOKEN`
+ `PLEIAHUB_USER_ID`
+ `HUB_MODE=0` (o no ponerlo)

---

## 🚨 IMPORTANTE:

1. **NEXT_PUBLIC_SITE_URL** debe ser tu dominio de producción: `https://playlists.jeylabbb.com`
2. **SUPABASE_SERVICE_ROLE_KEY** es SECRETO - nunca lo expongas en el cliente
3. Si la UI sigue siendo vieja, puede ser caché de Vercel - haz "Clear Build Cache" y "Redeploy"
4. Después de agregar variables, Vercel hace redeploy automático

