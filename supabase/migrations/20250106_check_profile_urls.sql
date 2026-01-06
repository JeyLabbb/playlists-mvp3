-- SQL para verificar estado de URLs de perfiles
-- Ver qué usuarios tienen username y cuáles no

-- 1. Resumen: usuarios con/sin username
SELECT 
  COUNT(*) as total_usuarios,
  COUNT(CASE WHEN username IS NOT NULL AND username != '' THEN 1 END) as con_username,
  COUNT(CASE WHEN username IS NULL OR username = '' THEN 1 END) as sin_username,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as con_email
FROM users;

-- 2. Lista de usuarios SIN username (necesitan uno)
SELECT 
  id,
  email,
  plan,
  created_at,
  CASE 
    WHEN username IS NULL THEN 'Sin username'
    WHEN username = '' THEN 'Username vacío'
    ELSE 'Tiene username'
  END as estado_username
FROM users
WHERE username IS NULL OR username = ''
ORDER BY created_at DESC;

-- 3. Lista de usuarios CON username (pueden tener perfil)
SELECT 
  id,
  email,
  username,
  plan,
  created_at,
  CONCAT('https://playlists.jeylabbb.com/u/', username) as profile_url
FROM users
WHERE username IS NOT NULL AND username != ''
ORDER BY created_at DESC;

-- 4. Usuarios que podrían tener perfil pero no tienen username
SELECT 
  id,
  email,
  plan,
  created_at,
  'Necesita username para tener perfil' as nota
FROM users
WHERE (username IS NULL OR username = '')
  AND email IS NOT NULL
ORDER BY created_at DESC;

