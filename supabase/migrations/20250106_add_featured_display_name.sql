-- Migration: Add display_name field to featured_playlists
-- Fecha: 2025-01-06
-- Descripción: Permite personalizar el nombre que se muestra en UI de la playlist destacada

-- Añadir columna display_name (opcional, si es NULL se usa playlist_name)
ALTER TABLE public.featured_playlists
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Comentario
COMMENT ON COLUMN public.featured_playlists.display_name IS 'Nombre personalizado para mostrar en UI. Si es NULL, se usa playlist_name.';

