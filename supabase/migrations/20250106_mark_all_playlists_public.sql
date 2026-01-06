-- Migration: Marcar todas las playlists existentes como públicas
-- Fecha: 2025-01-06
-- Descripción: Todas las playlists creadas hasta ahora deben ser públicas por defecto

-- Actualizar todas las playlists existentes a públicas (is_public = true)
-- Solo actualizar las que tienen is_public = NULL o false
UPDATE public.playlists
SET is_public = true
WHERE is_public IS NULL OR is_public = false;

-- Verificar cuántas playlists se actualizaron
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Playlists actualizadas a públicas: %', updated_count;
END $$;

-- Comentario
COMMENT ON COLUMN public.playlists.is_public IS 
  'Si es false, la playlist es privada y no aparece en perfiles públicos, trending ni admin featured playlists. Por defecto todas son públicas.';

