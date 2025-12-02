# ⚡ Probar en Local AHORA MISMO

## 🚀 Comandos (Copy & Paste)

### Si tu servidor dev YA está corriendo:

```bash
cd /Users/jorgemig/Desktop/JeyLabbb/JL_IA_PLEIA/playlists-mvp
curl http://localhost:3000/api/admin/newsletter/init-out-of-credits
```

---

### Si NO está corriendo:

**Terminal 1:**
```bash
cd /Users/jorgemig/Desktop/JeyLabbb/JL_IA_PLEIA/playlists-mvp
npm run dev
```

**Terminal 2 (nueva ventana):**
```bash
cd /Users/jorgemig/Desktop/JeyLabbb/JL_IA_PLEIA/playlists-mvp
sleep 5
curl http://localhost:3000/api/admin/newsletter/init-out-of-credits
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
    "trigger": "automatic"
  },
  "campaign": {
    "id": "yyy-yyy-yyy",
    "title": "Out of Credits · Automático",
    "slug": "out-of-credits-automatic",
    "status": "active"
  },
  "recipients": {
    "total": 0
  }
}
```

---

## 👀 Ver en Newsletter HQ

Abre en tu navegador:

```
http://localhost:3000/admin/newsletter
```

Deberías ver:

### Tab "Workflows":
```
🔄 Out of Credits · Automático ✅
   Status: Activo
   Tipo: Automático
```

### Tab "Campaigns":
```
📧 Out of Credits · Automático
   Status: Active
   Sent: 0  ← Normal, aún no se ha enviado
   Opens: 0
   Clicks: 0
```

---

## 🐛 Si da error

Ver el error completo:
```bash
curl http://localhost:3000/api/admin/newsletter/init-out-of-credits | python3 -m json.tool
```

Revisar logs de la app en la terminal donde corre `npm run dev`.

---

## ✨ Una vez funcione en local:

Deploy a producción:

```bash
git add .
git commit -m "feat: workflow out of credits en Newsletter HQ"
git push origin main
```

Luego en producción:
```bash
curl https://playlists.jeylabbb.com/api/admin/newsletter/init-out-of-credits
```

---

**¡Prueba ahora en local!** 🚀

