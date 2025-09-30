# Variables de entorno para Feedback

Añadir estas variables a tu `.env.local`:

```bash
# Email feedback
RESEND_API_KEY=TU_CLAVE_DE_RESEND
FEEDBACK_TO=jeylabbb@gmail.com
FEEDBACK_FROM=onboarding@resend.dev
```

## Comportamiento:

- **Si `RESEND_API_KEY` está presente**: Envía email a `FEEDBACK_TO`
- **Si falta**: No rompe la app; guarda feedback y devuelve `ok=true`
- **Log claro**: En consola indica si se envió o no el email

## Obtener API key de Resend:

1. Ve a [resend.com](https://resend.com)
2. Crea cuenta gratuita
3. Genera API key
4. Añade a `.env.local`
