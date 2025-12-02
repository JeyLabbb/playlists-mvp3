# ⏰ CONFIGURACIÓN DE VERCEL CRON - PASO A PASO

## 🎯 Objetivo
Configurar Vercel Cron para que evalúe automáticamente los A/B tests y envíe el asunto ganador al 50% restante de destinatarios.

---

## 📋 PASOS A SEGUIR

### **PASO 1: Configurar Variable de Entorno en Vercel**

1. Ve a tu proyecto en **Vercel Dashboard**: https://vercel.com/dashboard
2. Selecciona tu proyecto (playlists-mvp o similar)
3. Click en **Settings** (arriba)
4. En el menú izquierdo, click en **Environment Variables**
5. Click en **Add New**
6. Añade:
   - **Name**: `CRON_SECRET`
   - **Value**: Genera un secreto seguro (ejemplo: `pleia_cron_2024_abc123xyz789`)
   - **Environment**: Marca todas (Production, Preview, Development)
7. Click en **Save**

**💡 Tip para generar un secreto seguro:**
```bash
# En tu terminal local
openssl rand -base64 32
```

---

### **PASO 2: El archivo `vercel.json` ya está actualizado**

Ya incluye:
```json
{
  "crons": [
    {
      "path": "/api/cron/ab-test-evaluator",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

**Significado del schedule:**
- `*/15 * * * *` = Cada 15 minutos
- Formato: `minuto hora día mes día_semana`

**Opciones de frecuencia:**
```
*/5 * * * *    → Cada 5 minutos (más frecuente)
*/15 * * * *   → Cada 15 minutos (recomendado)
*/30 * * * *   → Cada 30 minutos
0 * * * *      → Cada hora en punto
0 */2 * * *    → Cada 2 horas
```

---

### **PASO 3: Deploy a Vercel**

```bash
# En tu terminal
cd /Users/jorgemig/Desktop/JeyLabbb/JL_IA_PLEIA/playlists-mvp

# Añadir cambios
git add .

# Commit
git commit -m "Add A/B testing with automatic winner selection"

# Push (Vercel se desplegará automáticamente)
git push
```

---

### **PASO 4: Verificar que el Cron está activo**

1. Ve a Vercel Dashboard → Tu proyecto
2. Click en **Cron Jobs** (en el menú superior o lateral)
3. Deberías ver:
   ```
   /api/cron/ab-test-evaluator
   Schedule: */15 * * * *
   Status: Active ✅
   ```

Si no aparece, espera 1-2 minutos después del deploy.

---

### **PASO 5: Probar manualmente el endpoint**

```bash
# Reemplaza con tu dominio y tu CRON_SECRET
curl -X GET \
  -H "Authorization: Bearer pleia_cron_2024_abc123xyz789" \
  https://tu-dominio.vercel.app/api/cron/ab-test-evaluator
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "checked": 3,
  "evaluated": 1,
  "pending": 2,
  "timestamp": "2024-12-02T15:30:00.000Z"
}
```

**Si da error 401:**
- Verifica que el `CRON_SECRET` coincida exactamente
- Asegúrate de incluir `Bearer` en el header

---

## 📊 Verificar Logs del Cron

### En Vercel Dashboard:
1. Tu proyecto → **Deployments**
2. Click en el deployment más reciente
3. **Functions** → Busca `ab-test-evaluator`
4. Click para ver logs de ejecución

### Lo que deberías ver:
```
[CRON] Campaign abc-123 not ready yet (120 minutes remaining)
[CRON] Evaluating A/B test for campaign xyz-456 (Welcome Mail)
[CRON] ✅ Evaluated campaign xyz-456. Winner: A
[A/B TEST] Sent winner (A) to 250 holdout recipients
```

---

## 🔧 Troubleshooting

### ❌ Error: "Unauthorized"
**Causa**: El `CRON_SECRET` no coincide o no está configurado

**Solución:**
1. Verifica en Vercel → Settings → Environment Variables
2. Asegúrate que `CRON_SECRET` existe
3. Redeploy el proyecto para que tome la nueva variable

---

### ❌ Cron no aparece en Dashboard
**Causa**: El `vercel.json` no se leyó correctamente

**Solución:**
1. Verifica que `vercel.json` está en la raíz del proyecto
2. Verifica que el JSON es válido (sin errores de sintaxis)
3. Haz un nuevo commit y push
4. Espera 1-2 minutos

---

### ❌ A/B tests no se evalúan
**Causa**: Puede ser que el tiempo aún no haya pasado

**Solución:**
1. Verifica en Supabase:
```sql
SELECT 
  id,
  title,
  created_at,
  test_duration,
  test_duration_unit,
  ab_test_evaluated_at
FROM newsletter_campaigns
WHERE ab_test_enabled = true
ORDER BY created_at DESC;
```

2. Calcula si ya pasó el tiempo:
   - created_at + (test_duration * 60 minutos si hours, * 1440 si days)
   - Si aún no pasó, el cron dirá "not ready yet"

3. Para testar inmediatamente:
```bash
curl -X POST \
  https://tu-dominio.vercel.app/api/admin/newsletter/ab-test-evaluate \
  -H "Content-Type: application/json" \
  -d '{"campaignId": "tu-campaign-id"}'
```

---

## 🎓 Ejemplo Completo

### 1. Crear campaña con A/B test:
- Ir a Newsletter HQ → Campañas
- Activar "A/B Testing"
- Asunto A: "🎉 Descubre las nuevas funciones"
- Asunto B: "👋 PLEIA tiene novedades para ti"
- Duración: 24 horas
- Criterio: "Más aperturas"
- Enviar

### 2. Lo que sucede:
- ✅ **Inmediatamente**: 25% recibe asunto A, 25% recibe asunto B
- ⏰ **Después de 24h**: El cron evalúa cuál tuvo más aperturas
- 📧 **Automáticamente**: El 50% restante recibe el asunto ganador

### 3. Ver resultados:
- Ir a **Tracking**
- Buscar la campaña
- Ver métricas de variantes A y B
- Ver qué asunto ganó

---

## 📈 Monitoreo Continuo

### Ver próximas evaluaciones:
```sql
SELECT 
  c.id,
  c.title,
  c.created_at,
  c.test_duration,
  c.test_duration_unit,
  c.created_at + (
    c.test_duration * interval '1 hour' * 
    CASE WHEN c.test_duration_unit = 'days' THEN 24 ELSE 1 END
  ) as should_evaluate_at,
  c.ab_test_evaluated_at
FROM newsletter_campaigns c
WHERE c.ab_test_enabled = true
  AND c.ab_test_evaluated_at IS NULL
ORDER BY c.created_at DESC;
```

### Verificar ejecuciones del cron:
En Vercel → Functions → `ab-test-evaluator` → Ver logs

---

## ✅ Checklist Final

- [ ] `CRON_SECRET` configurado en Vercel
- [ ] `vercel.json` actualizado con cron job
- [ ] Proyecto deployado en Vercel
- [ ] Cron visible en Vercel Dashboard → Cron Jobs
- [ ] Test manual del endpoint exitoso
- [ ] SQL ejecutado en Supabase
- [ ] Primera campaña con A/B test creada
- [ ] Logs del cron revisados

---

## 🎉 ¡Listo!

Una vez completados todos los pasos, el sistema es **completamente automático**:

1. Creas una campaña con A/B test
2. Se envía automáticamente a los grupos A y B
3. El cron revisa cada 15 minutos si ya pasó el tiempo
4. Evalúa el ganador automáticamente
5. Envía al grupo holdout con el asunto ganador
6. Todo sin intervención manual

**Sistema de Newsletter de nivel enterprise** 🚀✨

