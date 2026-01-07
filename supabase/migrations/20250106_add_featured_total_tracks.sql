-- Migration: Add total_tracks field to featured_playlists
-- Fecha: 2025-01-06
-- Descripción: Guarda el total de canciones de la playlist para mostrar "... y x canciones más"

-- Añadir columna total_tracks (opcional)
ALTER TABLE public.featured_playlists
ADD COLUMN IF NOT EXISTS total_tracks INTEGER;

-- Comentario
COMMENT ON COLUMN public.featured_playlists.total_tracks IS 'Total de canciones en la playlist de Spotify. Usado para mostrar "... y x canciones más" en la UI.';

