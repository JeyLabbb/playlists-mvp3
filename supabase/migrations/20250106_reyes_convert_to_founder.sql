-- SQL para convertir TODOS los usuarios a Founder (Reyes)
-- ⚠️ EJECUTAR DESPUÉS de verificar con el script anterior

-- Convertir a Founder: plan = 'founder' y max_uses = null (ilimitado)
-- Captura TODOS los casos: plan NULL, plan vacío, plan != 'founder', o max_uses != NULL
UPDATE users
SET 
  plan = 'founder',
  max_uses = NULL
WHERE 
  plan IS NULL
  OR plan = ''
  OR plan != 'founder' 
  OR max_uses IS NOT NULL;

-- Verificar el resultado
SELECT 
  plan,
  COUNT(*) as cantidad,
  COUNT(CASE WHEN max_uses IS NULL THEN 1 END) as ilimitados
FROM users
GROUP BY plan
ORDER BY cantidad DESC;

-- Ver algunos ejemplos de usuarios convertidos
SELECT 
  id,
  email,
  plan,
  max_uses,
  created_at
FROM users
WHERE plan = 'founder'
ORDER BY created_at DESC
LIMIT 10;

