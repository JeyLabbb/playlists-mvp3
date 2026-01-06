-- SQL para verificar usuarios que NO han recibido el email de Reyes
-- Ejecutar después del segundo envío para identificar pendientes

-- 1. Lista completa de usuarios pendientes (para envío manual)
SELECT 
  id,
  email,
  plan,
  username,
  created_at,
  reyes_email_sent,
  reyes_email_sent_at,
  CASE 
    WHEN reyes_email_sent IS NULL THEN 'Nunca intentado'
    WHEN reyes_email_sent = false THEN 'Falló anteriormente'
    ELSE 'Ya recibido'
  END as estado
FROM users
WHERE 
  email IS NOT NULL
  AND (reyes_email_sent IS NULL OR reyes_email_sent = false)
ORDER BY created_at DESC;

-- 2. Resumen: cuántos faltan
SELECT 
  COUNT(*) as usuarios_pendientes,
  COUNT(CASE WHEN reyes_email_sent IS NULL THEN 1 END) as nunca_intentado,
  COUNT(CASE WHEN reyes_email_sent = false THEN 1 END) as fallo_anterior,
  COUNT(CASE WHEN reyes_email_sent = true THEN 1 END) as ya_recibido
FROM users
WHERE email IS NOT NULL;

-- 3. Lista solo emails (para copiar/pegar fácilmente)
SELECT 
  email
FROM users
WHERE 
  email IS NOT NULL
  AND (reyes_email_sent IS NULL OR reyes_email_sent = false)
ORDER BY email;

-- 4. Exportar a CSV (formato para envío manual)
SELECT 
  email as "Email",
  COALESCE(username, email) as "Nombre",
  plan as "Plan",
  created_at::text as "Fecha Registro"
FROM users
WHERE 
  email IS NOT NULL
  AND (reyes_email_sent IS NULL OR reyes_email_sent = false)
ORDER BY created_at DESC;

