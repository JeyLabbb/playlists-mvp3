-- ============================================================
-- SQL: Actualizar Status de Campañas Automáticas a ACTIVE
-- ============================================================
-- 
-- Problema: Las campañas automáticas (Welcome Founder Pass, Welcome Mail)
-- aparecen como SENT o DRAFT, cuando deberían ser ACTIVE
-- 
-- Solución: Actualizar todas las campañas automáticas a status = 'active'
-- ============================================================

-- 1. Actualizar Welcome Founder Pass a ACTIVE
UPDATE newsletter_campaigns
SET status = 'active',
    metadata = COALESCE(metadata, '{}'::jsonb) || '{"type": "automated", "mail_category": "welcome"}'::jsonb,
    updated_at = NOW()
WHERE title = 'Welcome Founder Pass';

-- 2. Actualizar Welcome_Mail a ACTIVE
UPDATE newsletter_campaigns
SET status = 'active',
    metadata = COALESCE(metadata, '{}'::jsonb) || '{"type": "automated", "mail_category": "welcome"}'::jsonb,
    updated_at = NOW()
WHERE title = 'Welcome_Mail';

-- 3. Asegurar que Out of Credits también está ACTIVE
UPDATE newsletter_campaigns
SET status = 'active',
    metadata = COALESCE(metadata, '{}'::jsonb) || '{"type": "automated", "mail_category": "retention"}'::jsonb,
    updated_at = NOW()
WHERE title = 'Out of Credits · Automático';

-- ============================================================
-- VERIFICACIÓN
-- ============================================================

-- Ver todas las campañas automáticas
SELECT 
  id,
  title,
  status,
  send_mode,
  metadata->>'type' as type,
  metadata->>'mail_category' as category,
  created_at
FROM newsletter_campaigns
WHERE title IN ('Welcome Founder Pass', 'Welcome_Mail', 'Out of Credits · Automático')
ORDER BY title;

-- Resultado esperado:
-- Todas deberían tener status = 'active'

-- ============================================================
-- ADICIONAL: Actualizar TODAS las campañas que sean automáticas
-- ============================================================

-- Si quieres actualizar todas las automáticas de una vez:
UPDATE newsletter_campaigns
SET status = 'active',
    updated_at = NOW()
WHERE send_mode = 'automatic' 
   OR metadata->>'automated' = 'true'
   OR metadata->>'type' = 'automated';

-- ============================================================
-- FIN
-- ============================================================

