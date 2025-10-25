-- Habilitar RLS (Row Level Security) en las tablas
-- Esto protege los datos de acceso público no autorizado

-- Habilitar RLS en tabla playlists
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS en tabla payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Crear políticas para playlists
-- Permitir que los usuarios vean solo sus propias playlists
CREATE POLICY "Users can view their own playlists" ON public.playlists
    FOR SELECT USING (auth.uid() = user_id OR user_email = auth.jwt() ->> 'email');

-- Permitir que los usuarios inserten sus propias playlists
CREATE POLICY "Users can insert their own playlists" ON public.playlists
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_email = auth.jwt() ->> 'email');

-- Permitir que los usuarios actualicen sus propias playlists
CREATE POLICY "Users can update their own playlists" ON public.playlists
    FOR UPDATE USING (auth.uid() = user_id OR user_email = auth.jwt() ->> 'email');

-- Permitir que los usuarios eliminen sus propias playlists
CREATE POLICY "Users can delete their own playlists" ON public.playlists
    FOR DELETE USING (auth.uid() = user_id OR user_email = auth.jwt() ->> 'email');

-- Crear políticas para payments
-- Permitir que los usuarios vean solo sus propios pagos
CREATE POLICY "Users can view their own payments" ON public.payments
    FOR SELECT USING (auth.uid() = user_id OR user_email = auth.jwt() ->> 'email');

-- Permitir que los usuarios inserten sus propios pagos
CREATE POLICY "Users can insert their own payments" ON public.payments
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_email = auth.jwt() ->> 'email');

-- Permitir que los usuarios actualicen sus propios pagos
CREATE POLICY "Users can update their own payments" ON public.payments
    FOR UPDATE USING (auth.uid() = user_id OR user_email = auth.jwt() ->> 'email');

-- Permitir que los usuarios eliminen sus propios pagos
CREATE POLICY "Users can delete their own payments" ON public.payments
    FOR DELETE USING (auth.uid() = user_id OR user_email = auth.jwt() ->> 'email');

-- Política especial para el servicio admin (usando SERVICE_ROLE_KEY)
-- Esto permite que el backend acceda a todos los datos
CREATE POLICY "Service role can do everything on playlists" ON public.playlists
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything on payments" ON public.payments
    FOR ALL USING (auth.role() = 'service_role');

-- Verificar que RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('playlists', 'payments')
ORDER BY tablename;
