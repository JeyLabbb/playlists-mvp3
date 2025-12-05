# 🔄 Sistema de Cron para Newsletter - PLEIA

## ✅ Configuración Implementada

### 📁 Archivos Creados/Modificados

1. **`/app/api/cron/newsletter-processor/route.ts`** (NUEVO)
   - Endpoint unificado que procesa:
     - ✅ Campañas programadas
     - ✅ Evaluación de A/B tests

2. **`vercel.json`** (ACTUALIZADO)
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/newsletter-processor",
         "schedule": "0 19 * * *"
       }
     ]
   }
   ```
   > Nota: `0 19 * * *` = 19:00 UTC = **20:00 hora España** (invierno)

3. **UI de Newsletter** (ACTUALIZADA)
   - Programación de campañas: Solo permite elegir fecha (la hora es fija: 20:00 UTC)
   - A/B Testing: Muestra claramente que la evaluación es a las 20:00 UTC

---

## ⏰ Horario del Cron

| Zona Horaria | Hora de Ejecución |
|--------------|-------------------|
| **UTC** | 19:00 |
| **España (Invierno)** | **20:00** ✅ |
| **España (Verano)** | 21:00 |
| **México Ciudad** | 13:00 |
| **Argentina** | 16:00 |

> ⚠️ **Nota sobre horario de verano**: En verano (marzo-octubre), España usa UTC+2, por lo que el cron se ejecutará a las 21:00. Si quieres mantener siempre las 20:00, necesitarías cambiar el cron manualmente 2 veces al año.

---

## 🔧 Configuración Necesaria en Vercel

### 1. Variable de Entorno CRON_SECRET

Ve a **Vercel Dashboard > Tu Proyecto > Settings > Environment Variables** y añade:

```
CRON_SECRET=tu-secreto-seguro-aqui-12345
```

> ⚠️ **IMPORTANTE**: Genera un string aleatorio seguro. Vercel usará este valor automáticamente para autorizar las llamadas al cron.

### 2. Verificar vercel.json

El archivo `vercel.json` ya está configurado. Al hacer deploy, Vercel detectará automáticamente la configuración del cron.

### 3. Después del Deploy

1. Ve a **Vercel Dashboard > Tu Proyecto > Settings > Crons**
2. Deberías ver el cron `/api/cron/newsletter-processor` listado
3. El estado debería ser "Active"

---

## 📊 Qué Hace el Cron

Cada día a las 20:00 UTC, el cron ejecuta:

### 1. Envío de Campañas Programadas
```
- Busca campañas con status = 'scheduled'
- Cuya fecha scheduledFor sea <= hoy
- Las envía y actualiza su status a 'sent'
```

### 2. Evaluación de A/B Tests
```
- Busca campañas con ab_test_enabled = true
- Cuyo ab_test_evaluated_at sea NULL
- Cuyo tiempo de test haya expirado
- Evalúa el ganador y envía al 50% restante
```

---

## 💰 Precios y Límites de Vercel

### Plan Hobby (GRATIS)
| Característica | Límite |
|----------------|--------|
| Cron Jobs | 2 por proyecto |
| Frecuencia mínima | **1 vez al día** |
| Invocaciones | 500K/mes |
| Funciones | 100GB-hrs |

### Plan Pro ($20/mes por miembro)
| Característica | Límite |
|----------------|--------|
| Cron Jobs | **40 por proyecto** |
| Frecuencia mínima | **Cada minuto** |
| Invocaciones | 1M/mes (luego $0.60/1M) |
| Funciones | 1000GB-hrs (luego $0.18/GB-hr) |
| Soporte | Email priority |

### Plan Enterprise (Precio personalizado)
| Característica | Límite |
|----------------|--------|
| Cron Jobs | **Ilimitados** |
| Frecuencia mínima | Cada minuto |
| Invocaciones | Personalizado |
| Soporte | 24/7, SLA garantizado |

---

## 🎯 ¿Qué Plan Necesitas?

### Con Plan Hobby (Gratis) ✅
- ✅ 1 cron diario a las 20:00 UTC
- ✅ Perfecto para tus necesidades actuales
- ✅ Suficiente para envíos programados + A/B tests
- ⚠️ **Limitación**: No puedes ejecutar crons cada hora/minuto

### Con Plan Pro ($20/mes) 🚀
- ✅ Hasta 40 crons por proyecto
- ✅ Puedes ejecutar **cada minuto** si quieres
- ✅ Podrías tener:
  - Cron cada hora para emails más inmediatos
  - Cron cada 15 min para A/B tests con evaluación rápida
  - Cron para limpieza de datos
  - Cron para reportes automáticos
- ✅ Más invocaciones y GB-hrs de funciones
- ✅ Soporte prioritario

### Ejemplo de crons con Pro:
```json
{
  "crons": [
    {
      "path": "/api/cron/newsletter-processor",
      "schedule": "0 * * * *"  // Cada hora
    },
    {
      "path": "/api/cron/ab-test-quick-eval",
      "schedule": "*/15 * * * *"  // Cada 15 minutos
    },
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 3 * * *"  // 3 AM diario
    }
  ]
}
```

---

## 🧪 Probar el Cron Manualmente

### Desde la Terminal (curl)
```bash
curl -X GET "https://tu-dominio.vercel.app/api/cron/newsletter-processor" \
  -H "Authorization: Bearer TU_CRON_SECRET"
```

### Desde el Panel Admin
El endpoint también acepta POST, así que podrías crear un botón en el admin para ejecutar manualmente:

```typescript
const runCronManually = async () => {
  const response = await fetch('/api/cron/newsletter-processor', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CRON_SECRET}`
    }
  });
  const result = await response.json();
  console.log(result);
};
```

---

## 📝 Logs del Cron

Los logs del cron aparecen en:
1. **Vercel Dashboard > Tu Proyecto > Logs**
2. Filtra por `/api/cron/newsletter-processor`

Ejemplo de output exitoso:
```json
{
  "success": true,
  "timestamp": "2024-12-02T20:00:01.234Z",
  "scheduledCampaigns": {
    "processed": 2,
    "sent": 2,
    "errors": []
  },
  "abTests": {
    "checked": 1,
    "evaluated": 1,
    "errors": []
  },
  "executionTimeMs": 4523
}
```

---

## ⚠️ Importante: Restricciones de la UI

La UI ahora **informa claramente** de las restricciones:

### Campañas Programadas
- Solo puedes elegir la **fecha** (no la hora)
- Se enviarán automáticamente a las **20:00 UTC** de ese día
- Mensaje informativo visible en el formulario

### A/B Testing
- Duración en **días** (no horas)
- Se evalúa a las **20:00 UTC** del día correspondiente
- Mensaje informativo visible en el formulario

---

## 🚀 Deploy Checklist

- [ ] Añadir `CRON_SECRET` en Vercel Environment Variables
- [ ] Hacer deploy del proyecto
- [ ] Verificar que el cron aparece en Settings > Crons
- [ ] Probar manualmente con curl
- [ ] Verificar logs después de la primera ejecución (20:00 UTC)

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Vercel Dashboard
2. Verifica que `CRON_SECRET` esté configurado
3. Comprueba que el endpoint responde manualmente
4. Revisa que las campañas tengan status 'scheduled' y fecha correcta

