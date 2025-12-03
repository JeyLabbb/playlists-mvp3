-- Migración para soportar A/B Testing y categorización de mails en Newsletter
-- Ejecutar en Supabase SQL Editor

-- 1. Añadir campos de A/B Testing a newsletter_campaigns
ALTER TABLE newsletter_campaigns
ADD COLUMN IF NOT EXISTS mail_category TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS ab_test_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS subject_b TEXT,
ADD COLUMN IF NOT EXISTS test_duration INTEGER,
ADD COLUMN IF NOT EXISTS test_duration_unit TEXT CHECK (test_duration_unit IN ('hours', 'days')),
ADD COLUMN IF NOT EXISTS winner_criteria TEXT CHECK (winner_criteria IN ('opens', 'clicks', 'ctr', 'combined')),
ADD COLUMN IF NOT EXISTS ab_test_winner TEXT CHECK (ab_test_winner IN ('A', 'B')),
ADD COLUMN IF NOT EXISTS ab_test_evaluated_at TIMESTAMPTZ;

-- 2. Añadir campo de variante a newsletter_campaign_recipients
ALTER TABLE newsletter_campaign_recipients
ADD COLUMN IF NOT EXISTS ab_test_variant TEXT CHECK (ab_test_variant IN ('A', 'B', 'holdout'));

-- 3. Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_campaigns_mail_category ON newsletter_campaigns(mail_category);
CREATE INDEX IF NOT EXISTS idx_campaigns_ab_test ON newsletter_campaigns(ab_test_enabled, ab_test_winner);
CREATE INDEX IF NOT EXISTS idx_recipients_variant ON newsletter_campaign_recipients(campaign_id, ab_test_variant);

-- 4. Añadir comentarios para documentación
COMMENT ON COLUMN newsletter_campaigns.mail_category IS 'Categoría del mail: welcome, founder, update, general, promo';
COMMENT ON COLUMN newsletter_campaigns.ab_test_enabled IS 'Si esta campaña usa A/B testing de asuntos';
COMMENT ON COLUMN newsletter_campaigns.subject_b IS 'Asunto alternativo para variante B en A/B test';
COMMENT ON COLUMN newsletter_campaigns.test_duration IS 'Duración del test antes de evaluar ganador';
COMMENT ON COLUMN newsletter_campaigns.test_duration_unit IS 'Unidad de tiempo: hours o days';
COMMENT ON COLUMN newsletter_campaigns.winner_criteria IS 'Criterio para elegir ganador: opens, clicks, ctr, combined';
COMMENT ON COLUMN newsletter_campaigns.ab_test_winner IS 'Variante ganadora después de evaluar: A o B';
COMMENT ON COLUMN newsletter_campaigns.ab_test_evaluated_at IS 'Timestamp cuando se evaluó el ganador';
COMMENT ON COLUMN newsletter_campaign_recipients.ab_test_variant IS 'Variante asignada: A (25%), B (25%), o holdout (50%)';

-- 5. Actualizar campañas existentes con categoría general
UPDATE newsletter_campaigns 
SET mail_category = 'general' 
WHERE mail_category IS NULL;


