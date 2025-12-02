# 📬 Email Automático "Sin Créditos" - LÉEME PRIMERO

## ⚡ 2 Pasos para Activar

### 1️⃣ SQL en Supabase (1 min)
```
1. Abrir archivo: SQL_EJECUTAR_EN_SUPABASE.sql
2. Copiar TODO
3. Supabase → SQL Editor → Pegar → Run
```

### 2️⃣ Deploy (1 min)
```bash
git add .
git commit -m "feat: email automático sin créditos"
git push origin main
```

## ✅ ¡Listo!

- ✅ No necesitas configurar variables de entorno (usa las mismas que emails de bienvenida)
- ✅ El sistema funciona automáticamente
- ✅ Email se envía SOLO UNA VEZ por usuario
- ✅ No bloquea el API (asíncrono)

---

## 📧 El Email

**Asunto:** "Te has quedado sin playlists IA… pero tengo algo para ti."

**Contenido:**
- Mensaje de MTRYX (fundadores)
- 2 opciones: Invitar amigos (gratis) o Founder (5€)
- CTA a /pricing
- Diseño responsive con branding PLEIA

---

## 🧪 Testear (opcional)

```sql
-- Crear usuario test
INSERT INTO users (email, plan, usage_count, max_uses, out_of_credits_email_sent)
VALUES ('test@example.com', 'free', 5, 5, false);

-- Verificar después
SELECT email, out_of_credits_email_sent, out_of_credits_email_sent_at
FROM users WHERE email = 'test@example.com';
```

---

## 📚 Más Info

- **Guía completa:** `INSTRUCCIONES_DEPLOY_EMAIL_SIN_CREDITOS.md`
- **Resumen ejecutivo:** `RESUMEN_FINAL_EMAIL_SIN_CREDITOS.md`
- **Docs técnicas:** `docs/OUT_OF_CREDITS_EMAIL_AUTOMATION.md`

---

## 🎯 Estado: ✅ READY

Todo funciona. Solo ejecuta el SQL y haz deploy.

