-- Migration: Agregar profile_url a users y actualizar todos los usuarios
-- Fecha: 2025-01-06
-- Descripción: Guarda la URL completa del perfil de cada usuario

-- 1. Agregar columna profile_url si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
        AND column_name = 'profile_url'
    ) THEN
        ALTER TABLE public.users
        ADD COLUMN profile_url TEXT;
        
        RAISE NOTICE 'Columna profile_url agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna profile_url ya existe';
    END IF;
END $$;

-- 2. Actualizar profile_url para usuarios que tienen username
UPDATE users
SET profile_url = CONCAT('https://playlists.jeylabbb.com/u/', username)
WHERE username IS NOT NULL 
  AND username != ''
  AND (profile_url IS NULL OR profile_url = '');

-- 3. Para usuarios sin username, generar uno desde el email y actualizar
-- (Esto es opcional, puedes ejecutarlo después de generar usernames)
UPDATE users
SET 
  username = LOWER(REGEXP_REPLACE(SPLIT_PART(email, '@', 1), '[^a-z0-9._-]', '', 'g')),
  profile_url = CONCAT('https://playlists.jeylabbb.com/u/', LOWER(REGEXP_REPLACE(SPLIT_PART(email, '@', 1), '[^a-z0-9._-]', '', 'g')))
WHERE (username IS NULL OR username = '')
  AND email IS NOT NULL
  AND (profile_url IS NULL OR profile_url = '');

-- 4. Crear índice para búsquedas por profile_url
CREATE INDEX IF NOT EXISTS idx_users_profile_url 
ON public.users(profile_url) 
WHERE profile_url IS NOT NULL;

-- 5. Comentario
COMMENT ON COLUMN public.users.profile_url IS 
  'URL completa del perfil público del usuario (ej: https://playlists.jeylabbb.com/u/username)';

-- 6. Verificar resultado
SELECT 
  COUNT(*) as total_usuarios,
  COUNT(CASE WHEN profile_url IS NOT NULL THEN 1 END) as con_profile_url,
  COUNT(CASE WHEN profile_url IS NULL THEN 1 END) as sin_profile_url
FROM users;

