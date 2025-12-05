# ⏰ Configuración de Vercel Cron para A/B Testing

## ¿Qué hace el Cron Job?

El cron job ejecuta automáticamente la evaluación de A/B tests cuando llega el momento de determinar el ganador y enviar el mail al grupo holdout (50% restante).

## Método 1: Vercel Cron (Recomendado para Producción)

### 1. Crear archivo `vercel.json` (ya existe, actualizar):

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

**Explicación del schedule:**
- `*/15 * * * *` = Cada 15 minutos
- Puedes ajustarlo según tus necesidades:
  - `*/5 * * * *` = Cada 5 minutos (más frecuente)
  - `*/30 * * * *` = Cada 30 minutos
  - `0 * * * *` = Cada hora en punto

### 2. Crear endpoint `/app/api/cron/ab-test-evaluator/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getNewsletterAdminClient } from '@/lib/newsletter/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verificar cron secret (seguridad)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await getNewsletterAdminClient();
    
    // Buscar campañas con A/B test pendientes de evaluar
    const { data: campaigns, error } = await supabase
      .from('newsletter_campaigns')
      .select('*')
      .eq('ab_test_enabled', true)
      .is('ab_test_evaluated_at', null)
      .lte('scheduled_for', new Date().toISOString());
    
    if (error) throw error;

    let evaluatedCount = 0;

    for (const campaign of campaigns || []) {
      // Calcular si ya pasó el tiempo del test
      const testStartedAt = new Date(campaign.created_at);
      const durationMs = campaign.test_duration * (campaign.test_duration_unit === 'days' ? 24 : 1) * 60 * 60 * 1000;
      const shouldEvaluateAt = new Date(testStartedAt.getTime() + durationMs);

      if (new Date() >= shouldEvaluateAt) {
        // Evaluar este A/B test
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/newsletter/ab-test-evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId: campaign.id }),
        });

        if (response.ok) {
          evaluatedCount++;
          console.log(`[CRON] Evaluated A/B test for campaign ${campaign.id}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      checked: campaigns?.length || 0,
      evaluated: evaluatedCount,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[CRON] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### 3. Añadir variable de entorno en Vercel:

```bash
CRON_SECRET=tu_secreto_super_seguro_aqui_12345
```

**Cómo añadirlo:**
1. Ve a tu proyecto en Vercel Dashboard
2. Settings → Environment Variables
3. Añade `CRON_SECRET` con un valor seguro aleatorio

### 4. Desplegar a Vercel:

```bash
git add .
git commit -m "Add A/B testing cron job"
git push
```

Vercel detectará automáticamente el cron job y lo activará.

## Método 2: Cron Job Manual (Alternativa)

Si no usas Vercel o quieres más control:

### 1. Crear un script para ejecutar manualmente:

```bash
#!/bin/bash
# ab-test-cron.sh

curl -X GET \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://tu-dominio.vercel.app/api/cron/ab-test-evaluator
```

### 2. Configurar cron en tu servidor:

```bash
# Editar crontab
crontab -e

# Añadir línea (ejecutar cada 15 minutos)
*/15 * * * * /path/to/ab-test-cron.sh >> /var/log/ab-test-cron.log 2>&1
```

## Método 3: GitHub Actions (Gratis)

### Crear `.github/workflows/ab-test-evaluator.yml`:

```yaml
name: A/B Test Evaluator

on:
  schedule:
    - cron: '*/15 * * * *'  # Cada 15 minutos
  workflow_dispatch:  # Permitir ejecución manual

jobs:
  evaluate-ab-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Call cron endpoint
        run: |
          curl -X GET \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            ${{ secrets.APP_URL }}/api/cron/ab-test-evaluator
```

**Configurar secrets en GitHub:**
1. Ve a tu repo → Settings → Secrets and variables → Actions
2. Añade:
   - `CRON_SECRET`: tu secreto
   - `APP_URL`: https://tu-dominio.vercel.app

## Verificación

### Comprobar que funciona:

```bash
# Ejecutar manualmente
curl -X GET \
  -H "Authorization: Bearer TU_CRON_SECRET" \
  https://tu-dominio.vercel.app/api/cron/ab-test-evaluator
```

### Respuesta esperada:

```json
{
  "success": true,
  "checked": 5,
  "evaluated": 2,
  "timestamp": "2024-12-02T10:30:00.000Z"
}
```

## Logs y Monitoreo

### Ver logs en Vercel:
1. Dashboard → Tu proyecto
2. Deployments → Selecciona deployment
3. Functions → Busca `ab-test-evaluator`
4. Ver logs de ejecución

### Logs en Supabase:
```sql
SELECT 
  id,
  title,
  subject,
  subject_b,
  ab_test_winner,
  ab_test_evaluated_at,
  created_at
FROM newsletter_campaigns
WHERE ab_test_enabled = true
ORDER BY created_at DESC;
```

## Troubleshooting

### Error: "Unauthorized"
- Verifica que `CRON_SECRET` esté configurado correctamente en Vercel
- Asegúrate de enviar el header `Authorization: Bearer ...`

### No se evalúan los tests:
- Verifica que el cron esté activo en Vercel Dashboard
- Comprueba que `scheduled_for` sea correcto
- Revisa logs para ver errores

### Tests se evalúan demasiado tarde:
- Aumenta frecuencia del cron (ej: cada 5 minutos en lugar de 15)
- Verifica timezone en Vercel (UTC por defecto)

## Alternativa: Sin Cron (Manual)

Si prefieres control manual, puedes:

1. Ir a Newsletter HQ en el admin
2. Ver campañas con A/B test
3. Botón manual "Evaluar ahora" cuando esté listo

Esto requiere modificar la UI para añadir el botón.

## Recomendación Final

**Para producción:** Usa Vercel Cron (Método 1)
- ✅ Automático
- ✅ Sin infraestructura adicional
- ✅ Logs integrados
- ✅ Gratis en plan Pro

**Para desarrollo:** Ejecuta manualmente cuando necesites testar
```bash
npm run dev
# En otra terminal
curl -X POST http://localhost:3000/api/admin/newsletter/ab-test-evaluate \
  -H "Content-Type: application/json" \
  -d '{"campaignId": "tu-campaign-id"}'
```

## Próximos Pasos

1. ✅ Ejecutar `COMPLETE_SETUP.sql` en Supabase
2. ✅ Crear endpoint de cron
3. ✅ Configurar `CRON_SECRET` en Vercel
4. ✅ Actualizar `vercel.json`
5. ✅ Deploy y verificar
6. 🎉 ¡Listo! El A/B testing es completamente automático


