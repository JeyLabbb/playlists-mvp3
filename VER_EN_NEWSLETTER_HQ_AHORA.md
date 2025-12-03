# 👀 Ver "Out of Credits" en Newsletter HQ AHORA MISMO

## ⚡ Para que aparezca inmediatamente (con 0 sends):

### **Opción 1: Script Automático**

```bash
cd /Users/jorgemig/Desktop/JeyLabbb/JL_IA_PLEIA/playlists-mvp
bash INICIALIZAR_WORKFLOW.sh
```

Este script:
1. Hace deploy del endpoint
2. Espera 90 segundos
3. Inicializa workflow y campaña
4. Muestra resultado

---

### **Opción 2: Manual (Más Rápido si ya hiciste deploy)**

#### Paso 1: Deploy primero

```bash
cd /Users/jorgemig/Desktop/JeyLabbb/JL_IA_PLEIA/playlists-mvp
git add .
git commit -m "feat: endpoint inicializar workflow out of credits"
git push origin main
```

Esperar 1-2 minutos...

#### Paso 2: Inicializar workflow

```bash
curl https://playlists.jeylabbb.com/api/admin/newsletter/init-out-of-credits
```

O en navegador:
```
https://playlists.jeylabbb.com/api/admin/newsletter/init-out-of-credits
```

#### Paso 3: Ver Newsletter HQ

```
https://playlists.jeylabbb.com/admin/newsletter
```

---

## 📊 Lo Que Verás

### Tab "Workflows":

```
🔄 Out of Credits · Automático ✅
   Status: Activo
   Tipo: Automático
   Trigger: out_of_credits
   Steps: 1
```

### Tab "Campaigns":

```
📧 Out of Credits · Automático
   Type: Automated
   Category: Retention
   Status: Active
   
   Stats:
   - Sent: 0
   - Opens: 0
   - Clicks: 0
   - Conversions: 0
```

**Aparecerá con todo en 0, pero VISIBLE.** ✅

---

## 🔍 Verificar en Local (Desarrollo)

Si estás en local y quieres probarlo en dev:

```bash
# Terminal 1: Arrancar app
cd /Users/jorgemig/Desktop/JeyLabbb/JL_IA_PLEIA/playlists-mvp
npm run dev

# Terminal 2: Inicializar
curl http://localhost:3000/api/admin/newsletter/init-out-of-credits
```

Luego ve a:
```
http://localhost:3000/admin/newsletter
```

---

## ✅ Respuesta Esperada

```json
{
  "success": true,
  "message": "✅ Workflow y Campaña inicializados correctamente",
  "workflow": {
    "id": "xxx-xxx-xxx",
    "name": "Out of Credits · Automático",
    "status": "active",
    "trigger": "automatic",
    "created": "new"
  },
  "campaign": {
    "id": "yyy-yyy-yyy",
    "name": "Out of Credits · Automático",
    "slug": "out-of-credits-automatic",
    "status": "active",
    "type": "automated",
    "category": "retention",
    "tracking": true,
    "workflow_id": "xxx-xxx-xxx",
    "created": "new"
  },
  "recipients": {
    "total": 0
  },
  "links": {
    "newsletterHQ": "https://playlists.jeylabbb.com/admin/newsletter",
    "workflows": "https://playlists.jeylabbb.com/admin/newsletter?tab=workflows",
    "campaigns": "https://playlists.jeylabbb.com/admin/newsletter?tab=campaigns"
  }
}
```

---

## 🎯 TL;DR

**Ejecutar:**

```bash
cd /Users/jorgemig/Desktop/JeyLabbb/JL_IA_PLEIA/playlists-mvp
git add . && git commit -m "feat: init workflow" && git push origin main
# Esperar 2 minutos
curl https://playlists.jeylabbb.com/api/admin/newsletter/init-out-of-credits
# Abrir: https://playlists.jeylabbb.com/admin/newsletter
```

**Resultado:**
- ✅ Workflow visible en tab "Workflows"
- ✅ Campaign visible en tab "Campaigns"
- ✅ Todo con 0 sends (normal)
- ✅ Status: Active

---

## 📝 Notas

- El workflow/campaña se crean la **primera vez** que llamas al endpoint
- Llamadas subsecuentes dirán "already exists"
- Es **idempotente** (puedes llamarlo múltiples veces sin problema)
- Solo crea las estructuras, no envía emails

---

**¿Ejecutamos?** 🚀


