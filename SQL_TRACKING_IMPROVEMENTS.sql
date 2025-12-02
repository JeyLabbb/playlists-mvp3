-- ========================================
-- SQL TRACKING IMPROVEMENTS
-- Mejoras para tracking de mails
-- ========================================

-- 1. Añadir columna para excluir mails de tracking
ALTER TABLE newsletter_campaigns 
ADD COLUMN IF NOT EXISTS excluded_from_tracking BOOLEAN DEFAULT FALSE;

-- Crear índice para mejorar el rendimiento de consultas
CREATE INDEX IF NOT EXISTS idx_campaigns_excluded_tracking 
ON newsletter_campaigns(excluded_from_tracking);

-- Comentar la columna
COMMENT ON COLUMN newsletter_campaigns.excluded_from_tracking IS 'Si es true, esta campaña no se incluye en las métricas de tracking globales';

-- ========================================
-- 2. Crear campaña de Welcome Founder Pass
-- ========================================

-- Primero, verificar si ya existe
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
      updated_at = NOW()
    WHERE id = v_campaign_id;

    RAISE NOTICE 'Campaña Welcome Founder Pass ya existe con ID: %', v_campaign_id;
  END IF;
END $$;

-- ========================================
-- 3. Verificación
-- ========================================

-- Verificar que la columna se añadió correctamente
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'newsletter_campaigns' 
  AND column_name = 'excluded_from_tracking';

-- Ver la campaña de Welcome Founder Pass
SELECT 
  id,
  title,
  subject,
  mail_category,
  status,
  tracking_enabled,
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
  SUM(CASE WHEN tracking_enabled THEN 1 ELSE 0 END) as tracking_enabled_count
FROM newsletter_campaigns
GROUP BY mail_category
ORDER BY total_campaigns DESC;

-- ========================================
-- NOTA IMPORTANTE
-- ========================================
-- Ejecuta este script completo en tu consola SQL de Supabase
-- Luego reinicia tu aplicación Next.js para que los cambios tengan efecto

