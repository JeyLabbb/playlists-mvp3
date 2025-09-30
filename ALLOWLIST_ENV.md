# Variables de entorno para Allowlist

Añadir estas variables a tu `.env.local`:

```bash
# Email allowlist
RESEND_API_KEY=TU_CLAVE_DE_RESEND
RESEND_FROM=onboarding@resend.dev
ALLOWLIST_TO=jeylabbb@gmail.com
```

## Comportamiento:

- **Si `RESEND_API_KEY` está presente**: Envía email de solicitud a `ALLOWLIST_TO`
- **Si falta**: No rompe la app; guarda solicitud y devuelve `ok=true`
- **Log claro**: En consola indica si se envió o no el email

## Flujo completo:

1. Usuario pulsa "Iniciar con Spotify" → Modal de solicitud
2. Envía solicitud → Email a jeylabbb@gmail.com
3. Si ya está activado → "Ya he solicitado acceso" → signIn('spotify')
4. Si intenta antes de estar activado → callback con OAuthCallback → Modal automático

## Formato del email:

```
Subject: Allowlist Spotify: usuario@email.com

Nueva solicitud de acceso
Nombre: Juan Pérez
Email (Spotify): usuario@email.com
Fecha: 2025-01-16T10:30:00.000Z
User Agent: Mozilla/5.0...
URL: http://localhost:3000
```
