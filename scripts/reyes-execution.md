# Ejecución de Reyes - Paso a Paso

## PASO 1: Verificar usuarios NO founders

Ejecuta en Supabase SQL Editor:

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

## PASO 2: Convertir a Founder

Ejecuta en Supabase SQL Editor:

```sql
-- Convertir a Founder
UPDATE users
SET 
  plan = 'founder',
  max_uses = NULL,
  updated_at = NOW()
WHERE 
  plan != 'founder' 
  OR max_uses IS NOT NULL;
```

## PASO 3: Enviar emails

Desde el admin panel o con curl:

```bash
# Opción 1: Desde admin panel
# Ve a: http://localhost:3001/admin/reyes
# Haz clic en "Enviar Email a Todos"

# Opción 2: Con curl (necesitas estar autenticado)
curl -X POST http://localhost:3001/api/admin/reyes/send-email \
  -H "Content-Type: application/json" \
  -b "admin-session=TU_SESSION_TOKEN"
```

