-- SQL para verificar usuarios NO founders antes de convertir
-- Ejecutar primero para ver quiénes serán convertidos

-- 1. Ver usuarios que NO son founders (todos los casos)
SELECT 
  id,
  email,
  plan,
  max_uses,
  created_at,
  CASE 
    WHEN plan = 'founder' AND max_uses IS NULL THEN 'Ya es Founder'
    WHEN plan IS NULL OR plan = '' OR plan != 'founder' OR max_uses IS NOT NULL THEN 'Será convertido'
    ELSE 'Ya es Founder'
  END as estado
FROM users
WHERE 
  plan IS NULL
  OR plan = ''
  OR plan != 'founder' 
  OR max_uses IS NOT NULL
ORDER BY created_at DESC;

-- 2. Contar cuántos serán convertidos
SELECT 
  COUNT(*) as usuarios_a_convertir,
  COUNT(CASE WHEN plan IS NULL OR plan = '' OR plan != 'founder' THEN 1 END) as con_plan_diferente,
  COUNT(CASE WHEN max_uses IS NOT NULL THEN 1 END) as con_limite_uses
FROM users
WHERE 
  plan IS NULL
  OR plan = ''
  OR plan != 'founder' 
  OR max_uses IS NOT NULL;

-- 3. Ver distribución actual de planes
SELECT 
  plan,
  COUNT(*) as cantidad,
  COUNT(CASE WHEN max_uses IS NULL THEN 1 END) as ilimitados,
  COUNT(CASE WHEN max_uses IS NOT NULL THEN 1 END) as limitados
FROM users
GROUP BY plan
ORDER BY cantidad DESC;

