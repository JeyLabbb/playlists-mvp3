-- Script para crear tablas extendidas en Supabase
-- Ejecutar en el SQL Editor de Supabase

-- Verificar y crear tabla playlists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'playlists') THEN
        CREATE TABLE public.playlists (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_email TEXT NOT NULL,
            user_id UUID REFERENCES auth.users(id),
            playlist_name TEXT NOT NULL,
            prompt TEXT NOT NULL,
            spotify_url TEXT,
            spotify_id TEXT,
            track_count INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Crear índices para playlists
        CREATE INDEX idx_playlists_user_email ON public.playlists(user_email);
        CREATE INDEX idx_playlists_user_id ON public.playlists(user_id);
        CREATE INDEX idx_playlists_created_at ON public.playlists(created_at);
        CREATE INDEX idx_playlists_spotify_id ON public.playlists(spotify_id);
        
        RAISE NOTICE 'Tabla playlists creada exitosamente';
    ELSE
        RAISE NOTICE 'Tabla playlists ya existe';
    END IF;
END $$;

-- Verificar y crear tabla payments
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
        CREATE TABLE public.payments (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_email TEXT NOT NULL,
            user_id UUID REFERENCES auth.users(id),
            stripe_payment_intent_id TEXT,
            stripe_customer_id TEXT,
            amount INTEGER NOT NULL, -- en centavos
            currency TEXT DEFAULT 'eur',
            plan TEXT NOT NULL, -- 'founder', 'pro', etc.
            status TEXT NOT NULL, -- 'completed', 'failed', 'pending'
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Crear índices para payments
        CREATE INDEX idx_payments_user_email ON public.payments(user_email);
        CREATE INDEX idx_payments_user_id ON public.payments(user_id);
        CREATE INDEX idx_payments_stripe_payment_intent_id ON public.payments(stripe_payment_intent_id);
        CREATE INDEX idx_payments_created_at ON public.payments(created_at);
        CREATE INDEX idx_payments_status ON public.payments(status);
        CREATE INDEX idx_payments_plan ON public.payments(plan);
        
        RAISE NOTICE 'Tabla payments creada exitosamente';
    ELSE
        RAISE NOTICE 'Tabla payments ya existe';
    END IF;
END $$;

-- Verificar que las tablas existen
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('playlists', 'payments')
ORDER BY table_name, ordinal_position;
