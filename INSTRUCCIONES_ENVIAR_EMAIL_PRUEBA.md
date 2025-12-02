# 📧 Enviar Email de Prueba a jeylabbb@gmail.com

## Opción 1: Via API Endpoint (Recomendado)

### 1. Primero, ejecuta el SQL en Supabase

```sql
-- Asegurarse que jeylabbb@gmail.com existe con 0 usos
INSERT INTO users (email, plan, usage_count, max_uses, out_of_credits_email_sent)
VALUES ('jeylabbb@gmail.com', 'free', 5, 5, false)
ON CONFLICT (email) DO UPDATE SET
  usage_count = 5,
  max_uses = 5,
  out_of_credits_email_sent = false,
  out_of_credits_email_sent_at = null;
```

### 2. Haz deploy del código

```bash
git add .
git commit -m "feat: email automático sin créditos"
git push origin main
```

### 3. Intenta generar una playlist

- Login con jeylabbb@gmail.com
- Intenta crear una playlist
- Como tienes 0 usos restantes, debería:
  - Retornar error 403
  - Enviar el email automáticamente en background

### 4. Revisa tu email

El email debería llegar en 1-2 minutos a **jeylabbb@gmail.com**.

Si no aparece en inbox, revisa spam.

---

## Opción 2: Forzar envío manual (Development)

Si quieres forzar el envío sin hacer el deploy completo:

### 1. Crear endpoint de prueba temporal

```typescript
// app/api/test-send-out-of-credits/route.ts
import { NextResponse } from 'next/server';
import { sendOutOfCreditsEmail } from '@/lib/email/outOfCreditsNotification';
import { getSupabaseAdmin } from '@/lib/supabase/server';

export async function POST() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const testEmail = 'jeylabbb@gmail.com';

  // Buscar usuario
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', testEmail)
    .maybeSingle();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Resetear flag
  await supabase
    .from('users')
    .update({ out_of_credits_email_sent: false, out_of_credits_email_sent_at: null })
    .eq('id', user.id);

  // Enviar email
  const result = await sendOutOfCreditsEmail(user.id, testEmail);

  return NextResponse.json({ result });
}
```

### 2. Deploy y llamar al endpoint

```bash
# Deploy
git add .
git commit -m "test: endpoint email sin créditos"
git push origin main

# Llamar al endpoint
curl -X POST https://playlists.jeylabbb.com/api/test-send-out-of-credits
```

---

## Verificación

### Query en Supabase:

```sql
SELECT 
  email,
  out_of_credits_email_sent,
  out_of_credits_email_sent_at
FROM users
WHERE email = 'jeylabbb@gmail.com';
```

Debería mostrar:
```
email: jeylabbb@gmail.com
out_of_credits_email_sent: true
out_of_credits_email_sent_at: 2025-12-02 19:10:23...
```

### Logs en Vercel:

```
[OUT_OF_CREDITS_EMAIL] ✅ Email sent successfully. MessageId: xxx
```

### Dashboard de Resend:

https://resend.com/emails

---

## 🎯 Lo Más Fácil

**Simplemente:**

1. ✅ Ejecuta el SQL en Supabase (arriba)
2. ✅ Haz el deploy
3. ✅ Login con jeylabbb@gmail.com e intenta crear una playlist

El email llegará automáticamente. 📧

