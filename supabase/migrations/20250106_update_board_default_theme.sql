-- Migration: Actualizar default theme a 'pleia'
-- Fecha: 2025-01-06
-- Descripción: Cambiar el default theme de 'light' a 'pleia' para nuevos boards

-- Actualizar el default en la tabla
ALTER TABLE public.playlist_boards 
  ALTER COLUMN theme SET DEFAULT 'pleia';

-- Actualizar boards existentes que tengan 'light' a 'pleia' (opcional)
UPDATE public.playlist_boards 
SET theme = 'pleia' 
WHERE theme = 'light';

