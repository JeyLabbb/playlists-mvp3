-- Migration: Agregar owner_username a featured_playlists (si no existe)
-- Fecha: 2025-01-06
-- Descripción: Asegura que la columna owner_username existe en featured_playlists

-- Agregar columna owner_username si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'featured_playlists'
        AND column_name = 'owner_username'
    ) THEN
        ALTER TABLE public.featured_playlists
        ADD COLUMN owner_username TEXT;
        
        RAISE NOTICE 'Columna owner_username agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna owner_username ya existe';
    END IF;
END $$;

-- Crear índice si no existe
CREATE INDEX IF NOT EXISTS idx_featured_playlists_owner_username 
ON public.featured_playlists(owner_username) 
WHERE owner_username IS NOT NULL;

-- Comentario
COMMENT ON COLUMN public.featured_playlists.owner_username IS 
  'Username del usuario creador de la playlist (para links a perfil)';

