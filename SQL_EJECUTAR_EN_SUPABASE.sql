-- ============================================================
-- SCRIPT SQL PARA EJECUTAR EN SUPABASE
-- Sistema de Email "Out of Credits" (Sin Créditos)
-- ============================================================
-- 
-- Este script agrega las columnas necesarias para trackear
-- el envío del email cuando usuarios agotan sus créditos
--
-- INSTRUCCIONES:
-- 1. Ir a Supabase Dashboard
-- 2. Seleccionar tu proyecto
-- 3. Ir a "SQL Editor"
-- 4. Copiar y pegar este código completo
-- 5. Ejecutar (Run)
--
-- ============================================================

-- Agregar columna para flag de email enviado
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS out_of_credits_email_sent BOOLEAN DEFAULT FALSE;

-- Agregar columna para timestamp de cuándo se envió
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS out_of_credits_email_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Crear índice para mejorar performance en consultas
-- (solo indexa usuarios que NO han recibido el email)
CREATE INDEX IF NOT EXISTS idx_users_out_of_credits_email_sent 
ON users(out_of_credits_email_sent) 
WHERE out_of_credits_email_sent = FALSE;

-- Agregar comentarios para documentación
COMMENT ON COLUMN users.out_of_credits_email_sent IS 
  'Flag to track if the user has received the "out of credits" email when they first attempted to generate a playlist with 0 remaining uses';

COMMENT ON COLUMN users.out_of_credits_email_sent_at IS 
  'Timestamp when the out of credits email was sent';

-- ============================================================
-- VERIFICACIÓN (ejecutar después para confirmar)
-- ============================================================

-- Ver las nuevas columnas en la tabla users
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('out_of_credits_email_sent', 'out_of_credits_email_sent_at')
ORDER BY ordinal_position;

-- Ver el índice creado
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'users' 
  AND indexname = 'idx_users_out_of_credits_email_sent';

-- ============================================================
-- QUERIES ÚTILES PARA MONITOREO
-- ============================================================

-- Ver usuarios que han recibido el email (últimos 10)
-- SELECT 
--   email,
--   usage_count,
--   max_uses,
--   plan,
--   out_of_credits_email_sent,
--   out_of_credits_email_sent_at
-- FROM users
-- WHERE out_of_credits_email_sent = true
-- ORDER BY out_of_credits_email_sent_at DESC
-- LIMIT 10;

-- Contar cuántos emails se han enviado
-- SELECT COUNT(*) as total_emails_sent
-- FROM users
-- WHERE out_of_credits_email_sent = true;

-- Ver emails enviados en las últimas 24 horas
-- SELECT COUNT(*) as emails_last_24h
-- FROM users
-- WHERE out_of_credits_email_sent = true
--   AND out_of_credits_email_sent_at >= NOW() - INTERVAL '1 day';

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================

