# 🚀 Setup: Automatización "Email Sin Créditos"

Guía rápida para activar el sistema de emails automáticos cuando usuarios agotan sus usos.

## ✅ Checklist de Instalación

### 1. Aplicar Migración en Supabase

```bash
# En el proyecto de Supabase
cd supabase

# Aplicar migración
supabase db push

# O manualmente ejecutar SQL:
# supabase/migrations/20251202_add_out_of_credits_email_flag.sql
```

**Verificar que se agregaron las columnas:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('out_of_credits_email_sent', 'out_of_credits_email_sent_at');
```

### 2. Configurar Variables de Entorno

**✅ No necesitas configurar nuevas variables**

El sistema usa las **MISMAS variables** que los emails de bienvenida:
- `RESEND_API_KEY` (ya configurada)
- `RESEND_FROM` (ya configurada)
- `RESEND_NEWSLETTER_FROM` (fallback, opcional)
- `CONTACT_EMAIL` (reply-to, opcional)
- `SUPABASE_SERVICE_ROLE_KEY` (ya configurada)
- `NEXT_PUBLIC_APP_URL` (ya configurada)

**Si ya envías emails de bienvenida, no necesitas hacer nada aquí.** ✅

### 3. Verificar Resend

1. Ir a [resend.com](https://resend.com)
2. Verificar que el dominio está configurado (DNS: SPF, DKIM)
3. Obtener API key si no la tienes
4. Verificar límite de envíos: Plan gratuito = 100/día, 3000/mes

### 4. Testear Localmente

```bash
# Instalar dependencias si es necesario
npm install

# Probar envío de email de prueba
npm run tsx scripts/test-out-of-credits-email.ts tu-email@example.com
```

**Output esperado:**
```
🧪 Testing Out of Credits Email System

📧 Testing with email: tu-email@example.com

1️⃣  Finding user in database...
   ✅ User found
   📋 User ID: 123...
   
2️⃣  Checking if email should be sent...
   ✅ Should send: true
   
3️⃣  Sending out-of-credits email...
   ✅ Email sent successfully!
   📬 Check your inbox (and spam folder)
   
4️⃣  Verifying database update...
   📮 Email sent flag: true
   📅 Sent at: 2025-12-02T...
   
✨ Test complete!
```

### 5. Verificar en Producción

**Monitorear logs en Vercel:**
```
[STREAM:xxx] ✅ Sent out-of-credits email to user@example.com
```

**Query en Supabase para verificar envíos:**
```sql
SELECT 
  email,
  usage_count,
  max_uses,
  plan,
  out_of_credits_email_sent,
  out_of_credits_email_sent_at
FROM users
WHERE out_of_credits_email_sent = true
ORDER BY out_of_credits_email_sent_at DESC
LIMIT 10;
```

## 🧪 Testing Manual

### Simular usuario sin créditos:

1. **Crear usuario de prueba:**
```sql
INSERT INTO users (email, plan, usage_count, max_uses, out_of_credits_email_sent)
VALUES ('test-nocredits@example.com', 'free', 5, 5, false);
```

2. **Intentar generar playlist:**
   - Login con ese usuario
   - Ir a crear playlist
   - Debería recibir error 403 LIMIT_REACHED
   - Email debería enviarse automáticamente

3. **Verificar email recibido:**
   - Revisar bandeja de entrada
   - Revisar carpeta de spam si no aparece
   - Verificar que diseño se ve bien en mobile y desktop

4. **Verificar flag en DB:**
```sql
SELECT out_of_credits_email_sent, out_of_credits_email_sent_at
FROM users
WHERE email = 'test-nocredits@example.com';
```

### Resetear para re-testear:

```sql
UPDATE users 
SET out_of_credits_email_sent = false, 
    out_of_credits_email_sent_at = null
WHERE email = 'test-nocredits@example.com';
```

## 🔍 Troubleshooting

### Email no se envía

**1. Verificar logs:**
```bash
# Buscar en logs de Vercel
[OUT_OF_CREDITS_EMAIL] 
```

**2. Causas comunes:**
- ✅ Email ya fue enviado antes (revisar flag en DB)
- ✅ Usuario tiene plan unlimited (founder, premium, etc)
- ✅ Usuario aún tiene usos restantes
- ✅ RESEND_API_KEY no configurada
- ✅ Límite de Resend alcanzado

**3. Verificar en Resend Dashboard:**
- Ir a [resend.com/emails](https://resend.com/emails)
- Ver historial de envíos
- Revisar bounces y errores

### Email llega a spam

**1. Verificar configuración DNS:**
```bash
# Verificar SPF
dig TXT playlists.jeylabbb.com

# Verificar DKIM
dig TXT resend._domainkey.playlists.jeylabbb.com
```

**2. Mejorar reputación:**
- Enviar emails solo a usuarios reales
- No enviar a emails bounced
- Incluir unsubscribe link (ya incluido en template)

### Flag no se actualiza

**Revisar logs:**
```
[OUT_OF_CREDITS_EMAIL] Email sent successfully but failed to update flag
```

**Verificar permisos de Supabase:**
- Service role key debe tener acceso de escritura a tabla `users`

## 📊 Métricas a Monitorear

### Tasa de envío
```sql
SELECT 
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE out_of_credits_email_sent_at >= NOW() - INTERVAL '1 day') as last_24h
FROM users
WHERE out_of_credits_email_sent = true;
```

### Tasa de conversión (upgrades después del email)
```sql
SELECT 
  COUNT(*) FILTER (WHERE plan != 'free') * 100.0 / COUNT(*) as conversion_rate_percent
FROM users
WHERE out_of_credits_email_sent = true
  AND out_of_credits_email_sent_at >= NOW() - INTERVAL '7 days';
```

### Tiempo promedio hasta upgrade
```sql
SELECT 
  AVG(
    EXTRACT(EPOCH FROM (updated_at - out_of_credits_email_sent_at)) / 3600
  ) as avg_hours_to_upgrade
FROM users
WHERE out_of_credits_email_sent = true
  AND plan != 'free'
  AND updated_at > out_of_credits_email_sent_at;
```

## 🎯 Siguientes Pasos

Después de validar que funciona:

1. **A/B Testing del contenido:**
   - Probar diferentes subject lines
   - Probar diferentes CTAs
   - Medir conversión

2. **Seguimiento:**
   - Email de recordatorio a los 3 días (opcional)
   - Email cuando amigos se registran con su referral

3. **Analytics:**
   - Integrar con Mixpanel/Amplitude
   - Trackear opens y clicks
   - Medir ROI del email

## 📞 Soporte

Si algo no funciona:
1. Revisar logs en Vercel
2. Revisar dashboard de Resend
3. Verificar query SQL en Supabase
4. Revisar archivo de documentación completo: `docs/OUT_OF_CREDITS_EMAIL_AUTOMATION.md`

---

**¿Dudas?** Contactar al equipo de desarrollo.

