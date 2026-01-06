-- Migration: Featured Playlist System
-- Fecha: 2025-01-02
-- Descripción: Tabla para gestionar playlist destacada de la semana

-- Crear tabla featured_playlists
CREATE TABLE IF NOT EXISTS public.featured_playlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  is_active BOOLEAN DEFAULT false NOT NULL,
  spotify_playlist_id TEXT NOT NULL,
  spotify_playlist_url TEXT NOT NULL,
  playlist_name TEXT NOT NULL,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_display_name TEXT,
  owner_username TEXT,
  owner_email TEXT,
  preview_tracks JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  featured_at TIMESTAMPTZ,
  featured_by_admin UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_featured_playlists_is_active ON public.featured_playlists(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_featured_playlists_spotify_id ON public.featured_playlists(spotify_playlist_id);
CREATE INDEX IF NOT EXISTS idx_featured_playlists_owner_user_id ON public.featured_playlists(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_featured_playlists_featured_at ON public.featured_playlists(featured_at DESC);

-- Constraint: Solo una playlist destacada activa
CREATE UNIQUE INDEX IF NOT EXISTS idx_featured_playlists_single_active 
ON public.featured_playlists(is_active) 
WHERE is_active = true;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_featured_playlists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_featured_playlists_updated_at
  BEFORE UPDATE ON public.featured_playlists
  FOR EACH ROW
  EXECUTE FUNCTION update_featured_playlists_updated_at();

-- RLS Policies

-- Habilitar RLS
ALTER TABLE public.featured_playlists ENABLE ROW LEVEL SECURITY;

-- Policy: Lectura pública - Solo la playlist activa
CREATE POLICY "Public can read active featured playlist"
ON public.featured_playlists
FOR SELECT
TO public
USING (is_active = true);

-- Policy: Admin puede leer todas
CREATE POLICY "Admin can read all featured playlists"
ON public.featured_playlists
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.email = 'jorge@jeylabbb.com' OR
      auth.users.email = ANY(
        SELECT unnest(string_to_array(current_setting('app.admin_emails', true), ','))
      )
    )
  )
);

-- Policy: Admin puede insertar
CREATE POLICY "Admin can insert featured playlists"
ON public.featured_playlists
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.email = 'jorge@jeylabbb.com' OR
      auth.users.email = ANY(
        SELECT unnest(string_to_array(current_setting('app.admin_emails', true), ','))
      )
    )
  )
);

-- Policy: Admin puede actualizar
CREATE POLICY "Admin can update featured playlists"
ON public.featured_playlists
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.email = 'jorge@jeylabbb.com' OR
      auth.users.email = ANY(
        SELECT unnest(string_to_array(current_setting('app.admin_emails', true), ','))
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.email = 'jorge@jeylabbb.com' OR
      auth.users.email = ANY(
        SELECT unnest(string_to_array(current_setting('app.admin_emails', true), ','))
      )
    )
  )
);

-- Policy: Admin puede eliminar
CREATE POLICY "Admin can delete featured playlists"
ON public.featured_playlists
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.email = 'jorge@jeylabbb.com' OR
      auth.users.email = ANY(
        SELECT unnest(string_to_array(current_setting('app.admin_emails', true), ','))
      )
    )
  )
);

-- Comentarios
COMMENT ON TABLE public.featured_playlists IS 'Playlists destacadas de la semana. Solo una puede estar activa.';
COMMENT ON COLUMN public.featured_playlists.is_active IS 'Solo una playlist puede tener is_active=true';
COMMENT ON COLUMN public.featured_playlists.preview_tracks IS 'Cache de ~15 tracks: {name, artist, album, image, spotify_url}';
COMMENT ON COLUMN public.featured_playlists.featured_by_admin IS 'Usuario admin que seleccionó esta playlist';

