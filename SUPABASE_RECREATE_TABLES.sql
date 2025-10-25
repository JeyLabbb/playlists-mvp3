-- Script para recrear las tablas con el esquema correcto
-- ⚠️ ESTE SCRIPT ELIMINARÁ TODOS LOS DATOS EXISTENTES EN ESTAS TABLAS

-- Eliminar tablas existentes (si existen)
DROP TABLE IF EXISTS public.playlists CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;

-- Crear tabla playlists con el esquema correcto
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

-- Crear tabla payments con el esquema correcto
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

-- Crear índices para playlists
CREATE INDEX idx_playlists_user_email ON public.playlists(user_email);
CREATE INDEX idx_playlists_user_id ON public.playlists(user_id);
CREATE INDEX idx_playlists_created_at ON public.playlists(created_at);
CREATE INDEX idx_playlists_spotify_id ON public.playlists(spotify_id);

-- Crear índices para payments
CREATE INDEX idx_payments_user_email ON public.payments(user_email);
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_stripe_payment_intent_id ON public.payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_created_at ON public.payments(created_at);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_plan ON public.payments(plan);

-- Verificar que las tablas se crearon correctamente
SELECT 
  'playlists' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'playlists'
ORDER BY ordinal_position

UNION ALL

SELECT 
  'payments' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'payments'
ORDER BY ordinal_position;
