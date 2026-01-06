-- Migration: Agregar owner_username a featured_playlists
-- Fecha: 2025-01-06
-- Descripción: Añade campo owner_username para poder hacer links a perfiles

-- Agregar columna owner_username si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
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

-- Índice para búsquedas por username (opcional)
CREATE INDEX IF NOT EXISTS idx_featured_playlists_owner_username 
ON public.featured_playlists(owner_username) 
WHERE owner_username IS NOT NULL;

