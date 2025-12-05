# 🧪 Sistema de A/B Testing para Newsletter

## Características Implementadas

### 1. **A/B Testing de Asuntos**
- Prueba 2 asuntos diferentes con el 25% de destinatarios cada uno
- Evaluación automática después del tiempo configurado
- El 50% restante recibe el asunto ganador automáticamente
- Selección aleatoria de destinatarios (Fisher-Yates shuffle)

### 2. **Criterios de Ganador**
- **Más Aperturas**: Gana el asunto con más opens
- **Más Clicks**: Gana el asunto con más clicks
- **Mejor CTR**: Gana el mejor click-through rate (clicks/opens)
- **Combinado**: Suma de opens + clicks

### 3. **Categorización de Mails**
- Welcome Mail 👋
- Founder Mail ⭐
- Actualización 📰
- Promoción 🎁
- General 📧

### 4. **Vista de Tracking Mejorada**
- Métricas agrupadas por categoría
- Ver asunto + cuerpo de cada campaña
- Estadísticas detalladas: opens, clicks, open rate, CTR
- Usuarios específicos que abrieron/clickearon
- Resultados de A/B tests con variantes

## Flujo de A/B Testing

### Paso 1: Configurar Campaña
1. En el formulario de campañas, activar toggle "A/B Testing"
2. Ingresar "Asunto B" (variante alternativa)
3. Configurar duración del test (horas o días)
4. Elegir criterio para determinar ganador
5. Seleccionar destinatarios normalmente

### Paso 2: Envío Automático
- **25% reciben Asunto A** inmediatamente
- **25% reciben Asunto B** inmediatamente  
- **50% quedan en "holdout"** esperando resultado

### Paso 3: Evaluación Automática
- Después del tiempo configurado, se ejecuta el job `ab-test-evaluate`
- Se calculan métricas de ambas variantes
- Se determina el ganador según el criterio elegido
- El ganador se guarda en `ab_test_winner` (A o B)

### Paso 4: Envío del Ganador
- El 50% holdout recibe automáticamente el mail con el asunto ganador
- Se actualiza `ab_test_evaluated_at` con timestamp

## Estructura de Base de Datos

### Tabla: `newsletter_campaigns`
```sql
-- Nuevos campos añadidos
mail_category              TEXT           -- Categoría del mail
ab_test_enabled            BOOLEAN        -- Si usa A/B testing
subject_b                  TEXT           -- Asunto variante B
test_duration              INTEGER        -- Duración del test
test_duration_unit         TEXT           -- 'hours' o 'days'
winner_criteria            TEXT           -- 'opens', 'clicks', 'ctr', 'combined'
ab_test_winner             TEXT           -- 'A' o 'B'
ab_test_evaluated_at       TIMESTAMPTZ    -- Cuando se evaluó
```

### Tabla: `newsletter_campaign_recipients`
```sql
-- Nuevo campo
ab_test_variant            TEXT           -- 'A', 'B', o 'holdout'
```

## Endpoints API

### `POST /api/admin/newsletter/campaigns`
Crea una campaña con A/B testing opcional:
```json
{
  "title": "Test Campaign",
  "subject": "Asunto A",
  "subjectB": "Asunto B",
  "body": "...",
  "abTestEnabled": true,
  "testDuration": 24,
  "testDurationUnit": "hours",
  "winnerCriteria": "opens",
  "mailCategory": "welcome"
}
```

### `POST /api/admin/newsletter/ab-test-evaluate`
Evalúa el ganador y envía al grupo holdout:
```json
{
  "campaignId": "uuid"
}
```

## Programación de Jobs

El sistema usa `newsletter_jobs` para programar:
- **Tipo**: `ab-test-evaluate`
- **Scheduled for**: `now + testDuration`
- **Payload**: `{ campaignId: "uuid" }`

## Visualización en UI

### Formulario de Campañas
- Toggle para activar A/B testing
- Campos condicionales cuando está activo
- Distribución visual (25% + 25% + 50%)
- Explicación clara del funcionamiento

### Vista de Tracking
- Agrupación por categoría de mail
- Acordeones expandibles por categoría
- Métricas agregadas por categoría
- Detalle individual de cada campaña
- Badges especiales para A/B tests
- Mostrar variantes y ganador

## Instalación

1. Ejecutar migración SQL:
```bash
# En Supabase SQL Editor
psql < SUPABASE_AB_TESTING_MIGRATION.sql
```

2. El código ya está implementado y listo para usar

3. Configurar job processor para ejecutar `ab-test-evaluate` jobs
   (puede ser un cron job o Vercel Cron que llame al endpoint)

## Métricas Disponibles

### Por Campaña
- Enviados
- Abiertos
- Clicks
- Open Rate (%)
- CTR - Click Through Rate (%)

### Por Variante (A/B Test)
- Métricas individuales de A y B
- Comparación lado a lado
- Identificación clara del ganador

### Por Categoría
- Agregación de todas las campañas de esa categoría
- Promedio de open rate
- Promedio de CTR
- Número total de campañas

## Ejemplo de Uso

```javascript
// Crear campaña con A/B testing
await fetch('/api/admin/newsletter/campaigns', {
  method: 'POST',
  body: JSON.stringify({
    title: 'Welcome Series - Test 1',
    subject: '🎉 Bienvenido a PLEIA',
    subjectB: '👋 Descubre PLEIA ahora',
    body: 'Contenido del email...',
    mailCategory: 'welcome',
    abTestEnabled: true,
    testDuration: 48,
    testDurationUnit: 'hours',
    winnerCriteria: 'combined',
    groupIds: ['group-uuid'],
    sendMode: 'immediate',
    trackingEnabled: true
  })
});
```

## Notas Importantes

⚠️ **El A/B testing requiere mínimo 100 destinatarios** para tener resultados significativos (25% = 25 usuarios mínimo)

⚠️ **Los jobs deben ser procesados** por un worker externo o cron job

⚠️ **El tracking debe estar habilitado** (`trackingEnabled: true`) para que funcione correctamente

✅ **La división es verdaderamente aleatoria** usando Fisher-Yates shuffle

✅ **El sistema es completamente automático** después de crear la campaña

## Roadmap Futuro

- [ ] A/B testing de contenido (no solo asuntos)
- [ ] Soporte para más de 2 variantes (A/B/C/D)
- [ ] Machine learning para predecir mejores asuntos
- [ ] Dashboard de insights con tendencias
- [ ] Recomendaciones automáticas basadas en histórico


