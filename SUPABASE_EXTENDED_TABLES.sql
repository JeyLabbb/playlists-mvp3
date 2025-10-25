-- Crear tabla playlists
CREATE TABLE IF NOT EXISTS public.playlists (
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

-- Crear tabla payments
CREATE TABLE IF NOT EXISTS public.payments (
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
CREATE INDEX IF NOT EXISTS idx_playlists_user_email ON public.playlists(user_email);
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON public.playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_created_at ON public.playlists(created_at);
CREATE INDEX IF NOT EXISTS idx_playlists_spotify_id ON public.playlists(spotify_id);

-- Crear índices para payments
CREATE INDEX IF NOT EXISTS idx_payments_user_email ON public.payments(user_email);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id ON public.payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_plan ON public.payments(plan);
