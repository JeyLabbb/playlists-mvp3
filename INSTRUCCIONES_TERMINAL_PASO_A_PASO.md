# 📋 Comandos Terminal: Email "Out of Credits" con Tracking

## ⚡ Opción A: Script Automático (Recomendado)

### 1. Ejecutar script completo

```bash
cd /Users/jorgemig/Desktop/JeyLabbb/JL_IA_PLEIA/playlists-mvp
chmod +x COMANDOS_COMPLETOS_TERMINAL.sh
./COMANDOS_COMPLETOS_TERMINAL.sh
```

El script hace todo automáticamente:
- ✅ Deploy del código
- ✅ Espera el deploy
- ✅ Envía el email de prueba
- ✅ Muestra los resultados
- ✅ Opcionalmente elimina el endpoint de prueba

---

## 🔧 Opción B: Comandos Manuales Paso a Paso

### 1️⃣ Ir al proyecto

```bash
cd /Users/jorgemig/Desktop/JeyLabbb/JL_IA_PLEIA/playlists-mvp
```

### 2️⃣ Ver estado actual

```bash
git status
```

### 3️⃣ Agregar cambios

```bash
git add .
```

### 4️⃣ Hacer commit

```bash
git commit -m "feat: email out of credits con tracking completo en Newsletter HQ"
```

### 5️⃣ Deploy a producción

```bash
git push origin main
```

**⏳ ESPERAR 1-2 minutos** a que Vercel termine el deploy.

Puedes ver el progreso en:
```
https://vercel.com/dashboard
```

### 6️⃣ Enviar email de prueba

```bash
curl https://playlists.jeylabbb.com/api/test-send-out-of-credits-email
```

O abre en el navegador:
```
https://playlists.jeylabbb.com/api/test-send-out-of-credits-email
```

### 7️⃣ Ver respuesta (con formato)

```bash
curl -s https://playlists.jeylabbb.com/api/test-send-out-of-credits-email | python3 -m json.tool
```

Deberías ver:
```json
{
  "success": true,
  "message": "✅ Email enviado exitosamente con tracking completo",
  "email": "jeylabbb@gmail.com",
  "campaignId": "xxx-xxx-xxx",
  "recipientId": "yyy-yyy-yyy",
  "newsletterHQ": "https://playlists.jeylabbb.com/admin/newsletter"
}
```

### 8️⃣ Verificar en Newsletter HQ

Abre en navegador:
```
https://playlists.jeylabbb.com/admin/newsletter
```

Busca la campaña: **"Out of Credits · Automatic"**

Deberías ver:
- ✅ Email enviado a jeylabbb@gmail.com
- 📊 Status: Sent
- 🔍 Tracking activo

### 9️⃣ Revisar email

Abre tu email: **jeylabbb@gmail.com**

**Asunto:** "Te has quedado sin playlists IA… pero tengo algo para ti."

Si no aparece en inbox, revisa **spam**.

### 🔟 Verificar tracking (después de abrir el email)

Vuelve a Newsletter HQ y deberías ver:
- ✅ Email abierto (green badge)
- 🖱️ Clicks si haces click en "Quiero playlists ilimitadas"

---

## 🗑️ PASO FINAL: Eliminar endpoint de prueba

### Después de confirmar que funciona:

```bash
cd /Users/jorgemig/Desktop/JeyLabbb/JL_IA_PLEIA/playlists-mvp
rm -rf app/api/test-send-out-of-credits-email
git add .
git commit -m "chore: eliminar endpoint de prueba"
git push origin main
```

---

## 📊 Verificar en Supabase (Opcional)

### Ver campaña creada:

```sql
SELECT 
  id,
  name,
  slug,
  subject,
  status,
  created_at
FROM newsletter_campaigns
WHERE slug = 'out-of-credits-automatic';
```

### Ver recipients:

```sql
SELECT 
  r.id,
  r.email,
  r.status,
  r.sent_at,
  c.name as campaign_name
FROM newsletter_campaign_recipients r
JOIN newsletter_campaigns c ON c.id = r.campaign_id
WHERE c.slug = 'out-of-credits-automatic'
ORDER BY r.created_at DESC;
```

### Ver eventos de tracking:

```sql
SELECT 
  e.event_type,
  e.occurred_at,
  r.email,
  c.name as campaign_name
FROM newsletter_events e
JOIN newsletter_campaigns c ON c.id = e.campaign_id
JOIN newsletter_campaign_recipients r ON r.id = e.recipient_id
WHERE c.slug = 'out-of-credits-automatic'
ORDER BY e.occurred_at DESC;
```

---

## 🎯 Resumen Ejecutivo

```bash
# 1. Deploy
cd /Users/jorgemig/Desktop/JeyLabbb/JL_IA_PLEIA/playlists-mvp
git add .
git commit -m "feat: email out of credits con tracking"
git push origin main

# 2. Esperar 1-2 min

# 3. Enviar email
curl https://playlists.jeylabbb.com/api/test-send-out-of-credits-email

# 4. Ver Newsletter HQ
# https://playlists.jeylabbb.com/admin/newsletter

# 5. Revisar email en jeylabbb@gmail.com

# 6. Eliminar endpoint
rm -rf app/api/test-send-out-of-credits-email
git add . && git commit -m "chore: cleanup" && git push
```

---

## ✨ Lo Que Vas a Ver

### En Newsletter HQ:
- 📊 Campaña: "Out of Credits · Automatic"
- 📧 Email enviado a: jeylabbb@gmail.com
- ✅ Status: Sent
- 📈 Analytics:
  - Opens (cuando abras el email)
  - Clicks (cuando hagas click en el CTA)
  - Conversiones

### En tu Email:
- 📧 Asunto: "Te has quedado sin playlists IA… pero tengo algo para ti."
- 🎨 Diseño con branding PLEIA
- 📱 Responsive
- 🔗 CTA: "Quiero playlists ilimitadas" → /pricing
- 👤 Firmado por: MTRYX

### En Supabase:
- ✅ Columna `out_of_credits_email_sent = true`
- ✅ Timestamp en `out_of_credits_email_sent_at`
- ✅ Contact creado en `newsletter_contacts`
- ✅ Campaign en `newsletter_campaigns`
- ✅ Recipient en `newsletter_campaign_recipients`
- ✅ Events en `newsletter_events`

---

## 🐛 Troubleshooting

### Email no llega:

```bash
# Ver logs en Vercel
# https://vercel.com/dashboard → Logs

# Buscar:
[OUT_OF_CREDITS_TRACKING]
```

### Error en curl:

```bash
# Ver respuesta completa
curl -v https://playlists.jeylabbb.com/api/test-send-out-of-credits-email
```

### Newsletter HQ no muestra la campaña:

```sql
-- Verificar en Supabase
SELECT * FROM newsletter_campaigns 
WHERE slug = 'out-of-credits-automatic';
```

---

**¿Todo claro? Ejecuta los comandos y el sistema funcionará automáticamente.** 🚀

