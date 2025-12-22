# Integración MTRYX - PLEIA

Este documento describe la integración entre PLEIA y MTRYX para el tracking de eventos y exportación de datos históricos.

## Variables de Entorno

Añade las siguientes variables a tu `.env.local`:

```bash
# MTRYX Integration
# URL completa del endpoint de eventos de MTRYX (ej: http://localhost:3000/api/events o URL de producción)
MTRYX_EVENTS_URL=
# Clave secreta del proyecto MTRYX que representa a PLEIA
MTRYX_SECRET_KEY=
```

**Importante:** Estas variables son opcionales. Si no están configuradas, el tracking simplemente no se enviará a MTRYX y se logueará un warning. PLEIA seguirá funcionando normalmente.

## Eventos Trackeados

### 1. Signup (`type: "signup"`)

Se envía cuando un usuario completa su registro en PLEIA (acepta términos y configura su username).

**Ubicación:** `app/api/auth/complete/route.ts`

**Payload enviado:**
```typescript
{
  type: "signup",
  source: "pleia_signup",
  contact: {
    email: string,
    name: string | null,
    id: string (userId)
  },
  data: {
    plan: string,
    referralEmail?: string
  }
}
```

### 2. Usage (`type: "usage"`)

Se envía cada vez que un usuario consume un crédito/usos al generar una playlist.

**Ubicaciones:**
- `app/api/playlist/stream/route.js` (streaming de playlist)
- `app/api/agent/stream/route.ts` (agente de generación)

**Payload enviado:**
```typescript
{
  type: "usage",
  source: "pleia_usage",
  contact: {
    email: string,
    id: string (userId)
  },
  data: {
    feature: string, // "playlist_generation" o "agent_playlist_generation"
    remainingFreeUses: number | "unlimited",
    plan: string,
    usageId?: string
  }
}
```

### 3. Payment (`type: "payment"`)

Se envía cuando un usuario completa un pago (upgrade a Founder Pass).

**Ubicación:** `app/checkout/success/page.tsx`

**Payload enviado:**
```typescript
{
  type: "payment",
  source: "pleia_billing",
  contact: {
    email: string,
    id?: string (userId)
  },
  data: {
    amount: number, // en euros
    currency: string, // "EUR"
    plan: string, // "founder"
    stripeSessionId?: string,
    stripeCustomerId?: string
  }
}
```

## Cliente MTRYX

El cliente se encuentra en `lib/mtryxClient.ts` y proporciona:

- `sendEventToMtryx(event)`: Función base para enviar eventos
- `trackSignup(user)`: Helper para trackear signups
- `trackUsage(user)`: Helper para trackear usos
- `trackPayment(paymentInfo)`: Helper para trackear pagos

**Características:**
- No bloquea el flujo principal de PLEIA
- Manejo de errores robusto (no lanza excepciones)
- Logging claro para debugging
- Valida variables de entorno antes de intentar enviar

## Exportación de Datos Históricos

Para exportar datos históricos de PLEIA a CSV para importar manualmente en MTRYX:

```bash
npm run export:mtryx
```

Este script genera dos archivos CSV en `scripts/output/`:

1. **`mtryx_contacts.csv`**: Lista de todos los usuarios/contactos
   - Columnas: `email`, `name`, `created_at`, `newsletter_opt_in`, `extra` (JSON)
   
2. **`mtryx_events.csv`**: Lista de eventos históricos
   - Columnas: `type`, `timestamp`, `contact_email`, `properties` (JSON)
   - Tipos de eventos exportados:
     - `signup`: Usuarios que aceptaron términos
     - `usage`: Eventos de uso desde `usage_events`
     - `prompt`: Prompts generados (si existe la tabla `prompts`)

### Formato CSV

Los CSV están correctamente formateados con:
- Primera fila: nombres de columnas
- Escape de comillas y comas
- JSON válido en campos `extra` y `properties`

### Notas Importantes

- El script **solo lee** de la base de datos; no modifica nada
- Si alguna tabla no existe, el script continúa y loguea un warning
- Los errores individuales no detienen la exportación completa
- Los archivos se sobrescriben en cada ejecución

### Próximos Pasos Después de la Exportación

1. Revisa los archivos CSV generados
2. Súbelos manualmente en la UI de MTRYX
3. Verifica que los datos se importaron correctamente

## TODOs Futuros

- [ ] Añadir reintentos automáticos para eventos fallidos
- [ ] Exportación directa a endpoint de MTRYX (sin CSV manual)
- [ ] Export incremental o por rangos de fecha
- [ ] Integrar con logger más serio si el proyecto adopta uno

## Troubleshooting

### Los eventos no se envían

1. Verifica que `MTRYX_EVENTS_URL` y `MTRYX_SECRET_KEY` estén configuradas en `.env.local`
2. Revisa los logs en consola (busca `[MTRYX]`)
3. Verifica que la URL de MTRYX sea accesible desde tu entorno

### Error al ejecutar export:mtryx

1. Verifica que `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` estén configuradas
2. Verifica que las tablas `users`, `usage_events`, y opcionalmente `prompts` existan en tu Supabase
3. Revisa los errores en la consola del script

### Archivos CSV vacíos

1. Verifica que haya datos en las tablas de Supabase
2. Revisa los logs del script para ver si hay errores de consulta
3. Asegúrate de tener permisos de lectura en las tablas

