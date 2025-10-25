-- Script SQL para crear las tablas de métricas en Supabase
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Crear tabla prompts (ya existe y funciona)
-- CREATE TABLE IF NOT EXISTS public.prompts (
--   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--   user_email TEXT NOT NULL,
--   text TEXT NOT NULL,
--   source TEXT DEFAULT 'web',
--   created_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- 2. Crear tabla usage_events
CREATE TABLE IF NOT EXISTS public.usage_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_prompts_user_email ON public.prompts(user_email);
CREATE INDEX IF NOT EXISTS idx_prompts_created_at ON public.prompts(created_at);

CREATE INDEX IF NOT EXISTS idx_usage_events_user_email ON public.usage_events(user_email);
CREATE INDEX IF NOT EXISTS idx_usage_events_created_at ON public.usage_events(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_events_action ON public.usage_events(action);

-- 4. Verificar que las tablas se crearon correctamente
SELECT 'prompts' as table_name, COUNT(*) as row_count FROM public.prompts
UNION ALL
SELECT 'usage_events' as table_name, COUNT(*) as row_count FROM public.usage_events
UNION ALL
SELECT 'profiles' as table_name, COUNT(*) as row_count FROM public.profiles;
