-- Migration: Agregar owner_profile_url a featured_playlists
-- Fecha: 2025-01-06
-- Descripción: Guarda la URL completa del perfil del creador de la playlist destacada

-- Agregar columna owner_profile_url si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'featured_playlists'
        AND column_name = 'owner_profile_url'
    ) THEN
        ALTER TABLE public.featured_playlists
        ADD COLUMN owner_profile_url TEXT;
        
        RAISE NOTICE 'Columna owner_profile_url agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna owner_profile_url ya existe';
    END IF;
END $$;

-- Actualizar profile_url para playlists destacadas existentes que tienen username
UPDATE public.featured_playlists
SET owner_profile_url = CONCAT('https://playlists.jeylabbb.com/u/', owner_username)
WHERE owner_username IS NOT NULL 
  AND owner_username != ''
  AND (owner_profile_url IS NULL OR owner_profile_url = '');

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_featured_playlists_owner_profile_url 
ON public.featured_playlists(owner_profile_url) 
WHERE owner_profile_url IS NOT NULL;

-- Comentario
COMMENT ON COLUMN public.featured_playlists.owner_profile_url IS 
  'URL completa del perfil público del creador (ej: https://playlists.jeylabbb.com/u/username)';

