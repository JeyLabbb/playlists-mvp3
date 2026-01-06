-- Migration: Playlist Board by PLEIA
-- Fecha: 2025-01-06
-- Descripción: Sistema de boards personalizables y compartibles para mostrar playlists de cada usuario

-- 1) Crear tabla playlist_boards
CREATE TABLE IF NOT EXISTS public.playlist_boards (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    slug TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL DEFAULT '',
    status_text TEXT DEFAULT '',
    theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'pleia')),
    font_title TEXT NOT NULL DEFAULT 'inter' CHECK (font_title IN ('inter', 'space_grotesk', 'sf_pro')),
    font_status TEXT NOT NULL DEFAULT 'inter' CHECK (font_status IN ('inter', 'space_grotesk', 'sf_pro')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Índices
CREATE INDEX IF NOT EXISTS idx_playlist_boards_slug ON public.playlist_boards(slug);
CREATE INDEX IF NOT EXISTS idx_playlist_boards_user_id ON public.playlist_boards(user_id);

-- 3) Trigger para updated_at
CREATE OR REPLACE FUNCTION update_playlist_boards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_playlist_boards_updated_at
    BEFORE UPDATE ON public.playlist_boards
    FOR EACH ROW
    EXECUTE FUNCTION update_playlist_boards_updated_at();

-- 4) RLS Policies
ALTER TABLE public.playlist_boards ENABLE ROW LEVEL SECURITY;

-- Policy: El propietario puede leer y escribir su board
DROP POLICY IF EXISTS playlist_boards_owner_all ON public.playlist_boards;
CREATE POLICY playlist_boards_owner_all
    ON public.playlist_boards
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Cualquiera puede leer boards públicos (solo campos necesarios)
DROP POLICY IF EXISTS playlist_boards_public_read ON public.playlist_boards;
CREATE POLICY playlist_boards_public_read
    ON public.playlist_boards
    FOR SELECT
    USING (true);

-- 5) Función helper para generar slug único
CREATE OR REPLACE FUNCTION generate_unique_board_slug(base_slug TEXT, user_id_param UUID)
RETURNS TEXT AS $$
DECLARE
    final_slug TEXT;
    counter INT := 0;
BEGIN
    -- Sanitizar base_slug: lowercase, solo alfanuméricos y guiones
    base_slug := LOWER(REGEXP_REPLACE(base_slug, '[^a-z0-9-]', '', 'g'));
    
    -- Si queda vacío, usar 'user' + sufijo del user_id
    IF base_slug = '' OR LENGTH(base_slug) < 3 THEN
        base_slug := 'user-' || SUBSTRING(user_id_param::TEXT FROM 1 FOR 8);
    END IF;
    
    final_slug := base_slug;
    
    -- Buscar slug disponible
    WHILE EXISTS (SELECT 1 FROM public.playlist_boards WHERE slug = final_slug AND user_id != user_id_param) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- 6) Comentarios
COMMENT ON TABLE public.playlist_boards IS 'Boards personalizables de playlists para cada usuario';
COMMENT ON COLUMN public.playlist_boards.slug IS 'Slug único para URL pública: /u/[slug]';
COMMENT ON COLUMN public.playlist_boards.status_text IS 'Frase/estado del usuario (max 80 chars recomendado)';
COMMENT ON COLUMN public.playlist_boards.theme IS 'Tema visual: light, dark, pleia';
COMMENT ON COLUMN public.playlist_boards.font_title IS 'Fuente para display_name: inter, space_grotesk, sf_pro';
COMMENT ON COLUMN public.playlist_boards.font_status IS 'Fuente para status_text: inter, space_grotesk, sf_pro';

