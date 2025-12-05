-- Crear tabla usage_events en Supabase
-- Ejecutar este script en el SQL Editor de Supabase

CREATE TABLE IF NOT EXISTS public.usage_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_usage_events_user_email ON public.usage_events(user_email);
CREATE INDEX IF NOT EXISTS idx_usage_events_created_at ON public.usage_events(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_events_action ON public.usage_events(action);

-- Verificar que la tabla se creó correctamente
SELECT 'usage_events' as table_name, COUNT(*) as row_count FROM public.usage_events;
