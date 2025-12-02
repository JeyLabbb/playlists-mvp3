# 📧 ENVIAR EMAIL DE PRUEBA AHORA MISMO

## ⚡ Pasos Rápidos

### 1️⃣ Deploy del endpoint de prueba

```bash
git add .
git commit -m "test: endpoint para enviar email sin créditos"
git push origin main
```

Espera 1-2 minutos a que Vercel haga el deploy.

---

### 2️⃣ Llamar al endpoint

**Opción A: Desde el navegador** (más fácil)

Abre esta URL en tu navegador:

```
https://playlists.jeylabbb.com/api/test-send-out-of-credits-email
```

**Opción B: Desde terminal**

```bash
curl https://playlists.jeylabbb.com/api/test-send-out-of-credits-email
```

**Opción C: Con otro email**

```
https://playlists.jeylabbb.com/api/test-send-out-of-credits-email?email=otro@example.com
```

---

### 3️⃣ Ver resultado

Verás una respuesta JSON como:

```json
{
  "success": true,
  "message": "✅ Email enviado exitosamente",
  "email": "jeylabbb@gmail.com",
  "userId": "xxx...",
  "emailSentAt": "2025-12-02T19:15:23.456Z",
  "details": {
    "flagInDB": true,
    "timestamp": "2025-12-02T19:15:23.456Z"
  }
}
```

---

### 4️⃣ Revisar email

El email debería llegar en **1-2 minutos** a **jeylabbb@gmail.com**.

- Revisa inbox
- Revisa spam si no aparece

---

### 5️⃣ Verificar en Supabase

```sql
SELECT 
  email,
  out_of_credits_email_sent,
  out_of_credits_email_sent_at
FROM users
WHERE email = 'jeylabbb@gmail.com';
```

---

### 6️⃣ ELIMINAR endpoint después

Una vez que confirmes que funciona, **eliminar el archivo**:

```bash
rm app/api/test-send-out-of-credits-email/route.ts
git add .
git commit -m "chore: eliminar endpoint de prueba"
git push origin main
```

---

## 🎯 Resumen

1. Haz `git push`
2. Espera 1-2 minutos
3. Abre en navegador: `https://playlists.jeylabbb.com/api/test-send-out-of-credits-email`
4. Revisa email en jeylabbb@gmail.com
5. Elimina el endpoint después

---

## 📧 El Email

**Asunto:** Te has quedado sin playlists IA… pero tengo algo para ti.

**Contenido:**
- Mensaje de MTRYX (fundadores)
- 2 opciones: Invitar amigos o Founder 5€
- CTA a /pricing
- Diseño responsive con branding PLEIA

---

¡Listo! Haz el push y llama al endpoint. 🚀

