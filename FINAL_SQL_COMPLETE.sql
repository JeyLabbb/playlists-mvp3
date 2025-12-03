-- ============================================
-- SETUP COMPLETO DE NEWSLETTER + A/B TESTING
-- ============================================
-- Ejecutar TODO este archivo en Supabase SQL Editor
-- Autor: PLEIA Admin System
-- Fecha: Diciembre 2024
-- ============================================

-- ============================================
-- 1. AÑADIR CAMPOS DE A/B TESTING Y CATEGORIZACIÓN
-- ============================================

ALTER TABLE newsletter_campaigns
ADD COLUMN IF NOT EXISTS mail_category TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS ab_test_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS subject_b TEXT,
ADD COLUMN IF NOT EXISTS test_duration INTEGER,
ADD COLUMN IF NOT EXISTS test_duration_unit TEXT CHECK (test_duration_unit IN ('hours', 'days')),
ADD COLUMN IF NOT EXISTS winner_criteria TEXT CHECK (winner_criteria IN ('opens', 'clicks', 'ctr', 'combined')),
ADD COLUMN IF NOT EXISTS ab_test_winner TEXT CHECK (ab_test_winner IN ('A', 'B')),
ADD COLUMN IF NOT EXISTS ab_test_evaluated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS template_mode TEXT DEFAULT 'pleia';

ALTER TABLE newsletter_campaign_recipients
ADD COLUMN IF NOT EXISTS ab_test_variant TEXT CHECK (ab_test_variant IN ('A', 'B', 'holdout'));

-- ============================================
-- 2. CREAR ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_campaigns_mail_category ON newsletter_campaigns(mail_category);
CREATE INDEX IF NOT EXISTS idx_campaigns_ab_test ON newsletter_campaigns(ab_test_enabled, ab_test_winner);
CREATE INDEX IF NOT EXISTS idx_campaigns_template_mode ON newsletter_campaigns(template_mode);
CREATE INDEX IF NOT EXISTS idx_recipients_variant ON newsletter_campaign_recipients(campaign_id, ab_test_variant);
CREATE INDEX IF NOT EXISTS idx_recipients_status ON newsletter_campaign_recipients(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_recipients_tracking ON newsletter_campaign_recipients(campaign_id, opened_at, clicked_at);

-- ============================================
-- 3. AÑADIR COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================

COMMENT ON COLUMN newsletter_campaigns.mail_category IS 'Categoría del mail: welcome, founder, update, general, promo';
COMMENT ON COLUMN newsletter_campaigns.ab_test_enabled IS 'Si esta campaña usa A/B testing de asuntos';
COMMENT ON COLUMN newsletter_campaigns.subject_b IS 'Asunto alternativo para variante B en A/B test';
COMMENT ON COLUMN newsletter_campaigns.test_duration IS 'Duración del test antes de evaluar ganador';
COMMENT ON COLUMN newsletter_campaigns.test_duration_unit IS 'Unidad de tiempo: hours o days';
COMMENT ON COLUMN newsletter_campaigns.winner_criteria IS 'Criterio para elegir ganador: opens, clicks, ctr, combined';
COMMENT ON COLUMN newsletter_campaigns.ab_test_winner IS 'Variante ganadora después de evaluar: A o B';
COMMENT ON COLUMN newsletter_campaigns.ab_test_evaluated_at IS 'Timestamp cuando se evaluó el ganador';
COMMENT ON COLUMN newsletter_campaigns.template_mode IS 'Modo de plantilla: custom, pleia, minimal';
COMMENT ON COLUMN newsletter_campaign_recipients.ab_test_variant IS 'Variante asignada: A (25%), B (25%), o holdout (50%)';

-- ============================================
-- 4. ACTUALIZAR CAMPAÑAS EXISTENTES
-- ============================================

UPDATE newsletter_campaigns 
SET mail_category = 'general' 
WHERE mail_category IS NULL;

UPDATE newsletter_campaigns 
SET template_mode = 'pleia' 
WHERE template_mode IS NULL;

-- ============================================
-- 5. INSERTAR PLANTILLAS PRE-HECHAS
-- ============================================

-- Plantilla PLEIA Visual (La Mítica)
INSERT INTO newsletter_templates (
  id,
  name,
  description,
  subject,
  body,
  primary_cta,
  secondary_cta,
  is_default,
  created_by,
  created_at,
  updated_at
) VALUES (
  'pleia-visual-template',
  '🎨 Plantilla PLEIA Visual',
  'La plantilla mítica de PLEIA con gradientes vibrantes, fondos oscuros premium y efectos visuales impactantes. Ideal para anuncios importantes, lanzamientos y actualizaciones que merecen destacar. Incluye dos CTAs para maximizar engagement.',
  '🎵 Novedades en PLEIA',
  'Hola 👋

Tenemos novedades emocionantes que compartir contigo.

PLEIA sigue evolucionando para darte la mejor experiencia creando playlists con IA.

Cada actualización está diseñada pensando en ti y en cómo hacer tu experiencia musical aún más mágica.

¡Gracias por ser parte de nuestra comunidad!',
  '{"label": "Crear playlist con IA", "url": "https://playlists.jeylabbb.com"}',
  '{"label": "Explorar trending", "url": "https://playlists.jeylabbb.com/trending"}',
  true,
  'system',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  primary_cta = EXCLUDED.primary_cta,
  secondary_cta = EXCLUDED.secondary_cta,
  is_default = EXCLUDED.is_default,
  updated_at = NOW();

-- Plantilla Minimal (Enfocada en Texto)
INSERT INTO newsletter_templates (
  id,
  name,
  description,
  subject,
  body,
  primary_cta,
  secondary_cta,
  is_default,
  created_by,
  created_at,
  updated_at
) VALUES (
  'pleia-minimal-template',
  '📄 Plantilla Minimal',
  'Diseño limpio y minimalista con colores sutiles de PLEIA. Enfocada en la legibilidad del texto y el mensaje. Perfecta para comunicaciones importantes, anuncios serios o contenido que requiere atención y reflexión. Un solo CTA principal para no distraer del mensaje.',
  'Una actualización importante de PLEIA',
  'Hola,

Queremos compartir contigo algo importante.

Este es un mensaje directo, sin distracciones visuales, porque el contenido merece toda tu atención.

PLEIA está aquí para crear las mejores experiencias musicales para ti, y cada decisión que tomamos está pensada para mejorar tu día a día.

Nos tomamos muy en serio nuestro compromiso contigo.

Gracias por tu confianza y por leernos.

El equipo de PLEIA',
  '{"label": "Continuar leyendo", "url": "https://playlists.jeylabbb.com"}',
  NULL,
  false,
  'system',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  primary_cta = EXCLUDED.primary_cta,
  secondary_cta = EXCLUDED.secondary_cta,
  is_default = EXCLUDED.is_default,
  updated_at = NOW();

-- ============================================
-- 6. CREAR FUNCIÓN HELPER PARA CALCULAR MÉTRICAS
-- ============================================

CREATE OR REPLACE FUNCTION get_campaign_metrics(campaign_uuid UUID)
RETURNS TABLE (
  total_recipients INTEGER,
  sent INTEGER,
  opened INTEGER,
  clicked INTEGER,
  open_rate NUMERIC,
  ctr NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_recipients,
    COUNT(*) FILTER (WHERE status = 'sent')::INTEGER as sent,
    COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::INTEGER as opened,
    COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::INTEGER as clicked,
    CASE 
      WHEN COUNT(*) FILTER (WHERE status = 'sent') > 0 
      THEN (COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::NUMERIC / COUNT(*) FILTER (WHERE status = 'sent')::NUMERIC * 100)
      ELSE 0 
    END as open_rate,
    CASE 
      WHEN COUNT(*) FILTER (WHERE opened_at IS NOT NULL) > 0 
      THEN (COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::NUMERIC / COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::NUMERIC * 100)
      ELSE 0 
    END as ctr
  FROM newsletter_campaign_recipients
  WHERE campaign_id = campaign_uuid;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. CREAR VISTA PARA TRACKING POR CATEGORÍA
-- ============================================

CREATE OR REPLACE VIEW newsletter_metrics_by_category AS
SELECT
  c.mail_category,
  COUNT(DISTINCT c.id) as total_campaigns,
  COUNT(r.id) as total_recipients,
  COUNT(r.id) FILTER (WHERE r.status = 'sent') as total_sent,
  COUNT(r.id) FILTER (WHERE r.opened_at IS NOT NULL) as total_opened,
  COUNT(r.id) FILTER (WHERE r.clicked_at IS NOT NULL) as total_clicked,
  CASE 
    WHEN COUNT(r.id) FILTER (WHERE r.status = 'sent') > 0 
    THEN (COUNT(r.id) FILTER (WHERE r.opened_at IS NOT NULL)::NUMERIC / COUNT(r.id) FILTER (WHERE r.status = 'sent')::NUMERIC * 100)
    ELSE 0 
  END as avg_open_rate,
  CASE 
    WHEN COUNT(r.id) FILTER (WHERE r.opened_at IS NOT NULL) > 0 
    THEN (COUNT(r.id) FILTER (WHERE r.clicked_at IS NOT NULL)::NUMERIC / COUNT(r.id) FILTER (WHERE r.opened_at IS NOT NULL)::NUMERIC * 100)
    ELSE 0 
  END as avg_ctr
FROM newsletter_campaigns c
LEFT JOIN newsletter_campaign_recipients r ON c.id = r.campaign_id
WHERE c.mail_category IS NOT NULL
GROUP BY c.mail_category;

-- ============================================
-- 8. VERIFICAR INSTALACIÓN
-- ============================================

DO $$
DECLARE
  campaign_cols INTEGER;
  recipient_cols INTEGER;
  template_count INTEGER;
  function_exists BOOLEAN;
  view_exists BOOLEAN;
BEGIN
  -- Contar columnas añadidas en campaigns
  SELECT COUNT(*) INTO campaign_cols
  FROM information_schema.columns
  WHERE table_name = 'newsletter_campaigns'
  AND column_name IN ('mail_category', 'ab_test_enabled', 'subject_b', 'test_duration', 
                       'test_duration_unit', 'winner_criteria', 'ab_test_winner', 
                       'ab_test_evaluated_at', 'template_mode');
  
  -- Contar columnas añadidas en recipients
  SELECT COUNT(*) INTO recipient_cols
  FROM information_schema.columns
  WHERE table_name = 'newsletter_campaign_recipients'
  AND column_name = 'ab_test_variant';
  
  -- Contar plantillas
  SELECT COUNT(*) INTO template_count
  FROM newsletter_templates
  WHERE created_by = 'system';
  
  -- Verificar función
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_campaign_metrics'
  ) INTO function_exists;
  
  -- Verificar vista
  SELECT EXISTS (
    SELECT 1 FROM information_schema.views WHERE table_name = 'newsletter_metrics_by_category'
  ) INTO view_exists;
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ INSTALACIÓN COMPLETADA';
  RAISE NOTICE '============================================';
  RAISE NOTICE '  ✓ Columnas en campaigns: % de 9', campaign_cols;
  RAISE NOTICE '  ✓ Columnas en recipients: % de 1', recipient_cols;
  RAISE NOTICE '  ✓ Plantillas instaladas: %', template_count;
  RAISE NOTICE '  ✓ Función get_campaign_metrics: %', CASE WHEN function_exists THEN 'Creada' ELSE 'Error' END;
  RAISE NOTICE '  ✓ Vista metrics_by_category: %', CASE WHEN view_exists THEN 'Creada' ELSE 'Error' END;
  RAISE NOTICE '';
  
  IF campaign_cols >= 9 AND recipient_cols = 1 AND template_count >= 2 AND function_exists AND view_exists THEN
    RAISE NOTICE '🎉 Sistema de Newsletter completo y listo!';
    RAISE NOTICE '';
    RAISE NOTICE 'Características instaladas:';
    RAISE NOTICE '  • A/B Testing automático';
    RAISE NOTICE '  • Tracking por categoría de mail';
    RAISE NOTICE '  • 2 Plantillas premium (PLEIA Visual + Minimal)';
    RAISE NOTICE '  • Sistema de unsubscribe';
    RAISE NOTICE '  • Métricas avanzadas';
    RAISE NOTICE '';
    RAISE NOTICE 'Siguiente paso: Configurar CRON_SECRET en Vercel';
  ELSE
    RAISE WARNING '⚠️ Puede que falten algunos elementos:';
    IF campaign_cols < 9 THEN
      RAISE WARNING '  - Faltan columnas en campaigns (esperadas: 9, encontradas: %)', campaign_cols;
    END IF;
    IF recipient_cols < 1 THEN
      RAISE WARNING '  - Falta columna ab_test_variant en recipients';
    END IF;
    IF template_count < 2 THEN
      RAISE WARNING '  - Faltan plantillas (esperadas: 2, encontradas: %)', template_count;
    END IF;
    IF NOT function_exists THEN
      RAISE WARNING '  - Función get_campaign_metrics no creada';
    END IF;
    IF NOT view_exists THEN
      RAISE WARNING '  - Vista newsletter_metrics_by_category no creada';
    END IF;
  END IF;
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
END $$;

-- ============================================
-- 9. MOSTRAR PLANTILLAS INSTALADAS
-- ============================================

SELECT 
  name as "Plantilla",
  CASE 
    WHEN is_default THEN '⭐ Default'
    ELSE '  Regular'
  END as "Estado",
  LEFT(description, 80) as "Descripción",
  created_at as "Creada"
FROM newsletter_templates
WHERE created_by = 'system'
ORDER BY is_default DESC, created_at ASC;

-- ============================================
-- 10. MOSTRAR RESUMEN DE CONFIGURACIÓN
-- ============================================

SELECT 
  'Campañas con A/B Test' as "Métrica",
  COUNT(*) as "Valor"
FROM newsletter_campaigns
WHERE ab_test_enabled = true

UNION ALL

SELECT 
  'Campañas por Categoría' as "Métrica",
  mail_category as "Valor"
FROM newsletter_campaigns
WHERE mail_category IS NOT NULL
GROUP BY mail_category

UNION ALL

SELECT 
  'Total de Plantillas' as "Métrica",
  COUNT(*)::TEXT as "Valor"
FROM newsletter_templates;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================

-- Si ves el mensaje "🎉 Sistema de Newsletter completo y listo!" arriba,
-- significa que todo está instalado correctamente.
--
-- Próximos pasos:
-- 1. Configurar CRON_SECRET en Vercel (ver VERCEL_CRON_SETUP.md)
-- 2. Deploy del proyecto
-- 3. Verificar que el cron job se activa
-- 4. ¡Crear tu primera campaña con A/B testing!


