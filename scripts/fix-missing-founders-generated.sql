-- SQL generado automáticamente para corregir usuarios que deberían ser founder
-- Generado el: 2025-12-22T15:49:18.173Z
-- Total usuarios: 4

-- Verificar primero qué se actualizará:
SELECT 
  id,
  email,
  plan as current_plan,
  founder_source,
  max_uses,
  created_at
FROM public.users
WHERE email IN (
  'mateomontoyac301@gmail.com',
  'adrian@huelvayork.com',
  'dikdmpb@gmail.com',
  'albertavila1220@gmail.com'
);

-- Si todo se ve bien, ejecutar el UPDATE:
UPDATE public.users
SET 
  plan = 'founder',
  max_uses = NULL,
  founder_source = 'referral'
WHERE email IN (
  'mateomontoyac301@gmail.com',
  'adrian@huelvayork.com',
  'dikdmpb@gmail.com',
  'albertavila1220@gmail.com'
);

-- Verificar que se actualizó correctamente:
SELECT 
  id,
  email,
  plan,
  founder_source,
  max_uses
FROM public.users
WHERE email IN (
  'mateomontoyac301@gmail.com',
  'adrian@huelvayork.com',
  'dikdmpb@gmail.com',
  'albertavila1220@gmail.com'
);
