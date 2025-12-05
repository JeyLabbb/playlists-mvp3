-- ========================================
-- SQL COMPLETO - FIXES Y MEJORAS
-- Ejecuta todo este script de una vez
-- ========================================

-- 1. Añadir columna mail_category si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'newsletter_campaigns' 
    AND column_name = 'mail_category'
  ) THEN
    ALTER TABLE newsletter_campaigns 
    ADD COLUMN mail_category TEXT DEFAULT 'general';
    
    RAISE NOTICE 'Columna mail_category añadida';
  ELSE
    RAISE NOTICE 'Columna mail_category ya existe';
  END IF;
END $$;

-- 2. Añadir columna excluded_from_tracking si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'newsletter_campaigns' 
    AND column_name = 'excluded_from_tracking'
  ) THEN
    ALTER TABLE newsletter_campaigns 
    ADD COLUMN excluded_from_tracking BOOLEAN DEFAULT FALSE;
    
    RAISE NOTICE 'Columna excluded_from_tracking añadida';
  ELSE
    RAISE NOTICE 'Columna excluded_from_tracking ya existe';
  END IF;
END $$;

-- 3. Añadir columna template_mode si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'newsletter_campaigns' 
    AND column_name = 'template_mode'
  ) THEN
    ALTER TABLE newsletter_campaigns 
    ADD COLUMN template_mode TEXT DEFAULT 'custom';
    
    RAISE NOTICE 'Columna template_mode añadida';
  ELSE
    RAISE NOTICE 'Columna template_mode ya existe';
  END IF;
END $$;

-- 4. Añadir columnas de A/B testing si no existen (del script anterior)
DO $$ 
BEGIN
  -- ab_test_enabled
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'newsletter_campaigns' 
    AND column_name = 'ab_test_enabled'
  ) THEN
    ALTER TABLE newsletter_campaigns ADD COLUMN ab_test_enabled BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Columna ab_test_enabled añadida';
  END IF;

  -- subject_b
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'newsletter_campaigns' 
    AND column_name = 'subject_b'
  ) THEN
    ALTER TABLE newsletter_campaigns ADD COLUMN subject_b TEXT;
    RAISE NOTICE 'Columna subject_b añadida';
  END IF;

  -- test_duration
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'newsletter_campaigns' 
    AND column_name = 'test_duration'
  ) THEN
    ALTER TABLE newsletter_campaigns ADD COLUMN test_duration INTEGER DEFAULT 24;
    RAISE NOTICE 'Columna test_duration añadida';
  END IF;

  -- test_duration_unit
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'newsletter_campaigns' 
    AND column_name = 'test_duration_unit'
  ) THEN
    ALTER TABLE newsletter_campaigns ADD COLUMN test_duration_unit TEXT DEFAULT 'hours';
    RAISE NOTICE 'Columna test_duration_unit añadida';
  END IF;

  -- winner_criteria
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'newsletter_campaigns' 
    AND column_name = 'winner_criteria'
  ) THEN
    ALTER TABLE newsletter_campaigns ADD COLUMN winner_criteria TEXT DEFAULT 'opens';
    RAISE NOTICE 'Columna winner_criteria añadida';
  END IF;

  -- ab_test_evaluated_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'newsletter_campaigns' 
    AND column_name = 'ab_test_evaluated_at'
  ) THEN
    ALTER TABLE newsletter_campaigns ADD COLUMN ab_test_evaluated_at TIMESTAMPTZ;
    RAISE NOTICE 'Columna ab_test_evaluated_at añadida';
  END IF;

  -- ab_test_winner
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'newsletter_campaigns' 
    AND column_name = 'ab_test_winner'
  ) THEN
    ALTER TABLE newsletter_campaigns ADD COLUMN ab_test_winner TEXT;
    RAISE NOTICE 'Columna ab_test_winner añadida';
  END IF;
END $$;

-- 5. Añadir columna ab_test_group en newsletter_campaign_recipients si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'newsletter_campaign_recipients' 
    AND column_name = 'ab_test_group'
  ) THEN
    ALTER TABLE newsletter_campaign_recipients 
    ADD COLUMN ab_test_group TEXT;
    
    RAISE NOTICE 'Columna ab_test_group añadida en newsletter_campaign_recipients';
  ELSE
    RAISE NOTICE 'Columna ab_test_group ya existe en newsletter_campaign_recipients';
  END IF;
END $$;

-- 6. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_campaigns_excluded_tracking 
ON newsletter_campaigns(excluded_from_tracking);

CREATE INDEX IF NOT EXISTS idx_campaigns_mail_category 
ON newsletter_campaigns(mail_category);

CREATE INDEX IF NOT EXISTS idx_campaigns_ab_test 
ON newsletter_campaigns(ab_test_enabled) 
WHERE ab_test_enabled = TRUE;

CREATE INDEX IF NOT EXISTS idx_recipients_ab_group 
ON newsletter_campaign_recipients(ab_test_group);

-- 7. Crear campaña de Welcome Founder Pass si no existe
DO $$
DECLARE
  v_campaign_id uuid;
BEGIN
  -- Buscar si ya existe una campaña de bienvenida a founders
  SELECT id INTO v_campaign_id
  FROM newsletter_campaigns
  WHERE title = 'Welcome Founder Pass'
     OR subject LIKE '%Bienvenido al grupo FOUNDERS%'
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
      excluded_from_tracking,
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
      FALSE,
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
      excluded_from_tracking = FALSE,
      updated_at = NOW()
    WHERE id = v_campaign_id;

    RAISE NOTICE 'Campaña Welcome Founder Pass actualizada con ID: %', v_campaign_id;
  END IF;
END $$;

-- 8. Añadir comentarios a las columnas
COMMENT ON COLUMN newsletter_campaigns.excluded_from_tracking IS 'Si es true, esta campaña no se incluye en las métricas de tracking globales';
COMMENT ON COLUMN newsletter_campaigns.mail_category IS 'Categoría del mail: welcome, founder, update, promo, general';
COMMENT ON COLUMN newsletter_campaigns.template_mode IS 'Modo de plantilla: custom, pleia, minimal';
COMMENT ON COLUMN newsletter_campaigns.ab_test_enabled IS 'Si está habilitado el test A/B para esta campaña';
COMMENT ON COLUMN newsletter_campaign_recipients.ab_test_group IS 'Grupo del test A/B: A, B, o holdout';

-- ========================================
-- 9. VERIFICACIÓN FINAL
-- ========================================

-- Verificar columnas creadas
SELECT 
  'newsletter_campaigns' as tabla,
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'newsletter_campaigns' 
  AND column_name IN (
    'excluded_from_tracking',
    'mail_category',
    'template_mode',
    'ab_test_enabled',
    'subject_b',
    'test_duration',
    'test_duration_unit',
    'winner_criteria',
    'ab_test_evaluated_at',
    'ab_test_winner'
  )
ORDER BY column_name;

-- Ver la campaña de Welcome Founder Pass
SELECT 
  id,
  title,
  subject,
  mail_category,
  status,
  tracking_enabled,
  excluded_from_tracking,
  template_mode,
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
-- SCRIPT COMPLETADO ✅
-- ========================================
-- 
-- Este script ha:
-- ✅ Añadido todas las columnas necesarias
-- ✅ Creado índices para mejor rendimiento
-- ✅ Creado/actualizado la campaña Welcome Founder Pass
-- ✅ Añadido comentarios para documentación
-- ✅ Verificado que todo esté correcto
-- 
-- ¡Ahora reinicia tu aplicación con: npm run dev
-- ========================================

