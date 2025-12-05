-- ============================================
-- MIGRACIÓN: Eliminar columna last_prompt_at de users
-- ============================================
-- 
-- Esta migración elimina la columna last_prompt_at de la tabla users
-- ya que ahora usamos prompts.created_at como fuente de verdad.
--
-- IMPORTANTE: Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Verificar que la tabla prompts existe y tiene created_at
-- (No hacer nada, solo verificar manualmente)

-- 2. Eliminar la columna last_prompt_at de users (si existe)
-- Si la columna no existe, este comando fallará silenciosamente
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'last_prompt_at'
  ) THEN
    ALTER TABLE users DROP COLUMN last_prompt_at;
    RAISE NOTICE 'Columna last_prompt_at eliminada de users';
  ELSE
    RAISE NOTICE 'Columna last_prompt_at no existe en users, no se requiere acción';
  END IF;
END $$;

-- 3. Verificar que se eliminó correctamente
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'last_prompt_at';
-- Debe devolver 0 filas

-- ============================================
-- NOTAS:
-- ============================================
-- - El código ahora usa prompts.created_at para obtener lastPromptAt
-- - No se requiere migración de datos ya que prompts.created_at es la fuente de verdad
-- - Si necesitas el último prompt de un usuario, consulta:
--   SELECT created_at FROM prompts WHERE user_email = 'email@example.com' ORDER BY created_at DESC LIMIT 1;
-- ============================================

