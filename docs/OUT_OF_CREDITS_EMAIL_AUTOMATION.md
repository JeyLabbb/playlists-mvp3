# Automatización: Email "Sin Créditos" (Out of Credits)

## 📋 Descripción

Sistema automático que envía un email personalizado a los usuarios cuando intentan generar una playlist sin usos restantes por primera vez.

## 🎯 Objetivo

Retener usuarios que han agotado sus créditos gratuitos, ofreciéndoles dos opciones claras para continuar:
1. **Invitar a 3 amigos** → Acceso ilimitado gratis
2. **Ser Founder por 5€** → Acceso ilimitado de por vida

## ✨ Características

- ✅ **Envío único**: El email se envía solo la primera vez que un usuario intenta generar con 0 usos
- ✅ **No bloqueante**: El envío es asíncrono y no afecta la respuesta del API
- ✅ **Tracking en DB**: Se registra en Supabase cuando el email fue enviado
- ✅ **Diseño branded**: Email con branding sutil de PLEIA, priorizando el texto
- ✅ **Tono conversacional**: Mensaje directo y personal de los fundadores

## 🏗️ Arquitectura

### 1. Base de Datos (Supabase)

**Nueva columna en tabla `users`:**
```sql
-- Flag para tracking
out_of_credits_email_sent BOOLEAN DEFAULT FALSE

-- Timestamp del envío
out_of_credits_email_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
```

**Migración:** `supabase/migrations/20251202_add_out_of_credits_email_flag.sql`

### 2. Template del Email

**Ubicación:** `lib/email/templates/outOfCredits.ts`

**Funciones:**
- `generateOutOfCreditsEmailHTML()`: Versión HTML con diseño completo
- `generateOutOfCreditsEmailText()`: Versión texto plano

**Características del diseño:**
- Branding PLEIA sutil (colores #22f6ce, #04070d)
- Responsive (mobile-friendly)
- Dos opciones claramente destacadas
- CTA prominente: "Quiero playlists ilimitadas"
- Firma de MTRYX (fundadores)

### 3. Servicio de Envío

**Ubicación:** `lib/email/outOfCreditsNotification.ts`

**Funciones principales:**

```typescript
sendOutOfCreditsEmail(userId: string, userEmail: string): Promise<OutOfCreditsEmailResult>
```
- Verifica que el email no haya sido enviado antes
- Genera el contenido del email
- Envía vía Resend
- Actualiza flag en base de datos

```typescript
shouldSendOutOfCreditsEmail(userId: string): Promise<boolean>
```
- Verifica si el usuario debería recibir el email
- Chequea: email no enviado + 0 usos restantes + no es plan unlimited

### 4. Integración en API

**Ubicación:** `app/api/playlist/stream/route.js`

**Punto de integración:** Línea ~3280, cuando se detecta `LIMIT_REACHED`

```javascript
if (!isUnlimited && typeof remaining === 'number' && remaining <= 0) {
  // Envío asíncrono del email (no bloquea la respuesta)
  (async () => {
    const { sendOutOfCreditsEmail } = await import('...');
    await sendOutOfCreditsEmail(pleiaUser.id, pleiaUser.email);
  })();
  
  return NextResponse.json({ code: "LIMIT_REACHED", ... });
}
```

## 🔄 Flujo de Trabajo

```
1. Usuario intenta generar playlist
   ↓
2. Sistema verifica uso (usageV2.ts)
   ↓
3. remaining = 0?
   ↓ SÍ
4. Retornar error 403 LIMIT_REACHED
   +
5. [ASYNC] Verificar si email ya fue enviado
   ↓ NO
6. Enviar email vía Resend
   ↓
7. Actualizar flag out_of_credits_email_sent = true
   ↓
8. Usuario recibe email en su bandeja
```

## 📧 Contenido del Email

**Asunto:**
```
Te has quedado sin playlists IA… pero tengo algo para ti.
```

**Puntos clave del mensaje:**
- Empatía: "Sé que jode quedarse justo en lo mejor"
- Valor: "Te ahorra tiempo, te inspira, y te crea playlists que tú no podrías hacer"
- Urgencia: "Solo los primeros miles tendrán acceso ilimitado"
- Opciones claras: Invitar amigos (gratis) o Founder (5€)
- CTA directo: Botón a `/pricing`

**Tono:** Directo, honesto, conversacional, sin agresividad comercial

## 🧪 Testing

### Desarrollo Local

1. **Preparar base de datos:**
```bash
# Aplicar migración
cd supabase
supabase db push
```

2. **Variables de entorno necesarias:**
```env
RESEND_API_KEY=re_xxxxx
RESEND_FROM="PLEIA <noreply@playlists.jeylabbb.com>"
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=xxxxx
```

3. **Test manual:**
```bash
# 1. Crear usuario de prueba con 0 usos
# 2. Intentar generar playlist
# 3. Verificar:
#    - Respuesta 403 LIMIT_REACHED
#    - Email recibido en bandeja
#    - Flag actualizado en DB
```

### Verificación en Supabase

```sql
-- Ver usuarios que han recibido el email
SELECT 
  email, 
  usage_count, 
  max_uses, 
  out_of_credits_email_sent,
  out_of_credits_email_sent_at
FROM users
WHERE out_of_credits_email_sent = true
ORDER BY out_of_credits_email_sent_at DESC;
```

### Logs a Monitorear

```bash
# Envío exitoso
[STREAM:xxx] ✅ Sent out-of-credits email to user@example.com

# Email ya enviado (esperado)
[STREAM:xxx] ℹ️ Out-of-credits email not sent: already_sent

# Error en envío (requiere investigación)
[STREAM:xxx] ❌ Failed to send out-of-credits email: [reason]
```

## 🚀 Deployment

### Checklist Pre-Deploy

- [ ] Migración aplicada en Supabase production
- [ ] Variables de entorno configuradas en Vercel:
  - `RESEND_API_KEY`
  - `RESEND_FROM`
  - `NEXT_PUBLIC_APP_URL`
- [ ] Email template testeado en sandbox
- [ ] Verificar dominio en Resend (SPF, DKIM)

### Post-Deploy

1. Monitorear logs en Vercel
2. Verificar envíos en Resend dashboard
3. Tracking en Supabase: rate de conversión después del email

## 📊 Métricas Clave

Para evaluar efectividad:

```sql
-- Tasa de conversión post-email
SELECT 
  COUNT(*) FILTER (WHERE plan != 'free') * 100.0 / COUNT(*) as conversion_rate
FROM users
WHERE out_of_credits_email_sent = true
  AND out_of_credits_email_sent_at >= NOW() - INTERVAL '30 days';

-- Tiempo promedio hasta conversión
SELECT 
  AVG(
    EXTRACT(EPOCH FROM (updated_at - out_of_credits_email_sent_at)) / 3600
  ) as avg_hours_to_conversion
FROM users
WHERE out_of_credits_email_sent = true
  AND plan != 'free'
  AND updated_at > out_of_credits_email_sent_at;
```

## 🔧 Mantenimiento

### Resetear flag para testing

```sql
-- Resetear para un usuario específico (testing)
UPDATE users 
SET 
  out_of_credits_email_sent = false,
  out_of_credits_email_sent_at = null
WHERE email = 'test@example.com';
```

### Actualizar contenido del email

Solo editar: `lib/email/templates/outOfCredits.ts`
No requiere deploy de base de datos.

## ⚠️ Consideraciones

1. **Rate limiting**: Resend tiene límite de envíos. Monitorear.
2. **Spam**: Email diseñado para no parecer spam, pero monitorear reportes
3. **GDPR**: Usuario debe poder darse de baja (link en footer del email)
4. **Testing**: Nunca testear con emails reales de usuarios

## 📞 Soporte

Si un usuario reporta no haber recibido el email:

1. Verificar flag en DB
2. Revisar logs de Resend
3. Verificar carpeta de spam
4. Si es necesario, resetear flag y pedir retry

---

**Última actualización:** 2 Diciembre 2025  
**Versión:** 1.0  
**Responsable:** MTRYX Team

