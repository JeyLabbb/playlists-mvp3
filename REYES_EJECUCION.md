# 🎁 Ejecución de Reyes - Paso a Paso

## 📋 PASO 1: Ver usuarios NO founders

Ejecuta en **Supabase SQL Editor**:

```sql
-- Ver usuarios que NO son founders
SELECT 
  id,
  email,
  plan,
  max_uses,
  created_at,
  CASE 
    WHEN plan = 'founder' AND max_uses IS NULL THEN 'Ya es Founder'
    WHEN plan != 'founder' OR max_uses IS NOT NULL THEN 'Será convertido'
    ELSE 'Ya es Founder'
  END as estado
FROM users
WHERE 
  plan != 'founder' 
  OR max_uses IS NOT NULL
ORDER BY created_at DESC;
```

**Esto te mostrará:**
- Todos los usuarios que NO son founders
- Su plan actual
- Si tienen límite de uses
- Cuándo fueron creados

---

## 📋 PASO 2: Contar cuántos serán convertidos

```sql
-- Contar usuarios a convertir
SELECT 
  COUNT(*) as usuarios_a_convertir,
  COUNT(CASE WHEN plan != 'founder' THEN 1 END) as con_plan_diferente,
  COUNT(CASE WHEN max_uses IS NOT NULL THEN 1 END) as con_limite_uses
FROM users
WHERE 
  plan != 'founder' 
  OR max_uses IS NOT NULL;
```

---

## 📋 PASO 3: Convertir a Founder

⚠️ **EJECUTAR DESPUÉS de verificar el paso 1**

```sql
-- Convertir TODOS los usuarios a Founder
UPDATE users
SET 
  plan = 'founder',
  max_uses = NULL,
  updated_at = NOW()
WHERE 
  plan != 'founder' 
  OR max_uses IS NOT NULL;
```

**Verificar resultado:**
```sql
-- Ver distribución final
SELECT 
  plan,
  COUNT(*) as cantidad,
  COUNT(CASE WHEN max_uses IS NULL THEN 1 END) as ilimitados
FROM users
GROUP BY plan
ORDER BY cantidad DESC;
```

---

## 📋 PASO 4: Enviar Emails de Reyes

### Opción A: Desde Admin Panel (RECOMENDADO)

1. Ve a: `http://localhost:3001/admin/reyes`
2. Haz clic en **"Enviar Email a Todos"**
3. Confirma
4. Espera (puede tardar varios minutos)
5. Verás el resultado: enviados, fallidos, errores

### Opción B: Desde Terminal (si prefieres)

```bash
# Desde el directorio del proyecto
cd /Users/jorgemig/Desktop/JeyLabbb/JL_IA_playlists/playlists-mvp

# Ejecutar script (requiere ADMIN_PASSWORD en .env)
node scripts/send-reyes-emails.js
```

### Opción C: Con curl (necesitas session token)

```bash
# 1. Primero login para obtener session token
curl -X POST http://localhost:3001/api/admin/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"TU_EMAIL","password":"TU_PASSWORD"}' \
  -c cookies.txt

# 2. Luego enviar emails
curl -X POST http://localhost:3001/api/admin/reyes/send-email \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

---

## ✅ Verificación Final

Después de ejecutar todo:

1. **Verificar usuarios convertidos:**
```sql
SELECT COUNT(*) as total_founders 
FROM users 
WHERE plan = 'founder' AND max_uses IS NULL;
```

2. **Verificar emails enviados:**
   - Revisa logs de Vercel/consola
   - Busca: `[REYES_EMAIL] ✅ Email enviado a:`
   - El endpoint devuelve: `sent`, `failed`, `total`

---

## 📝 Notas Importantes

- **Idempotente**: Puedes ejecutar el UPDATE múltiples veces sin problemas
- **Rate Limiting**: Los emails se envían en lotes de 10 con 1 segundo de delay
- **Si falla un email**: No rompe el proceso, continúa con los demás
- **Tiempo estimado**: ~1 segundo por usuario (con rate limiting)

---

## 🚨 Troubleshooting

### Error "No autorizado"
- Verifica que estés logueado como admin
- Revisa `ADMIN_EMAILS` en variables de entorno

### Emails no se envían
- Verifica `RESEND_API_KEY` en Vercel
- Revisa logs: `[REYES_EMAIL]`
- Si falla 1 usuario, continúa con los demás

### SQL no funciona
- Verifica que estás en el proyecto correcto de Supabase
- Asegúrate de que la tabla `users` existe
- Revisa permisos RLS si hay problemas

