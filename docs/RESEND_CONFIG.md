# Configuración de Resend para Emails

## Variables de Entorno Requeridas

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx  # API Key de Resend
RESEND_FROM=PLEIA <pleia@jeylabbb.com>  # Email desde el que se envían (debe estar verificado en Resend)
# O alternativamente:
RESEND_NEWSLETTER_FROM=PLEIA <pleia@jeylabbb.com>
```

## Verificación en Resend Dashboard

1. **Verificar que el dominio esté verificado:**
   - Ve a [Resend Dashboard](https://resend.com/domains)
   - Asegúrate de que `jeylabbb.com` esté verificado
   - Si no está verificado, añade los registros DNS que Resend te indique

2. **Verificar que la API Key sea válida:**
   - Ve a [Resend API Keys](https://resend.com/api-keys)
   - Verifica que la API key esté activa
   - Si no tienes una, crea una nueva

3. **Verificar emails enviados:**
   - Ve a [Resend Emails](https://resend.com/emails)
   - Deberías ver todos los emails enviados
   - Si no aparecen, revisa los logs del servidor

## Problemas Comunes

### 1. Emails no aparecen en Resend Dashboard

**Posibles causas:**
- El dominio `jeylabbb.com` no está verificado en Resend
- La API key no es válida o está desactivada
- El `from` no coincide con un dominio verificado

**Solución:**
- Verifica el dominio en Resend Dashboard
- Usa un dominio verificado o `onboarding@resend.dev` para pruebas
- Verifica que la API key sea correcta

### 2. Error: "Invalid from address"

**Causa:**
- El email `from` no está verificado en Resend

**Solución:**
- Verifica el dominio en Resend
- O usa `onboarding@resend.dev` para pruebas (no requiere verificación)

### 3. Emails se envían pero no llegan

**Posibles causas:**
- El email está en spam
- El dominio tiene problemas de reputación
- El email de destino rechaza el email

**Solución:**
- Revisa la carpeta de spam
- Verifica los logs de Resend para ver el estado del email
- Revisa si hay bounces o rejections

## Logs de Debugging

Los logs ahora muestran:
- `[EMAIL] ===== ENVIANDO EMAIL DE CONFIRMACIÓN =====`
- `[EMAIL] To: email@example.com`
- `[EMAIL] From: PLEIA <pleia@jeylabbb.com>`
- `[EMAIL] Has API Key: true/false`
- `[EMAIL] Response status: 200`
- `[EMAIL] MessageId: xxxxxx`

Si ves errores, revisa:
1. Que `RESEND_API_KEY` esté configurada en Vercel
2. Que el dominio esté verificado en Resend
3. Que el `from` sea válido

## Testing

Para probar el envío de emails:

```bash
# En local (con servidor corriendo)
curl -X POST http://localhost:3000/api/test/send-founder-email \
  -H "Content-Type: application/json" \
  -d '{"email":"tu-email@example.com"}'
```

O revisa los logs en producción:
```bash
vercel logs --follow | grep "\[EMAIL\]"
```

