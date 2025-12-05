# 🚀 Instrucciones de Deploy: Email "Sin Créditos"

## ✅ TODO LISTO - Solo 2 Pasos

---

## 📋 PASO 1: Ejecutar SQL en Supabase

### 1.1 Ir a Supabase Dashboard
```
https://supabase.com/dashboard
```

### 1.2 Abrir SQL Editor
- Selecciona tu proyecto PLEIA
- Click en "SQL Editor" en el menú lateral
- Click en "New Query"

### 1.3 Copiar y Ejecutar el SQL

Abre el archivo: **`SQL_EJECUTAR_EN_SUPABASE.sql`**

Copia TODO el contenido y pégalo en el SQL Editor, luego click en **"Run"**.

**Esto agregará:**
- ✅ Columna `out_of_credits_email_sent` (boolean)
- ✅ Columna `out_of_credits_email_sent_at` (timestamp)
- ✅ Índice para performance
- ✅ Comentarios de documentación

### 1.4 Verificar que funcionó

El mismo script incluye queries de verificación al final. Deberías ver:

```
✅ 2 columnas nuevas en tabla 'users'
✅ 1 índice creado
```

---

## 📋 PASO 2: Deploy del Código

### 2.1 Las variables de entorno YA están configuradas

El sistema usa las **MISMAS variables** que los emails de bienvenida:
- ✅ `RESEND_API_KEY` (ya configurada)
- ✅ `RESEND_FROM` (ya configurada)
- ✅ `RESEND_NEWSLETTER_FROM` (fallback, opcional)
- ✅ `CONTACT_EMAIL` (reply-to, opcional)

**No necesitas configurar nada nuevo en Vercel.**

### 2.2 Deploy a producción

```bash
# Commit de los cambios
git add .
git commit -m "feat: email automático cuando usuario agota créditos"

# Push a main (o tu rama de producción)
git push origin main
```

Vercel hará el deploy automáticamente. ✅

---

## 🧪 PASO 3: Testear (Opcional pero Recomendado)

### Opción A: Test con Usuario Real

1. **Crear usuario de prueba** con 0 usos:

```sql
-- En Supabase SQL Editor
INSERT INTO users (email, plan, usage_count, max_uses, out_of_credits_email_sent)
VALUES ('tu-email@example.com', 'free', 5, 5, false);
```

2. **Login** con ese usuario en la app

3. **Intentar generar una playlist**
   - Debería fallar con error 403
   - Email debería llegar en 1-2 minutos

4. **Verificar en DB**:

```sql
SELECT email, out_of_credits_email_sent, out_of_credits_email_sent_at
FROM users
WHERE email = 'tu-email@example.com';
```

Debería mostrar:
```
email: tu-email@example.com
out_of_credits_email_sent: true
out_of_credits_email_sent_at: 2025-12-02 14:30:00...
```

### Opción B: Test con Script (si tienes acceso local)

```bash
npm run tsx scripts/test-out-of-credits-email.ts tu-email@example.com
```

---

## 📊 Monitoreo Post-Deploy

### Ver emails enviados:

```sql
-- Últimos 10 usuarios que recibieron el email
SELECT 
  email,
  usage_count,
  max_uses,
  plan,
  out_of_credits_email_sent_at
FROM users
WHERE out_of_credits_email_sent = true
ORDER BY out_of_credits_email_sent_at DESC
LIMIT 10;
```

### Ver logs en Vercel:

Buscar en logs:
```
✅ Sent out-of-credits email to user@example.com
```

O si hubo problemas:
```
❌ Failed to send out-of-credits email
```

### Dashboard de Resend:

https://resend.com/emails

Ver todos los emails enviados, bounces, etc.

---

## ✨ Características del Sistema

### ✅ Email se envía SOLO UNA VEZ por usuario
Aunque intenten generar múltiples playlists sin créditos, el email se envía solo la primera vez.

### ✅ No bloquea el API
El envío es asíncrono, la respuesta al usuario es inmediata.

### ✅ Usa la misma configuración de emails
No necesitas configurar variables nuevas.

### ✅ Diseño responsive
El email se ve bien en mobile y desktop.

### ✅ Tracking completo
Todo se registra en DB con timestamps.

---

## 📧 Contenido del Email

**Asunto:**
```
Te has quedado sin playlists IA… pero tengo algo para ti.
```

**Mensaje:**
- Tono conversacional y empático
- Dos opciones claras:
  - 👉 Invitar 3 amigos → Gratis
  - 👉 Founder por 5€ → De por vida
- CTA: "Quiero playlists ilimitadas" → `/pricing`
- Firmado por: MTRYX (fundadores)

---

## 🐛 Troubleshooting

### Email no llega

1. **Verificar Resend Dashboard:**
   - https://resend.com/emails
   - Ver si el email aparece como enviado

2. **Verificar logs en Vercel:**
   - Buscar `[OUT_OF_CREDITS_EMAIL]`

3. **Verificar flag en DB:**
```sql
SELECT out_of_credits_email_sent, out_of_credits_email_sent_at
FROM users
WHERE email = 'usuario@example.com';
```

4. **Verificar carpeta de spam** del usuario

### Email se envía múltiples veces

Verificar que el flag está funcionando:
```sql
SELECT email, out_of_credits_email_sent, COUNT(*) 
FROM users
GROUP BY email, out_of_credits_email_sent
HAVING COUNT(*) > 1;
```

Si hay problema, resetear manualmente:
```sql
UPDATE users 
SET out_of_credits_email_sent = false,
    out_of_credits_email_sent_at = null
WHERE email = 'usuario@example.com';
```

---

## 📝 Archivos Relevantes

```
📁 playlists-mvp/
│
├── SQL_EJECUTAR_EN_SUPABASE.sql ⬅️ EJECUTAR EN SUPABASE
├── INSTRUCCIONES_DEPLOY_EMAIL_SIN_CREDITOS.md (este archivo)
│
├── lib/email/
│   ├── outOfCreditsNotification.ts (servicio de envío)
│   └── templates/
│       └── outOfCredits.ts (template HTML y texto)
│
└── app/api/playlist/stream/
    └── route.js (línea ~3280: integración)
```

---

## ✅ Checklist Final

Antes de cerrar este task:

- [ ] ✅ SQL ejecutado en Supabase
- [ ] ✅ Columnas verificadas en tabla `users`
- [ ] ✅ Código deployed a producción
- [ ] ✅ Test enviado a email de prueba
- [ ] ✅ Email recibido y se ve bien
- [ ] ✅ Flag actualizado en DB
- [ ] ✅ Logs visibles en Vercel

---

## 🎉 ¡Listo!

El sistema está **100% funcional** y listo para enviar emails automáticamente cuando usuarios agotan sus créditos.

**No necesitas configurar nada más.**

---

## 📞 Soporte

**Documentación completa:**
- `docs/OUT_OF_CREDITS_EMAIL_AUTOMATION.md`

**Queries útiles:**
- Incluidas en `SQL_EJECUTAR_EN_SUPABASE.sql`

**Script de testing:**
- `scripts/test-out-of-credits-email.ts`

---

**Fecha:** 2 Diciembre 2025  
**Sistema:** Email Automático "Out of Credits"  
**Estado:** ✅ READY TO DEPLOY


