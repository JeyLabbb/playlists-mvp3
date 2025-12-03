-- ============================================
-- SETUP COMPLETO DE NEWSLETTER CON A/B TESTING
-- ============================================
-- Ejecutar en Supabase SQL Editor
-- Autor: PLEIA Admin System
-- Fecha: Diciembre 2024

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
ADD COLUMN IF NOT EXISTS ab_test_evaluated_at TIMESTAMPTZ;

ALTER TABLE newsletter_campaign_recipients
ADD COLUMN IF NOT EXISTS ab_test_variant TEXT CHECK (ab_test_variant IN ('A', 'B', 'holdout'));

-- ============================================
-- 2. CREAR ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_campaigns_mail_category ON newsletter_campaigns(mail_category);
CREATE INDEX IF NOT EXISTS idx_campaigns_ab_test ON newsletter_campaigns(ab_test_enabled, ab_test_winner);
CREATE INDEX IF NOT EXISTS idx_recipients_variant ON newsletter_campaign_recipients(campaign_id, ab_test_variant);
CREATE INDEX IF NOT EXISTS idx_recipients_status ON newsletter_campaign_recipients(campaign_id, status);

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
COMMENT ON COLUMN newsletter_campaign_recipients.ab_test_variant IS 'Variante asignada: A (25%), B (25%), o holdout (50%)';

-- ============================================
-- 4. ACTUALIZAR CAMPAÑAS EXISTENTES
-- ============================================

UPDATE newsletter_campaigns 
SET mail_category = 'general' 
WHERE mail_category IS NULL;

-- ============================================
-- 5. INSERTAR PLANTILLAS PRE-HECHAS
-- ============================================

-- Plantilla PLEIA (Visual - La mítica)
INSERT INTO newsletter_templates (
  name,
  description,
  subject,
  body,
  primary_cta,
  secondary_cta,
  is_default,
  created_by
) VALUES (
  'Plantilla PLEIA Visual',
  'La plantilla mítica de PLEIA con gradientes y colores vibrantes. Ideal para anuncios y actualizaciones importantes.',
  '🎵 Novedades en PLEIA',
  'Hola 👋

Tenemos novedades emocionantes que compartir contigo.

PLEIA sigue evolucionando para darte la mejor experiencia creando playlists con IA.

¡Gracias por ser parte de nuestra comunidad!',
  '{"label": "Crear playlist con IA", "url": "https://playlists.jeylabbb.com"}',
  '{"label": "Explorar trending", "url": "https://playlists.jeylabbb.com/trending"}',
  true,
  'system'
) ON CONFLICT DO NOTHING;

-- Plantilla Minimal (Texto enfocado)
INSERT INTO newsletter_templates (
  name,
  description,
  subject,
  body,
  primary_cta,
  secondary_cta,
  is_default,
  created_by
) VALUES (
  'Plantilla Minimal',
  'Plantilla minimalista con colores sutiles de PLEIA. Enfocada en legibilidad y el mensaje. Perfecta para comunicaciones importantes donde el texto es protagonista.',
  'Una actualización importante',
  'Hola,

Queremos compartir contigo algo importante.

Este es un mensaje directo, sin distracciones visuales, porque el contenido merece toda tu atención.

PLEIA está aquí para crear las mejores experiencias musicales para ti.

Gracias por leernos.',
  '{"label": "Continuar leyendo", "url": "https://playlists.jeylabbb.com"}',
  NULL,
  false,
  'system'
) ON CONFLICT DO NOTHING;

-- ============================================
-- 6. VERIFICAR INSTALACIÓN
-- ============================================

DO $$
DECLARE
  campaign_cols INTEGER;
  recipient_cols INTEGER;
  template_count INTEGER;
BEGIN
  -- Contar columnas añadidas en campaigns
  SELECT COUNT(*) INTO campaign_cols
  FROM information_schema.columns
  WHERE table_name = 'newsletter_campaigns'
  AND column_name IN ('mail_category', 'ab_test_enabled', 'subject_b', 'test_duration', 'test_duration_unit', 'winner_criteria', 'ab_test_winner', 'ab_test_evaluated_at');
  
  -- Contar columnas añadidas en recipients
  SELECT COUNT(*) INTO recipient_cols
  FROM information_schema.columns
  WHERE table_name = 'newsletter_campaign_recipients'
  AND column_name = 'ab_test_variant';
  
  -- Contar plantillas
  SELECT COUNT(*) INTO template_count
  FROM newsletter_templates
  WHERE created_by = 'system';
  
  RAISE NOTICE '✅ INSTALACIÓN COMPLETADA';
  RAISE NOTICE '  - Columnas en campaigns: % de 8', campaign_cols;
  RAISE NOTICE '  - Columnas en recipients: % de 1', recipient_cols;
  RAISE NOTICE '  - Plantillas instaladas: %', template_count;
  
  IF campaign_cols = 8 AND recipient_cols = 1 AND template_count >= 2 THEN
    RAISE NOTICE '🎉 Sistema de A/B Testing listo para usar!';
  ELSE
    RAISE WARNING '⚠️ Puede que falten algunos elementos. Revisa los logs.';
  END IF;
END $$;

-- ============================================
-- 7. MOSTRAR PLANTILLAS INSTALADAS
-- ============================================

SELECT 
  name,
  description,
  is_default,
  created_at
FROM newsletter_templates
WHERE created_by = 'system'
ORDER BY is_default DESC, created_at DESC;


