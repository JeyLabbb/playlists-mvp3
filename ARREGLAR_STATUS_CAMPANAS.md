# 🔧 Arreglar Status de Campañas Automáticas

## ⚡ EJECUTAR DESDE TERMINAL (2 comandos)

### 1️⃣ Inicializar "Out of Credits" + Arreglar Status de Todas

```bash
cd /Users/jorgemig/Desktop/JeyLabbb/JL_IA_PLEIA/playlists-mvp

# Inicializar Out of Credits
curl http://localhost:3000/api/admin/newsletter/init-out-of-credits

# Arreglar status de todas las automáticas
curl http://localhost:3000/api/admin/newsletter/fix-automated-campaigns
```

---

## ✅ Resultado Esperado

Todas las campañas automáticas aparecerán como **ACTIVE**:

```
📧 Welcome Founder Pass
   Status: ACTIVE ✅ (antes: SENT)
   Type: Automated
   Category: Welcome

📧 Welcome_Mail
   Status: ACTIVE ✅ (antes: DRAFT)
   Type: Automated
   Category: Welcome

📧 Out of Credits · Automático
   Status: ACTIVE ✅
   Type: Automated
   Category: Retention
```

---

## 📊 Ver en Newsletter HQ

Después de ejecutar los comandos, refresca:

```
http://localhost:3000/admin/newsletter
```

En el tab "Campaigns" deberías ver todas con badge verde **ACTIVE**.

---

## 🎯 Respuesta del Curl

```json
{
  "success": true,
  "message": "✅ Campañas automáticas actualizadas a ACTIVE",
  "updates": [
    {
      "title": "Welcome Founder Pass",
      "status": "updated",
      "previousStatus": "sent",
      "newStatus": "active",
      "category": "welcome"
    },
    {
      "title": "Welcome_Mail",
      "status": "updated",
      "previousStatus": "draft",
      "newStatus": "active",
      "category": "welcome"
    },
    {
      "title": "Out of Credits · Automático",
      "status": "updated",
      "newStatus": "active",
      "category": "retention"
    }
  ]
}
```

---

## 🔄 Alternativa: Ejecutar SQL Directo

Si prefieres ejecutar SQL en Supabase directamente:

**Archivo:** `SQL_FIX_AUTOMATED_CAMPAIGNS_STATUS.sql`

```sql
-- Actualizar todas a ACTIVE
UPDATE newsletter_campaigns
SET status = 'active',
    metadata = COALESCE(metadata, '{}'::jsonb) || '{"type": "automated"}'::jsonb,
    updated_at = NOW()
WHERE title IN ('Welcome Founder Pass', 'Welcome_Mail', 'Out of Credits · Automático');
```

---

## 📋 Comandos Completos

```bash
# 1. Ir al proyecto
cd /Users/jorgemig/Desktop/JeyLabbb/JL_IA_PLEIA/playlists-mvp

# 2. Asegurarse que app está corriendo
# npm run dev (si no está corriendo)

# 3. Inicializar Out of Credits
curl http://localhost:3000/api/admin/newsletter/init-out-of-credits

# 4. Arreglar status de todas
curl http://localhost:3000/api/admin/newsletter/fix-automated-campaigns

# 5. Refrescar Newsletter HQ
open http://localhost:3000/admin/newsletter
```

---

## ✨ Resultado Final

```
Newsletter HQ → Campaigns

📧 Welcome Founder Pass
   ACTIVE ✅ (Type: Automated, Category: Welcome)
   Sent: 0, Opens: 0, Clicks: 0

📧 Welcome_Mail  
   ACTIVE ✅ (Type: Automated, Category: Welcome)
   Sent: 70, Opens: 28, Clicks: X

📧 Out of Credits · Automático
   ACTIVE ✅ (Type: Automated, Category: Retention)
   Sent: 0, Opens: 0, Clicks: 0
```

**Todas con badge verde ACTIVE.** 🎉

---

## 🎯 TL;DR

**Ejecutar:**

```bash
curl http://localhost:3000/api/admin/newsletter/init-out-of-credits && curl http://localhost:3000/api/admin/newsletter/fix-automated-campaigns
```

**Luego refrescar Newsletter HQ.**

---

**¿Ejecutamos?** 🚀


