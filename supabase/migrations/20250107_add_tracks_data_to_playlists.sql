-- Migration: Add tracks_data column to playlists table
-- Fecha: 2025-01-07
-- Descripción: Agregar columna JSONB para guardar información completa de tracks durante generación

-- Agregar columna tracks_data (JSONB) a la tabla playlists
ALTER TABLE public.playlists 
ADD COLUMN IF NOT EXISTS tracks_data JSONB DEFAULT '[]'::jsonb;

-- Crear índice GIN para búsquedas eficientes en tracks_data
CREATE INDEX IF NOT EXISTS idx_playlists_tracks_data 
ON public.playlists USING GIN (tracks_data);

-- Comentario en la columna
COMMENT ON COLUMN public.playlists.tracks_data IS 'Array JSONB con información completa de tracks: id, name, artist, artists, album, spotify_url, image';

