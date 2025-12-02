-- ========================================
-- MIGRATION COMPLETA PARA NEWSLETTER TRACKING
-- Ejecuta este script COMPLETO en Supabase SQL Editor
-- ========================================

-- 1. Añadir columna para excluir mails de tracking
ALTER TABLE newsletter_campaigns 
ADD COLUMN IF NOT EXISTS excluded_from_tracking BOOLEAN DEFAULT FALSE;

-- 2. Añadir columna para categoría de mail
ALTER TABLE newsletter_campaigns 
ADD COLUMN IF NOT EXISTS mail_category TEXT DEFAULT 'general';

-- 3. Añadir columnas para A/B testing (si no existen)
ALTER TABLE newsletter_campaigns 
ADD COLUMN IF NOT EXISTS ab_test_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE newsletter_campaigns 
ADD COLUMN IF NOT EXISTS subject_b TEXT;

ALTER TABLE newsletter_campaigns 
ADD COLUMN IF NOT EXISTS test_duration INTEGER DEFAULT 24;

ALTER TABLE newsletter_campaigns 
ADD COLUMN IF NOT EXISTS test_duration_unit TEXT DEFAULT 'hours';

ALTER TABLE newsletter_campaigns 
ADD COLUMN IF NOT EXISTS winner_criteria TEXT DEFAULT 'opens';

ALTER TABLE newsletter_campaigns 
ADD COLUMN IF NOT EXISTS ab_test_evaluated_at TIMESTAMPTZ;

ALTER TABLE newsletter_campaigns 
ADD COLUMN IF NOT EXISTS ab_test_winner TEXT;

-- 4. Añadir columna para template_mode (si no existe)
ALTER TABLE newsletter_campaigns 
ADD COLUMN IF NOT EXISTS template_mode TEXT DEFAULT 'custom';

-- 5. Añadir columna para tracking_enabled (si no existe)
ALTER TABLE newsletter_campaigns 
ADD COLUMN IF NOT EXISTS tracking_enabled BOOLEAN DEFAULT TRUE;

-- 6. Añadir columna ab_test_group en newsletter_campaign_recipients (si no existe)
ALTER TABLE newsletter_campaign_recipients 
ADD COLUMN IF NOT EXISTS ab_test_group TEXT;

-- 7. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_campaigns_excluded_tracking 
ON newsletter_campaigns(excluded_from_tracking);

CREATE INDEX IF NOT EXISTS idx_campaigns_mail_category 
ON newsletter_campaigns(mail_category);

CREATE INDEX IF NOT EXISTS idx_campaigns_ab_test 
ON newsletter_campaigns(ab_test_enabled, ab_test_evaluated_at);

CREATE INDEX IF NOT EXISTS idx_recipients_ab_group 
ON newsletter_campaign_recipients(ab_test_group);

-- 8. Añadir comentarios a las columnas
COMMENT ON COLUMN newsletter_campaigns.excluded_from_tracking IS 'Si es true, esta campaña no se incluye en las métricas de tracking globales';
COMMENT ON COLUMN newsletter_campaigns.mail_category IS 'Categoría del mail: welcome, founder, update, promo, general';
COMMENT ON COLUMN newsletter_campaigns.ab_test_enabled IS 'Si está habilitado el A/B testing para esta campaña';
COMMENT ON COLUMN newsletter_campaigns.subject_b IS 'Asunto alternativo B para A/B testing';
COMMENT ON COLUMN newsletter_campaigns.template_mode IS 'Modo de plantilla: custom, pleia, minimal';

-- 9. Añadir constraint para mail_category
DO $$ BEGIN
  ALTER TABLE newsletter_campaigns 
  ADD CONSTRAINT check_mail_category 
  CHECK (mail_category IN ('welcome', 'founder', 'update', 'promo', 'general'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 10. Añadir constraint para template_mode
DO $$ BEGIN
  ALTER TABLE newsletter_campaigns 
  ADD CONSTRAINT check_template_mode 
  CHECK (template_mode IN ('custom', 'pleia', 'minimal'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ========================================
-- 11. Crear campaña de Welcome Founder Pass
-- ========================================

DO $$
DECLARE
  v_campaign_id uuid;
BEGIN
  -- Buscar si ya existe una campaña de bienvenida a founders
  SELECT id INTO v_campaign_id
  FROM newsletter_campaigns
  WHERE subject LIKE '%Bienvenido al grupo FOUNDERS%'
  LIMIT 1;

  -- Si no existe, crearla
  IF v_campaign_id IS NULL THEN
    INSERT INTO newsletter_campaigns (
      title,
      subject,
      body,
      status,
      send_mode,
      mail_category,
      tracking_enabled,
      template_mode,
      created_at,
      updated_at
    ) VALUES (
      'Welcome Founder Pass',
      '¡Bienvenido al grupo FOUNDERS de PLEIA! 🎵',
      E'Hola,\n\n¡Qué emoción tenerte con nosotros desde el principio! 🚀\n\nAl formar parte del grupo FOUNDERS, no solo tienes acceso a playlists ilimitadas, sino que también disfrutarás de:\n\n🎯 Beneficios exclusivos de FOUNDERS:\n✨ Playlists ilimitadas - Genera todas las que quieras\n✨ Trato cercano - Feedback directo con nuestro equipo\n✨ Actualizaciones exclusivas - Sé el primero en probar nuevas funciones\n✨ Pruebas privadas - Acceso anticipado a features\n✨ Sistema de puntos - Gana puntos por uso y feedback\n✨ Jerarquías especiales - Preferencias según tu apoyo\n✨ Regalos exclusivos - Merchandising y sorpresas\n\nTu apoyo y feedback son fundamentales para hacer de PLEIA la mejor plataforma de música con IA. ¡Juntos vamos a revolucionar cómo descubrimos música! 🎶',
      'sent',
      'immediate',
      'founder',
      TRUE,
      'pleia',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_campaign_id;

    RAISE NOTICE 'Campaña Welcome Founder Pass creada con ID: %', v_campaign_id;
  ELSE
    -- Si existe, actualizarla para asegurar que tiene la categoría correcta
    UPDATE newsletter_campaigns
    SET 
      mail_category = 'founder',
      tracking_enabled = TRUE,
      template_mode = 'pleia',
      updated_at = NOW()
    WHERE id = v_campaign_id;

    RAISE NOTICE 'Campaña Welcome Founder Pass ya existe con ID: %', v_campaign_id;
  END IF;
END $$;

-- ========================================
-- 12. Verificación de la instalación
-- ========================================

-- Verificar que todas las columnas se añadieron correctamente
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'newsletter_campaigns' 
  AND column_name IN (
    'excluded_from_tracking',
    'mail_category',
    'ab_test_enabled',
    'subject_b',
    'test_duration',
    'test_duration_unit',
    'winner_criteria',
    'ab_test_evaluated_at',
    'ab_test_winner',
    'template_mode',
    'tracking_enabled'
  )
ORDER BY column_name;

-- Verificar que la columna ab_test_group se añadió a recipients
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'newsletter_campaign_recipients' 
  AND column_name = 'ab_test_group';

-- Ver la campaña de Welcome Founder Pass
SELECT 
  id,
  title,
  subject,
  mail_category,
  status,
  tracking_enabled,
  template_mode,
  excluded_from_tracking,
  created_at
FROM newsletter_campaigns
WHERE title = 'Welcome Founder Pass'
   OR subject LIKE '%Bienvenido al grupo FOUNDERS%';

-- Ver estadísticas de campañas por categoría
SELECT 
  mail_category,
  COUNT(*) as total_campaigns,
  SUM(CASE WHEN excluded_from_tracking THEN 1 ELSE 0 END) as excluded_count,
  SUM(CASE WHEN tracking_enabled THEN 1 ELSE 0 END) as tracking_enabled_count,
  SUM(CASE WHEN ab_test_enabled THEN 1 ELSE 0 END) as ab_test_count
FROM newsletter_campaigns
GROUP BY mail_category
ORDER BY total_campaigns DESC;

-- ========================================
-- ✅ MIGRATION COMPLETADA
-- ========================================
-- Si ves resultados sin errores arriba, la migración fue exitosa.
-- Reinicia tu aplicación Next.js para que los cambios tengan efecto.

