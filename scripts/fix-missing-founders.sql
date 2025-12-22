-- Script SQL para desbloquear Founder Pass a usuarios que cumplieron los requisitos
-- pero no se les actualizó automáticamente
--
-- Este script busca usuarios en Supabase que:
-- 1. Tienen founder_source = 'referral' pero plan != 'founder'
-- 2. O usuarios que deberían tener founder_source = 'referral' basado en referidos
--
-- ⚠️ IMPORTANTE: Ejecutar primero una consulta SELECT para ver qué usuarios se afectarían
-- antes de hacer el UPDATE

-- ============================================
-- PASO 1: VER QUÉ USUARIOS SE AFECTARÍAN
-- ============================================
-- ⚠️ IMPORTANTE: Este query solo muestra usuarios con founder_source='referral' pero plan != 'founder'
-- Estos son los casos SEGUROS que definitivamente deberían ser founder
-- 
-- Para usuarios con founder_source=NULL, necesitas usar el endpoint:
-- GET /api/referrals/fix-missing-founders?dryRun=true
-- (Ese endpoint verifica Vercel KV para ver si tienen referredQualifiedCount >= 1)

SELECT 
  u.id,
  u.email,
  u.plan as current_plan,
  u.founder_source,
  u.max_uses,
  u.created_at,
  'Should be founder (has referral source)' as status
FROM public.users u
WHERE 
  -- SOLO usuarios con founder_source='referral' pero plan != 'founder'
  -- Estos son casos seguros que definitivamente deberían ser founder
  u.founder_source = 'referral' 
  AND u.plan != 'founder'
ORDER BY u.created_at DESC;

-- ============================================
-- PASO 2: ACTUALIZAR USUARIOS CON REFERRAL SOURCE
-- ============================================
-- ⚠️ SOLO ejecuta esto si el PASO 1 mostró usuarios que necesitan corrección
-- Solo actualiza usuarios que ya tienen founder_source='referral'
-- Esto es seguro porque indica que obtuvieron el founder por referidos

-- Primero verifica cuántos se actualizarían:
SELECT COUNT(*) as usuarios_a_actualizar
FROM public.users
WHERE founder_source = 'referral' 
  AND plan != 'founder';

-- Si el número es razonable (no miles), ejecuta el UPDATE:
-- UPDATE public.users
-- SET 
--   plan = 'founder',
--   max_uses = NULL, -- null = infinito
--   founder_source = 'referral' -- Asegurar que esté marcado
-- WHERE 
--   founder_source = 'referral' 
--   AND plan != 'founder';

-- Verificar cuántos se actualizaron
SELECT COUNT(*) as updated_count
FROM public.users
WHERE 
  founder_source = 'referral' 
  AND plan = 'founder'
  AND max_uses IS NULL;

-- ============================================
-- PASO 3: VERIFICAR RESULTADOS
-- ============================================
-- Ver todos los founders por referidos

SELECT 
  id,
  email,
  plan,
  founder_source,
  max_uses,
  created_at
FROM public.users
WHERE 
  founder_source = 'referral'
  AND plan = 'founder'
ORDER BY created_at DESC;

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. Este script SQL solo actualiza usuarios que YA tienen founder_source='referral'
--    pero plan != 'founder'. Estos son casos seguros.
--
-- 2. Para usuarios con founder_source=NULL que podrían necesitar founder:
--    ⚠️ NO uses SQL directamente porque no puedes verificar Vercel KV desde SQL
--    En su lugar, usa el endpoint API:
--    
--    a) Primero ver qué se corregiría (dry-run):
--       GET /api/referrals/fix-missing-founders?dryRun=true
--    
--    b) Si todo se ve bien, ejecutar la corrección:
--       GET /api/referrals/fix-missing-founders?dryRun=false
--    
--    Este endpoint verifica en Vercel KV si tienen referredQualifiedCount >= 1
--    y solo actualiza a los que realmente lo necesitan.
--
-- 3. Si necesitas actualizar usuarios específicos manualmente:
--    UPDATE public.users
--    SET plan = 'founder', max_uses = NULL, founder_source = 'referral'
--    WHERE email = 'usuario@ejemplo.com';
--
-- 4. Para ver todos los founders (compra + referidos):
--    SELECT email, plan, founder_source, created_at 
--    FROM public.users 
--    WHERE plan = 'founder' 
--    ORDER BY founder_source, created_at DESC;
--
-- 5. Para contar cuántos founders hay por tipo:
--    SELECT founder_source, COUNT(*) as total
--    FROM public.users
--    WHERE plan = 'founder'
--    GROUP BY founder_source;

