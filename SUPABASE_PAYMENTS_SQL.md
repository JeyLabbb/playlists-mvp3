# Instrucciones SQL para verificar y actualizar `created_at` en Supabase

## Verificar la estructura de la tabla `payments`

```sql
-- Ver todas las columnas de la tabla payments
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'payments'
ORDER BY ordinal_position;
```

## Verificar si existe la columna `created_at`

```sql
-- Verificar si created_at existe
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'payments' 
  AND column_name = 'created_at';
```

## Ver todos los pagos con su `created_at`

```sql
-- Ver todos los pagos con created_at
SELECT 
  id,
  user_email,
  amount,
  currency,
  plan,
  status,
  created_at,
  stripe_payment_intent_id
FROM payments
ORDER BY created_at DESC;
```

## Ver pagos SIN `created_at` (NULL)

```sql
-- Ver pagos que no tienen created_at
SELECT 
  id,
  user_email,
  amount,
  currency,
  plan,
  status,
  created_at
FROM payments
WHERE created_at IS NULL;
```

## Añadir columna `created_at` si no existe

```sql
-- Añadir columna created_at si no existe (con valor por defecto)
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
```

## Actualizar `created_at` para pagos que no lo tienen

```sql
-- Actualizar created_at a la fecha actual para pagos que no lo tienen
UPDATE payments
SET created_at = NOW()
WHERE created_at IS NULL;
```

## Actualizar `created_at` a una fecha específica

```sql
-- Actualizar created_at a una fecha específica (ejemplo: 2025-01-15 10:30:00)
UPDATE payments
SET created_at = '2025-01-15 10:30:00+00'::timestamptz
WHERE id = 'TU_PAYMENT_ID_AQUI';
```

## Verificar pagos recientes (últimos 30 días)

```sql
-- Ver pagos de los últimos 30 días
SELECT 
  id,
  user_email,
  amount,
  currency,
  plan,
  status,
  created_at
FROM payments
WHERE created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;
```

## Verificar pagos por fecha específica

```sql
-- Ver pagos de una fecha específica (ejemplo: 2025-01-15)
SELECT 
  id,
  user_email,
  amount,
  currency,
  plan,
  status,
  created_at
FROM payments
WHERE DATE(created_at) = '2025-01-15'
ORDER BY created_at DESC;
```

## Asegurar que `created_at` tenga valor por defecto

```sql
-- Asegurar que created_at tenga valor por defecto para futuros inserts
ALTER TABLE payments
ALTER COLUMN created_at SET DEFAULT NOW();
```

## Nota importante

Si la columna `created_at` no existe, el código de admin puede fallar al intentar ordenar o filtrar por fecha. Asegúrate de que:

1. La columna existe: `SELECT column_name FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'created_at';`
2. Tiene valores: `SELECT COUNT(*) FROM payments WHERE created_at IS NOT NULL;`
3. Tiene valor por defecto: Verifica que `column_default` no sea NULL en la consulta de estructura

