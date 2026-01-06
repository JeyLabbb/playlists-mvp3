-- Migration: Agregar campo is_public a playlists
-- Fecha: 2025-01-06
-- Descripción: Permite marcar playlists como privadas (no aparecen en perfiles públicos, trending ni admin)

-- Agregar columna is_public si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'playlists'
        AND column_name = 'is_public'
    ) THEN
        ALTER TABLE public.playlists
        ADD COLUMN is_public BOOLEAN DEFAULT true NOT NULL;
        
        RAISE NOTICE 'Columna is_public agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna is_public ya existe';
    END IF;
END $$;

-- Crear índice para búsquedas de playlists públicas
CREATE INDEX IF NOT EXISTS idx_playlists_is_public 
ON public.playlists(is_public) 
WHERE is_public = true;

-- Comentario
COMMENT ON COLUMN public.playlists.is_public IS 
  'Si es false, la playlist es privada y no aparece en perfiles públicos, trending ni admin featured playlists';

